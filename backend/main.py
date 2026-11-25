"""ASGI entry point for repo-root and backend-directory launches."""

if __package__:
    from .solar_roof.app import app
else:
    from solar_roof.app import app

__all__ = ["app"]
