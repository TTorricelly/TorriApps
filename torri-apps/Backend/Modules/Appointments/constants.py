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
