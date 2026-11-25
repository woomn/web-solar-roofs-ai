# Contributing to Solar Roof AI

Use the [root README](README.md) to set up the project. Create a branch from the latest `main` and name it after the change, such as `feature/job-history`, `fix/large-geotiff-upload`, or `refactor/report-components`. Write commit messages that describe the change, such as `Stream GeoTIFF uploads through Next.js`.

## Where to work

- Keep Next.js routes under `frontend/src/app/` and reusable UI under `frontend/src/components/`. Use kebab-case for TypeScript/React filenames and PascalCase for React component names.
- Put HTTP request and response handling in `backend/solar_roof/api.py`. Put raster processing, model inference, geometry, or image generation in the matching backend module. Use snake_case for Python modules and functions.
- If an API response changes, update the frontend types and consider previously saved browser history. If a report changes, check both its interactive view and its print layout.

## Pull requests

Describe the user-visible change and how you verified it. Screenshots help review interface changes. Run the checks listed in the README before opening the PR.

For changes to analysis, test a file that returns detections and one that returns no detections. For upload changes, include a file the validator rejects and a larger file that takes the streaming path. For report changes, check selection from the location list or table and use the print preview to inspect the report.

Use synthetic fixtures for automated tests. Keep model checkpoints, uploaded data, generated results, and local environment files out of commits.
