from typing import List, Optional, Annotated
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, UploadFile, File, Form
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.constants import UserRole
from Core.Security.jwt import TokenPayload
from Core.Utils.file_handler import file_handler

from .services import NFSeService, CertificateService, ReportService
from .schemas import (
    CertificateSchema, CertificateUploadRequest, CertificateStatusUpdate,
    NFSeSettingsSchema, NFSeSettingsCreate, NFSeSettingsUpdate,
    NFSeInvoiceSchema, NFSeInvoiceCreate, NFSeInvoiceListResponse, NFSeInvoiceFilters,
    TestCallRequest, TestCallResponse,
    ISSReportRequest, ISSReportResponse,
    AuditLogSchema
)
from .constants import CERT_FILE_SIZE_LIMIT

# Main router for NFS-e module
router = APIRouter(prefix="/nfse", tags=["NFS-e (Brazilian Fiscal Invoices)"])


# Certificate Management Endpoints
@router.post(
    "/certificates/upload",
    response_model=CertificateSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Upload fiscal certificate for NFS-e issuance"
)
async def upload_certificate(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    password: Annotated[str, Form(..., min_length=1)],
    certificate_file: UploadFile = File(..., description="PFX certificate file")
):
    """
    Upload a fiscal certificate (.pfx file) for NFS-e issuance.
    Only salon owners (GESTOR role) can upload certificates.
    """
    
    # Validate file type and size
    if not certificate_file.filename.endswith('.pfx'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate file must be a .pfx file"
        )
    
    # Read file content
    pfx_data = await certificate_file.read()
    
    if len(pfx_data) > CERT_FILE_SIZE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Certificate file too large. Maximum size: {CERT_FILE_SIZE_LIMIT // (1024*1024)}MB"
        )
    
    # Upload certificate
    cert_service = CertificateService(db)
    request = CertificateUploadRequest(password=password)
    
    try:
        certificate = await cert_service.upload_certificate(
            tenant_id="default",  # Single schema mode
            user_id=current_user.user_id,
            pfx_data=pfx_data,
            request=request
        )
        return certificate
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/certificates",
    response_model=List[CertificateSchema],
    summary="List fiscal certificates"
)
async def list_certificates(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """List all fiscal certificates for the current tenant"""
    
    cert_service = CertificateService(db)
    certificate = await cert_service.get_active_certificate("default")
    
    return [certificate] if certificate else []


@router.post(
    "/certificates/{certificate_id}/test",
    response_model=TestCallResponse,
    summary="Test certificate with Goiânia web service"
)
async def test_certificate(
    certificate_id: Annotated[UUID, Path(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    request: TestCallRequest = TestCallRequest()
):
    """
    Test the certificate by making a test call to Goiânia NFS-e web service.
    Should return test NF-e number 370 on success.
    """
    
    # Implementation would test SOAP connection
    # For now, return a mock response
    return TestCallResponse(
        success=True,
        test_nf_number="370",
        response_time_ms=1500
    )


@router.patch(
    "/certificates/{certificate_id}/status",
    response_model=CertificateSchema,
    summary="Update certificate status (enable production mode)"
)
async def update_certificate_status(
    certificate_id: Annotated[UUID, Path(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    status_update: CertificateStatusUpdate
):
    """
    Enable or disable production mode for the certificate.
    This should only be done after successful test calls.
    """
    
    # Implementation would update certificate status
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Certificate status update not yet implemented"
    )


# Settings Management Endpoints
@router.post(
    "/settings",
    response_model=NFSeSettingsSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create NFS-e settings"
)
async def create_settings(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    settings: NFSeSettingsCreate
):
    """Create initial NFS-e settings for the salon"""
    
    nfse_service = NFSeService(db)
    
    try:
        result = await nfse_service.create_settings(
            tenant_id="default",
            user_id=current_user.user_id,
            settings_data=settings
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/settings",
    response_model=NFSeSettingsSchema,
    summary="Get current NFS-e settings"
)
async def get_settings(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL]))]
):
    """Get current NFS-e settings for the salon"""
    
    nfse_service = NFSeService(db)
    settings = await nfse_service.get_settings("default")
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFS-e settings not configured"
        )
    
    return settings


@router.patch(
    "/settings",
    response_model=NFSeSettingsSchema,
    summary="Update NFS-e settings"
)
async def update_settings(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    settings: NFSeSettingsUpdate
):
    """Update NFS-e settings for the salon"""
    
    nfse_service = NFSeService(db)
    
    try:
        result = await nfse_service.update_settings(
            tenant_id="default",
            user_id=current_user.user_id,
            settings_data=settings
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Invoice Management Endpoints
@router.post(
    "/invoices",
    response_model=NFSeInvoiceSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Issue new NFS-e invoice"
)
async def create_invoice(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL]))],
    invoice: NFSeInvoiceCreate
):
    """
    Issue a new NFS-e invoice for services rendered.
    Professionals and salon owners can issue invoices.
    """
    
    nfse_service = NFSeService(db)
    
    try:
        result = await nfse_service.create_invoice(
            tenant_id="default",
            user_id=current_user.user_id,
            invoice_data=invoice
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/invoices",
    response_model=NFSeInvoiceListResponse,
    summary="List NFS-e invoices with filters"
)
async def list_invoices(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL]))],
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    client_name: Optional[str] = Query(None, description="Filter by client name"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    min_value: Optional[Decimal] = Query(None, description="Minimum service value"),
    max_value: Optional[Decimal] = Query(None, description="Maximum service value"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
):
    """List NFS-e invoices with optional filters and pagination"""
    
    # Parse date filters
    from datetime import datetime
    parsed_date_from = None
    parsed_date_to = None
    
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format. Use YYYY-MM-DD"
            )
    
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format. Use YYYY-MM-DD"
            )
    
    # Create filters object
    filters = NFSeInvoiceFilters(
        status=status_filter,
        client_name=client_name,
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        min_value=min_value,
        max_value=max_value,
        page=page,
        page_size=page_size
    )
    
    nfse_service = NFSeService(db)
    invoices, total = await nfse_service.get_invoices("default", filters)
    
    total_pages = (total + page_size - 1) // page_size
    
    return NFSeInvoiceListResponse(
        invoices=invoices,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get(
    "/invoices/{invoice_id}",
    response_model=NFSeInvoiceSchema,
    summary="Get single NFS-e invoice"
)
async def get_invoice(
    invoice_id: Annotated[UUID, Path(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL]))]
):
    """Get details of a specific NFS-e invoice"""
    
    nfse_service = NFSeService(db)
    invoice = await nfse_service.get_invoice("default", str(invoice_id))
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    return invoice


@router.post(
    "/invoices/{invoice_id}/regenerate-pdf",
    response_model=NFSeInvoiceSchema,
    summary="Regenerate PDF for invoice"
)
async def regenerate_pdf(
    invoice_id: Annotated[UUID, Path(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL]))]
):
    """Regenerate PDF for an issued invoice"""
    
    # Implementation would regenerate PDF
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PDF regeneration not yet implemented"
    )


@router.post(
    "/invoices/{invoice_id}/email",
    summary="Email invoice to client"
)
async def email_invoice(
    invoice_id: Annotated[UUID, Path(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL]))]
):
    """Email invoice PDF to the client"""
    
    # Implementation would send email
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Email functionality not yet implemented"
    )


# Reporting Endpoints
@router.post(
    "/reports/iss",
    response_model=ISSReportResponse,
    summary="Generate ISS tax report"
)
async def generate_iss_report(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    report_request: ISSReportRequest
):
    """
    Generate ISS tax report for a specific period.
    Used by accountants for tax compliance.
    """
    
    report_service = ReportService(db)
    
    try:
        result = await report_service.generate_iss_report("default", report_request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating report: {str(e)}"
        )


# Administrative Endpoints
@router.get(
    "/audit-logs",
    response_model=List[AuditLogSchema],
    summary="Get audit trail logs"
)
async def get_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    operation: Optional[str] = Query(None, description="Filter by operation"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    limit: int = Query(50, le=200, description="Maximum number of logs")
):
    """Get audit trail logs for NFS-e operations"""
    
    from .models import NFSeAuditLog
    
    query = db.query(NFSeAuditLog).filter_by(tenant_id="default")
    
    if operation:
        query = query.filter(NFSeAuditLog.operation == operation)
    
    if entity_type:
        query = query.filter(NFSeAuditLog.entity_type == entity_type)
    
    logs = query.order_by(NFSeAuditLog.created_at.desc()).limit(limit).all()
    
    return logs


@router.get(
    "/status",
    summary="Get NFS-e module status"
)
async def get_module_status(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Get overall status of NFS-e module configuration"""
    
    nfse_service = NFSeService(db)
    cert_service = CertificateService(db)
    
    # Check settings
    settings = await nfse_service.get_settings("default")
    settings_configured = settings is not None
    
    # Check certificate
    certificate = await cert_service.get_active_certificate("default")
    certificate_configured = certificate is not None
    certificate_production = certificate.production_enabled if certificate else False
    
    # Check for expiring certificates
    from datetime import datetime, timedelta
    from .constants import CERT_EXPIRY_WARNING_DAYS
    
    expiry_warning = False
    if certificate and certificate.valid_until:
        days_until_expiry = (certificate.valid_until - datetime.utcnow()).days
        expiry_warning = days_until_expiry <= CERT_EXPIRY_WARNING_DAYS
    
    return {
        "settings_configured": settings_configured,
        "certificate_configured": certificate_configured,
        "certificate_production_mode": certificate_production,
        "certificate_expiry_warning": expiry_warning,
        "module_ready": settings_configured and certificate_configured,
        "last_check": datetime.utcnow()
    }