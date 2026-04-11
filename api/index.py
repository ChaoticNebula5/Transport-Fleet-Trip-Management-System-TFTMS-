"""
Vercel Serverless Function — ASGI adapter for FastAPI.

Vercel routes all /api/* requests here. The StripApiPrefix middleware
removes the /api prefix so FastAPI's existing routes (e.g. /auth/login,
/trips) continue to work without any changes.
"""

import sys
import os

# Add the backend directory to Python path so `from app.xxx` imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app as fastapi_app  # noqa: E402


class StripApiPrefix:
    """
    ASGI middleware that strips /api prefix from incoming request paths.

    Vercel sends the full URL path (e.g. /api/auth/login) to the function,
    but FastAPI routes are defined without the /api prefix (e.g. /auth/login).
    This middleware bridges that gap.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith("/api"):
                scope = dict(scope)
                scope["path"] = path[4:] or "/"
        await self.app(scope, receive, send)


# Wrap the FastAPI app with the prefix stripper
app = StripApiPrefix(fastapi_app)
