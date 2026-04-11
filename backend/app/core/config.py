import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ─────────────────────────────────────────────────────────────
_raw_db_url = os.getenv(
    "DATABASE_URL",
    "postgresql://harkamalsinghlubana@localhost:5432/tftms"
)

# Neon / Heroku / Railway use postgres:// but SQLAlchemy requires postgresql://
DATABASE_URL = _raw_db_url
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"

# ── Auth / JWT ───────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ── CORS ─────────────────────────────────────────────────────────────────
# Comma-separated list of allowed frontend origins.
# In production, set FRONTEND_URL to your Vercel domain (e.g. https://tftms.vercel.app)
FRONTEND_URL = os.getenv("FRONTEND_URL", "")

# ── Environment ──────────────────────────────────────────────────────────
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
