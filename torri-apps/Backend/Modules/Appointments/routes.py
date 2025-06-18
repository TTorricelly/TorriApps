from typing import List, Optional, Annotated
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, get_current_user_from_db, require_role
from Core.Auth.models import User
from Core.Auth.constants import UserRole
from Core.Security.jwt import TokenPayload

from . import services as appointments_services # Alias
from .schemas import (
    AppointmentSchema, AppointmentCreate,
    ProfessionalDailyAvailabilityResponse, AvailabilityRequest,
    DailyServiceAvailabilityResponse,
    AppointmentUpdate, # For future generic update, if needed
    AppointmentReschedulePayload, AppointmentCancelPayload, # New schemas for specific actions
    DailyScheduleResponseSchema # New schema for the daily schedule endpoint
)
from .constants import AppointmentStatus

# Models are not directly used in routes but good for context if needed
# from .models import Appointment
# from Modules.Availability.models import ...

router = APIRouter(
    # No prefix here, will be added in main.py (e.g., /api/v1/appointments)
    # However, the subtask suggests /api/v1/appointments as prefix in main.py,
    # so routes here should be relative to that.
    tags=["Appointments and Availability (Tenant)"]
)

# --- Daily Schedule Endpoint ---
@router.get(
    "/daily-schedule/{schedule_date}",
    response_model=DailyScheduleResponseSchema,
    summary="Get the daily schedule for all professionals, including appointments and blocked times."
)
def get_daily_schedule_endpoint(
    schedule_date: date = Path(..., description="The target date for the schedule (YYYY-MM-DD)."),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission: Any authenticated user can view this.
    # Service layer handles fetching data.
    daily_schedule_data = appointments_services.get_daily_schedule_data(
        db=db,
        schedule_date=schedule_date
        # tenant_id=requesting_user.tenant_id # Argument removed
    )
    if not daily_schedule_data.professionals_schedule:
        # Depending on desired behavior, either return 200 with empty list or 404.
        # For a schedule, 200 with empty is often preferred if the date is valid but no one is scheduled.
        # However, if it implies "no tenant data for this day", 404 could be an option.
        # Let's stick to 200 with empty list as per current service logic.
        pass # Service returns it as is.

    return daily_schedule_data


# --- Availability Endpoints ---
@router.get(
    "/professional/{professional_id}/availability",
    response_model=ProfessionalDailyAvailabilityResponse,
    summary="Get daily availability slots for a professional on a specific date."
)
def get_professional_daily_availability_endpoint(
    professional_id: UUID = Path(..., description="ID of the professional."),
    target_date: date = Query(..., description="The target date for availability (YYYY-MM-DD).", alias="date"),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission: Any authenticated user can view this.
    # Service layer should validate professional_id exists.
    # A quick check here:
    prof_check = db.query(User.id).filter(User.id == professional_id).first() # Removed tenant_id check
    if not prof_check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found.") # Updated detail

    return appointments_services.get_daily_time_slots_for_professional(
        db=db,
        professional_id=professional_id,
        target_date=target_date
        # tenant_id=requesting_user.tenant_id # Argument removed
    )

@router.post(
    "/services/availability", # Path relative to the router's prefix in main.py
    response_model=List[ProfessionalDailyAvailabilityResponse], # Placeholder, could be List[DailyServiceAvailabilityResponse]
    summary="Get available time slots for a specific service by a professional for a given month."
)
def get_service_availability_for_professional_endpoint(
    availability_request: AvailabilityRequest = Body(...),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission: Any authenticated user can view this.
    # Service layer should validate professional_id and service_id exist.
    prof_check = db.query(User.id).filter(User.id == availability_request.professional_id).first() # Removed tenant_id check
    if not prof_check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found.") # Updated detail

    # The service function is currently a placeholder and returns simplified data.
    return appointments_services.get_service_availability_for_professional(
        db=db,
        req=availability_request
        # tenant_id=requesting_user.tenant_id # Argument removed
    )

# --- Appointment Booking Endpoint ---
@router.post(
    "", # Relative to /api/v1/appointments, so this is POST /api/v1/appointments
    response_model=AppointmentSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new appointment."
)
def create_new_appointment_endpoint(
    appointment_data: AppointmentCreate,
    requesting_user: Annotated[User, Depends(get_current_user_tenant)], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)]
):
    # The service `create_appointment` handles permission logic:
    # - Client can book for self (requesting_user.id == appointment_data.client_id)
    # - Gestor/Atendente can book for any client.
    # It also validates that all IDs (client, professional, service) exist.

    # tenant_id is no longer passed to the service.
    created_appointment = appointments_services.create_appointment(
        db=db,
        appointment_data=appointment_data,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user
    )
    return created_appointment


# --- Appointment Listing and Retrieval Endpoints ---
@router.get(
    "", # Relative to /api/v1/appointments, so this is GET /api/v1/appointments
    response_model=List[AppointmentSchema],
    summary="List appointments based on filters and user role." # Updated summary
)
def list_appointments_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_tenant)], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)],
    professional_id: Optional[UUID] = Query(None, description="Filter by professional ID."),
    client_id: Optional[UUID] = Query(None, description="Filter by client ID."),
    date_from: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)."),
    date_to: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)."),
    status: Optional[AppointmentStatus] = Query(None, description="Filter by appointment status."),
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return.")
):
    # The service function get_appointments handles role-based filtering internally.
    appointments = appointments_services.get_appointments(
        db=db,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user,
        professional_id=professional_id,
        client_id=client_id,
        date_from=date_from,
        date_to=date_to,
        status=status,
        skip=skip,
        limit=limit
    )
    return appointments

@router.get(
    "/{appointment_id}",
    response_model=AppointmentSchema,
    summary="Get a specific appointment by its ID."
)
def get_appointment_by_id_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_tenant)], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to retrieve.")
):
    appointment = appointments_services.get_appointment_by_id(
        db=db,
        appointment_id=appointment_id,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user
    )
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found or access denied.")
    return appointment


# --- Appointment Modification Endpoints ---
@router.patch(
    "/{appointment_id}/cancel",
    response_model=AppointmentSchema,
    summary="Cancel an appointment."
)
def cancel_appointment_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_tenant)], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to cancel."),
    payload: Optional[AppointmentCancelPayload] = Body(None, description="Optional reason for cancellation.")
):
    reason = payload.reason if payload else None
    updated_appointment = appointments_services.cancel_appointment(
        db=db,
        appointment_id=appointment_id,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user,
        reason=reason
    )
    return updated_appointment

@router.patch(
    "/{appointment_id}/reschedule",
    response_model=AppointmentSchema,
    summary="Reschedule an appointment."
)
def reschedule_appointment_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_tenant)], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)],
    payload: AppointmentReschedulePayload = Body(...),
    appointment_id: UUID = Path(..., description="ID of the appointment to reschedule.")
):
    updated_appointment = appointments_services.reschedule_appointment(
        db=db,
        appointment_id=appointment_id,
        new_date=payload.new_date,
        new_start_time=payload.new_start_time,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user,
        reason=payload.reason
    )
    return updated_appointment

@router.patch(
    "/{appointment_id}/complete",
    response_model=AppointmentSchema,
    summary="Mark an appointment as completed."
)
def complete_appointment_endpoint(
    # This dependency ensures only specified roles can attempt this. Service layer does finer checks.
    requesting_user: Annotated[User, Depends(require_role([UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]))], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to mark as completed.")
):
    updated_appointment = appointments_services.complete_appointment(
        db=db,
        appointment_id=appointment_id,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user
    )
    return updated_appointment

@router.patch(
    "/{appointment_id}/no-show",
    response_model=AppointmentSchema,
    summary="Mark an appointment as No Show."
)
def mark_appointment_as_no_show_endpoint(
    requesting_user: Annotated[User, Depends(require_role([UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]))], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to mark as No Show.")
):
    updated_appointment = appointments_services.mark_appointment_as_no_show(
        db=db,
        appointment_id=appointment_id,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user
    )
    return updated_appointment


@router.put(
    "/{appointment_id}",
    response_model=AppointmentSchema,
    summary="Update appointment details (e.g., notes, client info, time, services)."
)
def update_appointment_details_endpoint(
    appointment_id: UUID,
    update_data: AppointmentUpdate,
    requesting_user: Annotated[User, Depends(get_current_user_from_db)], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)]
):
    # Call the generic update service
    updated_appointment = appointments_services.update_appointment_details(
        db, appointment_id, update_data, requesting_user # tenant_id argument removed
    )
    if not updated_appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found or update failed.")
    return updated_appointment


@router.put(
    "/{appointment_id}/multiple-services",
    response_model=List[AppointmentSchema],
    summary="Update appointment with multiple services (creates one appointment per service)."
)
def update_appointment_multiple_services_endpoint(
    appointment_id: UUID,
    requesting_user: Annotated[User, Depends(get_current_user_from_db)], # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)],
    update_data: dict = Body(..., description="Update data including services array")
):
    """
    Update appointment to handle multiple services.
    Each service will get its own appointment record.
    
    Expected update_data format:
    {
        "services": ["Service Name 1", "Service Name 2"],
        "client_id": "uuid",
        "professional_id": "uuid", 
        "appointment_date": "2024-01-15",
        "start_time": "10:00",
        "notes_by_client": "notes"
    }
    """
    updated_appointments = appointments_services.update_appointment_with_multiple_services(
        db=db,
        appointment_id=appointment_id,
        update_data=update_data,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        requesting_user=requesting_user
    )
    return updated_appointments

# Delete endpoint is intentionally omitted as per subtask notes (cancellation is logical deletion).
