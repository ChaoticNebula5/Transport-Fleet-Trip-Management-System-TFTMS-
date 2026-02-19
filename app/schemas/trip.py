from pydantic import BaseModel
from datetime import datetime


class TripResponse(BaseModel):
    trip_id: int
    status: str
    trip_date: datetime | None

    class Config:
        from_attributes = True
