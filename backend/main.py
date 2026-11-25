from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from pathlib import Path
import json
import logging
import math
import os
import shutil
import uuid
from datetime import datetime, timezone
from tempfile import TemporaryDirectory
from threading import Lock

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.windows import Window
from rasterio.warp import transform as transform_coords
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO


# ==========================
# App
# ==========================
app = FastAPI(title="Solar Roof AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================
# Config
# ==========================
BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"

MODEL_PATH = Path(os.environ.get("SOLAR_MODEL_PATH", BASE_DIR / "best.pt"))
SAMPLE_PATH = Path(os.environ.get("SOLAR_SAMPLE_GEOTIFF", BASE_DIR / "sample.tif"))
logger = logging.getLogger(__name__)

# รับไฟล์เล็กกว่า 1024×1024 ได้
MIN_SIZE = 256
MAX_SIZE = 5000
MIN_BANDS = 3

# ขนาด tile สำหรับ YOLO
TILE_SIZE = 1024

# ค่า confidence ขั้นต่ำของ YOLO
# 0.25 = รับเฉพาะผลตรวจจับที่มั่นใจตั้งแต่ 25% ขึ้นไป
YOLO_CONF_THRESHOLD = 0.25

# GSD
# ต่ำกว่า 0.3 อนุญาต เพราะภาพละเอียดกว่า
# มากกว่า 0.6 ไม่อนุญาต เพราะภาพหยาบเกินไปสำหรับโมเดล
RECOMMENDED_MIN_GSD = 0.3
MAX_GSD = 0.6

# ขนาดภาพ preview สำหรับแสดงผล
MAX_PREVIEW_SIZE = 2200

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


# ==========================
# YOLO Model
# ==========================
model = None
model_load_lock = Lock()


def get_model():
    global model

    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="ไม่พบไฟล์ best.pt กรุณาวางไว้ในโฟลเดอร์ backend",
        )

    with model_load_lock:
        if model is None:
            model = YOLO(str(MODEL_PATH))
            if model.task != "segment":
                model = None
                raise HTTPException(status_code=500, detail="ระบบต้องใช้โมเดล YOLO Segmentation")

    return model


# ==========================
# Root
# ==========================
@app.get("/")
def root():
    return {
        "message": "Solar Roof AI Backend is running",
        "status": "ok",
        "model_path": str(MODEL_PATH),
        "model_exists": MODEL_PATH.exists(),
        "min_size": MIN_SIZE,
        "max_size": MAX_SIZE,
        "tile_size": TILE_SIZE,
        "yolo_conf_threshold": YOLO_CONF_THRESHOLD,
        "recommended_min_gsd": RECOMMENDED_MIN_GSD,
        "max_gsd": MAX_GSD,
    }


# ==========================
# Helper Functions
# ==========================
def is_geotiff(filename: str | None) -> bool:
    name = (filename or "").lower()
    return name.endswith(".tif") or name.endswith(".tiff")


@app.get("/requirements")
def upload_requirements():
    return {
        "min_size": MIN_SIZE,
        "max_size": MAX_SIZE,
        "min_bands": MIN_BANDS,
        "sample_available": is_geotiff(SAMPLE_PATH.name) and SAMPLE_PATH.is_file(),
        "recommended_min_gsd": RECOMMENDED_MIN_GSD,
        "max_gsd": MAX_GSD,
    }


def metric_resolution(src):
    _, meters_per_unit = src.crs.linear_units_factor
    return tuple(resolution * meters_per_unit for resolution in src.res)


def validate_metadata(src):
    errors = []
    warnings = []
    crs = src.crs

    if src.driver != "GTiff":
        errors.append("ไฟล์ต้องอยู่ในรูปแบบ GeoTIFF")
    if not (MIN_SIZE <= src.width <= MAX_SIZE and MIN_SIZE <= src.height <= MAX_SIZE):
        errors.append(
            f"ความกว้างและความสูงต้องอยู่ระหว่าง {MIN_SIZE}–{MAX_SIZE} px "
            f"(ไฟล์นี้ {src.width}×{src.height} px)"
        )
    if src.count < MIN_BANDS:
        errors.append("ไฟล์ต้องมีอย่างน้อย 3 bands สำหรับ RGB")
    if crs is None or not crs.is_projected:
        errors.append("ต้องมีระบบพิกัดแบบ Projected CRS เช่น UTM")
    else:
        gsd_x, gsd_y = metric_resolution(src)
        if not all(math.isfinite(value) and value > 0 for value in (gsd_x, gsd_y)):
            errors.append("ค่า GSD ในไฟล์ไม่ถูกต้อง")
        elif max(gsd_x, gsd_y) > MAX_GSD + 1e-8:
            errors.append(
                f"GSD ทั้งสองแกนต้องไม่เกิน {MAX_GSD} เมตร/พิกเซล "
                f"(ไฟล์นี้ {gsd_x:.4f} × {gsd_y:.4f})"
            )
        elif min(gsd_x, gsd_y) < RECOMMENDED_MIN_GSD - 1e-8:
            warnings.append(
                f"GSD ต่ำกว่า {RECOMMENDED_MIN_GSD} เมตร/พิกเซล "
                "ภาพมีความละเอียดสูงกว่าช่วงที่แนะนำ ควรตรวจผลจากภาพประกอบ"
            )

    return {"is_valid": not errors, "errors": errors, "warnings": warnings}


def normalize_band(band: np.ndarray) -> np.ndarray:
    band = band.astype("float32")

    valid = band[np.isfinite(band)]

    if valid.size == 0:
        return np.zeros_like(band, dtype=np.uint8)

    p2, p98 = np.percentile(valid, (2, 98))

    if p98 - p2 == 0:
        return np.zeros_like(band, dtype=np.uint8)

    band = (band - p2) / (p98 - p2)
    band = np.clip(band, 0, 1)
    band = (band * 255).astype(np.uint8)

    return band


def read_rgb_from_geotiff(src, window=None) -> np.ndarray:
    """
    อ่าน GeoTIFF เป็น RGB array

    ใช้ band 1, 2, 3 เป็น RGB
    ถ้าเป็น NAIP 4 bands จะใช้เฉพาะ RGB และไม่ใช้ NIR
    """
    if src.count >= 3:
        red = src.read(1, window=window)
        green = src.read(2, window=window)
        blue = src.read(3, window=window)
    else:
        red = src.read(1, window=window)
        green = src.read(1, window=window)
        blue = src.read(1, window=window)

    rgb = np.dstack(
        [
            normalize_band(red),
            normalize_band(green),
            normalize_band(blue),
        ]
    )

    return rgb


def save_tile_png(tif_path: Path, window: Window, output_png_path: Path):
    with rasterio.open(tif_path) as src:
        rgb = read_rgb_from_geotiff(src, window=window)

    image = Image.fromarray(rgb)
    image.save(output_png_path)

    return output_png_path


def generate_tile_windows(width: int, height: int, tile_size: int = TILE_SIZE):
    """
    สร้าง window สำหรับ crop ภาพเป็น tile

    กรณีภาพเล็กกว่า 1024×1024:
    - ใช้ขนาดจริงของภาพ เช่น 800×700

    กรณีภาพใหญ่กว่า 1024×1024:
    - ตัดเป็น tile 1024×1024
    - tile สุดท้ายจะเลื่อนให้ชนขอบภาพ
    """

    def get_starts(size: int):
        if size <= tile_size:
            return [0]

        starts = list(range(0, size - tile_size + 1, tile_size))
        last_start = size - tile_size

        if starts[-1] != last_start:
            starts.append(last_start)

        return sorted(set(starts))

    x_starts = get_starts(width)
    y_starts = get_starts(height)

    for y in y_starts:
        for x in x_starts:
            window_width = min(tile_size, width - x)
            window_height = min(tile_size, height - y)

            window = Window(
                col_off=x,
                row_off=y,
                width=window_width,
                height=window_height,
            )

            yield window, x, y


def polygon_area_pixels(points) -> float:
    """
    คำนวณพื้นที่ polygon ในหน่วย pixel ด้วย Shoelace formula

    points:
    - np.ndarray shape (n, 2)
    - หรือ list ของ [x, y]
    """
    if points is None:
        return 0.0

    points = np.asarray(points, dtype=np.float64)

    if len(points) < 3:
        return 0.0

    x = points[:, 0]
    y = points[:, 1]

    area = 0.5 * abs(
        np.dot(x, np.roll(y, 1)) -
        np.dot(y, np.roll(x, 1))
    )

    return float(area)


def polygon_centroid_pixel(points):
    """
    หาจุดกึ่งกลางของ polygon ในระบบ pixel coordinate

    ใช้สูตร centroid ของ polygon
    ถ้าคำนวณไม่ได้ จะ fallback เป็น center ของ bounding box
    """
    if points is None:
        return 0.0, 0.0

    points = np.asarray(points, dtype=np.float64)

    if len(points) == 0:
        return 0.0, 0.0

    xs = points[:, 0]
    ys = points[:, 1]

    fallback_x = float((np.min(xs) + np.max(xs)) / 2)
    fallback_y = float((np.min(ys) + np.max(ys)) / 2)

    if len(points) < 3:
        return fallback_x, fallback_y

    signed_area = 0.0
    centroid_x = 0.0
    centroid_y = 0.0
    n = len(points)

    for i in range(n):
        x0, y0 = points[i]
        x1, y1 = points[(i + 1) % n]

        cross = (x0 * y1) - (x1 * y0)
        signed_area += cross
        centroid_x += (x0 + x1) * cross
        centroid_y += (y0 + y1) * cross

    signed_area *= 0.5

    if abs(signed_area) < 1e-6:
        return fallback_x, fallback_y

    centroid_x /= 6.0 * signed_area
    centroid_y /= 6.0 * signed_area

    return float(centroid_x), float(centroid_y)


def equal_area_crs(src):
    center = src.transform * (src.width / 2, src.height / 2)
    lon, lat = transform_coords(src.crs, "EPSG:4326", [center[0]], [center[1]])
    return CRS.from_proj4(
        f"+proj=laea +lat_0={lat[0]} +lon_0={lon[0]} +datum=WGS84 +units=m +no_defs"
    )


def ground_area(src, area_crs, polygon):
    points = np.asarray(polygon, dtype=np.float64)
    columns, rows = points.T
    map_x, map_y = src.transform * (columns, rows)
    x, y = transform_coords(src.crs, area_crs, map_x, map_y)
    area_points = np.column_stack((x, y))
    if not np.isfinite(area_points).all():
        raise ValueError("Invalid projected polygon")
    # Translate before applying the shoelace formula to preserve precision.
    return polygon_area_pixels(area_points - area_points[0])


def image_ground_area(src, area_crs):
    return ground_area(
        src, area_crs, [(0, 0), (src.width, 0), (src.width, src.height), (0, src.height)]
    )


def build_detected_locations(src, area_crs, detections):
    locations = []
    total_area = 0.0
    crs_text = src.crs.to_string()

    for index, detection in enumerate(detections, start=1):
        polygon = detection["polygon"]
        center_x, center_y = polygon_centroid_pixel(polygon)
        map_x, map_y = src.transform * (center_x, center_y)
        longitude, latitude = transform_coords(src.crs, "EPSG:4326", [map_x], [map_y])
        area_m2 = ground_area(src, area_crs, polygon)
        total_area += area_m2

        locations.append({
            "region_id": index,
            "confidence": round(detection["confidence"], 2),
            "mask_pixel_area": round(detection["area_px"], 2),
            "area_m2": round(area_m2, 2),
            "center_pixel": {"x": round(center_x, 2), "y": round(center_y, 2)},
            "map_coordinate": {"x": round(map_x, 3), "y": round(map_y, 3), "crs": crs_text},
            "latitude": round(latitude[0], 7),
            "longitude": round(longitude[0], 7),
            "bbox_pixel": [round(value, 2) for value in detection["bbox"]],
        })

    return locations, total_area


def bbox_iou(box_a, box_b) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)

    union_area = area_a + area_b - inter_area

    if union_area == 0:
        return 0.0

    return inter_area / union_area


def deduplicate_detections(detections, iou_threshold: float = 0.5):
    """
    ลบ detection ซ้ำจาก tile ที่ overlap กัน

    ตอนนี้ crop แบบไม่มี overlap แต่ยังเก็บ function นี้ไว้
    เผื่ออนาคตเพิ่ม overlap 128 หรือ 256 px
    """
    sorted_detections = sorted(
        detections,
        key=lambda item: item["confidence"],
        reverse=True,
    )

    kept = []

    for detection in sorted_detections:
        is_duplicate = False

        for existing in kept:
            if bbox_iou(detection["bbox"], existing["bbox"]) >= iou_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            kept.append(detection)

    return kept


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


# ==========================
# Analyze GeoTIFF Metadata
# ==========================
@app.post("/analyze-geotiff")
def analyze_geotiff(file: UploadFile = File(...)):
    if not is_geotiff(file.filename):
        raise HTTPException(
            status_code=400,
            detail="รองรับเฉพาะไฟล์ GeoTIFF .tif หรือ .tiff เท่านั้น",
        )

    file_id = str(uuid.uuid4())
    original_filename = os.path.basename(file.filename)
    safe_filename = f"{file_id}_{original_filename}"
    file_path = UPLOAD_DIR / safe_filename

    accepted = False
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with rasterio.open(file_path) as src:
            crs = src.crs
            bounds = src.bounds
            validation = validate_metadata(src)

            if not validation["is_valid"]:
                raise HTTPException(
                    status_code=400,
                    detail=validation["errors"],
                )

            crs_epsg = crs.to_epsg() if crs else None
            crs_string = str(crs) if crs else None
            is_projected = bool(crs.is_projected) if crs else False

            try:
                crs_unit = crs.linear_units if crs and crs.is_projected else None
            except Exception:
                crs_unit = None

            gsd_x, gsd_y = metric_resolution(src)
            area_crs = equal_area_crs(src)
            image_area_m2 = image_ground_area(src, area_crs)
            if image_area_m2 <= 0:
                raise HTTPException(status_code=400, detail="ไม่สามารถคำนวณขนาดพื้นที่จากพิกัดภาพนี้ได้")

            response = {
                "success": True,
                "filename": file.filename,
                "saved_filename": safe_filename,
                "file_size_mb": round(file_path.stat().st_size / 1024 / 1024, 2),
                "metadata": {
                    "driver": src.driver,
                    "width": src.width,
                    "height": src.height,
                    "bands": src.count,
                    "dtype": src.dtypes[0],
                    "crs": crs_string,
                    "crs_epsg": crs_epsg,
                    "crs_is_projected": is_projected,
                    "crs_unit": crs_unit,
                    "gsd_x": abs(gsd_x),
                    "gsd_y": abs(gsd_y),
                    "pixel_area_m2": image_area_m2 / (src.width * src.height),
                    "image_area_m2": image_area_m2,
                    "tile_size": TILE_SIZE,
                    "size_requirement": (
                        f"{MIN_SIZE}×{MIN_SIZE} ถึง {MAX_SIZE}×{MAX_SIZE} px"
                    ),
                    "gsd_requirement": f"ไม่เกิน {MAX_GSD} m/pixel",
                    "recommended_gsd": (
                        f"ประมาณ {RECOMMENDED_MIN_GSD}–{MAX_GSD} m/pixel"
                    ),
                    "bounds": {
                        "left": bounds.left,
                        "bottom": bounds.bottom,
                        "right": bounds.right,
                        "top": bounds.top,
                    },
                },
                "validation": validation,
            }

        accepted = True
        return response

    except HTTPException:
        raise

    except rasterio.errors.RasterioIOError:
        raise HTTPException(
            status_code=400,
            detail="ไม่สามารถอ่านไฟล์นี้ด้วย rasterio ได้ อาจไม่ใช่ GeoTIFF ที่ถูกต้อง",
        )

    except Exception:
        logger.exception("GeoTIFF metadata analysis failed")
        raise HTTPException(status_code=500, detail="ตรวจไฟล์ไม่สำเร็จ กรุณาลองใหม่")
    finally:
        if not accepted:
            file_path.unlink(missing_ok=True)


@app.post("/sample-geotiff")
def analyze_sample_geotiff():
    if not is_geotiff(SAMPLE_PATH.name):
        raise HTTPException(status_code=404, detail="ยังไม่ได้ตั้งค่าภาพตัวอย่าง")
    try:
        with SAMPLE_PATH.open("rb") as sample:
            return analyze_geotiff(UploadFile(file=sample, filename=SAMPLE_PATH.name))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="ยังไม่ได้ตั้งค่าภาพตัวอย่าง")


# ==========================
# Detect GeoTIFF
# ==========================
class DetectRequest(BaseModel):
    saved_filename: str


@app.post("/detect-geotiff")
def detect_geotiff(request: DetectRequest):
    safe_name = os.path.basename(request.saved_filename)
    tif_path = UPLOAD_DIR / safe_name

    if not is_geotiff(safe_name) or not tif_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="ไม่พบไฟล์ GeoTIFF ที่อัปโหลดไว้ กรุณาอัปโหลดใหม่",
        )

    output_paths = []
    completed = False
    try:
        with rasterio.open(tif_path) as src:
            validation = validate_metadata(src)

            if not validation["is_valid"]:
                raise HTTPException(
                    status_code=400,
                    detail=validation["errors"],
                )

            crs = src.crs
            gsd_x, gsd_y = metric_resolution(src)
            width = src.width
            height = src.height
            bounds = src.bounds

            area_crs = equal_area_crs(src)
            image_area_m2 = image_ground_area(src, area_crs)
            pixel_area_m2 = image_area_m2 / (width * height)

            crs_epsg = crs.to_epsg() if crs else None
            crs_string = str(crs) if crs else None

        yolo_model = get_model()

        output_id = str(uuid.uuid4())

        input_preview_name = f"{output_id}_input_preview.jpg"
        result_image_name = f"{output_id}_result.jpg"
        region_geometry_name = f"{output_id}_regions.json"

        input_preview_path = OUTPUT_DIR / input_preview_name
        result_image_path = OUTPUT_DIR / result_image_name

        region_geometry_path = OUTPUT_DIR / region_geometry_name
        output_paths = [input_preview_path, result_image_path, region_geometry_path]

        detections = []
        tile_count = 0

        with TemporaryDirectory() as temp_dir:
            for window, x_offset, y_offset in generate_tile_windows(width, height):
                tile_count += 1

                tile_png_path = Path(temp_dir) / "tile.png"

                save_tile_png(tif_path, window, tile_png_path)

                results = yolo_model.predict(
                    source=str(tile_png_path),
                    imgsz=TILE_SIZE,
                    conf=YOLO_CONF_THRESHOLD,
                    verbose=False,
                )

                result = results[0]

                conf_values = []

                if result.boxes is not None and result.boxes.conf is not None:
                    conf_values = result.boxes.conf.cpu().numpy().tolist()

                if result.masks is not None and result.masks.xy is not None:
                    for index, polygon in enumerate(result.masks.xy):
                        polygon = np.asarray(polygon, dtype=np.float64)

                        if len(polygon) < 3:
                            continue

                        # polygon จาก YOLO เป็นตำแหน่งใน tile
                        # ต้องบวก offset เพื่อให้เป็นตำแหน่งในภาพ GeoTIFF ใหญ่
                        global_polygon = polygon.copy()
                        global_polygon[:, 0] += x_offset
                        global_polygon[:, 1] += y_offset

                        area_px = polygon_area_pixels(global_polygon)

                        if area_px <= 0:
                            continue

                        confidence = 0.0

                        if index < len(conf_values):
                            # แปลงจาก 0.84 เป็น 84.0
                            confidence = float(conf_values[index] * 100)

                        x1 = float(np.min(global_polygon[:, 0]))
                        y1 = float(np.min(global_polygon[:, 1]))
                        x2 = float(np.max(global_polygon[:, 0]))
                        y2 = float(np.max(global_polygon[:, 1]))

                        detections.append(
                            {
                                "polygon": global_polygon,
                                "area_px": area_px,
                                "confidence": confidence,
                                "bbox": [x1, y1, x2, y2],
                            }
                        )

        detections = deduplicate_detections(detections)

        total_mask_pixel_area = sum(item["area_px"] for item in detections)

        # จำนวนที่ตรวจพบคือ region / mask ไม่ใช่จำนวนแผงจริง
        region_count = len(detections)

        confidence = 0.0
        if region_count > 0:
            confidence = (
                sum(item["confidence"] for item in detections) / region_count
            )

        with rasterio.open(tif_path) as src:
            detected_locations, detected_area_m2 = build_detected_locations(src, area_crs, detections)

        # สมมติ 1 kWp ใช้พื้นที่ประมาณ 5.5 m²
        capacity_kwp = detected_area_m2 / 5.5 if detected_area_m2 > 0 else 0

        # สมมติ Peak Sun Hours เฉลี่ย 5 ชั่วโมง/วัน
        daily_energy_kwh = capacity_kwp * 5

        save_preview_and_result_images(
            tif_path=tif_path,
            input_preview_path=input_preview_path,
            result_image_path=result_image_path,
            detections=detections,
        )

        # Keep detailed shapes out of localStorage and load them only in the image viewer.
        with region_geometry_path.open("w", encoding="utf-8") as file:
            json.dump({
                index: item["polygon"].round(2).tolist()
                for index, item in enumerate(detections, start=1)
            }, file, separators=(",", ":"))

        completed = True
        return {
            "success": True,
            "filename": safe_name,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "image_width": width,
            "image_height": height,
            "tile_size": TILE_SIZE,
            "tiles_processed": tile_count,
            "metadata": {
                "crs": crs_string,
                "crs_epsg": crs_epsg,
                "gsd_x": abs(gsd_x),
                "gsd_y": abs(gsd_y),
                "pixel_area_m2": round(pixel_area_m2, 8),
                "image_area_m2": image_area_m2,
                "bounds": {
                    "left": bounds.left,
                    "bottom": bounds.bottom,
                    "right": bounds.right,
                    "top": bounds.top,
                },
            },
            "validation": validation,

            # panel_count เก็บไว้เพื่อให้ frontend เก่าไม่พัง
            # แต่ความหมายจริงคือ region_count
            "panel_count": region_count,
            "region_count": region_count,

            "confidence": round(confidence, 2),
            "mask_pixel_area": round(total_mask_pixel_area, 2),
            "pixel_area_m2": round(pixel_area_m2, 8),
            "area_method": "equal_area",
            "detected_area_m2": round(detected_area_m2, 2),
            "capacity_kwp": round(capacity_kwp, 2),
            "daily_energy_kwh": round(daily_energy_kwh, 2),
            "detected_locations": detected_locations,
            "input_preview": f"/outputs/{input_preview_name}",
            "result_image": f"/outputs/{result_image_name}",
            "region_geometry": f"/outputs/{region_geometry_name}",
            "calculation": {
                "area_formula": "sum of mask polygon areas in a local equal-area projection",
                "capacity_formula": "detected_area_m2 / 5.5",
                "energy_formula": "capacity_kwp × 5",
                "note": "ค่ากำลังผลิตและพลังงานเป็นการประมาณเบื้องต้น",
            },
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("GeoTIFF detection failed")
        raise HTTPException(status_code=500, detail="ตรวจจับไม่สำเร็จ กรุณาลองใหม่")
    finally:
        if not completed:
            for output_path in output_paths:
                output_path.unlink(missing_ok=True)
