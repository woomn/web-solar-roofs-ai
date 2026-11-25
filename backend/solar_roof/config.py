"""Backend settings and local artifact paths."""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BACKEND_DIR / "uploads"
OUTPUT_DIR = BACKEND_DIR / "outputs"
MODEL_PATH = Path(os.environ.get("SOLAR_MODEL_PATH", BACKEND_DIR / "best.pt"))
SAMPLE_PATH = Path(os.environ.get("SOLAR_SAMPLE_GEOTIFF", BACKEND_DIR / "sample.tif"))

MIN_SIZE = 256
MAX_SIZE = 5000
MIN_BANDS = 3
RECOMMENDED_MIN_GSD = 0.3
MAX_GSD = 0.6
TILE_SIZE = 1024
YOLO_CONF_THRESHOLD = 0.25
MAX_PREVIEW_SIZE = 2200
