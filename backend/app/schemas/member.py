from pydantic import BaseModel

from app.models.enums import MeetingFrequency, MembershipRole


class MemberRow(BaseModel):
    membership_id: int
    name: str
    phone_number: str
    role: MembershipRole
    rotation_position: int | None
    # Lets the frontend hide/disable "Remove" on the caller's own row
    # without having to compare ids itself.
    is_self: bool


class MembersListOut(BaseModel):
    member_count: int
    contribution_amount: float
    meeting_frequency: MeetingFrequency
    members: list[MemberRow]
    # The caller's own role in THIS group -- gates whether the "Remove"
    # action shows at all (treasurer-only, enforced again on the backend
    # by the DELETE route itself, not just hidden in the UI).
    my_role: MembershipRole


class TransferTreasurerRequest(BaseModel):
    successor_membership_id: int


class TransferTreasurerResult(BaseModel):
    new_treasurer_name: str
    former_treasurer_name: str
