from datetime import date
from typing import Literal

from pydantic import BaseModel


class RotationMemberStatus(BaseModel):
    membership_id: int
    name: str
    rotation_position: int | None
    status: Literal["done", "current", "pending"]
    collected_date: date | None


class RotationScheduleOut(BaseModel):
    cycle_number: int
    round_number: int
    member_count: int
    pot_amount: float
    members: list[RotationMemberStatus]
