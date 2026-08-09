from datetime import date

from pydantic import BaseModel


class CloseCycleResult(BaseModel):
    previous_meeting_date: date
    new_meeting_date: date
    new_collector_name: str
    started_new_round: bool
    round_number: int
    # Named explicitly, not folded into a count -- the treasurer should
    # see exactly who is carrying forward an unpaid contribution, not a
    # vague number.
    unpaid_member_names: list[str]


class ReopenCycleResult(BaseModel):
    reopened_meeting_date: date
    collector_name: str | None
