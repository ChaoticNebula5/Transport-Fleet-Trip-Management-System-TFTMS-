import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import FRONTEND_URL, ENVIRONMENT
from app.core.dependencies import get_current_user, require_role
from app.api.routes.auth import router as auth_router
from app.api.routes.trip import router as trip_router
from app.api.routes.reports import router as reports_router

logger = logging.getLogger(__name__)


# ── Lifespan: DB init + seed on startup ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run once on cold start: create tables and seed data."""
    from app.seed import run_seed
    try:
        logger.info("[STARTUP] Running database init and seed...")
        run_seed()
        logger.info("[STARTUP] Database ready")
    except Exception as e:
        logger.error("[STARTUP] Seed failed (non-fatal): %s", e)
    yield


app = FastAPI(
    title="TFTMS Backend",
    root_path="/api" if ENVIRONMENT == "production" else "",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────
# Build origins list dynamically from env
_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://tftms.vercel.app",
]
if FRONTEND_URL:
    # Support comma-separated list of origins
    _origins.extend([o.strip() for o in FRONTEND_URL.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(trip_router)
app.include_router(reports_router)


@app.get("/")
def root():
    return {"message": "TFTMS Backend Running"}


@app.get("/me")
def read_me(current_user=Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }


@app.get("/admin-only")
def admin_only(current_user=Depends(require_role(["ADMIN"]))):
    return {"message": "Admin access granted"}


# uvicorn app.main:app --reload
