from pydantic import BaseModel, EmailStr, Field


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str


class UserResponse(BaseModel):
    user_id: int
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True
