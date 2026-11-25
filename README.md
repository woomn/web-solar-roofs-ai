# Solar Roof AI

Solar Roof AI detects visible solar-panel regions in georeferenced aerial imagery. The web app lets reviewers compare the source image with detected regions, inspect their coordinates, and print a report. Area measurements and energy estimates are intended for preliminary review.

## Quick start

Use Node.js 24, npm, and Python 3.13. Run the commands below from the repository root.

**Terminal 1 — API**

```bash
python3.13 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Web app**

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open the [web app](http://127.0.0.1:3000) or [FastAPI documentation](http://127.0.0.1:8000/docs). GeoTIFF metadata validation works as soon as the API is running. To run detection, place an Ultralytics YOLO segmentation checkpoint at `backend/best.pt` or configure `SOLAR_MODEL_PATH`.

The API accepts one `.tif` or `.tiff` at a time with a projected CRS, at least three bands, image dimensions of 256–5,000 pixels on each axis, and a GSD above 0 and up to 0.6 m/pixel. GSD below 0.3 m/pixel is accepted with a warning.

## Configuration

| Variable | Service | Default | Purpose |
| --- | --- | --- | --- |
| `SOLAR_MODEL_PATH` | FastAPI | `backend/best.pt` | Path to the segmentation checkpoint |
| `SOLAR_SAMPLE_GEOTIFF` | FastAPI | `backend/sample.tif` | Optional sample. The Upload page shows a demo button when the file exists |
| `SOLAR_BACKEND_URL` | Next.js | `http://127.0.0.1:8000` | FastAPI URL reachable from the Next.js server. Set it before building and when starting Next.js if you use a different URL |

The optional demo is available to anyone who can use that deployment. Use a GeoTIFF you have permission to share. Checkpoints, sample files, uploaded imagery, and generated assets are stored outside version control.

## Code map

| Path | Responsibility |
| --- | --- |
| [`frontend/src/app/`](frontend/src/app/) | Next.js page routes and the streaming upload endpoint |
| [`frontend/src/components/`](frontend/src/components/) | Screen components, shared detection viewer, and print report |
| [`frontend/src/lib/analysis/`](frontend/src/lib/analysis/) | Analysis API client, browser storage, types, and formatting |
| [`backend/main.py`](backend/main.py) | ASGI entry point |
| [`backend/solar_roof/api.py`](backend/solar_roof/api.py) | Request parsing, upload handling, and public routes |
| [`backend/solar_roof/geotiff.py`](backend/solar_roof/geotiff.py) | Raster validation, RGB conversion, and tiling |
| [`backend/solar_roof/detection.py`](backend/solar_roof/detection.py) | Model loading and detection workflow |
| [`backend/solar_roof/geometry.py`](backend/solar_roof/geometry.py) | Polygon measurements, coordinate conversion, and deduplication |
| [`backend/solar_roof/preview.py`](backend/solar_roof/preview.py) | Result overlays and region labels |
| [`backend/tests/`](backend/tests/) | Backend tests using synthetic images and a stub model |

## Data flow and persistence

1. Next.js streams the uploaded GeoTIFF to FastAPI. FastAPI saves it in `backend/uploads/`, validates its metadata, and returns a saved filename.
2. The detection endpoint reads that filename, runs segmentation in tiles, and generates images and region polygons under `backend/outputs/`.
3. The browser uses the response for the Analysis and Report pages. The latest result and up to 20 history entries live in browser storage, while their images stay on the server.

Keep `uploads/` and `outputs/` on persistent storage if a deployment needs to retain files after a restart or redeploy. The current app has no user accounts or per-user access controls.

## Checks

```bash
python -m unittest discover -s backend/tests -v
npm --prefix frontend run lint -- --max-warnings 0
npm --prefix frontend run build
```

For backend checks without a model installation, use `python -m pip install -r backend/requirements-core.txt`. See [Contributing](CONTRIBUTING.md) for branch names, pull requests, and manual verification.
