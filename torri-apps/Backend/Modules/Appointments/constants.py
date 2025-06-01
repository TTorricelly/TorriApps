import enum

class AppointmentStatus(str, enum.Enum):
    """
    Defines the status of an appointment.
    """
    SCHEDULED = "SCHEDULED"    # Appointment is booked and confirmed.
    CANCELLED_BY_CLIENT = "CANCELLED_BY_CLIENT" # Cancelled by the client.
    CANCELLED_BY_PROFESSIONAL = "CANCELLED_BY_PROFESSIONAL" # Cancelled by the professional or salon.
    CANCELLED_BY_SYSTEM = "CANCELLED_BY_SYSTEM" # Cancelled automatically by the system (e.g., due to no-show policy or professional unavailability).
    COMPLETED = "COMPLETED"      # Appointment has occurred and service was rendered.
    NOSHOW = "NOSHOW"            # Client did not show up for the appointment.
    # Could add other statuses like PENDING_CONFIRMATION, RESCHEDULED, etc. if needed.
