import enum

class AppointmentStatus(str, enum.Enum):
    """
    Defines the status of an appointment.
    """
    SCHEDULED = "SCHEDULED"    # Appointment is booked and confirmed.
    CANCELLED = "CANCELLED"      # Appointment was cancelled by client, professional, or system.
                                 # Specific cancellation reasons or initiator can be logged elsewhere if needed.
    COMPLETED = "COMPLETED"      # Appointment has occurred and service was rendered.
    NOSHOW = "NOSHOW"            # Client did not show up for the appointment.
    # Potential future statuses: PENDING_CONFIRMATION, RESCHEDULED (if tracking original state is needed)
