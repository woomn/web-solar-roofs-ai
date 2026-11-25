"""Assemble the FastAPI application and mount generated files."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import router
from .config import OUTPUT_DIR, UPLOAD_DIR


def create_app() -> FastAPI:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    app = FastAPI(title="Solar Roof AI Backend")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")
    app.include_router(router)
    return app


app = create_app()
