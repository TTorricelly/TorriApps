import enum

class AppointmentStatus(str, enum.Enum):
    """
    Defines the status of an appointment.
    """
    SCHEDULED = "SCHEDULED"    # Appointment is booked but not yet confirmed.
    CONFIRMED = "CONFIRMED"    # Appointment is confirmed by client or professional.
    IN_PROGRESS = "IN_PROGRESS"  # Appointment is currently in progress.
    COMPLETED = "COMPLETED"      # Appointment has occurred and service was rendered.
    CANCELLED = "CANCELLED"      # Appointment was cancelled by client, professional, or system.
                                 # Specific cancellation reasons or initiator can be logged elsewhere if needed.
    NO_SHOW = "NO_SHOW"          # Client did not show up for the appointment.
    # Potential future statuses: PENDING_CONFIRMATION, RESCHEDULED (if tracking original state is needed)


class AppointmentGroupStatus(str, enum.Enum):
    """
    Defines the status of a group of appointments (multi-service booking).
    """
    SCHEDULED = "SCHEDULED"      # All appointments in group are scheduled
    CONFIRMED = "CONFIRMED"      # All appointments in group are confirmed
    IN_PROGRESS = "IN_PROGRESS"  # At least one appointment in group is in progress
    COMPLETED = "COMPLETED"      # All appointments in group are completed
    CANCELLED = "CANCELLED"      # All appointments in group are cancelled
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"  # Some appointments completed, others not
