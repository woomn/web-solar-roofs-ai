from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from pathlib import Path
import os
import shutil
import uuid

import numpy as np
import rasterio
from rasterio.windows import Window
from PIL import Image, ImageDraw
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

MODEL_PATH = BASE_DIR / "best.pt"

# รับไฟล์เล็กกว่า 1024×1024 ได้
MIN_SIZE = 256
MAX_SIZE = 5000

# ขนาด tile สำหรับ YOLO
TILE_SIZE = 1024

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


def get_model():
    global model

    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="ไม่พบไฟล์ best.pt กรุณาวางไว้ในโฟลเดอร์ backend"
        )

    if model is None:
        model = YOLO(str(MODEL_PATH))

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
        "recommended_min_gsd": RECOMMENDED_MIN_GSD,
        "max_gsd": MAX_GSD,
    }


# ==========================
# Helper Functions
# ==========================
def is_geotiff(filename: str) -> bool:
    name = filename.lower()
    return name.endswith(".tif") or name.endswith(".tiff")


def validate_metadata(src):
    errors = []
    warnings = []

    crs = src.crs
    gsd_x, gsd_y = src.res

    abs_gsd_x = abs(gsd_x)
    abs_gsd_y = abs(gsd_y)

    # 1. ขนาดภาพต้องอยู่ในช่วง MIN_SIZE×MIN_SIZE ถึง MAX_SIZE×MAX_SIZE px
    if src.width < MIN_SIZE or src.height < MIN_SIZE:
        errors.append(
            f"ขนาดภาพต้องไม่น้อยกว่า {MIN_SIZE}×{MIN_SIZE} px "
            f"แต่ไฟล์นี้คือ {src.width}×{src.height} px"
        )

    if src.width > MAX_SIZE or src.height > MAX_SIZE:
        errors.append(
            f"ขนาดภาพต้องไม่เกิน {MAX_SIZE}×{MAX_SIZE} px "
            f"แต่ไฟล์นี้คือ {src.width}×{src.height} px"
        )

    # 2. ต้องมีอย่างน้อย 3 bands
    if src.count < 3:
        errors.append(
            f"ไฟล์ต้องมีอย่างน้อย 3 bands สำหรับ RGB แต่ไฟล์นี้มี {src.count} band"
        )

    # 3. ต้องมี CRS
    if crs is None:
        errors.append("ไม่พบ CRS ในไฟล์ GeoTIFF")

    # 4. CRS ต้องเป็น Projected CRS เช่น UTM
    if crs is not None and not crs.is_projected:
        errors.append(
            "CRS ต้องเป็น Projected CRS เช่น UTM เพื่อให้ Pixel Size เป็นหน่วยเมตร"
        )

    # 5. Pixel Size / GSD ต้องถูกต้อง
    if abs_gsd_x == 0 or abs_gsd_y == 0:
        errors.append("Pixel Size หรือ GSD ไม่ถูกต้อง")

    # 6. GSD
    # อนุญาต GSD ต่ำกว่า 0.3 เพราะภาพละเอียดกว่า
    # ไม่อนุญาต GSD มากกว่า 0.6 เพราะภาพหยาบเกินไป
    if crs is not None and crs.is_projected:
        if abs_gsd_x > MAX_GSD:
            errors.append(
                f"GSD X ต้องไม่เกิน {MAX_GSD} m/pixel "
                f"แต่ไฟล์นี้คือ {abs_gsd_x} m/pixel"
            )

        if abs_gsd_y > MAX_GSD:
            errors.append(
                f"GSD Y ต้องไม่เกิน {MAX_GSD} m/pixel "
                f"แต่ไฟล์นี้คือ {abs_gsd_y} m/pixel"
            )

        if abs_gsd_x < RECOMMENDED_MIN_GSD or abs_gsd_y < RECOMMENDED_MIN_GSD:
            warnings.append(
                f"GSD ต่ำกว่า {RECOMMENDED_MIN_GSD} m/pixel "
                "ซึ่งเป็นภาพละเอียดกว่า dataset ที่ใช้ train "
                "โมเดลอาจตรวจจับได้ แต่ขนาด object ในภาพอาจต่างจากตอน train"
            )

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


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

    rgb = np.dstack([
        normalize_band(red),
        normalize_band(green),
        normalize_band(blue),
    ])

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
                height=window_height
            )

            yield window, x, y


def polygon_area_pixels(points: np.ndarray) -> float:
    """
    คำนวณพื้นที่ polygon ในหน่วย pixel ด้วย Shoelace formula
    """
    if points is None or len(points) < 3:
        return 0.0

    x = points[:, 0]
    y = points[:, 1]

    area = 0.5 * abs(
        np.dot(x, np.roll(y, 1)) -
        np.dot(y, np.roll(x, 1))
    )

    return float(area)


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
        reverse=True
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


def save_preview_and_result_images(
    tif_path: Path,
    input_preview_path: Path,
    result_image_path: Path,
    detections,
):
    """
    สร้างภาพ preview input และภาพ result ที่ overlay mask ให้เห็นชัดสำหรับ demo

    สิ่งที่วาด:
    1. mask สีแดง
    2. เส้นขอบสีเหลือง
    3. bounding box สีฟ้า
    4. จุดกลาง object สีเหลือง
    """
    with rasterio.open(tif_path) as src:
        rgb = read_rgb_from_geotiff(src)
        width = src.width
        height = src.height

    image = Image.fromarray(rgb).convert("RGB")

    scale = min(
        MAX_PREVIEW_SIZE / width,
        MAX_PREVIEW_SIZE / height,
        1.0
    )

    preview_width = int(width * scale)
    preview_height = int(height * scale)

    if hasattr(Image, "Resampling"):
        resample_filter = Image.Resampling.LANCZOS
    else:
        resample_filter = Image.LANCZOS

    preview = image.resize(
        (preview_width, preview_height),
        resample_filter
    )

    preview.save(input_preview_path, quality=95)

    result_base = preview.convert("RGBA")
    overlay = Image.new("RGBA", result_base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for detection in detections:
        polygon = detection["polygon"]

        scaled_points = [
            (float(x) * scale, float(y) * scale)
            for x, y in polygon
        ]

        if len(scaled_points) < 3:
            continue

        # 1. วาด mask สีแดงโปร่งใส
        draw.polygon(
            scaled_points,
            fill=(255, 0, 0, 150)
        )

        # 2. วาดเส้นขอบ mask สีเหลือง
        closed_points = scaled_points + [scaled_points[0]]

        draw.line(
            closed_points,
            fill=(255, 255, 0, 255),
            width=4
        )

        # 3. วาด bounding box สีฟ้า
        xs = [point[0] for point in scaled_points]
        ys = [point[1] for point in scaled_points]

        x1 = min(xs)
        y1 = min(ys)
        x2 = max(xs)
        y2 = max(ys)

        draw.rectangle(
            [x1, y1, x2, y2],
            outline=(0, 255, 255, 255),
            width=3
        )

        # 4. วาดจุดกลาง object เพื่อให้เห็น object เล็ก
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2

        radius = 6

        draw.ellipse(
            [
                center_x - radius,
                center_y - radius,
                center_x + radius,
                center_y + radius,
            ],
            fill=(255, 255, 0, 255),
            outline=(0, 0, 0, 255),
            width=2,
        )

    result = Image.alpha_composite(result_base, overlay).convert("RGB")
    result.save(result_image_path, quality=95)


# ==========================
# Analyze GeoTIFF Metadata
# ==========================
@app.post("/analyze-geotiff")
async def analyze_geotiff(file: UploadFile = File(...)):
    if not is_geotiff(file.filename):
        raise HTTPException(
            status_code=400,
            detail="รองรับเฉพาะไฟล์ GeoTIFF .tif หรือ .tiff เท่านั้น"
        )

    file_id = str(uuid.uuid4())
    original_filename = os.path.basename(file.filename)
    safe_filename = f"{file_id}_{original_filename}"
    file_path = UPLOAD_DIR / safe_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with rasterio.open(file_path) as src:
            crs = src.crs
            bounds = src.bounds
            gsd_x, gsd_y = src.res

            validation = validate_metadata(src)

            if not validation["is_valid"]:
                raise HTTPException(
                    status_code=400,
                    detail=validation["errors"]
                )

            crs_epsg = crs.to_epsg() if crs else None
            crs_string = str(crs) if crs else None
            is_projected = bool(crs.is_projected) if crs else False

            try:
                crs_unit = crs.linear_units if crs and crs.is_projected else None
            except Exception:
                crs_unit = None

            pixel_area_m2 = None
            if crs and crs.is_projected:
                pixel_area_m2 = abs(gsd_x) * abs(gsd_y)

            return {
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
                    "pixel_area_m2": pixel_area_m2,

                    "tile_size": TILE_SIZE,
                    "size_requirement": f"{MIN_SIZE}×{MIN_SIZE} ถึง {MAX_SIZE}×{MAX_SIZE} px",
                    "gsd_requirement": f"ไม่เกิน {MAX_GSD} m/pixel",
                    "recommended_gsd": f"ประมาณ {RECOMMENDED_MIN_GSD}–{MAX_GSD} m/pixel",

                    "bounds": {
                        "left": bounds.left,
                        "bottom": bounds.bottom,
                        "right": bounds.right,
                        "top": bounds.top,
                    },
                },

                "validation": validation,
            }

    except HTTPException:
        raise

    except rasterio.errors.RasterioIOError:
        raise HTTPException(
            status_code=400,
            detail="ไม่สามารถอ่านไฟล์นี้ด้วย rasterio ได้ อาจไม่ใช่ GeoTIFF ที่ถูกต้อง"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาด: {str(e)}"
        )


# ==========================
# Detect GeoTIFF
# ==========================
class DetectRequest(BaseModel):
    saved_filename: str


@app.post("/detect-geotiff")
def detect_geotiff(request: DetectRequest):
    safe_name = os.path.basename(request.saved_filename)
    tif_path = UPLOAD_DIR / safe_name

    if not tif_path.exists():
        raise HTTPException(
            status_code=404,
            detail="ไม่พบไฟล์ GeoTIFF ที่อัปโหลดไว้ กรุณาอัปโหลดใหม่"
        )

    try:
        with rasterio.open(tif_path) as src:
            validation = validate_metadata(src)

            if not validation["is_valid"]:
                raise HTTPException(
                    status_code=400,
                    detail=validation["errors"]
                )

            crs = src.crs
            gsd_x, gsd_y = src.res
            width = src.width
            height = src.height
            bounds = src.bounds

            pixel_area_m2 = abs(gsd_x) * abs(gsd_y)

            crs_epsg = crs.to_epsg() if crs else None
            crs_string = str(crs) if crs else None

        yolo_model = get_model()

        output_id = str(uuid.uuid4())

        input_preview_name = f"{output_id}_input_preview.jpg"
        result_image_name = f"{output_id}_result.jpg"

        input_preview_path = OUTPUT_DIR / input_preview_name
        result_image_path = OUTPUT_DIR / result_image_name

        detections = []
        tile_count = 0

        for window, x_offset, y_offset in generate_tile_windows(width, height):
            tile_count += 1

            tile_png_name = f"{output_id}_tile_{tile_count:04d}.png"
            tile_png_path = OUTPUT_DIR / tile_png_name

            save_tile_png(tif_path, window, tile_png_path)

            results = yolo_model.predict(
                source=str(tile_png_path),
                imgsz=TILE_SIZE,
                conf=0.15,
                verbose=False,
            )

            result = results[0]

            conf_values = []

            if result.boxes is not None and result.boxes.conf is not None:
                conf_values = result.boxes.conf.cpu().numpy().tolist()

            if result.masks is not None and result.masks.xy is not None:
                for index, polygon in enumerate(result.masks.xy):
                    area_px = polygon_area_pixels(polygon)

                    if area_px <= 0:
                        continue

                    confidence = 0.0

                    if index < len(conf_values):
                        confidence = float(conf_values[index] * 100)

                    global_polygon = polygon.copy()
                    global_polygon[:, 0] += x_offset
                    global_polygon[:, 1] += y_offset

                    x1 = float(np.min(global_polygon[:, 0]))
                    y1 = float(np.min(global_polygon[:, 1]))
                    x2 = float(np.max(global_polygon[:, 0]))
                    y2 = float(np.max(global_polygon[:, 1]))

                    detections.append({
                        "polygon": global_polygon,
                        "area_px": area_px,
                        "confidence": confidence,
                        "bbox": [x1, y1, x2, y2],
                    })

            if tile_png_path.exists():
                tile_png_path.unlink()

        detections = deduplicate_detections(detections)

        total_mask_pixel_area = sum(item["area_px"] for item in detections)
        panel_count = len(detections)

        confidence = 0.0
        if panel_count > 0:
            confidence = sum(item["confidence"] for item in detections) / panel_count

        detected_area_m2 = total_mask_pixel_area * pixel_area_m2

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

        return {
            "success": True,
            "filename": safe_name,

            "image_width": width,
            "image_height": height,
            "tile_size": TILE_SIZE,
            "tiles_processed": tile_count,

            "metadata": {
                "crs": crs_string,
                "crs_epsg": crs_epsg,
                "gsd_x": abs(gsd_x),
                "gsd_y": abs(gsd_y),
                "pixel_area_m2": round(pixel_area_m2, 4),
                "bounds": {
                    "left": bounds.left,
                    "bottom": bounds.bottom,
                    "right": bounds.right,
                    "top": bounds.top,
                },
            },

            "validation": validation,

            "panel_count": panel_count,
            "confidence": round(confidence, 2),

            "mask_pixel_area": round(total_mask_pixel_area, 2),
            "pixel_area_m2": round(pixel_area_m2, 4),
            "detected_area_m2": round(detected_area_m2, 2),

            "capacity_kwp": round(capacity_kwp, 2),
            "daily_energy_kwh": round(daily_energy_kwh, 2),

            "input_preview": f"http://127.0.0.1:8000/outputs/{input_preview_name}",
            "result_image": f"http://127.0.0.1:8000/outputs/{result_image_name}",

            "calculation": {
                "area_formula": "mask_pixel_area × pixel_area_m2",
                "capacity_formula": "detected_area_m2 / 5.5",
                "energy_formula": "capacity_kwp × 5",
                "note": "ค่ากำลังผลิตและพลังงานเป็นการประมาณเบื้องต้น"
            }
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดขณะ Detect: {str(e)}"
        )