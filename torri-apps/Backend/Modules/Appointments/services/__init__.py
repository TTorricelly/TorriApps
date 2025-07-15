# Appointment Services Package
from .pricing_service import PricingService
from .client_service import ClientService  
from .appointment_factory import AppointmentFactory

# Import kanban functions from the main services module using absolute import
try:
    from Modules.Appointments.services_main import (
        get_appointment_groups_for_kanban,
        update_appointment_group_status,
        create_walk_in_appointment_group,
        create_walk_in_appointment_group_with_assignments,
        add_services_to_appointment_group,
        remove_service_from_appointment_group,
        create_merged_checkout_session,
        process_appointment_payment
    )
except ImportError:
    # If the import fails, we'll define placeholder functions
    def get_appointment_groups_for_kanban(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")
    
    def update_appointment_group_status(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")
    
    def create_walk_in_appointment_group(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")
    
    def create_walk_in_appointment_group_with_assignments(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")
    
    def add_services_to_appointment_group(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")
    
    def remove_service_from_appointment_group(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")
    
    def create_merged_checkout_session(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")
    
    def process_appointment_payment(*args, **kwargs):
        raise NotImplementedError("Kanban functions not properly imported")