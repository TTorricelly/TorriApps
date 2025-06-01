import enum

class DayOfWeek(enum.IntEnum):
    """
    Represents the day of the week, consistent with Python's datetime.weekday()
    (Monday=0, Sunday=6).
    """
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6

class AvailabilityBlockType(str, enum.Enum):
    """
    Defines the type of a time block for a professional.
    BLOCKED_SLOT: A specific time range on a given day is blocked.
    DAY_OFF: The entire day is marked as off.
    """
    BLOCKED_SLOT = "BLOCKED_SLOT"
    DAY_OFF = "DAY_OFF"
