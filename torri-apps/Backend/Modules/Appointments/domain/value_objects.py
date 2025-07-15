"""
Domain Value Objects for Appointments
Contains immutable value objects representing core domain concepts.
"""
from decimal import Decimal
from typing import Optional, Dict, Any, TYPE_CHECKING
from dataclasses import dataclass

if TYPE_CHECKING:
    from Core.Auth.models import User
else:
    # Import for runtime
    from Core.Auth.models import User


# ===== PRICING VALUE OBJECTS =====

@dataclass(frozen=True)
class ServicePrice:
    """Value object representing service pricing breakdown."""
    base: Decimal
    variation_delta: Decimal
    final: Decimal
    
    @classmethod
    def create(cls, base: Decimal, variation_delta: Decimal = Decimal('0')) -> 'ServicePrice':
        """Create ServicePrice with automatic final calculation."""
        return cls(
            base=base,
            variation_delta=variation_delta,
            final=base + variation_delta
        )


@dataclass(frozen=True)
class ServiceDuration:
    """Value object representing service duration breakdown."""
    base: int  # duration_minutes
    processing: int  # processing_time
    finishing: int  # finishing_time  
    variation_delta: int  # variation duration delta
    total: int
    
    @classmethod
    def create(
        cls, 
        base: int, 
        processing: int = 0, 
        finishing: int = 0, 
        variation_delta: int = 0
    ) -> 'ServiceDuration':
        """Create ServiceDuration with automatic total calculation."""
        return cls(
            base=base,
            processing=processing,
            finishing=finishing,
            variation_delta=variation_delta,
            total=base + processing + finishing + variation_delta
        )


@dataclass(frozen=True)
class ServiceCalculation:
    """Value object representing complete service calculation (price + duration)."""
    price: ServicePrice
    duration: ServiceDuration
    service_id: str
    variation_id: Optional[str] = None


@dataclass(frozen=True)
class GroupTotals:
    """Value object representing totals for a group of services."""
    total_price: Decimal
    total_duration: int
    service_count: int
    
    @classmethod
    def from_calculations(cls, calculations: list[ServiceCalculation]) -> 'GroupTotals':
        """Create GroupTotals from list of service calculations."""
        total_price = sum(calc.price.final for calc in calculations)
        total_duration = sum(calc.duration.total for calc in calculations)
        return cls(
            total_price=total_price,
            total_duration=total_duration,
            service_count=len(calculations)
        )


# ===== CLIENT VALUE OBJECTS =====

@dataclass(frozen=True)
class ClientData:
    """Value object representing client data for creation/lookup."""
    
    # Required fields
    name: str
    
    # Optional identification
    id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf: Optional[str] = None
    
    # Optional profile
    nickname: Optional[str] = None
    
    # Optional address
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_cep: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ClientData':
        """Create ClientData from dictionary input."""
        return cls(
            id=data.get('id'),
            name=data.get('name', ''),
            nickname=data.get('nickname'),
            email=data.get('email'),
            phone=data.get('phone'),
            cpf=data.get('cpf'),
            address_street=data.get('address_street'),
            address_number=data.get('address_number'),
            address_complement=data.get('address_complement'),
            address_neighborhood=data.get('address_neighborhood'),
            address_city=data.get('address_city'),
            address_state=data.get('address_state'),
            address_cep=data.get('address_cep')
        )


@dataclass(frozen=True)
class ClientResult:
    """Value object representing the result of client operations."""
    client: User
    was_created: bool


# ===== APPOINTMENT VALUE OBJECTS =====

@dataclass(frozen=True)
class AppointmentData:
    """Value object representing appointment creation data."""
    client_result: ClientResult  # Store actual client result to avoid redundant calls
    service_calculations: list[ServiceCalculation]
    group_totals: GroupTotals
    professional_assignments: Dict[str, str]  # service_id -> professional_id
    
    @classmethod
    def create(
        cls,
        client_result: ClientResult,
        service_calculations: list[ServiceCalculation],
        professional_assignments: Dict[str, str]
    ) -> 'AppointmentData':
        """Create AppointmentData with calculated totals."""
        group_totals = GroupTotals.from_calculations(service_calculations)
        return cls(
            client_result=client_result,
            service_calculations=service_calculations,
            group_totals=group_totals,
            professional_assignments=professional_assignments
        )
    
    @property
    def client_data(self) -> ClientData:
        """Backward compatibility property for accessing client data."""
        return ClientData(
            id=str(self.client_result.client.id),
            name=self.client_result.client.full_name,
            nickname=self.client_result.client.nickname,
            email=self.client_result.client.email,
            phone=self.client_result.client.phone,
            cpf=self.client_result.client.cpf,
            address_street=self.client_result.client.address_street,
            address_number=self.client_result.client.address_number,
            address_complement=self.client_result.client.address_complement,
            address_neighborhood=self.client_result.client.address_neighborhood,
            address_city=self.client_result.client.address_city,
            address_state=self.client_result.client.address_state,
            address_cep=self.client_result.client.address_cep
        )