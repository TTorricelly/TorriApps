import enum
from datetime import time

class DayOfWeek(str, enum.Enum):
    """
    Represents the day of the week as string values matching the database enum.
    Using lowercase to match database schema.
    """
    MONDAY = "monday"
    TUESDAY = "tuesday" 
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class AvailabilityBlockType(str, enum.Enum):
    """
    Represents the type of blocked time/unavailability.
    Matches database enum: enum('break','vacation','sick_leave','other')
    """
    BREAK = "break"           # Short break (coffee, bathroom, etc.)
    VACATION = "vacation"     # Vacation days
    SICK_LEAVE = "sick_leave" # Sick leave
    OTHER = "other"           # Any other type of unavailability

# Common time constants (optional, for convenience)
BUSINESS_START_TIME = time(9, 0)   # 9:00 AM
BUSINESS_END_TIME = time(18, 0)    # 6:00 PM
LUNCH_START_TIME = time(12, 0)     # 12:00 PM
LUNCH_END_TIME = time(13, 0)       # 1:00 PM
