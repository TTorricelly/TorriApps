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
    DailyScheduleResponseSchema, # New schema for the daily schedule endpoint
    # Multi-service wizard schemas
    MultiServiceAvailabilityRequest, MultiServiceAvailabilityResponse,
    AvailableProfessionalsRequest, AvailableProfessionalsResponse,
    MultiServiceBookingRequest, MultiServiceBookingResponse,
    # Kanban board schemas
    AppointmentGroupStatusUpdate, WalkInAppointmentRequest, WalkInAppointmentResponse,
    WalkInServiceData, AddServicesRequest, AddServicesResponse,
    MergedCheckoutRequest, MergedCheckoutResponse,
    # Payment schemas
    AppointmentPaymentRequest, AppointmentPaymentResponse
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
    requesting_user: Annotated[User, Depends(get_current_user_from_db)] = None,
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission: Any authenticated user can view this.
    # Service layer handles fetching data - db session already has tenant context
    daily_schedule_data = appointments_services.get_daily_schedule_data(
        db=db,
        schedule_date=schedule_date
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
    requesting_user: Annotated[User, Depends(get_current_user_from_db)] = None, # Use get_current_user_from_db to get actual User object
    db: Annotated[Session, Depends(get_db)] = None
):
    # Permission: Any authenticated user can view this.
    # Validate professional exists and has the correct role
    prof_check = db.query(User).filter(User.id == str(professional_id)).first() # Removed tenant_id check
    if not prof_check or prof_check.role != UserRole.PROFISSIONAL:
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
    requesting_user: Annotated[User, Depends(get_current_user_from_db)] = None, # Use get_current_user_from_db to get actual User object
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
    requesting_user: Annotated[User, Depends(get_current_user_from_db)], # Use get_current_user_from_db to get actual User object
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
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
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
    # db session already has tenant context from middleware
    appointments = appointments_services.get_appointments(
        db=db,
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

# --- Kanban Board Endpoints ---

@router.get(
    "/groups",
    response_model=List[dict],
    summary="Get appointment groups for kanban board display"
)
def get_appointment_groups_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)],
    date_filter: Optional[date] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    status_filter: Optional[str] = Query(None, description="Filter by status")
):
    """
    Get appointment groups formatted for kanban board display.
    
    - **date_filter**: Optional date to filter groups (defaults to today)
    - **status_filter**: Optional status to filter groups
    - Returns list of appointment groups with aggregated client and service data
    """
    from .constants import AppointmentGroupStatus
    
    # Convert string status to enum if provided
    status_enum = None
    if status_filter:
        try:
            status_enum = AppointmentGroupStatus(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    return appointments_services.get_appointment_groups_for_kanban(
        db=db,
        tenant_id="default",  # TODO: Get from auth context
        date_filter=date_filter,
        status_filter=status_enum
    )


@router.patch(
    "/groups/{group_id}/status",
    response_model=dict,
    summary="Update appointment group status for kanban board"
)
def update_appointment_group_status_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)],
    group_id: UUID = Path(..., description="The appointment group ID"),
    status_update: AppointmentGroupStatusUpdate = Body(...)
):
    """
    Update the status of an appointment group and all its appointments.
    
    - **group_id**: ID of the appointment group to update
    - **status**: New status to set
    - Updates both group and individual appointment statuses
    """
    # Check permissions - only ATENDENTE and GESTOR can update statuses
    if requesting_user.role not in ['ATENDENTE', 'GESTOR']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only reception staff and managers can update appointment statuses."
        )
    
    result = appointments_services.update_appointment_group_status(
        db=db,
        group_id=group_id,
        new_status=status_update.status,
        tenant_id="default"  # TODO: Get from auth context
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment group not found"
        )
    
    return result


@router.post(
    "/walk-in",
    response_model=dict,
    summary="Create a walk-in appointment group"
)
def create_walk_in_appointment_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)],
    walk_in_data: WalkInAppointmentRequest = Body(...)
):
    """
    Create a walk-in appointment group with client and services.
    
    - **client**: Client information (name, phone, email)
    - **services**: List of services with IDs
    - **professional_id**: ID of the professional providing services
    - Creates or finds client and creates appointment group with WALK_IN status
    """
    # Check permissions - only ATENDENTE and GESTOR can create walk-ins
    if requesting_user.role not in ['ATENDENTE', 'GESTOR']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only reception staff and managers can create walk-in appointments."
        )
    
    try:
        # Handle both old format (single professional_id) and new format (individual assignments)
        services_data = []
        for service in walk_in_data.services:
            service_dict = service.dict()
            # If service has individual professional_id, use it; otherwise use the global one
            if not service_dict.get('professional_id'):
                service_dict['professional_id'] = walk_in_data.professional_id
            services_data.append(service_dict)
        
        result = appointments_services.create_walk_in_appointment_group_with_assignments(
            db=db,
            client_data=walk_in_data.client.dict(),
            services_data=services_data,
            tenant_id="default"  # TODO: Get from auth context
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"[WalkIn] Unexpected error: {str(e)}")
        print(f"[WalkIn] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create walk-in appointment: {str(e)}"
        )


@router.post(
    "/add-services/{group_id}",
    response_model=AddServicesResponse,
    summary="Add services to existing appointment group"
)
def add_services_to_group_endpoint(
    group_id: UUID,
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)],
    request_data: AddServicesRequest = Body(...)
):
    """
    Add additional services to an existing appointment group.
    
    - **group_id**: ID of the existing appointment group
    - **services**: List of services to add with professional assignments
    - Returns updated appointment group information
    """
    # Check permissions - only ATENDENTE and GESTOR can modify appointments
    if requesting_user.role not in ['ATENDENTE', 'GESTOR']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only reception staff and managers can add services."
        )
    
    try:
        # Extract services from request
        services_data = request_data.services
        
        # Add services to appointment group
        updated_group_data = appointments_services.add_services_to_appointment_group(
            db=db,
            group_id=group_id,
            services_data=services_data,
            tenant_id="default"  # TODO: Get from auth context
        )
        
        # Return properly formatted response
        return AddServicesResponse(
            appointment_group=updated_group_data,
            added_services_count=len(services_data),
            message=f"Successfully added {len(services_data)} service(s) to appointment group"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"[AddServices] Unexpected error: {str(e)}")
        print(f"[AddServices] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add services to appointment group: {str(e)}"
        )


@router.delete(
    "/groups/{group_id}/services/{service_id}",
    response_model=dict,
    summary="Remove a service from an appointment group"
)
def remove_service_from_group_endpoint(
    group_id: UUID,
    service_id: UUID,
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)]
):
    """
    Remove a specific service from an appointment group.
    
    - **group_id**: ID of the appointment group
    - **service_id**: ID of the service to remove
    - Returns success message and updated group information
    """
    # Check permissions - only ATENDENTE and GESTOR can modify appointments
    if requesting_user.role not in ['ATENDENTE', 'GESTOR']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only reception staff and managers can remove services."
        )
    
    try:
        # Remove service from appointment group
        result = appointments_services.remove_service_from_appointment_group(
            db=db,
            group_id=group_id,
            service_id=service_id,
            tenant_id="default"  # TODO: Get from auth context
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove service from appointment group: {str(e)}"
        )


@router.post(
    "/checkout/merge",
    response_model=MergedCheckoutResponse,
    summary="Create merged checkout session for multiple appointment groups"
)
def create_merged_checkout_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)],
    checkout_data: MergedCheckoutRequest = Body(...)
):
    """
    Create a merged checkout session for multiple appointment groups.
    
    - **group_ids**: List of appointment group IDs to merge for payment
    - Returns merged checkout session with combined totals and service details
    """
    # Check permissions - only ATENDENTE and GESTOR can process checkouts
    if requesting_user.role not in ['ATENDENTE', 'GESTOR']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only reception staff and managers can process checkouts."
        )
    
    try:
        result = appointments_services.create_merged_checkout_session(
            db=db,
            group_ids=checkout_data.group_ids,
            tenant_id="default"  # TODO: Get from auth context
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.post(
    "/checkout/payment",
    response_model=AppointmentPaymentResponse,
    summary="Process payment for appointment groups"
)
def process_appointment_payment_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)],
    payment_data: AppointmentPaymentRequest = Body(...)
):
    """
    Process payment for multiple appointment groups.
    
    - **group_ids**: List of appointment group IDs to process payment for
    - **subtotal**: Subtotal amount before discounts and tips
    - **discount_amount**: Discount amount applied
    - **tip_amount**: Tip amount added
    - **total_amount**: Final total amount to be paid
    - **payment_method**: Payment method used (cash, debit, credit, pix)
    - **additional_products**: Optional additional products purchased
    """
    # Check permissions - only ATENDENTE and GESTOR can process payments
    if requesting_user.role not in ['ATENDENTE', 'GESTOR']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only reception staff and managers can process payments."
        )
    
    try:
        result = appointments_services.process_appointment_payment(
            db=db,
            payment_data=payment_data,
            tenant_id="default"  # TODO: Get from auth context
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"[Payment] Unexpected error: {str(e)}")
        print(f"[Payment] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process payment"
        )


@router.get(
    "/{appointment_id}",
    response_model=AppointmentSchema,
    summary="Get a specific appointment by its ID."
)
def get_appointment_by_id_endpoint(
    requesting_user: Annotated[User, Depends(get_current_user_from_db)], # Use get_current_user_from_db to get actual User object
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
    requesting_user: Annotated[User, Depends(get_current_user_from_db)], # Use get_current_user_from_db to get actual User object
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
    requesting_user: Annotated[User, Depends(get_current_user_from_db)], # Use get_current_user_from_db to get actual User object
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


# --- Multi-Service Wizard Endpoints ---

@router.get(
    "/wizard/professionals",
    response_model=AvailableProfessionalsResponse,
    summary="Get available professionals for multiple services on a specific date."
)
def get_available_professionals_for_wizard_endpoint(
    service_ids: List[UUID] = Query(..., description="List of service IDs"),
    target_date: date = Query(..., description="Target date for availability (YYYY-MM-DD)", alias="date"),
    requesting_user: Annotated[User, Depends(get_current_user_from_db)] = None,
    db: Annotated[Session, Depends(get_db)] = None
):
    """
    Get professionals who are available and qualified for the specified services on the target date.
    """
    return appointments_services.get_available_professionals_for_wizard(
        db=db,
        service_ids=service_ids,
        target_date=target_date
    )


@router.get(
    "/wizard/availability",
    response_model=MultiServiceAvailabilityResponse,
    summary="Get available time slots for multiple services."
)
def get_multi_service_availability_endpoint(
    service_ids: List[UUID] = Query(..., description="List of service IDs"),
    target_date: date = Query(..., description="Target date for availability (YYYY-MM-DD)", alias="date"),
    professionals_requested: int = Query(default=1, ge=1, le=3, description="Number of professionals requested"),
    professional_ids: Optional[List[UUID]] = Query(None, description="Optional specific professional IDs"),
    requesting_user: Annotated[User, Depends(get_current_user_from_db)] = None,
    db: Annotated[Session, Depends(get_db)] = None
):
    """
    Get available time slots for multiple services, considering parallel and sequential execution.
    """
    request = MultiServiceAvailabilityRequest(
        service_ids=service_ids,
        date=target_date,
        professionals_requested=professionals_requested,
        professional_ids=professional_ids
    )
    
    return appointments_services.get_multi_service_availability(
        db=db,
        request=request
    )


@router.post(
    "/wizard/book",
    response_model=MultiServiceBookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a multi-service appointment booking."
)
def create_multi_service_booking_endpoint(
    booking_data: MultiServiceBookingRequest,
    requesting_user: Annotated[User, Depends(get_current_user_from_db)],
    db: Annotated[Session, Depends(get_db)]
):
    """
    Create a multi-service appointment booking with an appointment group.
    This creates multiple individual appointments linked to a single group.
    """
    return appointments_services.create_multi_service_booking(
        db=db,
        booking_data=booking_data,
        requesting_user=requesting_user
    )


@router.get(
    "/wizard/available-dates",
    response_model=List[str],
    summary="Get dates that have availability for the specified services."
)
def get_available_dates_for_services_endpoint(
    service_ids: List[UUID] = Query(..., description="List of service IDs"),
    year: int = Query(..., description="Year to check"),
    month: int = Query(..., description="Month to check (1-12)"),
    requesting_user: Annotated[User, Depends(get_current_user_from_db)] = None,
    db: Annotated[Session, Depends(get_db)] = None
):
    """
    Get a list of dates in the specified month that have availability for all the requested services.
    Returns dates in YYYY-MM-DD format.
    """
    return appointments_services.get_available_dates_for_services(
        db=db,
        service_ids=service_ids,
        year=year,
        month=month
    )


@router.get(
    "/wizard/available-dates-fast",
    response_model=List[str],
    summary="OPTIMIZED: Get dates with availability for calendar display (fast version)"
)
def get_available_dates_for_calendar_endpoint(
    service_ids: List[UUID] = Query(..., description="List of service IDs"),
    year: int = Query(..., description="Year to check"),
    month: int = Query(..., description="Month to check (1-12)"),
    requesting_user: Annotated[User, Depends(get_current_user_from_db)] = None,
    db: Annotated[Session, Depends(get_db)] = None
):
    """
    OPTIMIZED ENDPOINT for calendar month views.
    
    This is a high-performance version that reduces database queries from 1,240+ to ~10.
    Specifically designed for calendar display where exact slot calculations aren't needed.
    
    Performance: ~200-500ms instead of 5-15 seconds
    Accuracy: ~95% (uses simplified availability heuristics)
    
    Use this for:
    - Calendar month view loading
    - Quick availability checks
    
    Use the regular /available-dates for:
    - Final booking validation
    - Exact slot calculations
    """
    from .calendar_availability_service import create_calendar_availability_service
    
    calendar_service = create_calendar_availability_service(db)
    return calendar_service.get_available_dates_for_calendar(
        service_ids=service_ids,
        year=year,
        month=month
    )





# Delete endpoint is intentionally omitted as per subtask notes (cancellation is logical deletion).

