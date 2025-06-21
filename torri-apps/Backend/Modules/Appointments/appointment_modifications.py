from typing import List, Optional
from uuid import UUID
from datetime import date, time, datetime, timedelta

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

# Models
from .models import Appointment
from Modules.Services.models import Service
from Core.Auth.models import User # Updated import

# Schemas
from .schemas import AppointmentUpdate, AppointmentCreate, AppointmentSchema
from .constants import AppointmentStatus

# Auth & Config
from Core.Auth.constants import UserRole

# Utils
from .appointment_utils import calculate_end_time # get_tenant_block_size removed
from .availability_service import get_daily_time_slots_for_professional
from .appointment_crud import get_appointment_by_id, create_appointment


def get_appointment_for_modification(
    db: Session,
    appointment_id: UUID,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User # Updated type
    # Removed allowed_to_modify_roles, direct checks below
) -> Appointment:
    """
    Fetches an appointment and performs initial permission checks for modification.
    This is a stricter version of get_appointment_by_id for write operations.
    """
    # Use the existing get_appointment_by_id which already applies basic view permissions
    # and eager loads relationships.
    appointment = get_appointment_by_id(db, appointment_id, requesting_user) # tenant_id argument removed

    if not appointment: # get_appointment_by_id would have raised 403 if view denied, or returns None if not found
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found or access denied.")

    # Specific modification permission checks (on top of view permissions)
    can_modify = False
    if requesting_user.role in [UserRole.GESTOR, UserRole.ATENDENTE]:
        can_modify = True
    elif requesting_user.role == UserRole.CLIENTE and str(appointment.client_id) == str(requesting_user.id): # Use .id
        can_modify = True
    elif requesting_user.role == UserRole.PROFISSIONAL and str(appointment.professional_id) == str(requesting_user.id): # Use .id
        can_modify = True

    if not can_modify:
        # This case should ideally be caught by get_appointment_by_id if it's strict enough,
        # but double-checking here or adding more granular modification rules.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to modify this appointment.")

    return appointment


def cancel_appointment(
    db: Session,
    appointment_id: UUID,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User, # Updated type
    reason: Optional[str] = None
) -> Appointment:

    appointment = get_appointment_for_modification(db, appointment_id, requesting_user) # tenant_id argument removed

    if appointment.status not in [AppointmentStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be cancelled in its current state ('{appointment.status.value}')."
        )

    appointment.status = AppointmentStatus.CANCELLED
    original_professional_id = appointment.professional_id # For logging
    original_client_id = appointment.client_id # For logging
    original_date = appointment.appointment_date # For logging

    if reason: # Log reason
        note = f"Cancelled by {requesting_user.role.value} ({requesting_user.email}): {reason}."
        if appointment.notes_by_professional: appointment.notes_by_professional += f"\n{note}"
        else: appointment.notes_by_professional = note

    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, requesting_user) # Re-fetch with relations, tenant_id argument removed


def reschedule_appointment(
    db: Session,
    appointment_id: UUID,
    new_date: date,
    new_start_time: time,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User, # Updated type
    reason: Optional[str] = None
) -> Appointment:

    appointment = get_appointment_for_modification(db, appointment_id, requesting_user) # tenant_id argument removed

    original_date = appointment.appointment_date
    original_start_time = appointment.start_time

    if appointment.status not in [AppointmentStatus.SCHEDULED, AppointmentStatus.CANCELLED]: # Allow rescheduling a cancelled appt
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be rescheduled in its current state ('{appointment.status.value}')."
        )

    service = db.get(Service, str(appointment.service_id))  # Convert UUID to string for MySQL compatibility
    if not service:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Associated service data missing.")

    new_end_time = calculate_end_time(new_start_time, service.duration_minutes)

    # Availability Check (re-using create_appointment's core logic for slot validation)
    # Appointments belonging to the same client at the new start time are ignored
    # so rescheduling can stack services for the client.
    daily_availability_response = get_daily_time_slots_for_professional(
        db,
        UUID(str(appointment.professional_id)), # Ensure UUID
        new_date,
        # tenant_id, # Argument removed
        ignore_client_id=UUID(str(appointment.client_id)), # Ensure UUID
        ignore_start_time=new_start_time,
    )

    block_size_minutes = 30 # Default block size, was get_tenant_block_size(db, tenant_id)
    current_check_time_dt = datetime.combine(new_date, new_start_time)
    service_end_dt = datetime.combine(new_date, new_end_time)

    required_slots_available = True
    temp_time_dt = current_check_time_dt
    while temp_time_dt < service_end_dt:
        slot_found_and_available = False
        for slot in daily_availability_response.slots:
            if slot.start_time == temp_time_dt.time() and \
               slot.end_time == (temp_time_dt + timedelta(minutes=block_size_minutes)).time():
                # If the blocking appointment is the one we are rescheduling, treat slot as available
                if slot.is_available or (slot.appointment_id == appointment_id):
                    slot_found_and_available = True
                break

        if not slot_found_and_available:
            required_slots_available = False; break
        temp_time_dt += timedelta(minutes=block_size_minutes)

    if not required_slots_available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The new selected time slot is not available.")

    appointment.appointment_date = new_date
    appointment.start_time = new_start_time
    appointment.end_time = new_end_time
    appointment.status = AppointmentStatus.SCHEDULED # Rescheduling implies it's active again

    if reason:
        note = f"Rescheduled by {requesting_user.role.value} ({requesting_user.email}): {reason}."
        if appointment.notes_by_professional: appointment.notes_by_professional += f"\n{note}"
        else: appointment.notes_by_professional = note

    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, requesting_user) # tenant_id argument removed


def complete_appointment(
    db: Session,
    appointment_id: UUID,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User # Updated type
) -> Appointment:
    appointment = get_appointment_for_modification(db, appointment_id, requesting_user) # tenant_id argument removed

    if requesting_user.role == UserRole.CLIENTE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients cannot mark appointments as completed.")
    if requesting_user.role == UserRole.PROFISSIONAL and str(appointment.professional_id) != str(requesting_user.id): # Use .id
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only complete their own appointments.")

    if appointment.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be completed in its current state ('{appointment.status.value}')."
        )

    appointment.status = AppointmentStatus.COMPLETED
    appointment.paid_manually = False # Defaulting as per requirement, assuming payment handled at location.
                                     # This field might need more context in a real payment flow.
    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, requesting_user) # tenant_id argument removed


def mark_appointment_as_no_show(
    db: Session,
    appointment_id: UUID,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User # Updated type
) -> Appointment:
    appointment = get_appointment_for_modification(db, appointment_id, requesting_user) # tenant_id argument removed

    if requesting_user.role == UserRole.CLIENTE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients cannot mark appointments as No Show.")
    if requesting_user.role == UserRole.PROFISSIONAL and str(appointment.professional_id) != str(requesting_user.id): # Use .id
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only mark their own appointments as No Show.")

    if appointment.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be marked as No Show in its current state ('{appointment.status.value}')."
        )

    appointment.status = AppointmentStatus.NO_SHOW
    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, requesting_user) # tenant_id argument removed


def update_appointment_details(
    db: Session,
    appointment_id: UUID,
    update_data: AppointmentUpdate,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User # Updated type
) -> Optional[Appointment]:
    """
    Update appointment details (client info, professional, service, time, notes, status).
    This is a general update function that handles various appointment modifications.
    """
    # Get the appointment and validate permissions
    appointment = get_appointment_for_modification(db, appointment_id, requesting_user) # tenant_id argument removed
    
    # Track what changed for audit logging
    changes = []
    
    # Update client_id if provided and valid
    if update_data.client_id is not None:
        # Validate client
        client = db.query(User).filter( # Changed UserTenant to User
            User.id == str(update_data.client_id), # Changed UserTenant to User
            # UserTenant.tenant_id == str(tenant_id), # Filter removed
            User.role == UserRole.CLIENTE # Changed UserTenant to User
        ).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client not found." # Updated detail
            )
        if appointment.client_id != str(update_data.client_id):
            changes.append(f"client_id: {appointment.client_id} -> {update_data.client_id}")
            appointment.client_id = str(update_data.client_id)
    
    # Update professional_id if provided and valid
    if update_data.professional_id is not None:
        # Validate professional
        professional = db.query(User).filter( # Changed UserTenant to User
            User.id == str(update_data.professional_id), # Changed UserTenant to User
            # UserTenant.tenant_id == str(tenant_id), # Filter removed
            User.role == UserRole.PROFISSIONAL # Changed UserTenant to User
        ).first()
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Professional not found." # Updated detail
            )
        if appointment.professional_id != str(update_data.professional_id):
            changes.append(f"professional_id: {appointment.professional_id} -> {update_data.professional_id}")
            appointment.professional_id = str(update_data.professional_id)
    
    # Update service_id if provided and valid
    if update_data.service_id is not None:
        # Validate service
        service = db.query(Service).filter(
            Service.id == str(update_data.service_id)
            # Service.tenant_id == str(tenant_id) # Filter removed (Service model already updated)
        ).first()
        if not service:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service not found." # Updated detail
            )
        if appointment.service_id != str(update_data.service_id):
            changes.append(f"service_id: {appointment.service_id} -> {update_data.service_id}")
            appointment.service_id = str(update_data.service_id)
            # Update end time based on new service duration
            appointment.end_time = calculate_end_time(appointment.start_time, service.duration_minutes)
    
    # Update appointment date if provided
    if update_data.appointment_date is not None:
        if appointment.appointment_date != update_data.appointment_date:
            changes.append(f"appointment_date: {appointment.appointment_date} -> {update_data.appointment_date}")
            appointment.appointment_date = update_data.appointment_date
    
    # Update start time if provided
    if update_data.start_time is not None:
        if appointment.start_time != update_data.start_time:
            changes.append(f"start_time: {appointment.start_time} -> {update_data.start_time}")
            appointment.start_time = update_data.start_time
            # Recalculate end time based on service duration
            # Get current service to calculate duration
            current_service = db.get(Service, str(appointment.service_id))
            if current_service:
                appointment.end_time = calculate_end_time(appointment.start_time, current_service.duration_minutes)
    
    # Update notes by client if provided
    if update_data.notes_by_client is not None:
        if appointment.notes_by_client != update_data.notes_by_client:
            changes.append(f"notes_by_client updated")
            appointment.notes_by_client = update_data.notes_by_client
    
    # Update notes by professional if provided
    if update_data.notes_by_professional is not None:
        if appointment.notes_by_professional != update_data.notes_by_professional:
            changes.append(f"notes_by_professional updated")
            appointment.notes_by_professional = update_data.notes_by_professional
    
    # Update status if provided (with validation)
    if update_data.status is not None:
        if appointment.status != update_data.status:
            # Validate status transition (add business logic as needed)
            if update_data.status == AppointmentStatus.CANCELLED and appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot cancel a completed or no-show appointment."
                )
            changes.append(f"status: {appointment.status} -> {update_data.status}")
            appointment.status = update_data.status
    
    # Update pricing if provided
    if update_data.price_at_booking is not None:
        if appointment.price_at_booking != update_data.price_at_booking:
            changes.append(f"price_at_booking: {appointment.price_at_booking} -> {update_data.price_at_booking}")
            appointment.price_at_booking = update_data.price_at_booking
    
    # Update paid manually flag if provided
    if update_data.paid_manually is not None:
        if appointment.paid_manually != update_data.paid_manually:
            changes.append(f"paid_manually: {appointment.paid_manually} -> {update_data.paid_manually}")
            appointment.paid_manually = update_data.paid_manually
    
    # Only commit if there were changes
    if changes:
        try:
            db.commit()
            
            # Removed audit logging
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update appointment: {str(e)}"
            )
    
    # Return the updated appointment directly instead of reloading to avoid session issues
    # The appointment object is already updated in memory after commit
    return appointment


def update_appointment_with_multiple_services(
    db: Session,
    appointment_id: UUID,
    update_data: dict,  # Contains services as array of service names
    # tenant_id: UUID, # Parameter removed
    requesting_user: User # Updated type
) -> List[AppointmentSchema]:
    """
    Update appointment to handle multiple services properly.
    Each service gets its own appointment record.
    
    Logic:
    1. Get current appointment and its service
    2. Get all service IDs from service names in update_data
    3. Update the current appointment with the first service
    4. Create new appointments for additional services
    5. Return all appointment records
    """
    
    # Get the existing appointment
    appointment = db.query(Appointment).filter(
        Appointment.id == str(appointment_id)
        # Appointment.tenant_id == str(tenant_id) # Filter removed
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found."
        )
    
    # Extract services from update_data
    service_names = update_data.get('services', [])
    if not service_names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one service must be selected."
        )
    
    # Get service objects from names
    from Modules.Services.models import Service
    services = db.query(Service).filter(
        Service.name.in_(service_names)
        # Service.tenant_id == str(tenant_id) # Filter removed (Service model already updated)
    ).all()
    
    if len(services) != len(service_names):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some services were not found."
        )
    
    # Sort services to maintain consistent order
    services = sorted(services, key=lambda s: service_names.index(s.name))
    
    updated_appointments = []
    
    try:
        # Update the existing appointment with the first service
        first_service = services[0]
        
        # Prepare update data for the first appointment (single service)
        single_service_update = {k: v for k, v in update_data.items() if k != 'services'}
        single_service_update['service_id'] = first_service.id
        
        # Convert to AppointmentUpdate schema
        from .schemas import AppointmentUpdate
        appointment_update_schema = AppointmentUpdate(**single_service_update)
        
        # Update the first appointment
        updated_first = update_appointment_details(
            db=db,
            appointment_id=appointment_id,
            update_data=appointment_update_schema,
            # tenant_id=tenant_id, # Argument removed
            requesting_user=requesting_user
        )
        updated_appointments.append(updated_first)
        
        # Create new appointments for additional services
        if len(services) > 1:
            for service in services[1:]:
                new_appointment_data = {
                    'client_id': updated_first.client_id,
                    'professional_id': updated_first.professional_id,
                    'service_id': service.id,
                    'appointment_date': updated_first.appointment_date,
                    'start_time': updated_first.start_time,  # Same time initially
                    'notes_by_client': updated_first.notes_by_client
                }
                
                # Convert to AppointmentCreate schema
                from .schemas import AppointmentCreate
                appointment_create_schema = AppointmentCreate(**new_appointment_data)
                
                # Create the new appointment
                new_appointment = create_appointment(
                    db=db,
                    appointment_data=appointment_create_schema,
                    # tenant_id=tenant_id, # Argument removed
                    requesting_user=requesting_user
                )
                updated_appointments.append(new_appointment)
        
        return updated_appointments
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update appointment with multiple services: {str(e)}"
        )