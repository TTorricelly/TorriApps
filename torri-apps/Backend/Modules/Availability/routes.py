from typing import List, Optional, Annotated
from uuid import UUID
from datetime import date, time # Ensure correct datetime imports

from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant # This dependency should also be updated if it returns UserTenant model
from Core.Auth.models import User # Updated import UserTenant to User
from Core.Auth.constants import UserRole # For permission checks if needed beyond helper

from . import services as availability_services # Alias
from .schemas import (
    ProfessionalAvailabilitySchema, ProfessionalAvailabilityCreate,
    ProfessionalBreakSchema, ProfessionalBreakCreate,
    ProfessionalBlockedTimeSchema, ProfessionalBlockedTimeCreate
)
from .constants import DayOfWeek

router = APIRouter(
    # No prefix here, will be added in main.py (e.g., /api/v1/availability)
    tags=["Professional Availability (Tenant)"] # Tag for all routes in this file
)

# --- ProfessionalAvailability (Weekly Recurring Slots) Endpoints ---
@router.post(
    "/professional/{professional_user_id_managed}/slots",
    response_model=ProfessionalAvailabilitySchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new weekly availability slot for a professional."
)
def create_professional_availability_slot_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional whose availability is being managed."),
    slot_data: ProfessionalAvailabilityCreate = Body(...),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission check and fetch the professional being managed
    # _get_professional_for_availability_management also ensures professional_user_id_managed exists and is a PROFISSIONAL
    availability_services._get_professional_for_availability_management(
        db, professional_user_id_to_manage=professional_user_id_managed, requesting_user=requesting_user
    )
    return availability_services.create_availability_slot(
        db=db,
        slot_data=slot_data,
        professional_user_id=professional_user_id_managed
        # tenant_id=requesting_user.tenant_id # Argument removed
    )

@router.get(
    "/professional/{professional_user_id_managed}/slots",
    response_model=List[ProfessionalAvailabilitySchema],
    summary="Get all weekly availability slots for a professional."
)
def get_professional_availability_slots_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional whose availability is being listed."),
    day_of_week: Optional[DayOfWeek] = Query(None, description="Filter by day of the week (0=Monday, 6=Sunday)."),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    # Basic permission: any authenticated user can view availability.
    # More specific validation of professional_user_id_managed:
    prof_to_view = db.query(User).filter(User.id == str(professional_user_id_managed)).first() # Removed tenant_id check
    if not prof_to_view or prof_to_view.role != UserRole.PROFISSIONAL:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found.") # Updated detail

    return availability_services.get_availability_slots_for_professional(
        db=db,
        professional_user_id=professional_user_id_managed,
        # tenant_id=requesting_user.tenant_id, # Argument removed
        day_of_week=day_of_week
    )

@router.delete(
    "/professional/{professional_user_id_managed}/slots/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a weekly availability slot for a professional."
)
def delete_professional_availability_slot_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional whose slot is being deleted."),
    slot_id: UUID = Path(..., description="ID of the availability slot to delete."),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    availability_services._get_professional_for_availability_management(
        db, professional_user_id_to_manage=professional_user_id_managed, requesting_user=requesting_user
    )
    success = availability_services.delete_availability_slot(
        db=db, slot_id=slot_id, professional_user_id=professional_user_id_managed
        # tenant_id=requesting_user.tenant_id # Argument removed
    )
    if not success: # Should be handled by exceptions in service now
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found or deletion failed.")
    return None


# --- ProfessionalBreak (Weekly Recurring Breaks) Endpoints ---
@router.post(
    "/professional/{professional_user_id_managed}/breaks",
    response_model=ProfessionalBreakSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new weekly break for a professional."
)
def create_professional_break_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional for whom the break is being created."),
    break_data: ProfessionalBreakCreate = Body(...),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    availability_services._get_professional_for_availability_management(
        db, professional_user_id_to_manage=professional_user_id_managed, requesting_user=requesting_user
    )
    return availability_services.create_break(
        db=db, break_data=break_data, professional_user_id=professional_user_id_managed
        # tenant_id=requesting_user.tenant_id # Argument removed
    )

@router.get(
    "/professional/{professional_user_id_managed}/breaks",
    response_model=List[ProfessionalBreakSchema],
    summary="Get all weekly breaks for a professional."
)
def get_professional_breaks_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional whose breaks are being listed."),
    day_of_week: Optional[DayOfWeek] = Query(None, description="Filter by day of the week (0=Monday, 6=Sunday)."),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    prof_to_view = db.query(User).filter(User.id == str(professional_user_id_managed)).first() # Removed tenant_id check
    if not prof_to_view or prof_to_view.role != UserRole.PROFISSIONAL:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found.") # Updated detail

    return availability_services.get_breaks_for_professional(
        db=db, professional_user_id=professional_user_id_managed, day_of_week=day_of_week
        # tenant_id=requesting_user.tenant_id # Argument removed
    )

@router.delete(
    "/professional/{professional_user_id_managed}/breaks/{break_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a weekly break for a professional."
)
def delete_professional_break_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional whose break is being deleted."),
    break_id: UUID = Path(..., description="ID of the break to delete."),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    availability_services._get_professional_for_availability_management(
        db, professional_user_id_to_manage=professional_user_id_managed, requesting_user=requesting_user
    )
    success = availability_services.delete_break(
        db=db, break_id=break_id, professional_user_id=professional_user_id_managed
        # tenant_id=requesting_user.tenant_id # Argument removed
    )
    if not success: # Should be handled by exceptions in service now
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Break not found or deletion failed.")
    return None


# --- ProfessionalBlockedTime (Specific Date Blocks/Offs) Endpoints ---
@router.post(
    "/professional/{professional_user_id_managed}/blocked-times",
    response_model=ProfessionalBlockedTimeSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new specific blocked time or day off for a professional."
)
def create_professional_blocked_time_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional for whom the block is being created."),
    blocked_time_data: ProfessionalBlockedTimeCreate = Body(...),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    availability_services._get_professional_for_availability_management(
        db, professional_user_id_to_manage=professional_user_id_managed, requesting_user=requesting_user
    )
    return availability_services.create_blocked_time(
        db=db, blocked_time_data=blocked_time_data, professional_user_id=professional_user_id_managed
        # tenant_id=requesting_user.tenant_id # Argument removed
    )

@router.get(
    "/professional/{professional_user_id_managed}/blocked-times",
    response_model=List[ProfessionalBlockedTimeSchema],
    summary="Get all specific blocked times or days off for a professional, optionally filtered by date range."
)
def get_professional_blocked_times_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional whose blocked times are being listed."),
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)."),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)."),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    prof_to_view = db.query(User).filter(User.id == str(professional_user_id_managed)).first() # Removed tenant_id check
    if not prof_to_view or prof_to_view.role != UserRole.PROFISSIONAL:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found.") # Updated detail

    return availability_services.get_blocked_times_for_professional(
        db=db, professional_user_id=professional_user_id_managed,
        start_date_filter=start_date, end_date_filter=end_date
        # tenant_id=requesting_user.tenant_id # Argument removed
    )

@router.delete(
    "/professional/{professional_user_id_managed}/blocked-times/{blocked_time_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a specific blocked time or day off for a professional."
)
def delete_professional_blocked_time_endpoint(
    professional_user_id_managed: UUID = Path(..., description="ID of the professional whose blocked time is being deleted."),
    blocked_time_id: UUID = Path(..., description="ID of the blocked time to delete."),
    requesting_user: Annotated[User, Depends(get_current_user_tenant)] = None, # Updated UserTenant to User
    db: Annotated[Session, Depends(get_db)] = None
):
    availability_services._get_professional_for_availability_management(
        db, professional_user_id_to_manage=professional_user_id_managed, requesting_user=requesting_user
    )
    success = availability_services.delete_blocked_time(
        db=db, blocked_time_id=blocked_time_id, professional_user_id=professional_user_id_managed
        # tenant_id=requesting_user.tenant_id # Argument removed
    )
    if not success: # Should be handled by exceptions in service now
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked time not found or deletion failed.")
    return None
