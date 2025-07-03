"""
Centralized relationship configuration for SQLAlchemy models.
This module configures relationships after all models are loaded to avoid circular import issues.
"""

from sqlalchemy.orm import relationship
from sqlalchemy import Table

def configure_relationships():
    """
    Configure all SQLAlchemy relationships after models are loaded.
    This should be called after all models are imported but before the application starts.
    """
    # Import all models here to ensure they're loaded
    from Core.Auth.models import User
    from Modules.Services.models import Service, Category, service_professionals_association
    from Modules.Appointments.models import Appointment, AppointmentGroup
    from Modules.Professionals.models import ProfessionalAvailability, ProfessionalBlockedTime, ProfessionalBreak
    from Modules.Availability.models import ProfessionalAvailability as AvailabilityModel, ProfessionalBreak as BreakModel, ProfessionalBlockedTime as BlockedTimeModel
    from Modules.Stations.models import StationType, Station, ServiceStationRequirement
    from Modules.Labels.models import Label, user_labels_association
    # from Modules.Payments.models import Payment, PaymentItem  # Temporarily disabled
    
    # Configure User relationships
    if not hasattr(User, 'services_offered'):
        User.services_offered = relationship(
            "Service",
            secondary=service_professionals_association,
            back_populates="professionals"
        )
    
    if not hasattr(User, 'client_appointments'):
        User.client_appointments = relationship(
            "Appointment",
            foreign_keys="Appointment.client_id",
            back_populates="client",
            cascade="all, delete-orphan"
        )
    
    if not hasattr(User, 'professional_appointments'):
        User.professional_appointments = relationship(
            "Appointment",
            foreign_keys="Appointment.professional_id", 
            back_populates="professional",
            cascade="all, delete-orphan"
        )
    
    if not hasattr(User, 'appointment_groups'):
        User.appointment_groups = relationship(
            "AppointmentGroup",
            foreign_keys="AppointmentGroup.client_id",
            back_populates="client",
            cascade="all, delete-orphan"
        )
    
    if not hasattr(User, 'availability_schedule'):
        User.availability_schedule = relationship(
            "ProfessionalAvailability",
            back_populates="professional",
            cascade="all, delete-orphan"
        )
    
    if not hasattr(User, 'blocked_times'):
        User.blocked_times = relationship(
            "ProfessionalBlockedTime",
            back_populates="professional", 
            cascade="all, delete-orphan"
        )
    
    if not hasattr(User, 'recurring_breaks'):
        User.recurring_breaks = relationship(
            "ProfessionalBreak",
            back_populates="professional",
            cascade="all, delete-orphan"
        )
    
    # Configure User-Labels relationship
    if not hasattr(User, 'labels'):
        User.labels = relationship(
            "Label",
            secondary=user_labels_association,
            back_populates="users"
        )
    
    # Configure Label-Users relationship
    if not hasattr(Label, 'users'):
        Label.users = relationship(
            "User",
            secondary=user_labels_association,
            back_populates="labels"
        )
    
    # Configure Service relationships
    if not hasattr(Service, 'professionals'):
        Service.professionals = relationship(
            "User",
            secondary=service_professionals_association,
            back_populates="services_offered"
        )
    
    if not hasattr(Service, 'appointments'):
        Service.appointments = relationship(
            "Appointment",
            foreign_keys="Appointment.service_id",
            back_populates="service"
        )
    
    if not hasattr(Service, 'station_requirements'):
        Service.station_requirements = relationship(
            "ServiceStationRequirement",
            back_populates="service",
            cascade="all, delete-orphan"
        )
    
    # Label-Users relationship is now configured directly in the Label model
    
    # Configure Appointment relationships
    if not hasattr(Appointment, 'client'):
        Appointment.client = relationship(
            "User", 
            foreign_keys="Appointment.client_id", 
            back_populates="client_appointments"
        )
    
    if not hasattr(Appointment, 'professional'):
        Appointment.professional = relationship(
            "User",
            foreign_keys="Appointment.professional_id",
            back_populates="professional_appointments"
        )
    
    if not hasattr(Appointment, 'service'):
        Appointment.service = relationship(
            "Service",
            foreign_keys="Appointment.service_id", 
            back_populates="appointments"
        )
    
    # Configure AppointmentGroup relationships
    if not hasattr(AppointmentGroup, 'client'):
        AppointmentGroup.client = relationship(
            "User",
            foreign_keys="AppointmentGroup.client_id",
            back_populates="appointment_groups"
        )
    
    # Configure Professional model relationships (if using Modules.Professionals.models)
    try:
        if not hasattr(ProfessionalAvailability, 'professional'):
            ProfessionalAvailability.professional = relationship(
                User,
                foreign_keys="ProfessionalAvailability.professional_user_id",
                back_populates="availability_schedule"
            )
        
        if not hasattr(ProfessionalBlockedTime, 'professional'):
            ProfessionalBlockedTime.professional = relationship(
                User,
                foreign_keys="ProfessionalBlockedTime.professional_user_id", 
                back_populates="blocked_times"
            )
        
        if not hasattr(ProfessionalBreak, 'professional'):
            ProfessionalBreak.professional = relationship(
                User,
                foreign_keys="ProfessionalBreak.professional_user_id",
                back_populates="recurring_breaks"
            )
    except ImportError:
        pass  # Module not available
    
    # Configure Availability model relationships (if using Modules.Availability.models)
    try:
        if hasattr(AvailabilityModel, '__table__') and not hasattr(AvailabilityModel, 'professional'):
            AvailabilityModel.professional = relationship(
                User,
                foreign_keys="ProfessionalAvailability.professional_user_id"
            )
        
        if hasattr(BreakModel, '__table__') and not hasattr(BreakModel, 'professional'):
            BreakModel.professional = relationship(
                User, 
                foreign_keys="ProfessionalBreak.professional_user_id"
            )
        
        if hasattr(BlockedTimeModel, '__table__') and not hasattr(BlockedTimeModel, 'professional'):
            BlockedTimeModel.professional = relationship(
                User,
                foreign_keys="ProfessionalBlockedTime.professional_user_id"
            )
    except ImportError:
        pass  # Module not available
    
    # Configure Payment relationships - temporarily disabled
    # if not hasattr(User, 'payments'):
    #     User.payments = relationship(
    #         "Payment",
    #         foreign_keys="Payment.client_id",
    #         back_populates="client",
    #         cascade="all, delete-orphan"
    #     )
    # 
    # if not hasattr(Payment, 'client'):
    #     Payment.client = relationship(
    #         "User",
    #         foreign_keys="Payment.client_id",
    #         back_populates="payments"
    #     )
    # 
    # if not hasattr(PaymentItem, 'appointment_group'):
    #     PaymentItem.appointment_group = relationship(
    #         "AppointmentGroup",
    #         foreign_keys="PaymentItem.reference_id",
    #         primaryjoin="and_(PaymentItem.reference_id == AppointmentGroup.id, PaymentItem.item_type == 'appointment_group')",
    #         viewonly=True
    #     )

def get_relationship_status():
    """
    Check which relationships are currently configured.
    Useful for debugging and verification.
    """
    from Core.Auth.models import User
    from Modules.Services.models import Service
    from Modules.Appointments.models import Appointment, AppointmentGroup
    # from Modules.Payments.models import Payment, PaymentItem  # Temporarily disabled
    
    status = {
        'User': {
            'services_offered': hasattr(User, 'services_offered'),
            'client_appointments': hasattr(User, 'client_appointments'),
            'professional_appointments': hasattr(User, 'professional_appointments'),
            'appointment_groups': hasattr(User, 'appointment_groups'),
            'availability_schedule': hasattr(User, 'availability_schedule'),
            'blocked_times': hasattr(User, 'blocked_times'),
            'recurring_breaks': hasattr(User, 'recurring_breaks'),
            'payments': hasattr(User, 'payments'),
        },
        'Service': {
            'professionals': hasattr(Service, 'professionals'),
            'appointments': hasattr(Service, 'appointments'),
        },
        'Appointment': {
            'client': hasattr(Appointment, 'client'),
            'professional': hasattr(Appointment, 'professional'),
            'service': hasattr(Appointment, 'service'),
        },
        'AppointmentGroup': {
            'client': hasattr(AppointmentGroup, 'client'),
        },
        'Payment': {
            'client': hasattr(Payment, 'client'),
        },
        'PaymentItem': {
            'appointment_group': hasattr(PaymentItem, 'appointment_group'),
        }
    }
    
    return status