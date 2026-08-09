from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import MembershipRole


class RecordContributionRequest(BaseModel):
    """
    Only the payer (and optionally which meeting) are client-supplied --
    amount, paid_date, and recorded_by are all set by the backend
    (Security doc: recorded_by and timestamps come from the
    authenticated user, never the client).

    meeting_id defaults to the group's current open meeting when
    omitted, which is exactly today's behavior. Passing a PAST meeting's
    id is how a late settlement gets recorded -- adding the
    previously-missing Contribution row rather than editing anything,
    which is why this is safe against a closed meeting's record even
    though CLAUDE.md says records are never edited: nothing here edits
    the meeting, it only adds a row that was always allowed to exist.
    """

    payer_membership_id: int
    meeting_id: int | None = None


class ContributionOut(BaseModel):
    id: int
    payer_membership_id: int
    amount: float
    paid_date: date
    recorded_by_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LedgerMemberStatus(BaseModel):
    """One row in the Contributions Ledger -- one per group member,
    showing whether they've paid for the currently open meeting."""

    membership_id: int
    name: str
    has_paid: bool
    paid_date: date | None
    amount: float | None
    # The specific Contribution row backing has_paid, if any -- lets the
    # frontend target the exact row to reverse without a second lookup.
    # None when has_paid is False (nothing to reverse yet).
    contribution_id: int | None


class ReversalEntry(BaseModel):
    """
    One correction that happened in this meeting -- shown as its own
    list, separate from the per-member grid above, so a reversal reads
    as "recorded, then corrected" rather than the member row just
    quietly changing. The member grid above already reflects the
    CURRENT (post-correction) truth; this list is what makes the
    correction itself visible, per full-ledger transparency.
    """

    original_contribution_id: int
    member_name: str
    amount: float
    original_paid_date: date
    reversed_by_name: str
    reversed_at: datetime
    reason: str | None


class ContributionsLedgerOut(BaseModel):
    meeting_id: int | None
    meeting_date: date | None
    round_number: int
    # False when browsing a past (COMPLETED) cycle via ?meeting_id= --
    # the frontend uses this to hide the Record Contribution FAB and the
    # Close Cycle prompt on a read-only historical view.
    is_current_cycle: bool
    contribution_amount: float
    total_expected: float
    total_collected: float
    paid_count: int
    member_count: int
    # Server-computed, not left for the app to infer from paid_count ==
    # member_count -- CLAUDE.md: the app displays state, it never
    # computes ledger truth locally. Only ever true on the current cycle.
    ready_to_close: bool
    members: list[LedgerMemberStatus]
    # Every correction that happened in THIS meeting, oldest first.
    reversals: list[ReversalEntry]
    # The caller's own role in THIS group -- a user can be treasurer in
    # one njangi and an ordinary member in another, so the frontend
    # can't gate the "Record Contribution" FAB on any global flag; it
    # has to come from this group's own data.
    my_role: MembershipRole


class MeetingSummary(BaseModel):
    """One entry in a group's cycle history -- powers the Ledger's
    cycle picker. Excludes VOIDED meetings; an accidental close that
    got undone was never a real cycle."""

    id: int
    cycle_number: int
    round_number: int
    meeting_date: date
    status: str


class MyContributionEntry(BaseModel):
    """One past payment of the CALLER'S OWN, never another member's --
    this is the personal history view, distinct from the full Ledger."""

    id: int
    cycle_number: int
    meeting_date: date
    amount: float
    paid_date: date
    recorded_by_name: str
    # True only on a correcting entry itself -- lets the frontend show
    # it distinctly (e.g. "Reversal") rather than as an ordinary payment.
    is_reversal: bool
    # True on an ORIGINAL entry that has since been reversed -- the row
    # still shows in history (never removed), just visibly struck
    # through/labeled so it's clear it no longer counts.
    reversed: bool


class OutstandingEntry(BaseModel):
    """One specific cycle the caller hasn't paid -- either the current
    open meeting, or a past closed one they never settled. Always tied
    to its own meeting, never folded into an untraceable lump sum."""

    meeting_id: int
    cycle_number: int
    round_number: int
    meeting_date: date
    amount: float


class ReverseContributionRequest(BaseModel):
    reason: str | None = None


class ReverseContributionResult(BaseModel):
    reversal_contribution_id: int
    member_name: str
    amount: float


class MyContributionsOut(BaseModel):
    payments_count: int
    total_paid: float
    # Sum of `outstanding` below -- every cycle since the caller joined
    # this group where they have no Contribution row, current or past.
    outstanding_amount: float
    outstanding: list[OutstandingEntry]
    history: list[MyContributionEntry]
    # The VIEWER's own role in this group, not the target member's --
    # gates whether "Record now" shows on Member Detail's outstanding
    # list. Same reasoning as ContributionsLedgerOut.my_role.
    my_role: MembershipRole
