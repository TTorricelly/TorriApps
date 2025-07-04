import enum

class AppointmentStatus(str, enum.Enum):
    """
    Defines the status of an appointment.
    """
    SCHEDULED = "SCHEDULED"      # Appointment is booked but not yet confirmed.
    CONFIRMED = "CONFIRMED"      # Appointment is confirmed by client or professional.
    WALK_IN = "WALK_IN"          # Walk-in client, no prior appointment.
    ARRIVED = "ARRIVED"          # Client has arrived at the salon.
    IN_SERVICE = "IN_SERVICE"    # Appointment is currently in progress (renamed from IN_PROGRESS).
    READY_TO_PAY = "READY_TO_PAY"  # Service completed, ready for payment.
    COMPLETED = "COMPLETED"      # Appointment has occurred and payment processed.
    CANCELLED = "CANCELLED"      # Appointment was cancelled by client, professional, or system.
                                 # Specific cancellation reasons or initiator can be logged elsewhere if needed.
    NO_SHOW = "NO_SHOW"          # Client did not show up for the appointment.
    
    # Deprecated - keeping for backward compatibility during migration
    IN_PROGRESS = "IN_SERVICE"   # Legacy status, maps to IN_SERVICE


class AppointmentGroupStatus(str, enum.Enum):
    """
    Defines the status of a group of appointments (multi-service booking).
    """
    SCHEDULED = "SCHEDULED"      # All appointments in group are scheduled
    CONFIRMED = "CONFIRMED"      # All appointments in group are confirmed
    WALK_IN = "WALK_IN"          # Walk-in booking group
    ARRIVED = "ARRIVED"          # Client has arrived for appointments in group
    IN_SERVICE = "IN_SERVICE"    # At least one appointment in group is in service
    READY_TO_PAY = "READY_TO_PAY"  # All services completed, ready for payment
    COMPLETED = "COMPLETED"      # All appointments in group are completed
    CANCELLED = "CANCELLED"      # All appointments in group are cancelled
    NO_SHOW = "NO_SHOW"  # Client did not show up for appointments in group
    
    # Deprecated - keeping for backward compatibility during migration
    IN_PROGRESS = "IN_SERVICE"   # Legacy status, maps to IN_SERVICE
