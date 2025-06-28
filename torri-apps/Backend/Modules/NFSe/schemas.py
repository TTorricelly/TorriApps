from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, validator, EmailStr

from .constants import NFSeStatus, CertificateStatus


# Base schemas
class NFSeBaseSchema(BaseModel):
    class Config:
        from_attributes = True


# Certificate schemas
class CertificateUploadRequest(BaseModel):
    """Request schema for uploading fiscal certificate"""
    password: str = Field(..., min_length=1, description="Certificate password")
    
    class Config:
        schema_extra = {
            "example": {
                "password": "certificate_password"
            }
        }


class CertificateSchema(NFSeBaseSchema):
    """Response schema for certificate information"""
    id: UUID
    cnpj: str
    certificate_subject: Optional[str]
    certificate_serial: Optional[str]
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    status: CertificateStatus
    test_nf_number: Optional[str]
    production_enabled: bool
    created_at: datetime
    updated_at: datetime


class CertificateStatusUpdate(BaseModel):
    """Request schema for updating certificate status"""
    production_enabled: bool = Field(..., description="Enable production mode")
    
    class Config:
        schema_extra = {
            "example": {
                "production_enabled": True
            }
        }


# Settings schemas
class NFSeSettingsCreate(BaseModel):
    """Request schema for creating NFS-e settings"""
    company_name: str = Field(..., max_length=120)
    company_cnpj: str = Field(..., regex=r'^\d{14}$')
    inscricao_municipal: str = Field(..., max_length=20)
    
    # Address
    address_street: str = Field(..., max_length=200)
    address_number: str = Field(..., max_length=20)
    address_complement: Optional[str] = Field(None, max_length=100)
    address_district: str = Field(..., max_length=100)
    address_city: str = Field(..., max_length=100)
    address_state: str = Field(..., max_length=2, regex=r'^[A-Z]{2}$')
    address_zipcode: str = Field(..., regex=r'^\d{8}$')
    
    # ISS settings
    default_iss_aliquota: Decimal = Field(default=Decimal('2.0'), ge=0, le=100)
    iss_retained: bool = Field(default=False)
    
    # Optional settings
    accountant_email: Optional[EmailStr] = None
    monthly_report_enabled: bool = Field(default=False)
    
    class Config:
        schema_extra = {
            "example": {
                "company_name": "Salão Exemplo Ltda",
                "company_cnpj": "12345678000190",
                "inscricao_municipal": "123456",
                "address_street": "Rua das Flores",
                "address_number": "123",
                "address_complement": "Sala 1",
                "address_district": "Centro",
                "address_city": "Goiânia",
                "address_state": "GO",
                "address_zipcode": "74000000",
                "default_iss_aliquota": 2.0,
                "iss_retained": False,
                "accountant_email": "contador@exemplo.com",
                "monthly_report_enabled": True
            }
        }


class NFSeSettingsUpdate(BaseModel):
    """Request schema for updating NFS-e settings"""
    company_name: Optional[str] = Field(None, max_length=120)
    inscricao_municipal: Optional[str] = Field(None, max_length=20)
    
    # Address updates
    address_street: Optional[str] = Field(None, max_length=200)
    address_number: Optional[str] = Field(None, max_length=20)
    address_complement: Optional[str] = Field(None, max_length=100)
    address_district: Optional[str] = Field(None, max_length=100)
    address_city: Optional[str] = Field(None, max_length=100)
    address_state: Optional[str] = Field(None, max_length=2, regex=r'^[A-Z]{2}$')
    address_zipcode: Optional[str] = Field(None, regex=r'^\d{8}$')
    
    # ISS settings
    default_iss_aliquota: Optional[Decimal] = Field(None, ge=0, le=100)
    iss_retained: Optional[bool] = None
    
    # Email settings
    accountant_email: Optional[EmailStr] = None
    monthly_report_enabled: Optional[bool] = None


class NFSeSettingsSchema(NFSeBaseSchema):
    """Response schema for NFS-e settings"""
    id: UUID
    rps_counter: int
    rps_series: str
    company_name: Optional[str]
    company_cnpj: Optional[str]
    inscricao_municipal: Optional[str]
    
    # Address
    address_street: Optional[str]
    address_number: Optional[str]
    address_complement: Optional[str]
    address_district: Optional[str]
    address_city: Optional[str]
    address_state: Optional[str]
    address_zipcode: Optional[str]
    
    # ISS settings
    default_iss_aliquota: Decimal
    iss_retained: bool
    
    # Email settings
    accountant_email: Optional[str]
    monthly_report_enabled: bool
    
    created_at: datetime
    updated_at: datetime


# Invoice schemas
class NFSeInvoiceCreate(BaseModel):
    """Request schema for creating NFS-e invoice"""
    client_name: str = Field(..., max_length=120)
    client_cnpj_cpf: Optional[str] = Field(None, regex=r'^\d{11}$|^\d{14}$')
    client_email: Optional[EmailStr] = None
    
    service_description: str = Field(..., min_length=1)
    service_code: Optional[str] = Field(None, max_length=10)
    service_value: Decimal = Field(..., gt=0)
    
    # Optional ISS override
    iss_aliquota: Optional[Decimal] = Field(None, ge=0, le=100)
    deductions_value: Optional[Decimal] = Field(default=Decimal('0.00'), ge=0)
    
    # Service execution date
    competence_date: datetime = Field(..., description="Date when service was performed")
    
    class Config:
        schema_extra = {
            "example": {
                "client_name": "Maria Silva",
                "client_cnpj_cpf": "12345678901",
                "client_email": "maria@email.com",
                "service_description": "Corte de cabelo feminino",
                "service_code": "1401",
                "service_value": 50.00,
                "iss_aliquota": 2.0,
                "deductions_value": 0.00,
                "competence_date": "2025-06-28T14:30:00"
            }
        }


class NFSeInvoiceSchema(NFSeBaseSchema):
    """Response schema for NFS-e invoice"""
    id: UUID
    nf_number: Optional[str]
    rps_number: str
    series: str
    
    issue_date: Optional[datetime]
    competence_date: datetime
    
    client_name: str
    client_cnpj_cpf: Optional[str]
    client_email: Optional[str]
    
    service_description: str
    service_code: Optional[str]
    
    service_value: Decimal
    iss_aliquota: Decimal
    iss_value: Decimal
    iss_retained: bool
    deductions_value: Decimal
    net_value: Decimal
    
    status: NFSeStatus
    verification_code: Optional[str]
    
    pdf_url: Optional[str]
    pdf_generated_at: Optional[datetime]
    
    error_code: Optional[str]
    error_message: Optional[str]
    retry_count: int
    
    created_at: datetime
    updated_at: datetime


class NFSeInvoiceListResponse(BaseModel):
    """Response schema for paginated invoice list"""
    invoices: List[NFSeInvoiceSchema]
    total: int
    page: int
    page_size: int
    total_pages: int


# Filter and query schemas
class NFSeInvoiceFilters(BaseModel):
    """Query parameters for filtering invoices"""
    status: Optional[NFSeStatus] = None
    client_name: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_value: Optional[Decimal] = Field(None, ge=0)
    max_value: Optional[Decimal] = Field(None, ge=0)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @validator('max_value')
    def validate_value_range(cls, v, values):
        if v is not None and 'min_value' in values and values['min_value'] is not None:
            if v < values['min_value']:
                raise ValueError('max_value must be greater than or equal to min_value')
        return v


# Test and status schemas
class TestCallRequest(BaseModel):
    """Request schema for testing SOAP connection"""
    force_retry: bool = Field(default=False, description="Force retry even if test already passed")


class TestCallResponse(BaseModel):
    """Response schema for test call results"""
    success: bool
    test_nf_number: Optional[str]
    error_code: Optional[str]
    error_message: Optional[str]
    response_time_ms: Optional[int]


# Report schemas
class ISSReportRequest(BaseModel):
    """Request schema for ISS report generation"""
    start_date: datetime
    end_date: datetime
    format: str = Field(default="csv", regex="^(csv|pdf)$")
    
    class Config:
        schema_extra = {
            "example": {
                "start_date": "2025-06-01T00:00:00",
                "end_date": "2025-06-30T23:59:59",
                "format": "csv"
            }
        }


class ISSReportSummary(BaseModel):
    """Summary data for ISS report"""
    period_start: datetime
    period_end: datetime
    total_invoices: int
    total_service_value: Decimal
    total_iss_value: Decimal
    total_retained_iss: Decimal
    average_aliquota: Decimal


class ISSReportResponse(BaseModel):
    """Response schema for ISS report"""
    summary: ISSReportSummary
    download_url: Optional[str]
    generated_at: datetime


# Audit log schema
class AuditLogSchema(NFSeBaseSchema):
    """Response schema for audit log entries"""
    id: UUID
    operation: str
    entity_type: str
    entity_id: Optional[UUID]
    user_email: Optional[str]
    success: bool
    error_message: Optional[str]
    soap_request_id: Optional[str]
    soap_response_code: Optional[str]
    soap_latency_ms: Optional[int]
    created_at: datetime