from pydantic import BaseModel, EmailStr, Field


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str
    full_name: str = Field(min_length=1, max_length=255)


class UserResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True
