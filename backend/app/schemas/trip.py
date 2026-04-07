from pydantic import BaseModel
from datetime import date


class TripResponse(BaseModel):
    trip_id: int
    status: str
    trip_date: date | None

    class Config:
        from_attributes = True
