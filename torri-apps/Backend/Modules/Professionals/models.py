# This module now imports models from Modules.Availability to avoid duplication
# Use the centralized models from Availability module

from Modules.Availability.models import (
    ProfessionalAvailability,
    ProfessionalBreak,
    ProfessionalBlockedTime
)

from Modules.Availability.constants import (
    DayOfWeek,
    AvailabilityBlockType
)

# Re-export for backward compatibility
__all__ = [
    'ProfessionalAvailability',
    'ProfessionalBreak', 
    'ProfessionalBlockedTime',
    'DayOfWeek',
    'AvailabilityBlockType'
]