from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import io

from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from Core.Database.dependencies import get_db
from Core.Auth.models import User
from Modules.Appointments.models import Appointment
from Modules.Services.models import Service
from .models import Commission, CommissionPayment, CommissionPaymentItem
from .schemas import (
    CommissionCreate, CommissionUpdate, CommissionResponse, 
    CommissionPaymentCreate, CommissionPaymentResponse,
    CommissionFilters, CommissionKPIs, CommissionExportRow,
    CommissionExportFilters
)
from .constants import CommissionPaymentStatus, CommissionPaymentMethod


class CommissionService:
    """Service class for commission management operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_commission_for_appointment(self, appointment_id: UUID) -> Optional[Commission]:
        """
        Creates a commission record for a completed appointment.
        Called automatically when appointment status changes to COMPLETED.
        
        Args:
            appointment_id: UUID of the completed appointment
            
        Returns:
            Commission object if created successfully, None if appointment not found or commission already exists
        """
        try:
            # Get appointment with related service and professional data
            appointment = self.db.query(Appointment)\
                .options(joinedload(Appointment.service))\
                .filter(Appointment.id == appointment_id)\
                .first()
            
            if not appointment:
                return None
                
            # Check if commission already exists
            existing_commission = self.db.query(Commission)\
                .filter(Commission.appointment_id == appointment_id)\
                .first()
            
            if existing_commission:
                return existing_commission
                
            # Get service to check commission percentage
            service = self.db.query(Service).filter(Service.id == appointment.service_id).first()
            if not service or service.commission_percentage is None:
                return None
                
            # Calculate commission value with validation
            try:
                commission_value = self.calculate_commission_value(
                    appointment.price_at_booking, 
                    service.commission_percentage
                )
            except ValueError as e:
                # Log the error but don't create commission with invalid data
                print(f"Commission calculation failed for appointment {appointment_id}: {e}")
                return None
            
            # Create commission record
            commission = Commission(
                professional_id=appointment.professional_id,
                appointment_id=appointment_id,
                service_price=appointment.price_at_booking,
                commission_percentage=service.commission_percentage,
                calculated_value=commission_value,
                payment_status=CommissionPaymentStatus.PENDING
            )
            
            self.db.add(commission)
            self.db.commit()
            self.db.refresh(commission)
            
            return commission
            
        except IntegrityError:
            self.db.rollback()
            # Commission already exists, return existing one
            return self.db.query(Commission)\
                .filter(Commission.appointment_id == appointment_id)\
                .first()
        except Exception as e:
            self.db.rollback()
            raise e
    
    def calculate_commission_value(self, service_price: Decimal, commission_percentage: Decimal) -> Decimal:
        """
        Calculates commission value based on service price and percentage.
        
        Args:
            service_price: Service price at booking time
            commission_percentage: Commission percentage (0-100)
            
        Returns:
            Calculated commission value
            
        Raises:
            ValueError: If input values are invalid
        """
        if service_price is None or commission_percentage is None:
            raise ValueError("Service price and commission percentage cannot be None")
            
        if service_price < 0:
            raise ValueError(f"Service price cannot be negative, got: {service_price}")
            
        if service_price == 0:
            return Decimal('0.00')
            
        if commission_percentage < 0:
            raise ValueError(f"Commission percentage cannot be negative, got: {commission_percentage}")
            
        if commission_percentage > 100:
            raise ValueError(f"Commission percentage cannot exceed 100%, got: {commission_percentage}")
            
        if commission_percentage == 0:
            return Decimal('0.00')
            
        commission_value = (service_price * commission_percentage) / Decimal('100')
        return commission_value.quantize(Decimal('0.01'))
    
    def get_commissions(self, filters: CommissionFilters) -> tuple[List[CommissionResponse], int]:
        """
        Retrieves commissions with filters and pagination.
        
        Args:
            filters: CommissionFilters object with query parameters
            
        Returns:
            Tuple of (commissions list, total count)
        """
        query = self.db.query(Commission)
        
        # Apply filters
        if filters.professional_id:
            query = query.filter(Commission.professional_id == filters.professional_id)
            
        if filters.payment_status:
            query = query.filter(Commission.payment_status == filters.payment_status)
            
        if filters.date_from:
            query = query.filter(Commission.created_at >= filters.date_from)
            
        if filters.date_to:
            query = query.filter(Commission.created_at <= filters.date_to)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        commissions = query.order_by(desc(Commission.created_at))\
            .offset(offset)\
            .limit(filters.page_size)\
            .all()
        
        # Convert to response format with additional data using joins to avoid N+1 queries
        response_commissions = []
        if commissions:
            # Get all related data in batch queries
            professional_ids = [c.professional_id for c in commissions]
            appointment_ids = [c.appointment_id for c in commissions]
            
            # Fetch professionals data
            professionals = {p.id: p for p in self.db.query(User).filter(User.id.in_(professional_ids)).all()}
            
            # Fetch appointments data  
            appointments = {a.id: a for a in self.db.query(Appointment).filter(Appointment.id.in_(appointment_ids)).all()}
            
            # Fetch services data
            service_ids = [a.service_id for a in appointments.values() if a.service_id]
            services = {s.id: s for s in self.db.query(Service).filter(Service.id.in_(service_ids)).all()}
            
            for commission in commissions:
                professional = professionals.get(commission.professional_id)
                appointment = appointments.get(commission.appointment_id)
                service = services.get(appointment.service_id) if appointment else None
                
                commission_response = CommissionResponse(
                    id=commission.id,
                    professional_id=commission.professional_id,
                    appointment_id=commission.appointment_id,
                    service_price=commission.service_price,
                    commission_percentage=commission.commission_percentage,
                    calculated_value=commission.calculated_value,
                    adjusted_value=commission.adjusted_value,
                    adjustment_reason=commission.adjustment_reason,
                    payment_status=commission.payment_status,
                    created_at=commission.created_at,
                    updated_at=commission.updated_at,
                    professional_name=professional.full_name or professional.email if professional else None,
                    service_name=service.name if service else None,
                    appointment_date=appointment.appointment_date if appointment else None,
                    final_value=commission.adjusted_value or commission.calculated_value
                )
                response_commissions.append(commission_response)
        
        return response_commissions, total_count
    
    def get_commission_by_id(self, commission_id: UUID) -> Optional[CommissionResponse]:
        """Get a specific commission by ID."""
        commission = self.db.query(Commission).filter(Commission.id == commission_id).first()
        if not commission:
            return None
        
        return self._build_commission_response(commission)
    
    def update_commission(self, commission_id: UUID, update_data: CommissionUpdate) -> Optional[CommissionResponse]:
        """
        Updates a commission with new values.
        
        Args:
            commission_id: UUID of commission to update
            update_data: CommissionUpdate object with new values
            
        Returns:
            Updated commission or None if not found
        """
        commission = self.db.query(Commission).filter(Commission.id == commission_id).first()
        if not commission:
            return None
        
        # Update fields
        if update_data.adjusted_value is not None:
            commission.adjusted_value = update_data.adjusted_value
            
        if update_data.adjustment_reason is not None:
            commission.adjustment_reason = update_data.adjustment_reason
            
        if update_data.payment_status is not None:
            commission.payment_status = update_data.payment_status
        
        commission.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(commission)
        
        return self._build_commission_response(commission)
    
    def get_commission_kpis(self, filters: CommissionFilters) -> CommissionKPIs:
        """
        Calculates KPIs for commission dashboard.
        
        Args:
            filters: Filters to apply (date range, professional, etc.)
            
        Returns:
            CommissionKPIs object with calculated metrics
        """
        query = self.db.query(Commission)
        
        # Apply filters
        if filters.professional_id:
            query = query.filter(Commission.professional_id == filters.professional_id)
            
        if filters.date_from:
            query = query.filter(Commission.created_at >= filters.date_from)
            
        if filters.date_to:
            query = query.filter(Commission.created_at <= filters.date_to)
        
        # Calculate metrics
        all_commissions = query.all()
        
        total_pending = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in all_commissions 
            if c.payment_status == CommissionPaymentStatus.PENDING
        )
        
        total_paid = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in all_commissions 
            if c.payment_status == CommissionPaymentStatus.PAID
        )
        
        total_this_period = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in all_commissions
        )
        
        pending_count = len([c for c in all_commissions if c.payment_status == CommissionPaymentStatus.PENDING])
        
        # Get last payment info
        last_payment = self.db.query(CommissionPayment)\
            .order_by(desc(CommissionPayment.payment_date))\
            .first()
        
        return CommissionKPIs(
            total_pending=Decimal(str(total_pending)),
            total_paid=Decimal(str(total_paid)),
            total_this_period=Decimal(str(total_this_period)),
            last_payment_date=last_payment.payment_date if last_payment else None,
            last_payment_amount=last_payment.total_amount if last_payment else None,
            commission_count=len(all_commissions),
            pending_count=pending_count
        )
    
    def process_commission_payment(self, payment_data: CommissionPaymentCreate) -> CommissionPaymentResponse:
        """
        Processes a batch payment for multiple commissions.
        
        Args:
            payment_data: CommissionPaymentCreate object with payment details
            
        Returns:
            CommissionPaymentResponse object
        """
        # Get commissions to pay
        commissions = self.db.query(Commission)\
            .filter(Commission.id.in_(payment_data.commission_ids))\
            .filter(Commission.professional_id == payment_data.professional_id)\
            .filter(Commission.payment_status == CommissionPaymentStatus.PENDING)\
            .all()
        
        if not commissions:
            raise ValueError("No pending commissions found for the specified professional")
        
        # Validate total amount
        expected_total = sum((c.adjusted_value or c.calculated_value) for c in commissions)
        if abs(payment_data.total_amount - expected_total) > Decimal('0.01'):
            raise ValueError(f"Total amount mismatch. Expected: {expected_total}, Got: {payment_data.total_amount}")
            
        # Validate payment amount is positive
        if payment_data.total_amount <= 0:
            raise ValueError(f"Payment amount must be positive, got: {payment_data.total_amount}")
            
        # Validate payment date is not in the future
        if payment_data.payment_date > date.today():
            raise ValueError("Payment date cannot be in the future")
        
        # Create payment record
        payment = CommissionPayment(
            professional_id=payment_data.professional_id,
            total_amount=payment_data.total_amount,
            payment_method=payment_data.payment_method,
            payment_date=payment_data.payment_date,
            period_start=payment_data.period_start,
            period_end=payment_data.period_end,
            receipt_url=payment_data.receipt_url,
            notes=payment_data.notes
        )
        
        self.db.add(payment)
        self.db.flush()  # Get payment ID
        
        # Create payment items and update commission status
        for commission in commissions:
            payment_item = CommissionPaymentItem(
                payment_id=payment.id,
                commission_id=commission.id
            )
            self.db.add(payment_item)
            
            # Update commission status
            commission.payment_status = CommissionPaymentStatus.PAID
            commission.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return self._build_payment_response(payment)
    
    def get_commission_export_data(self, filters: Union[CommissionFilters, CommissionExportFilters]) -> List[CommissionExportRow]:
        """
        Gets commission data formatted for CSV export using optimized joins.
        
        Args:
            filters: Filters to apply
            
        Returns:
            List of CommissionExportRow objects
        """
        # Use joins to fetch all related data in a single query
        query = self.db.query(
            Commission,
            User.full_name.label('professional_name'),
            User.email.label('professional_email'),
            Appointment.appointment_date,
            Service.name.label('service_name'),
            CommissionPayment.payment_date
        ).join(
            User, Commission.professional_id == User.id
        ).join(
            Appointment, Commission.appointment_id == Appointment.id
        ).join(
            Service, Appointment.service_id == Service.id
        ).outerjoin(
            CommissionPaymentItem, Commission.id == CommissionPaymentItem.commission_id
        ).outerjoin(
            CommissionPayment, CommissionPaymentItem.payment_id == CommissionPayment.id
        )
        
        # Apply filters
        if filters.professional_id:
            query = query.filter(Commission.professional_id == filters.professional_id)
            
        if filters.payment_status:
            query = query.filter(Commission.payment_status == filters.payment_status)
            
        if filters.date_from:
            query = query.filter(Commission.created_at >= filters.date_from)
            
        if filters.date_to:
            query = query.filter(Commission.created_at <= filters.date_to)
        
        results = query.order_by(desc(Commission.created_at)).all()
        
        export_rows = []
        for result in results:
            commission = result[0]  # Commission object
            professional_name = result[1] or result[2] or 'Unknown'  # full_name or email
            appointment_date = result[3] or date.today()
            service_name = result[4] or 'Unknown'
            payment_date = result[5]  # Will be None if not paid
            
            export_row = CommissionExportRow(
                professional_name=professional_name,
                appointment_date=appointment_date,
                service_name=service_name,
                service_price=commission.service_price,
                commission_percentage=commission.commission_percentage,
                calculated_value=commission.calculated_value,
                adjusted_value=commission.adjusted_value,
                final_value=commission.adjusted_value or commission.calculated_value,
                payment_status=commission.payment_status.value,
                payment_date=payment_date,
                created_at=commission.created_at
            )
            export_rows.append(export_row)
        
        return export_rows
    
    def _build_commission_response(self, commission: Commission) -> CommissionResponse:
        """Builds a CommissionResponse with additional data."""
        # Get related data
        professional = self.db.query(User).filter(User.id == commission.professional_id).first()
        appointment = self.db.query(Appointment).filter(Appointment.id == commission.appointment_id).first()
        service = self.db.query(Service).filter(Service.id == appointment.service_id).first() if appointment else None
        
        return CommissionResponse(
            id=commission.id,
            professional_id=commission.professional_id,
            appointment_id=commission.appointment_id,
            service_price=commission.service_price,
            commission_percentage=commission.commission_percentage,
            calculated_value=commission.calculated_value,
            adjusted_value=commission.adjusted_value,
            adjustment_reason=commission.adjustment_reason,
            payment_status=commission.payment_status,
            created_at=commission.created_at,
            updated_at=commission.updated_at,
            professional_name=professional.full_name or professional.email if professional else None,
            service_name=service.name if service else None,
            appointment_date=appointment.appointment_date if appointment else None,
            final_value=commission.adjusted_value or commission.calculated_value
        )
    
    def _build_payment_response(self, payment: CommissionPayment) -> CommissionPaymentResponse:
        """Builds a CommissionPaymentResponse with additional data."""
        professional = self.db.query(User).filter(User.id == payment.professional_id).first()
        commission_count = len(payment.payment_items)
        
        return CommissionPaymentResponse(
            id=payment.id,
            professional_id=payment.professional_id,
            total_amount=payment.total_amount,
            payment_method=payment.payment_method,
            payment_date=payment.payment_date,
            period_start=payment.period_start,
            period_end=payment.period_end,
            receipt_url=payment.receipt_url,
            notes=payment.notes,
            created_at=payment.created_at,
            professional_name=professional.full_name or professional.email if professional else None,
            commission_count=commission_count
        )
    
    def generate_commission_pdf(self, filters: Union[CommissionFilters, CommissionExportFilters]) -> bytes:
        """
        Generates a PDF report of commission data.
        
        Args:
            filters: Filters to apply
            
        Returns:
            PDF content as bytes
        """
        # Get commission data
        export_data = self.get_commission_export_data(filters)
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1f2937'),
            alignment=1,  # Center alignment
            spaceAfter=30
        )
        
        # Build PDF content
        story = []
        
        # Title
        title = Paragraph("Relatório de Comissões", title_style)
        story.append(title)
        
        # Add filters info if any
        filter_info = []
        if filters.professional_id:
            filter_info.append(f"Profissional: {filters.professional_id}")
        if filters.payment_status:
            filter_info.append(f"Status: {filters.payment_status}")
        if filters.date_from:
            filter_info.append(f"Data inicial: {filters.date_from.strftime('%d/%m/%Y')}")
        if filters.date_to:
            filter_info.append(f"Data final: {filters.date_to.strftime('%d/%m/%Y')}")
        
        if filter_info:
            filter_text = " | ".join(filter_info)
            filter_para = Paragraph(f"<b>Filtros aplicados:</b> {filter_text}", styles['Normal'])
            story.append(filter_para)
            story.append(Spacer(1, 20))
        
        # Add generation date
        gen_date = datetime.now().strftime('%d/%m/%Y às %H:%M')
        date_para = Paragraph(f"<b>Gerado em:</b> {gen_date}", styles['Normal'])
        story.append(date_para)
        story.append(Spacer(1, 20))
        
        if not export_data:
            no_data_para = Paragraph("Nenhuma comissão encontrada para os filtros aplicados.", styles['Normal'])
            story.append(no_data_para)
        else:
            # Create table data
            headers = [
                'Profissional',
                'Data',
                'Serviço',
                'Preço',
                'Comissão %',
                'Valor Calculado',
                'Valor Ajustado',
                'Valor Final',
                'Status'
            ]
            
            table_data = [headers]
            
            # Add data rows
            for row in export_data:
                table_data.append([
                    row.professional_name,
                    row.appointment_date.strftime('%d/%m/%Y'),
                    row.service_name[:25] + '...' if len(row.service_name) > 25 else row.service_name,
                    f'R$ {row.service_price:.2f}'.replace('.', ','),
                    f'{row.commission_percentage:.1f}%',
                    f'R$ {row.calculated_value:.2f}'.replace('.', ','),
                    f'R$ {row.adjusted_value:.2f}'.replace('.', ',') if row.adjusted_value else '-',
                    f'R$ {row.final_value:.2f}'.replace('.', ','),
                    'Pago' if row.payment_status == 'PAID' else 'Pendente' if row.payment_status == 'PENDING' else 'Estornado'
                ])
            
            # Create table
            table = Table(table_data, colWidths=[
                1.1*inch,  # Profissional
                0.7*inch,  # Data
                1.0*inch,  # Serviço
                0.7*inch,  # Preço
                0.7*inch,  # Comissão %
                1.0*inch,  # Valor Calculado
                1.0*inch,  # Valor Ajustado
                0.9*inch,  # Valor Final
                0.7*inch   # Status
            ])
            
            # Style the table
            table.setStyle(TableStyle([
                # Header style
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                
                # Data rows style
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Professional name left aligned
                ('ALIGN', (2, 1), (2, -1), 'LEFT'),  # Service name left aligned
                ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Numbers right aligned
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                
                # Borders
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
                
                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            
            story.append(table)
            
            # Add summary
            story.append(Spacer(1, 30))
            
            # Calculate totals
            total_pending = sum(row.final_value for row in export_data if row.payment_status == 'PENDING')
            total_paid = sum(row.final_value for row in export_data if row.payment_status == 'PAID')
            total_overall = sum(row.final_value for row in export_data)
            
            summary_data = [
                ['Resumo', ''],
                ['Total de comissões:', f'{len(export_data)}'],
                ['Total pendente:', f'R$ {total_pending:.2f}'.replace('.', ',')],
                ['Total pago:', f'R$ {total_paid:.2f}'.replace('.', ',')],
                ['Total geral:', f'R$ {total_overall:.2f}'.replace('.', ',')]
            ]
            
            summary_table = Table(summary_data, colWidths=[2*inch, 1.5*inch])
            summary_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ]))
            
            story.append(summary_table)
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def generate_commission_receipt_pdf(self, filters: Union[CommissionFilters, CommissionExportFilters]) -> bytes:
        """
        Generates a PDF receipt for paid commissions based on filters.
        This is used to re-generate receipts for previously paid commissions.
        
        Args:
            filters: Filters to apply (should include payment_status=PAID)
            
        Returns:
            PDF content as bytes
        """
        # Force payment status to PAID for receipts
        filters.payment_status = CommissionPaymentStatus.PAID
        
        # Get commission data
        export_data = self.get_commission_export_data(filters)
        
        if not export_data:
            raise ValueError("Nenhuma comissão paga encontrada para os filtros aplicados")
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReceiptTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1f2937'),
            alignment=1,  # Center alignment
            spaceAfter=20
        )
        
        subtitle_style = ParagraphStyle(
            'ReceiptSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#4b5563'),
            alignment=1,  # Center alignment
            spaceAfter=30
        )
        
        # Build PDF content
        story = []
        
        # Title
        title = Paragraph("RECIBO DE PAGAMENTO DE COMISSÕES", title_style)
        story.append(title)
        
        # Receipt info
        receipt_info = Paragraph(
            f"<b>Data de Emissão:</b> {datetime.now().strftime('%d/%m/%Y às %H:%M')}",
            subtitle_style
        )
        story.append(receipt_info)
        
        # Period and professional info
        period_start = min(row.appointment_date for row in export_data)
        period_end = max(row.appointment_date for row in export_data)
        professionals = list(set(row.professional_name for row in export_data))
        total_amount = sum(row.final_value for row in export_data)
        
        payment_info_data = [
            ['INFORMAÇÕES DO RECIBO', ''],
            ['Profissional(is):', ', '.join(professionals)],
            ['Período:', f'{period_start.strftime("%d/%m/%Y")} a {period_end.strftime("%d/%m/%Y")}'],
            ['Total de Comissões:', f'{len(export_data)} item(s)'],
            ['Valor Total:', f'R$ {total_amount:.2f}'.replace('.', ',')],
        ]
        
        payment_info_table = Table(payment_info_data, colWidths=[2.5*inch, 4*inch])
        payment_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(payment_info_table)
        story.append(Spacer(1, 30))
        
        # Commission details
        story.append(Paragraph("<b>DETALHAMENTO DAS COMISSÕES PAGAS</b>", styles['Heading3']))
        story.append(Spacer(1, 15))
        
        # Create commission details table
        commission_headers = [
            'Data',
            'Profissional',
            'Serviço',
            'Preço Serviço',
            'Comissão %',
            'Valor Comissão'
        ]
        
        commission_data = [commission_headers]
        
        for row in export_data:
            commission_data.append([
                row.appointment_date.strftime('%d/%m/%Y'),
                row.professional_name[:20] + '...' if len(row.professional_name) > 20 else row.professional_name,
                row.service_name[:25] + '...' if len(row.service_name) > 25 else row.service_name,
                f'R$ {row.service_price:.2f}'.replace('.', ','),
                f'{row.commission_percentage:.1f}%',
                f'R$ {row.final_value:.2f}'.replace('.', ',')
            ])
        
        commission_table = Table(commission_data, colWidths=[
            0.8*inch,  # Data
            1.4*inch,  # Profissional
            1.8*inch,  # Serviço
            1.0*inch,  # Preço
            0.7*inch,  # %
            1.0*inch   # Valor
        ])
        
        commission_table.setStyle(TableStyle([
            # Header style
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Data rows style
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Date center
            ('ALIGN', (1, 1), (2, -1), 'LEFT'),    # Professional and service left
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Numbers right
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Borders
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        
        story.append(commission_table)
        story.append(Spacer(1, 30))
        
        # Total summary
        total_data = [
            ['TOTAL DAS COMISSÕES PAGAS', f'R$ {total_amount:.2f}'.replace('.', ',')]
        ]
        
        total_table = Table(total_data, colWidths=[4*inch, 2*inch])
        total_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 2, colors.HexColor('#1f2937')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        story.append(total_table)
        story.append(Spacer(1, 50))
        
        # Footer
        footer_text = Paragraph(
            f"<i>Este recibo apresenta o detalhamento de comissões pagas no período "
            f"de {period_start.strftime('%d/%m/%Y')} a {period_end.strftime('%d/%m/%Y')}.</i>",
            styles['Normal']
        )
        story.append(footer_text)
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def generate_payment_receipt_pdf(self, payment_id: UUID) -> bytes:
        """
        Generates a PDF receipt for a commission payment.
        
        Args:
            payment_id: UUID of the commission payment
            
        Returns:
            PDF content as bytes
        """
        # Get payment with related data
        payment = self.db.query(CommissionPayment)\
            .options(joinedload(CommissionPayment.payment_items))\
            .filter(CommissionPayment.id == payment_id)\
            .first()
        
        if not payment:
            raise ValueError(f"Payment with ID {payment_id} not found")
        
        # Get professional data
        professional = self.db.query(User).filter(User.id == payment.professional_id).first()
        
        # Get commission details
        commission_ids = [item.commission_id for item in payment.payment_items]
        commissions = self.db.query(Commission)\
            .filter(Commission.id.in_(commission_ids))\
            .all()
        
        # Get appointment and service details
        appointment_ids = [c.appointment_id for c in commissions]
        appointments = {a.id: a for a in self.db.query(Appointment).filter(Appointment.id.in_(appointment_ids)).all()}
        
        service_ids = [a.service_id for a in appointments.values() if a.service_id]
        services = {s.id: s for s in self.db.query(Service).filter(Service.id.in_(service_ids)).all()}
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReceiptTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1f2937'),
            alignment=1,  # Center alignment
            spaceAfter=20
        )
        
        subtitle_style = ParagraphStyle(
            'ReceiptSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#4b5563'),
            alignment=1,  # Center alignment
            spaceAfter=30
        )
        
        # Build PDF content
        story = []
        
        # Title
        title = Paragraph("RECIBO DE PAGAMENTO DE COMISSÃO", title_style)
        story.append(title)
        
        # Receipt number and date
        receipt_info = Paragraph(
            f"<b>Recibo Nº:</b> {str(payment.id)[:8].upper()}<br/>"
            f"<b>Data de Emissão:</b> {datetime.now().strftime('%d/%m/%Y às %H:%M')}",
            subtitle_style
        )
        story.append(receipt_info)
        
        # Payment information
        payment_info_data = [
            ['DADOS DO PAGAMENTO', ''],
            ['Profissional:', professional.full_name or professional.email if professional else 'N/A'],
            ['Valor Total:', f'R$ {payment.total_amount:.2f}'.replace('.', ',')],
            ['Forma de Pagamento:', {
                'CASH': 'Dinheiro',
                'PIX': 'PIX',
                'BANK_TRANSFER': 'Transferência Bancária',
                'CARD': 'Cartão',
                'OTHER': 'Outro'
            }.get(payment.payment_method.value, payment.payment_method.value)],
            ['Data de Pagamento:', payment.payment_date.strftime('%d/%m/%Y')],
            ['Período:', f'{payment.period_start.strftime("%d/%m/%Y")} a {payment.period_end.strftime("%d/%m/%Y")}'],
        ]
        
        if payment.notes:
            payment_info_data.append(['Observações:', payment.notes])
        
        payment_info_table = Table(payment_info_data, colWidths=[2.5*inch, 4*inch])
        payment_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(payment_info_table)
        story.append(Spacer(1, 30))
        
        # Commission details
        story.append(Paragraph("<b>DETALHAMENTO DAS COMISSÕES</b>", styles['Heading3']))
        story.append(Spacer(1, 15))
        
        # Create commission details table
        commission_headers = [
            'Data',
            'Serviço',
            'Preço Serviço',
            'Comissão %',
            'Valor Comissão'
        ]
        
        commission_data = [commission_headers]
        
        for commission in commissions:
            appointment = appointments.get(commission.appointment_id)
            service = services.get(appointment.service_id) if appointment else None
            
            commission_data.append([
                appointment.appointment_date.strftime('%d/%m/%Y') if appointment else '-',
                service.name[:30] + '...' if service and len(service.name) > 30 else (service.name if service else 'N/A'),
                f'R$ {commission.service_price:.2f}'.replace('.', ','),
                f'{commission.commission_percentage:.1f}%',
                f'R$ {(commission.adjusted_value or commission.calculated_value):.2f}'.replace('.', ',')
            ])
        
        commission_table = Table(commission_data, colWidths=[
            1.0*inch,  # Data
            2.2*inch,  # Serviço
            1.2*inch,  # Preço
            0.8*inch,  # %
            1.2*inch   # Valor
        ])
        
        commission_table.setStyle(TableStyle([
            # Header style
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Data rows style
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Date center
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Service left
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Numbers right
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Borders
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        
        story.append(commission_table)
        story.append(Spacer(1, 30))
        
        # Total summary
        total_data = [
            ['TOTAL PAGO', f'R$ {payment.total_amount:.2f}'.replace('.', ',')]
        ]
        
        total_table = Table(total_data, colWidths=[4*inch, 2*inch])
        total_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 2, colors.HexColor('#1f2937')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        story.append(total_table)
        story.append(Spacer(1, 50))
        
        # Footer
        footer_text = Paragraph(
            f"<i>Este recibo comprova o pagamento de comissões no valor de "
            f"R$ {payment.total_amount:.2f}".replace('.', ',') + 
            f" realizado em {payment.payment_date.strftime('%d/%m/%Y')}.</i>",
            styles['Normal']
        )
        story.append(footer_text)
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def generate_commission_receipt_pdf(self, filters: Union[CommissionFilters, CommissionExportFilters]) -> bytes:
        """
        Generates a PDF receipt for paid commissions based on filters.
        This is used to re-generate receipts for previously paid commissions.
        
        Args:
            filters: Filters to apply (should include payment_status=PAID)
            
        Returns:
            PDF content as bytes
        """
        # Force payment status to PAID for receipts
        filters.payment_status = CommissionPaymentStatus.PAID
        
        # Get commission data
        export_data = self.get_commission_export_data(filters)
        
        if not export_data:
            raise ValueError("Nenhuma comissão paga encontrada para os filtros aplicados")
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReceiptTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1f2937'),
            alignment=1,  # Center alignment
            spaceAfter=20
        )
        
        subtitle_style = ParagraphStyle(
            'ReceiptSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#4b5563'),
            alignment=1,  # Center alignment
            spaceAfter=30
        )
        
        # Build PDF content
        story = []
        
        # Title
        title = Paragraph("RECIBO DE PAGAMENTO DE COMISSÕES", title_style)
        story.append(title)
        
        # Receipt info
        receipt_info = Paragraph(
            f"<b>Data de Emissão:</b> {datetime.now().strftime('%d/%m/%Y às %H:%M')}",
            subtitle_style
        )
        story.append(receipt_info)
        
        # Period and professional info
        period_start = min(row.appointment_date for row in export_data)
        period_end = max(row.appointment_date for row in export_data)
        professionals = list(set(row.professional_name for row in export_data))
        total_amount = sum(row.final_value for row in export_data)
        
        payment_info_data = [
            ['INFORMAÇÕES DO RECIBO', ''],
            ['Profissional(is):', ', '.join(professionals)],
            ['Período:', f'{period_start.strftime("%d/%m/%Y")} a {period_end.strftime("%d/%m/%Y")}'],
            ['Total de Comissões:', f'{len(export_data)} item(s)'],
            ['Valor Total:', f'R$ {total_amount:.2f}'.replace('.', ',')],
        ]
        
        payment_info_table = Table(payment_info_data, colWidths=[2.5*inch, 4*inch])
        payment_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(payment_info_table)
        story.append(Spacer(1, 30))
        
        # Commission details
        story.append(Paragraph("<b>DETALHAMENTO DAS COMISSÕES PAGAS</b>", styles['Heading3']))
        story.append(Spacer(1, 15))
        
        # Create commission details table
        commission_headers = [
            'Data',
            'Profissional',
            'Serviço',
            'Preço Serviço',
            'Comissão %',
            'Valor Comissão'
        ]
        
        commission_data = [commission_headers]
        
        for row in export_data:
            commission_data.append([
                row.appointment_date.strftime('%d/%m/%Y'),
                row.professional_name[:20] + '...' if len(row.professional_name) > 20 else row.professional_name,
                row.service_name[:25] + '...' if len(row.service_name) > 25 else row.service_name,
                f'R$ {row.service_price:.2f}'.replace('.', ','),
                f'{row.commission_percentage:.1f}%',
                f'R$ {row.final_value:.2f}'.replace('.', ',')
            ])
        
        commission_table = Table(commission_data, colWidths=[
            0.8*inch,  # Data
            1.4*inch,  # Profissional
            1.8*inch,  # Serviço
            1.0*inch,  # Preço
            0.7*inch,  # %
            1.0*inch   # Valor
        ])
        
        commission_table.setStyle(TableStyle([
            # Header style
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Data rows style
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Date center
            ('ALIGN', (1, 1), (2, -1), 'LEFT'),    # Professional and service left
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Numbers right
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Borders
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        
        story.append(commission_table)
        story.append(Spacer(1, 30))
        
        # Total summary
        total_data = [
            ['TOTAL DAS COMISSÕES PAGAS', f'R$ {total_amount:.2f}'.replace('.', ',')]
        ]
        
        total_table = Table(total_data, colWidths=[4*inch, 2*inch])
        total_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 2, colors.HexColor('#1f2937')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        story.append(total_table)
        story.append(Spacer(1, 50))
        
        # Footer
        footer_text = Paragraph(
            f"<i>Este recibo apresenta o detalhamento de comissões pagas no período "
            f"de {period_start.strftime('%d/%m/%Y')} a {period_end.strftime('%d/%m/%Y')}.</i>",
            styles['Normal']
        )
        story.append(footer_text)
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes