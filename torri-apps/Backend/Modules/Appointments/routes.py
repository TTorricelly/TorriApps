from typing import List, Optional, Annotated
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body
from sqlalchemy.orm import Session

from Backend.Core.Database.dependencies import get_db
from Backend.Core.Auth.dependencies import get_current_user_tenant, require_role
from Backend.Core.Auth.models import UserTenant # For current_user type hint
from Backend.Core.Auth.constants import UserRole

from . import services as appointments_services # Alias
from .schemas import (
    AppointmentSchema, AppointmentCreate,
    ProfessionalDailyAvailabilityResponse, AvailabilityRequest,
    # DailyServiceAvailabilityResponse # For the more detailed service availability
)
# Models are not directly used in routes but good for context if needed
# from .models import Appointment
# from Backend.Modules.Availability.models import ...

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

# Future Endpoints for Appointments (GET list, GET by ID, PUT update, PATCH status change, DELETE)
# @router.get("", response_model=List[AppointmentSchema], summary="List appointments.")
# def list_appointments_endpoint(...): ...

# @router.get("/{appointment_id}", response_model=AppointmentSchema, summary="Get a specific appointment.")
# def get_appointment_endpoint(...): ...

# @router.put("/{appointment_id}", response_model=AppointmentSchema, summary="Update an appointment.")
# def update_appointment_endpoint(...): ...

# @router.patch("/{appointment_id}/status", response_model=AppointmentSchema, summary="Update appointment status.")
# def update_appointment_status_endpoint(...): ...

# @router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an appointment.")
# def delete_appointment_endpoint(...): ...
