"""Render output images and arrange region callouts."""

from pathlib import Path

import rasterio
from PIL import Image, ImageDraw, ImageFont

from .config import MAX_PREVIEW_SIZE
from .geotiff import read_rgb_from_geotiff


def layout_region_labels(regions, image_size):
    """Place measured label boxes in preview pixels without covering other labels."""
    width, height = image_size
    padding = 3
    region_boxes = [box for _, box, _, _, _ in regions]
    placed = []

    def intersects(rect, other, gap=0):
        return (
            rect[0] < other[2] + gap
            and rect[2] > other[0] - gap
            and rect[1] < other[3] + gap
            and rect[3] > other[1] - gap
        )

    for label, box, label_width, label_height, text_box in regions:
        x1, y1, x2, y2 = box
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2

        def bounded_rect(x, y):
            left = min(max(padding, round(x)), width - padding - label_width)
            top = min(max(padding, round(y)), height - padding - label_height)
            return left, top, left + label_width, top + label_height

        def label_free(rect):
            return not any(intersects(rect, item[2], padding) for item in placed)

        def clear(rect):
            return label_free(rect) and not any(intersects(rect, region, padding) for region in region_boxes)

        nearby = []
        for offset in (5, 15, 30, 50, 75, 110):
            above, below = y1 - label_height - offset, y2 + offset
            left, right = x1 - label_width - offset, x2 + offset
            nearby.extend(bounded_rect(x, y) for x, y in (
                (cx - label_width / 2, above),
                (cx - label_width / 2, below),
                (left, cy - label_height / 2),
                (right, cy - label_height / 2),
                (left, above), (right, above), (left, below), (right, below),
            ))

        rect = next((candidate for candidate in nearby if clear(candidate)), None)
        if rect is None:
            grid = [
                bounded_rect(x, y)
                for y in range(padding, height, label_height + padding)
                for x in range(padding, width, label_width + padding)
            ]
            grid.sort(key=lambda cell: (cell[0] + label_width / 2 - cx) ** 2
                      + (cell[1] + label_height / 2 - cy) ** 2)
            rect = next((candidate for candidate in grid if clear(candidate)), None)
            if rect is None:
                rect = next((candidate for candidate in nearby + grid if label_free(candidate)), None)

        if rect is not None:
            placed.append((label, box, rect, text_box))

    return placed


def draw_region_labels(draw, image_size, regions, font):
    labels = layout_region_labels(regions, image_size)

    # Draw connectors beneath every label, so a later connector cannot obscure a number.
    for _, (x1, y1, x2, y2), (left, top, right, bottom), _ in labels:
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        end = (min(max(cx, left), right), min(max(cy, top), bottom))
        start = (min(max(end[0], x1), x2), min(max(end[1], y1), y2))
        draw.line([start, end], fill=(15, 23, 42, 255), width=4)
        draw.line([start, end], fill=(255, 255, 255, 255), width=2)

    for label, _, rect, (text_x, text_y, _, _) in labels:
        left, top, _, _ = rect
        draw.rounded_rectangle(rect, radius=4, fill=(15, 23, 42, 255))
        draw.text((left + 6 - text_x, top + 4 - text_y), label, fill="white", font=font)


def save_preview_and_result_images(
    tif_path: Path,
    input_preview_path: Path,
    result_image_path: Path,
    detections,
):
    """Render a clean overview with translucent masks and numbered callouts."""
    with rasterio.open(tif_path) as src:
        rgb = read_rgb_from_geotiff(src)
        width = src.width
        height = src.height

    image = Image.fromarray(rgb).convert("RGB")

    scale = min(
        MAX_PREVIEW_SIZE / width,
        MAX_PREVIEW_SIZE / height,
        1.0,
    )

    preview_width = int(width * scale)
    preview_height = int(height * scale)

    if hasattr(Image, "Resampling"):
        resample_filter = Image.Resampling.LANCZOS
    else:
        resample_filter = Image.LANCZOS

    preview = image.resize(
        (preview_width, preview_height),
        resample_filter,
    )

    preview.save(input_preview_path, quality=95)

    # Rasterize at 2× for smooth edges when the preview is scaled or zoomed.
    overlay = Image.new("RGBA", (preview_width * 2, preview_height * 2))
    draw = ImageDraw.Draw(overlay)
    x_scale, y_scale = preview_width / width, preview_height / height
    polygons = [
        [(float(x) * x_scale * 2, float(y) * y_scale * 2) for x, y in item["polygon"]]
        for item in detections
    ]

    # Draw fills together so overlapping masks do not darken the underlying photo.
    for polygon in polygons:
        draw.polygon(polygon, fill=(35, 173, 158, 47))

    for color, stroke_width in (((8, 47, 43, 224), 6), ((115, 233, 212, 255), 3)):
        for polygon in polygons:
            draw.line(polygon + [polygon[0]], fill=color, width=stroke_width, joint="curve")

    overlay = overlay.resize(preview.size, resample_filter)
    draw = ImageDraw.Draw(overlay)
    try:
        font = ImageFont.load_default(size=16)
    except TypeError:
        font = ImageFont.load_default()

    regions = []
    for region_id, item in enumerate(detections, start=1):
        x1, y1, x2, y2 = item["bbox"]
        label = f"#{region_id}"
        text_box = draw.textbbox((0, 0), label, font=font)
        label_width = text_box[2] - text_box[0] + 12
        label_height = text_box[3] - text_box[1] + 8
        regions.append((label, (x1 * x_scale, y1 * y_scale, x2 * x_scale, y2 * y_scale),
                        label_width, label_height, text_box))

    draw_region_labels(draw, preview.size, regions, font)
    result = Image.alpha_composite(preview.convert("RGBA"), overlay).convert("RGB")
    result.save(result_image_path, quality=95)
