from typing import List, Optional
from uuid import UUID
from datetime import date, time # Ensure correct datetime imports

from sqlalchemy.orm import Session
from sqlalchemy import select, delete, and_, or_, func

from fastapi import HTTPException, status

from .models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
from .schemas import (
    ProfessionalAvailabilityCreate, ProfessionalAvailabilitySchema,
    ProfessionalBreakCreate, ProfessionalBreakSchema,
    ProfessionalBlockedTimeCreate, ProfessionalBlockedTimeSchema
)
from .constants import DayOfWeek, AvailabilityBlockType
from Core.Auth.models import UserTenant
from Core.Auth.constants import UserRole


# --- Helper Function for Permissions and Professional Validation ---
def _get_professional_for_availability_management(
    db: Session,
    professional_user_id_to_manage: UUID,
    requesting_user: UserTenant
) -> UserTenant:
    """
    Validates if the requesting_user has permission to manage availability
    for professional_user_id_to_manage.
    Returns the UserTenant object of the professional whose availability is being managed.
    """
    # Fetch the professional whose availability is being managed
    stmt = select(UserTenant).where(
        UserTenant.id == str(professional_user_id_to_manage),
        UserTenant.tenant_id == requesting_user.tenant_id # Must be in the same tenant
    )
    professional_to_manage = db.execute(stmt).scalars().first()

    if not professional_to_manage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional with ID {professional_user_id_to_manage} not found in this tenant."
        )

    if professional_to_manage.role != UserRole.PROFISSIONAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with ID {professional_user_id_to_manage} is not a Professional."
        )

    # Check permissions
    if requesting_user.role == UserRole.GESTOR:
        # Gestor can manage any professional in their tenant.
        return professional_to_manage
    elif requesting_user.role == UserRole.PROFISSIONAL:
        if requesting_user.id == str(professional_user_id_to_manage):
            # Professionals can manage their own availability.
            return professional_to_manage
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Professionals can only manage their own availability."
            )
    else: # ATENDENTE or other roles
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage professional availability."
        )

# --- ProfessionalAvailability (Weekly Recurring Slots) Services ---

def _check_slot_overlap(db: Session, professional_user_id: UUID, day_of_week: DayOfWeek, start_time: time, end_time: time, exclude_slot_id: Optional[UUID] = None) -> bool:
    """Checks for overlapping availability slots or breaks for a given professional."""
    # Check against ProfessionalAvailability
    query_avail = select(ProfessionalAvailability).where(
        ProfessionalAvailability.professional_user_id == str(professional_user_id),
        ProfessionalAvailability.day_of_week == day_of_week,
        not_(or_(
            ProfessionalAvailability.end_time <= start_time, # Existing ends before or at new start
            ProfessionalAvailability.start_time >= end_time  # Existing starts after or at new end
        ))
    )
    if exclude_slot_id: # When updating, exclude the current slot itself
        query_avail = query_avail.where(ProfessionalAvailability.id != str(exclude_slot_id))

    overlapping_availability = db.execute(query_avail).scalars().first()
    if overlapping_availability:
        return True # Found overlap with another availability slot

    # Check against ProfessionalBreak
    query_break = select(ProfessionalBreak).where(
        ProfessionalBreak.professional_user_id == str(professional_user_id),
        ProfessionalBreak.day_of_week == day_of_week,
        not_(or_(
            ProfessionalBreak.end_time <= start_time,
            ProfessionalBreak.start_time >= end_time
        ))
    )
    # No exclude_id for breaks as we are creating/checking an availability slot, not a break.
    overlapping_break = db.execute(query_break).scalars().first()
    if overlapping_break:
        # This means the new availability slot overlaps with an existing break.
        # Depending on desired logic, this might be acceptable (break is within slot) or not.
        # For now, let's consider any overlap an issue for simplicity of slot definition.
        # A more nuanced check would ensure break is *within* a slot, not just overlapping.
        return True

    return False

def create_availability_slot(
    db: Session,
    slot_data: ProfessionalAvailabilityCreate,
    professional_user_id: UUID,
    tenant_id: UUID # tenant_id of the professional/operation context
) -> ProfessionalAvailability:

    if _check_slot_overlap(db, professional_user_id, slot_data.day_of_week, slot_data.start_time, slot_data.end_time):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The proposed availability slot overlaps with an existing slot or break."
        )

    db_slot = ProfessionalAvailability(
        **slot_data.model_dump(),
        professional_user_id=str(professional_user_id),  # Convert UUID to string for MySQL compatibility
        tenant_id=str(tenant_id)  # Convert UUID to string for MySQL compatibility
    )
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

def get_availability_slots_for_professional(
    db: Session,
    professional_user_id: UUID,
    tenant_id: UUID, # Ensure tenant context is respected
    day_of_week: Optional[DayOfWeek] = None
) -> List[ProfessionalAvailability]:
    stmt = select(ProfessionalAvailability).where(
        ProfessionalAvailability.professional_user_id == professional_user_id,
        ProfessionalAvailability.tenant_id == str(tenant_id) # Security check
    ).order_by(ProfessionalAvailability.day_of_week, ProfessionalAvailability.start_time)

    if day_of_week is not None:
        stmt = stmt.where(ProfessionalAvailability.day_of_week == day_of_week)

    return list(db.execute(stmt).scalars().all())

def delete_availability_slot(
    db: Session,
    slot_id: UUID,
    professional_user_id: UUID, # Passed for ownership check via _get_professional_for_availability_management
    tenant_id: UUID
) -> bool:
    stmt = select(ProfessionalAvailability).where(
        ProfessionalAvailability.id == str(slot_id),
        ProfessionalAvailability.professional_user_id == professional_user_id, # Ensure slot belongs to this professional
        ProfessionalAvailability.tenant_id == str(tenant_id) # And this tenant
    )
    db_slot = db.execute(stmt).scalars().first()

    if not db_slot:
        # This means slot not found, or doesn't belong to the professional/tenant combination.
        # _get_professional_for_availability_management would have already validated the professional and tenant.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability slot not found or does not belong to this professional.")

    # TODO: Consider if there are future appointments scheduled within this slot.
    # If so, deletion might need to be prevented or handled carefully (e.g., notify, cancel appointments).
    # For now, direct deletion.

    db.delete(db_slot)
    db.commit()
    return True


# --- ProfessionalBreak (Weekly Recurring Breaks) Services ---

def _is_break_within_availability(db: Session, professional_user_id: UUID, day_of_week: DayOfWeek, break_start: time, break_end: time) -> bool:
    """Checks if the proposed break falls within any availability slot for that day."""
    stmt = select(ProfessionalAvailability).where(
        ProfessionalAvailability.professional_user_id == professional_user_id,
        ProfessionalAvailability.day_of_week == day_of_week,
        ProfessionalAvailability.start_time <= break_start,
        ProfessionalAvailability.end_time >= break_end
    )
    return db.execute(stmt).scalars().first() is not None

def _check_break_overlap(db: Session, professional_user_id: UUID, day_of_week: DayOfWeek, start_time: time, end_time: time, exclude_break_id: Optional[UUID] = None) -> bool:
    """Checks for overlapping breaks for a given professional."""
    # Check against ProfessionalBreak
    query_break = select(ProfessionalBreak).where(
        ProfessionalBreak.professional_user_id == professional_user_id,
        ProfessionalBreak.day_of_week == day_of_week,
        not_(or_(
            ProfessionalBreak.end_time <= start_time,
            ProfessionalBreak.start_time >= end_time
        ))
    )
    if exclude_break_id:
        query_break = query_break.where(ProfessionalBreak.id != str(exclude_break_id))

    if db.execute(query_break).scalars().first():
        return True # Overlaps with another break

    # A break should not overlap an entire availability slot, but it should be within one.
    # The _is_break_within_availability check is more relevant for that.
    # Here, we just ensure breaks don't overlap each other.
    return False


def create_break(
    db: Session,
    break_data: ProfessionalBreakCreate,
    professional_user_id: UUID,
    tenant_id: UUID
) -> ProfessionalBreak:
    if not _is_break_within_availability(db, professional_user_id, break_data.day_of_week, break_data.start_time, break_data.end_time):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Break time must be within an existing availability slot for that day."
        )

    if _check_break_overlap(db, professional_user_id, break_data.day_of_week, break_data.start_time, break_data.end_time):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The proposed break overlaps with an existing break."
        )

    db_break = ProfessionalBreak(
        **break_data.model_dump(),
        professional_user_id=str(professional_user_id),  # Convert UUID to string for MySQL compatibility
        tenant_id=str(tenant_id)  # Convert UUID to string for MySQL compatibility
    )
    db.add(db_break)
    db.commit()
    db.refresh(db_break)
    return db_break

def get_breaks_for_professional(
    db: Session,
    professional_user_id: UUID,
    tenant_id: UUID,
    day_of_week: Optional[DayOfWeek] = None
) -> List[ProfessionalBreak]:
    stmt = select(ProfessionalBreak).where(
        ProfessionalBreak.professional_user_id == professional_user_id,
        ProfessionalBreak.tenant_id == str(tenant_id)
    ).order_by(ProfessionalBreak.day_of_week, ProfessionalBreak.start_time)

    if day_of_week is not None:
        stmt = stmt.where(ProfessionalBreak.day_of_week == day_of_week)

    return list(db.execute(stmt).scalars().all())

def delete_break(
    db: Session,
    break_id: UUID,
    professional_user_id: UUID,
    tenant_id: UUID
) -> bool:
    stmt = select(ProfessionalBreak).where(
        ProfessionalBreak.id == str(break_id),
        ProfessionalBreak.professional_user_id == professional_user_id,
        ProfessionalBreak.tenant_id == tenant_id
    )
    db_break = db.execute(stmt).scalars().first()

    if not db_break:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Break not found or does not belong to this professional.")

    db.delete(db_break)
    db.commit()
    return True


# --- ProfessionalBlockedTime (Specific Date Blocks/Offs) Services ---

def _check_blocked_time_overlap(db: Session, professional_user_id: UUID, block_date: date, start_time: Optional[time], end_time: Optional[time], block_type: AvailabilityBlockType, exclude_id: Optional[UUID] = None):
    """Checks for overlapping ProfessionalBlockedTime entries."""
    query = select(ProfessionalBlockedTime).where(
        ProfessionalBlockedTime.professional_user_id == str(professional_user_id),
        ProfessionalBlockedTime.block_date == block_date
    )
    if exclude_id:
        query = query.where(ProfessionalBlockedTime.id != str(exclude_id))

    if block_type == AvailabilityBlockType.DAY_OFF:
        # If new block is DAY_OFF, it overlaps if any other block (DAY_OFF or BLOCKED_SLOT) exists on that day.
        if db.execute(query).scalars().first():
            return True
    elif block_type == AvailabilityBlockType.BLOCKED_SLOT:
        # New block is BLOCKED_SLOT. Check for overlap with existing DAY_OFF or other BLOCKED_SLOTs.
        query = query.where(
            or_(
                ProfessionalBlockedTime.block_type == AvailabilityBlockType.DAY_OFF, # Overlaps with any DAY_OFF
                # Overlaps with other BLOCKED_SLOT if times intersect
                and_(
                    ProfessionalBlockedTime.block_type == AvailabilityBlockType.BLOCKED_SLOT,
                    ProfessionalBlockedTime.start_time < end_time, # type: ignore
                    ProfessionalBlockedTime.end_time > start_time  # type: ignore
                )
            )
        )
        if db.execute(query).scalars().first():
            return True
    return False


def create_blocked_time(
    db: Session,
    blocked_time_data: ProfessionalBlockedTimeCreate,
    professional_user_id: UUID,
    tenant_id: UUID
) -> ProfessionalBlockedTime:

    if _check_blocked_time_overlap(db, professional_user_id, blocked_time_data.block_date, blocked_time_data.start_time, blocked_time_data.end_time, blocked_time_data.block_type):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The proposed blocked time overlaps with an existing blocked time or day off."
        )

    # Additional validation: For BLOCKED_SLOT, ensure it doesn't conflict with appointments (to be added later).
    # For DAY_OFF, ensure no appointments exist for that day (to be added later).

    db_blocked_time = ProfessionalBlockedTime(
        **blocked_time_data.model_dump(),
        professional_user_id=str(professional_user_id),  # Convert UUID to string for MySQL compatibility
        tenant_id=str(tenant_id)  # Convert UUID to string for MySQL compatibility
    )
    db.add(db_blocked_time)
    db.commit()
    db.refresh(db_blocked_time)
    return db_blocked_time

def get_blocked_times_for_professional(
    db: Session,
    professional_user_id: UUID,
    tenant_id: UUID,
    start_date_filter: Optional[date] = None, # Renamed for clarity
    end_date_filter: Optional[date] = None   # Renamed for clarity
) -> List[ProfessionalBlockedTime]:
    stmt = select(ProfessionalBlockedTime).where(
        ProfessionalBlockedTime.professional_user_id == professional_user_id,
        ProfessionalBlockedTime.tenant_id == str(tenant_id)
    ).order_by(ProfessionalBlockedTime.block_date, ProfessionalBlockedTime.start_time)

    if start_date_filter:
        stmt = stmt.where(ProfessionalBlockedTime.block_date >= start_date_filter)
    if end_date_filter:
        stmt = stmt.where(ProfessionalBlockedTime.block_date <= end_date_filter)

    return list(db.execute(stmt).scalars().all())

def delete_blocked_time(
    db: Session,
    blocked_time_id: UUID,
    professional_user_id: UUID,
    tenant_id: UUID
) -> bool:
    stmt = select(ProfessionalBlockedTime).where(
        ProfessionalBlockedTime.id == str(blocked_time_id),
        ProfessionalBlockedTime.professional_user_id == professional_user_id,
        ProfessionalBlockedTime.tenant_id == tenant_id
    )
    db_blocked_time = db.execute(stmt).scalars().first()

    if not db_blocked_time:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked time not found or does not belong to this professional.")

    # TODO: Consider if there are appointments that would be affected by unblocking this time.
    # For now, direct deletion.

    db.delete(db_blocked_time)
    db.commit()
    return True

# Helper for sqlalchemy "not" operator in overlap checks
def not_(expression):
    return expression == False # Or use sqlalchemy.sql.expression.not_
                               # Using `~` operator on a SQLAlchemy boolean clause also works e.g. ~or_(...)
                               # For simplicity and directness with `not_(or_(...))` pattern:
    # from sqlalchemy import not_ # this is the typical import
    # However, to avoid new import if not already there, this lambda-like approach works for simple cases.
    # A more robust way is to use `from sqlalchemy.sql.expression import not_`
    # or rely on the `~` operator if the expression is a SQLAlchemy ColumnElement.
    # For `or_` and `and_` results, `~` is fine.
    from sqlalchemy.sql.expression import not_ as sqlalchemy_not_
    return sqlalchemy_not_(expression)
