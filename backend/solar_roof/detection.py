"""Run tiled segmentation and persist detection results."""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Lock

import numpy as np
import rasterio
from fastapi import HTTPException

from .config import MODEL_PATH, OUTPUT_DIR, TILE_SIZE, UPLOAD_DIR, YOLO_CONF_THRESHOLD
from .geometry import (
    build_detected_locations,
    deduplicate_detections,
    equal_area_crs,
    image_ground_area,
    polygon_area_pixels,
)
from .geotiff import generate_tile_windows, is_geotiff, metric_resolution, save_tile_png, validate_metadata
from .preview import save_preview_and_result_images

logger = logging.getLogger(__name__)
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
            from ultralytics import YOLO

            model = YOLO(str(MODEL_PATH))
            if model.task != "segment":
                model = None
                raise HTTPException(status_code=500, detail="ระบบต้องใช้โมเดล YOLO Segmentation")

    return model


def detect_geotiff(saved_filename: str):
    safe_name = os.path.basename(saved_filename)
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

                        # Translate tile-local masks into source-image pixels.
                        global_polygon = polygon.copy()
                        global_polygon[:, 0] += x_offset
                        global_polygon[:, 1] += y_offset

                        area_px = polygon_area_pixels(global_polygon)

                        if area_px <= 0:
                            continue

                        confidence = 0.0

                        if index < len(conf_values):
                            # Return confidence as a percentage.
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

        # Each region represents a segmentation mask.
        region_count = len(detections)

        confidence = 0.0
        if region_count > 0:
            confidence = (
                sum(item["confidence"] for item in detections) / region_count
            )

        with rasterio.open(tif_path) as src:
            detected_locations, detected_area_m2 = build_detected_locations(src, area_crs, detections)

        # Estimate 1 kWp per 5.5 m² of detected area.
        capacity_kwp = detected_area_m2 / 5.5 if detected_area_m2 > 0 else 0

        # Assume five equivalent peak-sun hours per day.
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

            # Preserve the legacy panel_count field as an alias for region_count.
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
