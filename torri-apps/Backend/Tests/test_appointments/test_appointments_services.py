import pytest
from typing import List
from uuid import uuid4, UUID
from datetime import date, time, datetime, timedelta

from sqlalchemy.orm import Session
from fastapi import HTTPException

# Models to create
from Core.Auth.models import UserTenant
from Modules.Tenants.models import Tenant
from Modules.Services.models import Service, ServiceProfessionalAssociation # Assuming this association model if many-to-many
from Modules.Appointments.models import Appointment
from Modules.Availability.models import ProfessionalBlockedTime # Using the existing model

# Schemas to validate response
from Modules.Appointments.schemas import DailyScheduleResponseSchema

# Service to test
from Modules.Appointments.services import get_daily_schedule_data

# Constants
from Core.Auth.constants import UserRole
from Modules.Appointments.constants import AppointmentStatus
from Modules.Availability.constants import AvailabilityBlockType

# Helper to create professionals
def create_professional(db: Session, tenant_id: UUID, full_name: str, email_prefix: str, is_active: bool = True) -> UserTenant:
    user = UserTenant(
        id=str(uuid4()),
        tenant_id=str(tenant_id),
        full_name=full_name,
        email=f"{email_prefix}@example.com",
        hashed_password="hashed_password", # Not relevant for this test but required
        role=UserRole.PROFISSIONAL,
        is_active=is_active,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Helper to create services
def create_service(db: Session, tenant_id: UUID, name: str, duration_minutes: int, price: float) -> Service:
    service = Service(
        id=str(uuid4()),
        tenant_id=str(tenant_id),
        name=name,
        description="Test Service Description",
        duration_minutes=duration_minutes,
        price=price,
        is_active=True
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

# Helper to associate professional with service
def add_professional_to_service(db: Session, professional: UserTenant, service: Service):
    # Assuming a direct many-to-many relationship or an association table/model
    # If using an association model like ServiceProfessionalAssociation:
    # assoc = ServiceProfessionalAssociation(professional_id=professional.id, service_id=service.id)
    # db.add(assoc)
    # If Service model has a list `professionals` for the relationship:
    service.professionals.append(professional) # This requires the relationship to be configured in SQLAlchemy models
    db.commit()


# Helper to create appointments
def create_appointment_for_professional(
    db: Session, tenant_id: UUID, professional: UserTenant, client: UserTenant,
    service: Service, appt_date: date, start_time_obj: time, end_time_obj: time, status: AppointmentStatus
) -> Appointment:
    appointment = Appointment(
        id=str(uuid4()),
        tenant_id=str(tenant_id),
        professional_id=str(professional.id),
        client_id=str(client.id),
        service_id=str(service.id),
        appointment_date=appt_date,
        start_time=start_time_obj,
        end_time=end_time_obj,
        status=status,
        price_at_booking=service.price
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

# Helper to create blocked slots
def create_blocked_slot_for_professional(
    db: Session, tenant_id: UUID, professional: UserTenant,
    blocked_date_obj: date, start_time_obj: time, end_time_obj: time,
    reason: str, block_type: AvailabilityBlockType = AvailabilityBlockType.BLOCKED_SLOT
) -> ProfessionalBlockedTime:
    blocked_slot = ProfessionalBlockedTime(
        id=str(uuid4()),
        tenant_id=str(tenant_id),
        professional_user_id=str(professional.id),
        blocked_date=blocked_date_obj,
        start_time=start_time_obj,
        end_time=end_time_obj,
        reason=reason,
        block_type=block_type.value if isinstance(block_type, Enum) else str(block_type)
    )
    db.add(blocked_slot)
    db.commit()
    db.refresh(blocked_slot)
    return blocked_slot


@pytest.fixture(scope="function")
def sample_tenant(db_session: Session) -> Tenant:
    tenant = Tenant(
        id=str(uuid4()),
        name="Test Tenant Schedule",
        block_size_minutes=30 # Needed for some service functions, though not directly by get_daily_schedule_data
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant

@pytest.fixture(scope="function")
def client_user(db_session: Session, sample_tenant: Tenant) -> UserTenant:
    client = UserTenant(
        id=str(uuid4()),
        tenant_id=str(sample_tenant.id),
        full_name="Test Client",
        email="client@example.com",
        hashed_password="hashed_password",
        role=UserRole.CLIENTE, # Assuming CLIENTE role exists
        is_active=True,
        email_verified=True
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client


def test_get_daily_schedule_data_basic_retrieval(db_session: Session, sample_tenant: Tenant, client_user: UserTenant):
    # 1. Setup: Tenant, Professionals, Services, Appointments, Blocked Slots
    prof1 = create_professional(db_session, sample_tenant.id, "Prof A", "profa")
    prof2 = create_professional(db_session, sample_tenant.id, "Prof B", "profb")

    service1 = create_service(db_session, sample_tenant.id, "Corte", 60, 50.0)
    service2 = create_service(db_session, sample_tenant.id, "Pintura", 120, 150.0)

    # Associate professionals with services (if your logic requires it for an appointment to be valid)
    # This step depends on how Service-Professional association is managed.
    # For now, assuming direct creation of appointment is sufficient, or service.professionals.append works.
    # add_professional_to_service(db_session, prof1, service1)
    # add_professional_to_service(db_session, prof2, service2)


    target_date = date(2024, 7, 1) # July 1, 2024

    # Appointments for Prof1
    create_appointment_for_professional(
        db_session, sample_tenant.id, prof1, client_user, service1,
        target_date, time(9, 0), time(10, 0), AppointmentStatus.SCHEDULED
    )
    # Appointments for Prof2
    create_appointment_for_professional(
        db_session, sample_tenant.id, prof2, client_user, service2,
        target_date, time(14, 0), time(16, 0), AppointmentStatus.SCHEDULED
    )

    # Blocked Slot for Prof1
    create_blocked_slot_for_professional(
        db_session, sample_tenant.id, prof1, target_date, time(12, 0), time(13, 0), "Almoço Prof A"
    )

    # 2. Call the service function
    result_schema = get_daily_schedule_data(db_session, target_date, sample_tenant.id)

    # 3. Assertions
    assert result_schema.date == target_date
    assert len(result_schema.professionals_schedule) == 2 # prof1 and prof2

    prof_a_schedule = next((p for p in result_schema.professionals_schedule if p.professional_id == prof1.id), None)
    prof_b_schedule = next((p for p in result_schema.professionals_schedule if p.professional_id == prof2.id), None)

    assert prof_a_schedule is not None
    assert prof_a_schedule.professional_name == "Prof A"
    assert len(prof_a_schedule.appointments) == 1
    assert prof_a_schedule.appointments[0].client_name == "Test Client"
    assert prof_a_schedule.appointments[0].services[0].name == "Corte"
    assert prof_a_schedule.appointments[0].start_time == datetime(2024, 7, 1, 9, 0)
    assert prof_a_schedule.appointments[0].duration_minutes == 60

    assert len(prof_a_schedule.blocked_slots) == 1
    assert prof_a_schedule.blocked_slots[0].reason == "Almoço Prof A"
    assert prof_a_schedule.blocked_slots[0].start_time == datetime(2024, 7, 1, 12, 0)
    assert prof_a_schedule.blocked_slots[0].duration_minutes == 60

    assert prof_b_schedule is not None
    assert prof_b_schedule.professional_name == "Prof B"
    assert len(prof_b_schedule.appointments) == 1
    assert prof_b_schedule.appointments[0].services[0].name == "Pintura"
    assert len(prof_b_schedule.blocked_slots) == 0


def test_get_daily_schedule_data_no_professionals(db_session: Session, sample_tenant: Tenant):
    target_date = date(2024, 7, 1)
    # No professionals created for sample_tenant

    result_schema = get_daily_schedule_data(db_session, target_date, sample_tenant.id)

    assert result_schema.date == target_date
    assert len(result_schema.professionals_schedule) == 0

def test_get_daily_schedule_data_no_appointments_or_blocks(db_session: Session, sample_tenant: Tenant):
    prof1 = create_professional(db_session, sample_tenant.id, "Prof C", "profc")
    target_date = date(2024, 7, 1)

    result_schema = get_daily_schedule_data(db_session, target_date, sample_tenant.id)

    assert result_schema.date == target_date
    assert len(result_schema.professionals_schedule) == 1

    prof_c_schedule = result_schema.professionals_schedule[0]
    assert prof_c_schedule.professional_id == prof1.id
    assert prof_c_schedule.professional_name == "Prof C"
    assert len(prof_c_schedule.appointments) == 0
    assert len(prof_c_schedule.blocked_slots) == 0

def test_get_daily_schedule_data_filters_inactive_or_wrong_role(db_session: Session, sample_tenant: Tenant):
    active_prof = create_professional(db_session, sample_tenant.id, "Active Prof", "activeprof")
    inactive_prof = create_professional(db_session, sample_tenant.id, "Inactive Prof", "inactiveprof", is_active=False)

    # Create a user with a different role (e.g., CLIENTE)
    client_user_as_non_prof = UserTenant(
        id=str(uuid4()), tenant_id=str(sample_tenant.id), full_name="Not A Prof",
        email="notaprof@example.com", hashed_password="pw", role=UserRole.CLIENTE, is_active=True
    )
    db_session.add(client_user_as_non_prof)
    db_session.commit()

    target_date = date(2024, 7, 1)
    result_schema = get_daily_schedule_data(db_session, target_date, sample_tenant.id)

    assert len(result_schema.professionals_schedule) == 1 # Only active_prof should be included
    assert result_schema.professionals_schedule[0].professional_id == active_prof.id
    assert result_schema.professionals_schedule[0].professional_name == "Active Prof"

def test_get_daily_schedule_data_tenant_isolation(db_session: Session, sample_tenant: Tenant, client_user: UserTenant):
    # prof1 belongs to sample_tenant
    prof1 = create_professional(db_session, sample_tenant.id, "Prof Tenant1", "proft1")
    service_t1 = create_service(db_session, sample_tenant.id, "Service T1", 60, 50)
    target_date = date(2024, 7, 1)
    create_appointment_for_professional(
        db_session, sample_tenant.id, prof1, client_user, service_t1,
        target_date, time(10,0), time(11,0), AppointmentStatus.SCHEDULED
    )

    # Create another tenant and a professional for it
    other_tenant = Tenant(id=str(uuid4()), name="Other Tenant", block_size_minutes=30)
    db_session.add(other_tenant)
    db_session.commit()

    other_prof_client = UserTenant( # Client for other_tenant
        id=str(uuid4()), tenant_id=str(other_tenant.id), full_name="Other Client",
        email="otherclient@example.com", hashed_password="pw", role=UserRole.CLIENTE, is_active=True
    )
    db_session.add(other_prof_client)
    db_session.commit()

    prof_other_tenant = create_professional(db_session, other_tenant.id, "Prof OtherTenant", "profothert")
    service_other_t = create_service(db_session, other_tenant.id, "Service OtherT", 60, 50)
    create_appointment_for_professional(
        db_session, other_tenant.id, prof_other_tenant, other_prof_client, service_other_t,
        target_date, time(11,0), time(12,0), AppointmentStatus.SCHEDULED
    )

    # Fetch schedule for sample_tenant
    result_schema = get_daily_schedule_data(db_session, target_date, sample_tenant.id)

    assert len(result_schema.professionals_schedule) == 1
    assert result_schema.professionals_schedule[0].professional_id == prof1.id
    assert result_schema.professionals_schedule[0].professional_name == "Prof Tenant1"
    assert len(result_schema.professionals_schedule[0].appointments) == 1
    assert result_schema.professionals_schedule[0].appointments[0].services[0].name == "Service T1"
