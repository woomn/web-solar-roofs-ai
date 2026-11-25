"""Polygon measurements, coordinate conversion, and duplicate filtering."""

import numpy as np
from rasterio.crs import CRS
from rasterio.warp import transform as transform_coords


def polygon_area_pixels(points) -> float:
    """Measure the area of a sequence of x/y points using the shoelace formula."""
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
    """Return the polygon centroid, or the bounding-box center for degenerate shapes."""
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
    """Keep the highest-scoring detection when bounding boxes overlap across tiles."""
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
