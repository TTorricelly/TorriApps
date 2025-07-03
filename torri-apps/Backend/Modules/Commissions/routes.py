from datetime import date
from typing import List
from uuid import UUID
import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_from_db
from Core.Auth.models import User
from Core.Auth.constants import UserRole

from .services import CommissionService
from .schemas import (
    CommissionResponse, CommissionUpdate, CommissionFilters, CommissionKPIs,
    CommissionPaymentCreate, CommissionPaymentResponse, CommissionExportRow,
    CommissionExportFilters
)


router = APIRouter(prefix="/commissions", tags=["commissions"])


def get_commission_service(db: Session = Depends(get_db)) -> CommissionService:
    """Dependency to get CommissionService instance."""
    return CommissionService(db)


def validate_commission_access(user: User) -> None:
    """Validates that user has permission to access commission features."""
    if user.role != UserRole.GESTOR:
        raise HTTPException(
            status_code=403,
            detail=f"Operation not permitted. User role '{user.role.value}' is not authorized."
        )


# Use require_role for commission access control - only GESTOR can access commissions
# Note: ADMIN role might not exist in this system, using GESTOR for now


@router.get("", response_model=List[CommissionResponse])
async def list_commissions(
    professional_id: UUID = Query(None, description="Filter by professional ID"),
    payment_status: str = Query(None, description="Filter by payment status (PENDING, PAID, REVERSED)"),
    date_from: date = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: date = Query(None, description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    List commissions with optional filters and pagination.
    Only accessible by salon managers and administrators.
    """
    validate_commission_access(current_user)
    filters = CommissionFilters(
        professional_id=professional_id,
        payment_status=payment_status,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size
    )
    
    commissions, total_count = commission_service.get_commissions(filters)
    
    # Add pagination headers
    # In a real implementation, you might want to return a paginated response object
    return commissions


@router.get("/kpis", response_model=CommissionKPIs)
async def get_commission_kpis(
    professional_id: UUID = Query(None, description="Filter by professional ID"),
    date_from: date = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: date = Query(None, description="Filter to date (YYYY-MM-DD)"),
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Get commission KPIs for dashboard display.
    Returns summary metrics like total pending, total paid, etc.
    """
    validate_commission_access(current_user)
    filters = CommissionFilters(
        professional_id=professional_id,
        date_from=date_from,
        date_to=date_to
    )
    
    return commission_service.get_commission_kpis(filters)


@router.get("/{commission_id}", response_model=CommissionResponse)
async def get_commission(
    commission_id: UUID,
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """Get a specific commission by ID."""
    validate_commission_access(current_user)
    commission = commission_service.get_commission_by_id(commission_id)
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    return commission


@router.patch("/{commission_id}", response_model=CommissionResponse)
async def update_commission(
    commission_id: UUID,
    commission_update: CommissionUpdate,
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Update a commission.
    Allows adjusting commission values and payment status.
    """
    validate_commission_access(current_user)
    commission = commission_service.update_commission(commission_id, commission_update)
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    return commission


@router.post("/payments", response_model=CommissionPaymentResponse)
async def create_commission_payment(
    payment_data: CommissionPaymentCreate,
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Create a batch payment for multiple commissions.
    Marks the specified commissions as paid and creates a payment record.
    """
    validate_commission_access(current_user)
    try:
        payment = commission_service.process_commission_payment(payment_data)
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to process commission payment")


@router.get("/export/csv")
async def export_commissions_csv(
    professional_id: UUID = Query(None, description="Filter by professional ID"),
    payment_status: str = Query(None, description="Filter by payment status"),
    date_from: date = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: date = Query(None, description="Filter to date (YYYY-MM-DD)"),
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Export commission data as CSV file.
    Returns a downloadable CSV with all commission details.
    """
    validate_commission_access(current_user)
    filters = CommissionExportFilters(
        professional_id=professional_id,
        payment_status=payment_status,
        date_from=date_from,
        date_to=date_to
    )
    
    export_data = commission_service.get_commission_export_data(filters)
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    headers = [
        'Professional',
        'Data do Agendamento',
        'Serviço',
        'Preço do Serviço',
        'Percentual de Comissão',
        'Valor Calculado',
        'Valor Ajustado',
        'Valor Final',
        'Status de Pagamento',
        'Data de Pagamento',
        'Data de Criação'
    ]
    writer.writerow(headers)
    
    # Write data rows
    for row in export_data:
        writer.writerow([
            row.professional_name,
            row.appointment_date.strftime('%d/%m/%Y'),
            row.service_name,
            f'R$ {row.service_price:.2f}'.replace('.', ','),
            f'{row.commission_percentage:.1f}%',
            f'R$ {row.calculated_value:.2f}'.replace('.', ','),
            f'R$ {row.adjusted_value:.2f}'.replace('.', ',') if row.adjusted_value else '',
            f'R$ {row.final_value:.2f}'.replace('.', ','),
            row.payment_status,
            row.payment_date.strftime('%d/%m/%Y') if row.payment_date else '',
            row.created_at.strftime('%d/%m/%Y %H:%M')
        ])
    
    # Create response
    csv_content = output.getvalue()
    output.close()
    
    # Generate filename with current date
    filename = f"comissoes_{date.today().strftime('%Y%m%d')}.csv"
    
    return Response(
        content=csv_content.encode('utf-8'),
        media_type='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': 'text/csv; charset=utf-8'
        }
    )


@router.get("/export/pdf")
async def export_commissions_pdf(
    professional_id: UUID = Query(None, description="Filter by professional ID"),
    payment_status: str = Query(None, description="Filter by payment status"),
    date_from: date = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: date = Query(None, description="Filter to date (YYYY-MM-DD)"),
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Export commission data as PDF file.
    Returns a downloadable PDF with all commission details.
    """
    validate_commission_access(current_user)
    filters = CommissionExportFilters(
        professional_id=professional_id,
        payment_status=payment_status,
        date_from=date_from,
        date_to=date_to
    )
    
    try:
        pdf_bytes = commission_service.generate_commission_pdf(filters)
        
        # Generate filename with current date
        filename = f"relatorio_comissoes_{date.today().strftime('%Y%m%d')}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/pdf'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")


@router.get("/payments/{payment_id}/receipt")
async def generate_payment_receipt(
    payment_id: UUID,
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Generate a PDF receipt for a commission payment.
    Returns a downloadable PDF receipt with payment details.
    """
    validate_commission_access(current_user)
    
    try:
        pdf_bytes = commission_service.generate_payment_receipt_pdf(payment_id)
        
        # Generate filename with payment ID
        filename = f"recibo_pagamento_{str(payment_id)[:8].upper()}_{date.today().strftime('%Y%m%d')}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/pdf'
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar recibo: {str(e)}")


@router.get("/export/receipt")
async def export_commission_receipt(
    professional_id: UUID = Query(None, description="Filter by professional ID"),
    date_from: date = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: date = Query(None, description="Filter to date (YYYY-MM-DD)"),
    commission_service: CommissionService = Depends(get_commission_service),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Generate a PDF receipt for paid commissions based on filters.
    Returns a downloadable PDF receipt with payment details for the filtered commissions.
    """
    validate_commission_access(current_user)
    
    filters = CommissionExportFilters(
        professional_id=professional_id,
        payment_status='PAID',  # Force to only paid commissions
        date_from=date_from,
        date_to=date_to
    )
    
    try:
        pdf_bytes = commission_service.generate_commission_receipt_pdf(filters)
        
        # Generate filename
        professional_suffix = f"_{str(professional_id)[:8]}" if professional_id else ""
        date_suffix = f"_{date_from.strftime('%Y%m%d')}" if date_from else f"_{date.today().strftime('%Y%m%d')}"
        filename = f"recibo_comissoes{professional_suffix}{date_suffix}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/pdf'
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar recibo: {str(e)}")