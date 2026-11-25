"""Input validation, RGB conversion, and raster tiling."""

import math
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import Window

from .config import MAX_GSD, MAX_SIZE, MIN_BANDS, MIN_SIZE, RECOMMENDED_MIN_GSD, TILE_SIZE


def is_geotiff(filename: str | None) -> bool:
    name = (filename or "").lower()
    return name.endswith(".tif") or name.endswith(".tiff")


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
    """Read the first three raster bands, excluding the fourth NAIP infrared band."""
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
    """Yield windows at the original resolution and align the last tile with each edge."""

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
