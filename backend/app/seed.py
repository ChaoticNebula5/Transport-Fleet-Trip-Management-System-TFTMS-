"""
Idempotent database seeder for TFTMS.

Ports ALL data from backend/sql/seed.sql into Python so that:
1. Tables are created via SQLAlchemy's create_all() if they don't exist
2. Seed data is inserted only if missing (ON CONFLICT DO NOTHING equivalent)
3. Works with any PostgreSQL provider (Neon, Supabase, local Docker)
4. Uses Python bcrypt for password hashing (compatible with pgcrypto's bcrypt)

Called automatically on FastAPI startup via the lifespan hook.
"""

import logging
import os
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import engine
from app.db.base import Base
from app.models import (
    User, Staff, Vehicle, Route,
)  # importing models registers them with Base.metadata
from app.core.security import hash_password

logger = logging.getLogger(__name__)


# ── Seed Data ────────────────────────────────────────────────────────────

SEED_USERS = [
    {
        "email": "hssinghlubana11@gmail.com",
        "full_name": "System Administrator",
        "password": "Admin@321",
        "role": "ADMIN",
    },
    {
        "email": "driver1@tftms.local",
        "full_name": "Arjun Mehta",
        "password": "Driver@123",
        "role": "DRIVER",
    },
    {
        "email": "driver2@tftms.local",
        "full_name": "Ravi Kumar",
        "password": "Driver@123",
        "role": "DRIVER",
    },
    {
        "email": "driver3@tftms.local",
        "full_name": "Vikram Singh",
        "password": "Driver@123",
        "role": "DRIVER",
    },
    {
        "email": "driver4@tftms.local",
        "full_name": "Aman Gill",
        "password": "Driver@123",
        "role": "DRIVER",
    },
    {
        "email": "conductor1@tftms.local",
        "full_name": "Neha Sharma",
        "password": "Conductor@123",
        "role": "CONDUCTOR",
    },
    {
        "email": "conductor2@tftms.local",
        "full_name": "Pooja Verma",
        "password": "Conductor@123",
        "role": "CONDUCTOR",
    },
    {
        "email": "conductor3@tftms.local",
        "full_name": "Rahul Bansal",
        "password": "Conductor@123",
        "role": "CONDUCTOR",
    },
]

SEED_ROUTES = [
    {
        "route_code": "R-100",
        "route_name": "Central City Loop",
        "start_point": "Central Depot",
        "end_point": "City Center",
    },
    {
        "route_code": "R-200",
        "route_name": "North Connector",
        "start_point": "Central Depot",
        "end_point": "North Terminal",
    },
    {
        "route_code": "R-300",
        "route_name": "Airport Shuttle",
        "start_point": "City Center",
        "end_point": "Airport Terminal",
    },
    {
        "route_code": "R-400",
        "route_name": "Industrial Belt Express",
        "start_point": "Central Depot",
        "end_point": "Industrial Zone",
    },
    {
        "route_code": "R-500",
        "route_name": "University Circular",
        "start_point": "University Campus",
        "end_point": "Central Depot",
    },
]

SEED_VEHICLES = [
    {
        "registration_no": "PB10-FT-1021",
        "capacity": 42,
        "model": "Tata Starbus",
        "status": "ACTIVE",
    },
    {
        "registration_no": "PB10-FT-1132",
        "capacity": 38,
        "model": "Ashok Leyland Cheetah",
        "status": "ACTIVE",
    },
    {
        "registration_no": "PB10-FT-1243",
        "capacity": 40,
        "model": "Eicher Skyline",
        "status": "ACTIVE",
    },
    {
        "registration_no": "PB10-FT-1354",
        "capacity": 45,
        "model": "Volvo 9600",
        "status": "ACTIVE",
    },
    {
        "registration_no": "PB10-FT-1465",
        "capacity": 36,
        "model": "Force Traveller",
        "status": "ACTIVE",
    },
]

# Staff records for drivers/conductors — keyed by user email
SEED_STAFF = [
    {
        "user_email": "driver1@tftms.local",
        "phone": "+91-9000000001",
        "staff_type": "DRIVER",
        "license_no": "DL-DR-1001",
    },
    {
        "user_email": "driver2@tftms.local",
        "phone": "+91-9000000002",
        "staff_type": "DRIVER",
        "license_no": "DL-DR-1002",
    },
    {
        "user_email": "driver3@tftms.local",
        "phone": "+91-9000000004",
        "staff_type": "DRIVER",
        "license_no": "DL-DR-1004",
    },
    {
        "user_email": "driver4@tftms.local",
        "phone": "+91-9000000005",
        "staff_type": "DRIVER",
        "license_no": "DL-DR-1005",
    },
    {
        "user_email": "conductor1@tftms.local",
        "phone": "+91-9000000003",
        "staff_type": "CONDUCTOR",
        "license_no": None,
    },
    {
        "user_email": "conductor2@tftms.local",
        "phone": "+91-9000000006",
        "staff_type": "CONDUCTOR",
        "license_no": None,
    },
    {
        "user_email": "conductor3@tftms.local",
        "phone": "+91-9000000007",
        "staff_type": "CONDUCTOR",
        "license_no": None,
    },
]


# ── Seed Functions ───────────────────────────────────────────────────────


def _seed_users(db: Session) -> None:
    """Insert seed users if they don't already exist."""
    for u in SEED_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            continue
        db.add(
            User(
                email=u["email"],
                full_name=u["full_name"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                is_active=True,
            )
        )
    db.flush()
    logger.info("[SEED] Users seeded")


def _seed_routes(db: Session) -> None:
    """Insert seed routes if they don't already exist."""
    for r in SEED_ROUTES:
        existing = db.query(Route).filter(Route.route_code == r["route_code"]).first()
        if existing:
            continue
        db.add(
            Route(
                route_code=r["route_code"],
                route_name=r["route_name"],
                start_point=r["start_point"],
                end_point=r["end_point"],
            )
        )
    db.flush()
    logger.info("[SEED] Routes seeded")


def _seed_vehicles(db: Session) -> None:
    """Insert seed vehicles if they don't already exist."""
    for v in SEED_VEHICLES:
        existing = (
            db.query(Vehicle)
            .filter(Vehicle.registration_no == v["registration_no"])
            .first()
        )
        if existing:
            continue
        db.add(
            Vehicle(
                registration_no=v["registration_no"],
                capacity=v["capacity"],
                model=v["model"],
                status=v["status"],
            )
        )
    db.flush()
    logger.info("[SEED] Vehicles seeded")


def _seed_staff(db: Session) -> None:
    """Insert staff records linked to seed users."""
    for s in SEED_STAFF:
        user = db.query(User).filter(User.email == s["user_email"]).first()
        if not user:
            logger.warning("[SEED] User %s not found, skipping staff", s["user_email"])
            continue
        existing = db.query(Staff).filter(Staff.user_id == user.user_id).first()
        if existing:
            continue
        db.add(
            Staff(
                user_id=user.user_id,
                full_name=user.full_name,
                phone=s["phone"],
                staff_type=s["staff_type"],
                license_no=s["license_no"],
                is_active=True,
            )
        )
    db.flush()
    logger.info("[SEED] Staff records seeded")


def _create_sql_objects(db: Session) -> None:
    """Create SQL views, procedures, and triggers if they don't exist.
    
    These are defined in backend/sql/*.sql and need to exist in the DB
    for the reports API to work. We use CREATE OR REPLACE so repeated
    calls are safe.
    """
    sql_dir = os.path.join(os.path.dirname(__file__), "..", "sql")
    
    for filename in ["views.sql", "procedures.sql", "triggers.sql"]:
        filepath = os.path.join(sql_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                sql_content = f.read()
            # Execute each statement separately (split on semicolons)
            for statement in sql_content.split(";"):
                stmt = statement.strip()
                if stmt and not stmt.startswith("--"):
                    try:
                        db.execute(text(stmt))
                    except Exception as e:
                        logger.warning("[SEED] SQL object warning (%s): %s", filename, e)
            logger.info("[SEED] Applied %s", filename)
    
    db.flush()




def run_seed() -> None:
    """
    Master seed function — called once on app startup.
    
    1. Creates all tables via SQLAlchemy metadata (idempotent — skips existing)
    2. Inserts seed users, routes, vehicles, and staff (idempotent — checks before insert)
    3. Creates SQL views/procedures/triggers for reports
    
    Safe to call on every cold start. Existing data is never touched.
    """
    from app.db.session import SessionLocal

    # Step 1: Create tables from SQLAlchemy models
    logger.info("[SEED] Creating tables if not exist...")
    Base.metadata.create_all(bind=engine)
    logger.info("[SEED] Tables ready")

    # Step 2: Seed data
    db = SessionLocal()
    try:
        _seed_users(db)
        _seed_routes(db)
        _seed_vehicles(db)
        _seed_staff(db)
        _create_sql_objects(db)
        db.commit()
        logger.info("[SEED] All seed data committed successfully")
    except Exception as e:
        db.rollback()
        logger.error("[SEED] Seeding failed: %s", e)
        raise
    finally:
        db.close()
