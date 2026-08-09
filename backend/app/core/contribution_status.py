from sqlalchemy.orm import Session

from app.models.contribution import Contribution


def filter_active(contributions: list[Contribution]) -> list[Contribution]:
    """
    From a list of Contribution rows, returns only the ones that
    currently count toward a pot total, a paid/owing status, or an
    outstanding balance.

    This is the ONE place that defines "does this contribution still
    count." Every screen that shows a pot, a paid status, a
    ready-to-close flag, or an outstanding list must build its numbers
    from this, not from a raw query -- a reversal never deletes or
    edits the original row, so anything that queries Contribution rows
    directly will still see a reversed payment sitting right there
    unless it explicitly excludes it.

    Two kinds of row get excluded:
    - A reversal row itself (is_reversal=True) -- it's a correction
      marker, not a new payment, so it should never make anyone look
      "paid."
    - Any original row that a reversal points back at (found by
      checking whether another row in this same list has
      reverses_contribution_id == this row's id). The original is
      never touched, so it has to be filtered out here every time,
      not just once.

    Requires the reversal row(s) to be present in the input list
    alongside their originals -- every caller here queries by
    meeting_id or payer_membership_id, and a reversal always carries
    the same meeting_id and payer_membership_id as what it reverses,
    so that's guaranteed by construction, not by luck.
    """
    reversed_ids = {c.reverses_contribution_id for c in contributions if c.reverses_contribution_id is not None}
    return [c for c in contributions if not c.is_reversal and c.id not in reversed_ids]


def get_active_contributions_for_meetings(db: Session, meeting_ids: list[int]) -> list[Contribution]:
    if not meeting_ids:
        return []
    all_rows = db.query(Contribution).filter(Contribution.meeting_id.in_(meeting_ids)).all()
    return filter_active(all_rows)
