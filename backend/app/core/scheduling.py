import calendar
from datetime import date, timedelta

from app.models.enums import MeetingFrequency


def advance_date_by_frequency(base_date: date, frequency: MeetingFrequency) -> date:
    """
    Moves a date forward by one meeting cycle. Two-day, weekly, and biweekly
    schedules use exact day counts; monthly clamps the day-of-month to whatever the target
    month actually has (e.g. 31 Jan + 1 month -> 28/29 Feb, not an
    overflow into March), matching how people actually mean "a month
    from now" on a calendar.
    """
    if frequency == MeetingFrequency.EVERY_TWO_DAYS:
        return base_date + timedelta(days=2)
    if frequency == MeetingFrequency.WEEKLY:
        return base_date + timedelta(days=7)
    if frequency == MeetingFrequency.BIWEEKLY:
        return base_date + timedelta(days=14)

    month = base_date.month + 1
    year = base_date.year + (month - 1) // 12
    month = ((month - 1) % 12) + 1
    last_day_of_target_month = calendar.monthrange(year, month)[1]
    day = min(base_date.day, last_day_of_target_month)
    return date(year, month, day)
