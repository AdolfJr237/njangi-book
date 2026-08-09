from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MeetingFrequency, MembershipRole


class CreateGroupRequest(BaseModel):
    name: str = Field(min_length=1)
    contribution_amount: float = Field(gt=0)
    meeting_frequency: MeetingFrequency
    start_date: date


class JoinGroupRequest(BaseModel):
    invite_code: str = Field(min_length=1)


class GroupOut(BaseModel):
    """
    What we hand back after creating a group, or fetching one group's
    own details directly. Notice there's no 'number of members' field
    here -- that was in the Figma mockup's Create Group form, but
    nothing in the real data model tracks a target headcount.
    Membership only grows by people actually joining via invite code, so
    the field didn't correspond to anything real and gets dropped rather
    than faked.
    """

    id: int
    name: str
    contribution_amount: float
    meeting_frequency: MeetingFrequency
    start_date: date
    invite_code: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroupSummary(BaseModel):
    """
    One card's worth of data for the Dashboard's group list. Richer than
    GroupOut: it also carries who's collecting this cycle and when it's
    due, computed from the group's currently open Meeting, plus the
    caller's own role in that specific group (a user can be treasurer in
    one group and an ordinary member in another).
    """

    id: int
    name: str
    contribution_amount: float
    invite_code: str
    collector_name: str | None
    next_due_date: date | None
    my_role: MembershipRole

    model_config = ConfigDict(from_attributes=True)


class GroupHomeOut(BaseModel):
    """
    Powers the Group Home hub. cycle_number is just a count of this
    group's Meeting rows -- every group is "Cycle 1" today since nothing
    advances a cycle yet (that's a later session); this becomes accurate
    on its own once that logic exists, nothing here has to change.

    No welfare balance field on purpose -- Welfare is parked as
    "Coming soon" this session (its backend doesn't exist), and showing
    a number for it here would be exactly the fake-financial-data
    problem this whole pass is trying to remove.
    """

    id: int
    name: str
    contribution_amount: float
    cycle_number: int
    collecting_date: date | None
    collector_name: str | None
    collector_position: int | None
    total_pot_this_cycle: float
    has_paid_this_cycle: bool
    my_role: MembershipRole
