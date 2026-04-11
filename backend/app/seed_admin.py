"""
Seed the admin user for TFTMS.

Usage (from backend/ directory):
    python -m app.seed_admin

Or with explicit DB URL:
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tftms python -m app.seed_admin

This uses the same passlib bcrypt hashing as the backend,
guaranteeing login compatibility.
"""

import sys
import os

# Ensure the backend app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password


ADMIN_EMAIL = "hssinghlubana11@gmail.com"
ADMIN_PASSWORD = "Admin@321"
ADMIN_FULL_NAME = "System Administrator"
ADMIN_ROLE = "ADMIN"


def seed_admin():
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"[SEED] Admin user already exists: {ADMIN_EMAIL} (user_id={existing.user_id})")
            return

        admin = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_FULL_NAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role=ADMIN_ROLE,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"[SEED] Admin user created: {ADMIN_EMAIL} (user_id={admin.user_id})")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Failed to create admin: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
