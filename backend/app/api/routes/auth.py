import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import get_db, get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.models.staff import Staff
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import CreateUserRequest, UserResponse


router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)


# 1. REGISTER USER
@router.post("/register", response_model=UserResponse)
def register_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db)
):
    try:
        allowed_roles = {"ADMIN", "MANAGER", "DRIVER", "CONDUCTOR"}
        normalized_role = payload.role.strip().upper()
        full_name = payload.full_name.strip()

        if normalized_role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        if not full_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="full_name is required")

        # Check if email already exists
        existing_user = db.query(User).filter(User.email == payload.email).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        new_user = User(
            email=payload.email,
            full_name=full_name,
            password_hash=hash_password(payload.password),
            role=normalized_role,
            is_active=True
        )

        db.add(new_user)
        db.flush()

        if normalized_role in {"DRIVER", "CONDUCTOR"}:
            db.add(
                Staff(
                    user_id=new_user.user_id,
                    full_name=full_name,
                    staff_type=normalized_role,
                    is_active=True,
                )
            )

        db.commit()
        db.refresh(new_user)

        return new_user
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    except Exception as e:
        db.rollback()
        logger.exception("Failed to register user: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# 2. LOGIN USER
@router.post("/login", response_model=TokenResponse)
def login_user(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    access_token = create_access_token(
        data={
            "sub": str(user.user_id),
            "role": user.role
        }
    )

    return TokenResponse(access_token=access_token)


# 3. LIST USERS (Admin Only)
@router.get("/users")
def list_users(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    total = db.query(User).count()
    users = (
        db.query(User)
        .order_by(User.user_id)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "total": total,
        "data": [
            {
                "user_id": u.user_id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
            }
            for u in users
        ],
    }


# 4. UPDATE USER (Admin Only)
@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed_roles = {"ADMIN", "MANAGER", "DRIVER", "CONDUCTOR"}

    if "role" in payload:
        role = payload["role"].strip().upper()
        if role not in allowed_roles:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = role

    if "full_name" in payload:
        full_name = str(payload["full_name"]).strip()
        if not full_name:
            raise HTTPException(status_code=400, detail="full_name cannot be empty")
        user.full_name = full_name

    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])

    if user.role in {"DRIVER", "CONDUCTOR"}:
        staff = db.query(Staff).filter(Staff.user_id == user.user_id).first()
        if staff:
            staff.full_name = user.full_name
            staff.staff_type = user.role
            staff.is_active = user.is_active
        else:
            db.add(
                Staff(
                    user_id=user.user_id,
                    full_name=user.full_name,
                    staff_type=user.role,
                    is_active=user.is_active,
                )
            )

    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        logger.exception("Failed to update user %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Internal server error")

    return {
        "success": True,
        "data": {
            "user_id": user.user_id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
        },
    }
