"""
Tenant-Aware Client Service for Appointments
Centralizes client creation and lookup with proper tenant isolation.
Uses domain value objects for clean separation of concerns.
"""
from typing import Optional, Dict, Any
from uuid import uuid4
from sqlalchemy.orm import Session
from Core.Auth.models import User
from Core.Auth.constants import UserRole
from ..domain.value_objects import ClientData, ClientResult


class ClientService:
    """
    Tenant-aware service for client creation and lookup operations.
    
    Handles:
    - Client lookup by ID
    - Client lookup by email (for duplicate prevention)
    - Client creation with validation
    - Proper tenant isolation through database session
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize ClientService with tenant-aware database session.
        
        Args:
            db_session: SQLAlchemy session with tenant context from get_db()
        """
        self.db = db_session
    
    def get_or_create_client(self, client_data: Dict[str, Any]) -> ClientResult:
        """
        Get existing client or create new one based on provided data.
        
        Logic:
        1. If ID provided, lookup by ID (must exist)
        2. If no ID, check for existing client by email
        3. If no existing client found, create new one
        
        Args:
            client_data: Dictionary containing client information
            
        Returns:
            ClientResult with client entity and creation flag
            
        Raises:
            ValueError: If client ID not found or required data missing
        """
        data = ClientData.from_dict(client_data)
        
        # If client ID is provided, get existing client
        if data.id:
            client = self._lookup_client_by_id(data.id)
            if not client:
                raise ValueError(f"Client with ID {data.id} not found")
            return ClientResult(client=client, was_created=False)
        
        # For new clients, check if exists by email first
        existing_client = None
        if data.email:
            existing_client = self._lookup_client_by_email(data.email)
        
        if existing_client:
            return ClientResult(client=existing_client, was_created=False)
        
        # Create new client
        new_client = self._create_new_client(data)
        return ClientResult(client=new_client, was_created=True)
    
    def _lookup_client_by_id(self, client_id: str) -> Optional[User]:
        """
        Lookup client by ID in tenant-aware database session.
        
        Args:
            client_id: Unique client identifier
            
        Returns:
            User entity or None if not found
        """
        return self.db.query(User).filter(User.id == client_id).first()
    
    def _lookup_client_by_email(self, email: str) -> Optional[User]:
        """
        Lookup client by email in tenant-aware database session.
        
        Args:
            email: Client email address
            
        Returns:
            User entity or None if not found
        """
        return self.db.query(User).filter(User.email == email).first()
    
    def _create_new_client(self, data: ClientData) -> User:
        """
        Create new client with provided data.
        
        Args:
            data: Validated client data
            
        Returns:
            Newly created User entity (not yet committed)
            
        Raises:
            ValueError: If required data is missing
        """
        if not data.name:
            raise ValueError("Client name is required for new clients")
        
        # Use the provided email or None if not provided
        email = data.email or None
        
        client = User(
            id=str(uuid4()),
            full_name=data.name,
            nickname=data.nickname,
            email=email,
            phone_number=data.phone or '',
            cpf=data.cpf,
            address_street=data.address_street,
            address_number=data.address_number,
            address_complement=data.address_complement,
            address_neighborhood=data.address_neighborhood,
            address_city=data.address_city,
            address_state=data.address_state,
            address_cep=data.address_cep,
            role=UserRole.CLIENTE,
            is_active=True
        )
        
        self.db.add(client)
        self.db.flush()  # Get the ID without committing
        
        return client
    
    def validate_client_data(self, client_data: Dict[str, Any]) -> None:
        """
        Validate client data for common requirements.
        
        Args:
            client_data: Dictionary containing client information
            
        Raises:
            ValueError: If validation fails
        """
        data = ClientData.from_dict(client_data)
        
        # If ID provided, it should be valid format (basic validation)
        if data.id is not None and not data.id.strip():
            raise ValueError("Client ID cannot be empty")
        
        # If creating new client, name is required
        if not data.id and not data.name:
            raise ValueError("Client name is required for new clients")
        
        # Email format validation (basic)
        if data.email and '@' not in data.email:
            raise ValueError("Invalid email format")