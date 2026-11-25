"""HTTP endpoints and request validation."""

import logging
import os
import shutil
import uuid

import rasterio
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from .config import (
    MAX_GSD,
    MAX_SIZE,
    MIN_BANDS,
    MIN_SIZE,
    MODEL_PATH,
    RECOMMENDED_MIN_GSD,
    SAMPLE_PATH,
    TILE_SIZE,
    UPLOAD_DIR,
    YOLO_CONF_THRESHOLD,
)
from .detection import detect_geotiff as run_detection
from .geometry import equal_area_crs, image_ground_area
from .geotiff import is_geotiff, metric_resolution, validate_metadata

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
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


@router.get("/requirements")
def upload_requirements():
    return {
        "min_size": MIN_SIZE,
        "max_size": MAX_SIZE,
        "min_bands": MIN_BANDS,
        "sample_available": is_geotiff(SAMPLE_PATH.name) and SAMPLE_PATH.is_file(),
        "recommended_min_gsd": RECOMMENDED_MIN_GSD,
        "max_gsd": MAX_GSD,
    }


@router.post("/analyze-geotiff")
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


@router.post("/sample-geotiff")
def analyze_sample_geotiff():
    if not is_geotiff(SAMPLE_PATH.name):
        raise HTTPException(status_code=404, detail="ยังไม่ได้ตั้งค่าภาพตัวอย่าง")
    try:
        with SAMPLE_PATH.open("rb") as sample:
            return analyze_geotiff(UploadFile(file=sample, filename=SAMPLE_PATH.name))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="ยังไม่ได้ตั้งค่าภาพตัวอย่าง")


class DetectRequest(BaseModel):
    saved_filename: str


@router.post("/detect-geotiff")
def detect_geotiff(request: DetectRequest):
    return run_detection(request.saved_filename)
