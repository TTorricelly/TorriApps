# Refactored Appointments Services Module
# This module serves as a backward-compatible entry point that imports and re-exports
# functions from the specialized service modules.

# Import utility functions from specialized modules
from .appointment_utils import (
    calculate_end_time as _calculate_end_time
    # get_tenant_block_size as _get_tenant_block_size # Removed as function was deleted
)

# Import availability functions
from .availability_service import (
    get_daily_time_slots_for_professional,
    get_service_availability_for_professional,
    find_contiguous_available_slots as _find_contiguous_available_slots
)

# Import CRUD functions
from .appointment_crud import (
    validate_and_get_appointment_dependencies as _validate_and_get_appointment_dependencies,
    create_appointment,
    get_appointments,
    get_appointment_by_id
)

# Import modification functions
from .appointment_modifications import (
    get_appointment_for_modification as _get_appointment_for_modification,
    cancel_appointment,
    reschedule_appointment,
    complete_appointment,
    mark_appointment_as_no_show,
    update_appointment_details,
    update_appointment_with_multiple_services
)

# Import schedule functions
from .schedule_service import (
    get_daily_schedule_data
)

# Import wizard functions
from .wizard_service import (
    get_available_professionals_for_wizard,
    get_multi_service_availability,
    create_multi_service_booking,
    get_available_dates_for_services
)

# Re-export all functions for backward compatibility
__all__ = [
    # Utility functions (private)
    '_calculate_end_time',
    # '_get_tenant_block_size', # Removed
    '_validate_and_get_appointment_dependencies',
    '_get_appointment_for_modification', 
    '_find_contiguous_available_slots',
    
    # Public API functions
    'get_daily_time_slots_for_professional',
    'get_service_availability_for_professional',
    'create_appointment',
    'get_appointments',
    'get_appointment_by_id',
    'cancel_appointment',
    'reschedule_appointment',
    'complete_appointment',
    'mark_appointment_as_no_show',
    'update_appointment_details',
    'update_appointment_with_multiple_services',
    'get_daily_schedule_data',
    
    # Wizard functions
    'get_available_professionals_for_wizard',
    'get_multi_service_availability',
    'create_multi_service_booking',
    'get_available_dates_for_services'
]
