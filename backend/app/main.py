from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.dependencies import get_current_user, require_role
from app.api.routes.auth import router as auth_router
from app.api.routes.trip import router as trip_router
from app.api.routes.reports import router as reports_router

app = FastAPI(title="TFTMS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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

