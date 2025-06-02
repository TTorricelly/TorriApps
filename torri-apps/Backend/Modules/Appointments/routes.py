from typing import List, Optional, Annotated
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.models import UserTenant # For current_user type hint
from Core.Auth.constants import UserRole

from . import services as appointments_services # Alias
from .schemas import (
    AppointmentSchema, AppointmentCreate,
    ProfessionalDailyAvailabilityResponse, AvailabilityRequest,
    DailyServiceAvailabilityResponse,
    AppointmentUpdate, # For future generic update, if needed
    AppointmentReschedulePayload, AppointmentCancelPayload # New schemas for specific actions
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

# --- Availability Endpoints ---
@router.get(
    "/professional/{professional_id}/availability",
    response_model=ProfessionalDailyAvailabilityResponse,
    summary="Get daily availability slots for a professional on a specific date."
)
def get_professional_daily_availability_endpoint(
    professional_id: UUID = Path(..., description="ID of the professional."),
    target_date: date = Query(..., description="The target date for availability (YYYY-MM-DD).", alias="date"),
    requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)] = None, # Ensures user is authenticated
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission: Any authenticated user in the tenant can view this.
    # Service layer should validate professional_id belongs to requesting_user.tenant_id
    # A quick check here:
    prof_check = db.query(UserTenant.id).filter(UserTenant.id == professional_id, UserTenant.tenant_id == requesting_user.tenant_id).first()
    if not prof_check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found in this tenant.")

    return appointments_services.get_daily_time_slots_for_professional(
        db=db,
        professional_id=professional_id,
        target_date=target_date,
        tenant_id=requesting_user.tenant_id
    )

@router.post(
    "/services/availability", # Path relative to the router's prefix in main.py
    response_model=List[ProfessionalDailyAvailabilityResponse], # Placeholder, could be List[DailyServiceAvailabilityResponse]
    summary="Get available time slots for a specific service by a professional for a given month."
)
def get_service_availability_for_professional_endpoint(
    availability_request: AvailabilityRequest = Body(...),
    requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)] = None,
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission: Any authenticated user in the tenant can view this.
    # Service layer should validate professional_id and service_id belong to requesting_user.tenant_id
    prof_check = db.query(UserTenant.id).filter(UserTenant.id == availability_request.professional_id, UserTenant.tenant_id == requesting_user.tenant_id).first()
    if not prof_check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found in this tenant.")

    # The service function is currently a placeholder and returns simplified data.
    return appointments_services.get_service_availability_for_professional(
        db=db,
        req=availability_request,
        tenant_id=requesting_user.tenant_id
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
    requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)], # The user making the request
    db: Annotated[Session, Depends(get_db)]
):
    # The service `create_appointment` handles permission logic:
    # - Client can book for self (requesting_user.id == appointment_data.client_id)
    # - Gestor/Atendente can book for any client in the tenant.
    # It also validates that all IDs (client, professional, service) belong to the tenant.

    # Ensure the `tenant_id` passed to the service is the one from the authenticated `requesting_user`'s context.
    # This is crucial for security and data isolation.
    created_appointment = appointments_services.create_appointment(
        db=db,
        appointment_data=appointment_data,
        tenant_id=requesting_user.tenant_id, # Use tenant_id from the authenticated user
        requesting_user=requesting_user
    )
    return created_appointment


# --- Appointment Listing and Retrieval Endpoints ---
@router.get(
    "", # Relative to /api/v1/appointments, so this is GET /api/v1/appointments
    response_model=List[AppointmentSchema],
    summary="List appointments for the tenant based on filters and user role."
)
def list_appointments_endpoint(
    requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)],
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
        tenant_id=requesting_user.tenant_id,
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
    requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)],
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to retrieve.")
):
    appointment = appointments_services.get_appointment_by_id(
        db=db,
        appointment_id=appointment_id,
        tenant_id=requesting_user.tenant_id,
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
    requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)],
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to cancel."),
    payload: Optional[AppointmentCancelPayload] = Body(None, description="Optional reason for cancellation.")
):
    reason = payload.reason if payload else None
    updated_appointment = appointments_services.cancel_appointment(
        db=db,
        appointment_id=appointment_id,
        tenant_id=requesting_user.tenant_id,
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
    requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)],
    db: Annotated[Session, Depends(get_db)],
    payload: AppointmentReschedulePayload = Body(...),
    appointment_id: UUID = Path(..., description="ID of the appointment to reschedule.")
):
    updated_appointment = appointments_services.reschedule_appointment(
        db=db,
        appointment_id=appointment_id,
        new_date=payload.new_date,
        new_start_time=payload.new_start_time,
        tenant_id=requesting_user.tenant_id,
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
    requesting_user: Annotated[UserTenant, Depends(require_role([UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]))],
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to mark as completed.")
):
    updated_appointment = appointments_services.complete_appointment(
        db=db,
        appointment_id=appointment_id,
        tenant_id=requesting_user.tenant_id,
        requesting_user=requesting_user
    )
    return updated_appointment

@router.patch(
    "/{appointment_id}/no-show",
    response_model=AppointmentSchema,
    summary="Mark an appointment as No Show."
)
def mark_appointment_as_no_show_endpoint(
    requesting_user: Annotated[UserTenant, Depends(require_role([UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]))],
    db: Annotated[Session, Depends(get_db)],
    appointment_id: UUID = Path(..., description="ID of the appointment to mark as No Show.")
):
    updated_appointment = appointments_services.mark_appointment_as_no_show(
        db=db,
        appointment_id=appointment_id,
        tenant_id=requesting_user.tenant_id,
        requesting_user=requesting_user
    )
    return updated_appointment


# Placeholder for general Update Endpoint (if different from specific actions like reschedule)
# @router.put("/{appointment_id}", response_model=AppointmentSchema, summary="Update appointment details (e.g., notes).")
# def update_appointment_details_endpoint(
#     appointment_id: UUID = Path(..., description="ID of the appointment to update."),
#     update_data: AppointmentUpdate = Body(...), # Generic update schema
#     requesting_user: Annotated[UserTenant, Depends(get_current_user_tenant)],
#     db: Annotated[Session, Depends(get_db)]
# ):
#     # This would call a generic update service:
#     # updated_appointment = appointments_services.update_appointment_details(
#     #     db, appointment_id, update_data, requesting_user.tenant_id, requesting_user
#     # )
#     # if not updated_appointment:
#     #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found or update failed.")
#     # return updated_appointment

# Delete endpoint is intentionally omitted as per subtask notes (cancellation is logical deletion).
