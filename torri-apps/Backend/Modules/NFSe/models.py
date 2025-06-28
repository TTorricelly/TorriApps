from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, Text, LargeBinary, Boolean, Integer, Index
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from Config.Database import Base
from .constants import NFSeStatus, CertificateStatus


class NFSeCertificate(Base):
    """
    Stores fiscal certificates for NFS-e issuance per tenant.
    Certificates are encrypted at rest using AES-256.
    """
    __tablename__ = "nfse_certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    tenant_id = Column(UUID(as_uuid=True), nullable=True)  # Keep for database compatibility
    
    # Certificate identification
    cnpj = Column(String(14), nullable=False, index=True)
    certificate_subject = Column(String(255), nullable=True)  # Subject from certificate
    certificate_serial = Column(String(50), nullable=True)   # Serial number
    
    # Certificate data (encrypted)
    encrypted_pfx_data = Column(LargeBinary, nullable=False)  # Encrypted .pfx file content
    certificate_password_hash = Column(String(255), nullable=False)  # Hashed password
    
    # Certificate validity
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    
    # Status and configuration
    status = Column(SAEnum(CertificateStatus), nullable=False, default=CertificateStatus.PENDING)
    test_nf_number = Column(String(15), nullable=True)  # Number returned from test call
    production_enabled = Column(Boolean, nullable=False, default=False)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to invoices
    invoices = relationship("NFSeInvoice", back_populates="certificate", cascade="all, delete-orphan")
    
    # Index for tenant and CNPJ lookups
    __table_args__ = (
        Index('idx_nfse_cert_tenant_cnpj', 'tenant_id', 'cnpj'),
        Index('idx_nfse_cert_expiry', 'valid_until'),
    )
    
    def __repr__(self):
        return f"<NFSeCertificate(id={self.id}, cnpj={self.cnpj}, status={self.status.value})>"


class NFSeSettings(Base):
    """
    Stores NFS-e configuration settings per tenant.
    """
    __tablename__ = "nfse_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    tenant_id = Column(UUID(as_uuid=True), nullable=True)  # Keep for database compatibility
    
    # RPS (Recibo Provisório de Serviços) counter
    rps_counter = Column(Integer, nullable=False, default=0)
    rps_series = Column(String(10), nullable=False, default="001")
    
    # Company information for NFS-e
    company_name = Column(String(120), nullable=True)
    company_cnpj = Column(String(14), nullable=True)
    inscricao_municipal = Column(String(20), nullable=True)
    
    # Address information
    address_street = Column(String(200), nullable=True)
    address_number = Column(String(20), nullable=True)
    address_complement = Column(String(100), nullable=True)
    address_district = Column(String(100), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(2), nullable=True)
    address_zipcode = Column(String(8), nullable=True)
    
    # Default ISS settings
    default_iss_aliquota = Column(Numeric(5, 2), nullable=False, default=2.0)
    iss_retained = Column(Boolean, nullable=False, default=False)
    
    # Email settings for reports
    accountant_email = Column(String(120), nullable=True)
    monthly_report_enabled = Column(Boolean, nullable=False, default=False)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<NFSeSettings(id={self.id}, tenant_id={self.tenant_id}, cnpj={self.company_cnpj})>"


class NFSeInvoice(Base):
    """
    Stores NFS-e invoices issued by the system.
    Based on the PRD schema with PostgreSQL adaptations.
    """
    __tablename__ = "nfse_invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    tenant_id = Column(UUID(as_uuid=True), nullable=True)  # Keep for database compatibility
    
    # NFS-e identification
    nf_number = Column(String(15), nullable=True, index=True)  # Set after successful issuance
    rps_number = Column(String(15), nullable=False, index=True)
    series = Column(String(10), nullable=False, default="001")
    
    # Timing
    issue_date = Column(DateTime, nullable=True)  # When NFS-e was issued
    competence_date = Column(DateTime, nullable=False)  # Service execution date
    
    # Client information
    client_name = Column(String(120), nullable=False)
    client_cnpj_cpf = Column(String(14), nullable=True)
    client_email = Column(String(120), nullable=True)
    
    # Service details
    service_description = Column(Text, nullable=False)
    service_code = Column(String(10), nullable=True)  # Municipal service code
    
    # Financial values
    service_value = Column(Numeric(10, 2), nullable=False)
    iss_aliquota = Column(Numeric(5, 2), nullable=False, default=2.0)
    iss_value = Column(Numeric(10, 2), nullable=False)
    iss_retained = Column(Boolean, nullable=False, default=False)
    
    # Deductions and other taxes
    deductions_value = Column(Numeric(10, 2), nullable=False, default=0.00)
    net_value = Column(Numeric(10, 2), nullable=False)  # service_value - deductions
    
    # Status and verification
    status = Column(SAEnum(NFSeStatus), nullable=False, default=NFSeStatus.TEST)
    verification_code = Column(String(32), nullable=True)  # Goiânia verification code
    
    # XML and PDF storage
    xml_payload = Column(LargeBinary, nullable=True)  # Base64 encoded XML
    pdf_url = Column(String(255), nullable=True)  # S3 or file system path
    pdf_generated_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_code = Column(String(10), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    
    # Relationships
    certificate_id = Column(UUID(as_uuid=True), nullable=True)  # Reference to certificate used
    certificate = relationship("NFSeCertificate", back_populates="invoices")
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_nfse_invoice_tenant_date', 'tenant_id', 'issue_date'),
        Index('idx_nfse_invoice_rps', 'tenant_id', 'rps_number', 'series'),
        Index('idx_nfse_invoice_client', 'client_cnpj_cpf'),
        Index('idx_nfse_invoice_status', 'status'),
    )
    
    def __repr__(self):
        return f"<NFSeInvoice(id={self.id}, nf_number={self.nf_number}, rps={self.rps_number}, status={self.status.value})>"


class NFSeAuditLog(Base):
    """
    Immutable audit trail for NFS-e operations.
    Records all certificate operations and invoice issuance attempts.
    """
    __tablename__ = "nfse_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    tenant_id = Column(UUID(as_uuid=True), nullable=True)  # Keep for database compatibility
    
    # Operation details
    operation = Column(String(50), nullable=False)  # e.g., 'CERTIFICATE_UPLOAD', 'INVOICE_ISSUE'
    entity_type = Column(String(50), nullable=False)  # 'CERTIFICATE', 'INVOICE', 'SETTINGS'
    entity_id = Column(UUID(as_uuid=True), nullable=True)  # ID of affected entity
    
    # User information
    user_id = Column(UUID(as_uuid=True), nullable=True)  # User who performed action
    user_email = Column(String(120), nullable=True)
    
    # Request details
    request_data = Column(Text, nullable=True)  # JSON serialized request data
    response_data = Column(Text, nullable=True)  # JSON serialized response
    
    # Status and error
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # SOAP call details (for invoice operations)
    soap_request_id = Column(String(100), nullable=True)  # Correlation ID
    soap_response_code = Column(String(10), nullable=True)
    soap_latency_ms = Column(Integer, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Indexes for audit queries
    __table_args__ = (
        Index('idx_nfse_audit_tenant_date', 'tenant_id', 'created_at'),
        Index('idx_nfse_audit_operation', 'operation'),
        Index('idx_nfse_audit_entity', 'entity_type', 'entity_id'),
    )
    
    def __repr__(self):
        return f"<NFSeAuditLog(id={self.id}, operation={self.operation}, success={self.success})>"