"""Exercise the backend handoff from an upload to its generated artifacts."""

import json
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
from fastapi import HTTPException, UploadFile
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from starlette.routing import Mount

from backend.main import app
from backend.solar_roof import api, detection


def geotiff_bytes(width=256, height=256, gsd=0.3):
    with MemoryFile() as memory:
        with memory.open(
            driver="GTiff",
            width=width,
            height=height,
            count=3,
            dtype="uint8",
            crs="EPSG:32647",
            transform=from_origin(650_000, 1_500_000, gsd, gsd),
        ) as image:
            image.write(np.zeros((3, height, width), dtype=np.uint8))
        return memory.read()


class AnalysisWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.upload_dir = self.root / "uploads"
        self.output_dir = self.root / "outputs"
        self.upload_dir.mkdir()
        self.output_dir.mkdir()
        self.enterContext(patch.object(api, "UPLOAD_DIR", self.upload_dir))
        self.enterContext(patch.object(detection, "UPLOAD_DIR", self.upload_dir))
        self.enterContext(patch.object(detection, "OUTPUT_DIR", self.output_dir))

    def upload(self, **options):
        image = UploadFile(file=BytesIO(geotiff_bytes(**options)), filename="image.tif")
        return api.analyze_geotiff(image)

    def test_api_routes_remain_available(self):
        self.assertEqual(
            set(app.openapi()["paths"]),
            {"/", "/requirements", "/analyze-geotiff", "/sample-geotiff", "/detect-geotiff"},
        )
        self.assertIn("/outputs", {route.path for route in app.routes if isinstance(route, Mount)})

    def test_invalid_upload_is_rejected_and_removed(self):
        with self.assertRaises(HTTPException) as result:
            self.upload(width=255)
        self.assertEqual(result.exception.status_code, 400)
        self.assertEqual(list(self.upload_dir.iterdir()), [])

    def test_sample_availability_and_metadata(self):
        sample = self.root / "sample.tif"
        with patch.object(api, "SAMPLE_PATH", sample):
            self.assertFalse(api.upload_requirements()["sample_available"])
            with self.assertRaises(HTTPException) as result:
                api.analyze_sample_geotiff()
            self.assertEqual(result.exception.status_code, 404)

            sample.write_bytes(geotiff_bytes(gsd=0.2))
            self.assertTrue(api.upload_requirements()["sample_available"])
            metadata = api.analyze_sample_geotiff()

        self.assertEqual(metadata["filename"], "sample.tif")
        self.assertTrue(metadata["validation"]["is_valid"])
        self.assertTrue(metadata["validation"]["warnings"])

    def test_upload_to_detection_preserves_image_and_region_contract(self):
        metadata = self.upload(width=1100)
        mask = np.array([(8, 10), (24, 10), (24, 26), (8, 26)])
        yolo_result = SimpleNamespace(boxes=None, masks=SimpleNamespace(xy=[mask]))
        empty_result = SimpleNamespace(boxes=None, masks=None)
        with patch.object(detection, "get_model") as get_model:
            get_model.return_value.predict.side_effect = [[yolo_result], [empty_result]]
            result = api.detect_geotiff(api.DetectRequest(saved_filename=metadata["saved_filename"]))

        self.assertEqual(result["tiles_processed"], 2)
        self.assertEqual(result["region_count"], 1)
        self.assertEqual(result["panel_count"], result["region_count"])
        self.assertGreater(result["detected_area_m2"], 0)
        self.assertEqual(result["detected_locations"][0]["center_pixel"], {"x": 16.0, "y": 18.0})
        region_data = self.output_dir / Path(result["region_geometry"]).name
        self.assertEqual(json.loads(region_data.read_text()), {"1": mask.tolist()})
        for field in ("input_preview", "result_image"):
            path = self.output_dir / Path(result[field]).name
            self.assertTrue(path.read_bytes().startswith(b"\xff\xd8"))
