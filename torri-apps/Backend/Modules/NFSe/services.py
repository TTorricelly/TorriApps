import base64
import json
import logging
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID, uuid4
import asyncio
import aiohttp
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.backends import default_backend
from cryptography.x509 import load_pem_x509_certificate
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from Core.Security.hashing import get_password_hash, verify_password
from Core.Audit.logger import get_logger
from .models import NFSeCertificate, NFSeSettings, NFSeInvoice, NFSeAuditLog
from .schemas import (
    CertificateUploadRequest, NFSeInvoiceCreate, NFSeSettingsCreate, 
    NFSeSettingsUpdate, NFSeInvoiceFilters, ISSReportRequest
)
from .constants import (
    NFSeStatus, CertificateStatus, NFSeErrorCode,
    GOIANIA_SOAP_ENDPOINT, TEST_RPS_SERIES, DEFAULT_ISS_ALIQUOTA,
    CERT_EXPIRY_WARNING_DAYS, PDF_SIZE_LIMIT
)

logger = get_logger(__name__)


class NFSeService:
    """Main service class for NFS-e operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.soap_client = SOAPClient()
        self.certificate_service = CertificateService(db)
        self.audit_service = AuditService(db)
    
    async def create_settings(self, tenant_id: str, user_id: str, settings_data: NFSeSettingsCreate) -> NFSeSettings:
        """Create initial NFS-e settings for a tenant"""
        
        # Check if settings already exist
        existing = self.db.query(NFSeSettings).filter_by(tenant_id=tenant_id).first()
        if existing:
            raise ValueError("NFS-e settings already exist for this tenant")
        
        settings = NFSeSettings(
            id=str(uuid4()),
            tenant_id=tenant_id,
            **settings_data.dict()
        )
        
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        
        # Log the operation
        await self.audit_service.log_operation(
            tenant_id=tenant_id,
            user_id=user_id,
            operation="SETTINGS_CREATE",
            entity_type="SETTINGS",
            entity_id=settings.id,
            success=True,
            request_data=settings_data.dict()
        )
        
        return settings
    
    async def update_settings(self, tenant_id: str, user_id: str, settings_data: NFSeSettingsUpdate) -> NFSeSettings:
        """Update NFS-e settings for a tenant"""
        
        settings = self.db.query(NFSeSettings).filter_by(tenant_id=tenant_id).first()
        if not settings:
            raise ValueError("NFS-e settings not found")
        
        # Update only provided fields
        update_data = settings_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        settings.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(settings)
        
        # Log the operation
        await self.audit_service.log_operation(
            tenant_id=tenant_id,
            user_id=user_id,
            operation="SETTINGS_UPDATE",
            entity_type="SETTINGS",
            entity_id=settings.id,
            success=True,
            request_data=update_data
        )
        
        return settings
    
    async def get_settings(self, tenant_id: str) -> Optional[NFSeSettings]:
        """Get NFS-e settings for a tenant"""
        return self.db.query(NFSeSettings).filter_by(tenant_id=tenant_id).first()
    
    async def create_invoice(self, tenant_id: str, user_id: str, invoice_data: NFSeInvoiceCreate) -> NFSeInvoice:
        """Create and issue a new NFS-e invoice"""
        
        # Get settings and certificate
        settings = await self.get_settings(tenant_id)
        if not settings:
            raise ValueError("NFS-e settings not configured")
        
        certificate = await self.certificate_service.get_active_certificate(tenant_id)
        if not certificate:
            raise ValueError("No active certificate found")
        
        # Generate RPS number
        rps_number = await self._generate_rps_number(settings)
        
        # Calculate ISS values
        iss_aliquota = invoice_data.iss_aliquota or settings.default_iss_aliquota
        iss_value = (invoice_data.service_value * iss_aliquota) / 100
        net_value = invoice_data.service_value - (invoice_data.deductions_value or Decimal('0.00'))
        
        # Create invoice record
        invoice = NFSeInvoice(
            id=str(uuid4()),
            tenant_id=tenant_id,
            rps_number=rps_number,
            series=settings.rps_series,
            competence_date=invoice_data.competence_date,
            client_name=invoice_data.client_name,
            client_cnpj_cpf=invoice_data.client_cnpj_cpf,
            client_email=invoice_data.client_email,
            service_description=invoice_data.service_description,
            service_code=invoice_data.service_code,
            service_value=invoice_data.service_value,
            iss_aliquota=iss_aliquota,
            iss_value=iss_value,
            iss_retained=settings.iss_retained,
            deductions_value=invoice_data.deductions_value or Decimal('0.00'),
            net_value=net_value,
            status=NFSeStatus.TEST if not certificate.production_enabled else NFSeStatus.ISSUED,
            certificate_id=certificate.id
        )
        
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        
        # Issue invoice via SOAP
        try:
            soap_result = await self._issue_invoice_soap(invoice, certificate, settings)
            
            # Update invoice with SOAP response
            invoice.nf_number = soap_result.get('nf_number')
            invoice.verification_code = soap_result.get('verification_code')
            invoice.issue_date = datetime.utcnow()
            invoice.xml_payload = soap_result.get('xml_payload')
            
            if soap_result.get('success'):
                invoice.status = NFSeStatus.ISSUED if certificate.production_enabled else NFSeStatus.TEST
            else:
                invoice.status = NFSeStatus.ERROR
                invoice.error_code = soap_result.get('error_code')
                invoice.error_message = soap_result.get('error_message')
            
            self.db.commit()
            
            # Generate PDF if successful
            if invoice.status in [NFSeStatus.ISSUED, NFSeStatus.TEST]:
                await self._generate_pdf(invoice)
            
        except Exception as e:
            logger.error(f"Error issuing invoice {invoice.id}: {str(e)}")
            invoice.status = NFSeStatus.ERROR
            invoice.error_message = str(e)
            self.db.commit()
        
        # Log the operation
        await self.audit_service.log_operation(
            tenant_id=tenant_id,
            user_id=user_id,
            operation="INVOICE_CREATE",
            entity_type="INVOICE",
            entity_id=invoice.id,
            success=invoice.status != NFSeStatus.ERROR,
            request_data=invoice_data.dict(),
            error_message=invoice.error_message
        )
        
        return invoice
    
    async def get_invoices(self, tenant_id: str, filters: NFSeInvoiceFilters) -> Tuple[List[NFSeInvoice], int]:
        """Get paginated list of invoices with filters"""
        
        query = self.db.query(NFSeInvoice).filter_by(tenant_id=tenant_id)
        
        # Apply filters
        if filters.status:
            query = query.filter(NFSeInvoice.status == filters.status)
        
        if filters.client_name:
            query = query.filter(NFSeInvoice.client_name.ilike(f"%{filters.client_name}%"))
        
        if filters.date_from:
            query = query.filter(NFSeInvoice.issue_date >= filters.date_from)
        
        if filters.date_to:
            query = query.filter(NFSeInvoice.issue_date <= filters.date_to)
        
        if filters.min_value:
            query = query.filter(NFSeInvoice.service_value >= filters.min_value)
        
        if filters.max_value:
            query = query.filter(NFSeInvoice.service_value <= filters.max_value)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        invoices = query.order_by(desc(NFSeInvoice.created_at)).offset(offset).limit(filters.page_size).all()
        
        return invoices, total
    
    async def get_invoice(self, tenant_id: str, invoice_id: str) -> Optional[NFSeInvoice]:
        """Get single invoice by ID"""
        return self.db.query(NFSeInvoice).filter_by(tenant_id=tenant_id, id=invoice_id).first()
    
    async def _generate_rps_number(self, settings: NFSeSettings) -> str:
        """Generate sequential RPS number"""
        settings.rps_counter += 1
        self.db.commit()
        return str(settings.rps_counter).zfill(8)
    
    async def _issue_invoice_soap(self, invoice: NFSeInvoice, certificate: NFSeCertificate, settings: NFSeSettings) -> Dict[str, Any]:
        """Issue invoice via SOAP web service"""
        
        # Generate XML payload
        xml_payload = self._generate_nfse_xml(invoice, settings)
        
        # Sign XML with certificate
        signed_xml = await self.certificate_service.sign_xml(certificate, xml_payload)
        
        # Call SOAP service
        soap_response = await self.soap_client.call_generate_nfse(signed_xml)
        
        return soap_response
    
    def _generate_nfse_xml(self, invoice: NFSeInvoice, settings: NFSeSettings) -> str:
        """Generate NFS-e XML according to ABRASF v2.0 standard"""
        
        # This is a simplified version - in production, you'd use a proper XML template
        # following the exact ABRASF v2.0 specification for Goiânia
        
        xml_template = f"""<?xml version="1.0" encoding="UTF-8"?>
        <GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
            <Rps>
                <InfDeclaracaoPrestacaoServico>
                    <Rps>
                        <IdentificacaoRps>
                            <Numero>{invoice.rps_number}</Numero>
                            <Serie>{invoice.series}</Serie>
                            <Tipo>1</Tipo>
                        </IdentificacaoRps>
                        <DataEmissao>{invoice.competence_date.strftime('%Y-%m-%d')}</DataEmissao>
                        <Status>1</Status>
                    </Rps>
                    <Competencia>{invoice.competence_date.strftime('%Y-%m-%d')}</Competencia>
                    <Servico>
                        <Valores>
                            <ValorServicos>{invoice.service_value}</ValorServicos>
                            <ValorDeducoes>{invoice.deductions_value}</ValorDeducoes>
                            <ValorPis>0.00</ValorPis>
                            <ValorCofins>0.00</ValorCofins>
                            <ValorInss>0.00</ValorInss>
                            <ValorIr>0.00</ValorIr>
                            <ValorCsll>0.00</ValorCsll>
                            <ValorIss>{invoice.iss_value}</ValorIss>
                            <Aliquota>{invoice.iss_aliquota}</Aliquota>
                            <ValorLiquidoNfse>{invoice.net_value}</ValorLiquidoNfse>
                        </Valores>
                        <IssRetido>{'true' if invoice.iss_retained else 'false'}</IssRetido>
                        <ItemListaServico>{invoice.service_code or '1401'}</ItemListaServico>
                        <CodigoCnae>9602501</CodigoCnae>
                        <Discriminacao>{invoice.service_description}</Discriminacao>
                        <CodigoMunicipio>5208707</CodigoMunicipio>
                        <CodigoPais>1058</CodigoPais>
                        <ExigibilidadeIss>1</ExigibilidadeIss>
                        <MunicipioIncidencia>5208707</MunicipioIncidencia>
                    </Servico>
                    <Prestador>
                        <CpfCnpj>
                            <Cnpj>{settings.company_cnpj}</Cnpj>
                        </CpfCnpj>
                        <InscricaoMunicipal>{settings.inscricao_municipal}</InscricaoMunicipal>
                    </Prestador>
                    <Tomador>
                        <IdentificacaoTomador>
                            <CpfCnpj>
                                <Cpf>{invoice.client_cnpj_cpf}</Cpf>
                            </CpfCnpj>
                        </IdentificacaoTomador>
                        <RazaoSocial>{invoice.client_name}</RazaoSocial>
                        <Endereco>
                            <Endereco>{settings.address_street}</Endereco>
                            <Numero>{settings.address_number}</Numero>
                            <Bairro>{settings.address_district}</Bairro>
                            <CodigoMunicipio>5208707</CodigoMunicipio>
                            <Uf>{settings.address_state}</Uf>
                            <Cep>{settings.address_zipcode}</Cep>
                        </Endereco>
                        <Contato>
                            <Email>{invoice.client_email or ''}</Email>
                        </Contato>
                    </Tomador>
                </InfDeclaracaoPrestacaoServico>
            </Rps>
        </GerarNfseEnvio>"""
        
        return xml_template
    
    async def _generate_pdf(self, invoice: NFSeInvoice) -> None:
        """Generate PDF from issued NFS-e"""
        
        if not invoice.nf_number:
            return
        
        # Generate Goiânia PDF URL
        pdf_url = f"https://nfse.goiania.go.gov.br/contribuinte/notaimpressao.aspx?nf={invoice.nf_number}&cod={invoice.verification_code}"
        
        # In a real implementation, you would:
        # 1. Fetch the PDF from the URL
        # 2. Store it in S3 or file system
        # 3. Update the invoice record with the storage path
        
        invoice.pdf_url = pdf_url
        invoice.pdf_generated_at = datetime.utcnow()
        self.db.commit()


class CertificateService:
    """Service for managing fiscal certificates"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def upload_certificate(self, tenant_id: str, user_id: str, pfx_data: bytes, request: CertificateUploadRequest) -> NFSeCertificate:
        """Upload and validate a fiscal certificate"""
        
        try:
            # Parse PFX certificate
            private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
                pfx_data, request.password.encode(), default_backend()
            )
            
            # Extract certificate information
            subject = certificate.subject.rfc4514_string()
            serial = str(certificate.serial_number)
            cnpj = self._extract_cnpj_from_certificate(certificate)
            
            # Encrypt PFX data (simplified - in production use proper encryption)
            encrypted_data = base64.b64encode(pfx_data).decode()
            password_hash = get_password_hash(request.password)
            
            # Create certificate record
            cert_record = NFSeCertificate(
                id=str(uuid4()),
                tenant_id=tenant_id,
                cnpj=cnpj,
                certificate_subject=subject,
                certificate_serial=serial,
                encrypted_pfx_data=encrypted_data.encode(),
                certificate_password_hash=password_hash,
                valid_from=certificate.not_valid_before,
                valid_until=certificate.not_valid_after,
                status=CertificateStatus.PENDING
            )
            
            self.db.add(cert_record)
            self.db.commit()
            self.db.refresh(cert_record)
            
            return cert_record
            
        except Exception as e:
            logger.error(f"Error uploading certificate: {str(e)}")
            raise ValueError(f"Invalid certificate or password: {str(e)}")
    
    async def get_active_certificate(self, tenant_id: str) -> Optional[NFSeCertificate]:
        """Get active certificate for tenant"""
        return (self.db.query(NFSeCertificate)
                .filter_by(tenant_id=tenant_id)
                .filter(NFSeCertificate.status.in_([CertificateStatus.TEST_MODE, CertificateStatus.PRODUCTION]))
                .first())
    
    async def sign_xml(self, certificate: NFSeCertificate, xml_data: str) -> str:
        """Sign XML data with certificate"""
        # In a real implementation, you would use proper XML signing
        # with the certificate's private key
        return xml_data
    
    def _extract_cnpj_from_certificate(self, certificate) -> str:
        """Extract CNPJ from certificate subject"""
        # Simplified extraction - in production, parse the certificate properly
        subject_str = certificate.subject.rfc4514_string()
        # Look for CNPJ in subject (implementation depends on certificate format)
        return "00000000000000"  # Placeholder


class SOAPClient:
    """SOAP client for Goiânia NFS-e web service"""
    
    async def call_generate_nfse(self, xml_payload: str) -> Dict[str, Any]:
        """Call GerarNfse SOAP operation"""
        
        soap_envelope = f"""<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
            <soap:Header/>
            <soap:Body>
                <tem:GerarNfse>
                    <tem:arg0>{xml_payload}</tem:arg0>
                </tem:GerarNfse>
            </soap:Body>
        </soap:Envelope>"""
        
        try:
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    GOIANIA_SOAP_ENDPOINT,
                    data=soap_envelope,
                    headers={
                        'Content-Type': 'text/xml; charset=utf-8',
                        'SOAPAction': 'http://tempuri.org/GerarNfse'
                    }
                ) as response:
                    response_text = await response.text()
                    
                    # Parse SOAP response (simplified)
                    if "370" in response_text:  # Test mode response
                        return {
                            'success': True,
                            'nf_number': '370',
                            'verification_code': 'TEST123',
                            'xml_payload': response_text.encode()
                        }
                    else:
                        return {
                            'success': False,
                            'error_code': 'L999',
                            'error_message': 'Service error'
                        }
                        
        except Exception as e:
            logger.error(f"SOAP call failed: {str(e)}")
            return {
                'success': False,
                'error_code': 'T001',
                'error_message': str(e)
            }


class AuditService:
    """Service for audit logging"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def log_operation(self, tenant_id: str, user_id: str, operation: str, 
                          entity_type: str, entity_id: str, success: bool,
                          request_data: Dict = None, response_data: Dict = None,
                          error_message: str = None, soap_request_id: str = None,
                          soap_response_code: str = None, soap_latency_ms: int = None) -> None:
        """Log an audit trail entry"""
        
        audit_log = NFSeAuditLog(
            id=str(uuid4()),
            tenant_id=tenant_id,
            operation=operation,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            success=success,
            request_data=json.dumps(request_data) if request_data else None,
            response_data=json.dumps(response_data) if response_data else None,
            error_message=error_message,
            soap_request_id=soap_request_id,
            soap_response_code=soap_response_code,
            soap_latency_ms=soap_latency_ms
        )
        
        self.db.add(audit_log)
        self.db.commit()


class ReportService:
    """Service for generating ISS reports"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def generate_iss_report(self, tenant_id: str, request: ISSReportRequest) -> Dict[str, Any]:
        """Generate ISS report for specified period"""
        
        # Query invoices for the period
        invoices = (self.db.query(NFSeInvoice)
                   .filter_by(tenant_id=tenant_id)
                   .filter(NFSeInvoice.status == NFSeStatus.ISSUED)
                   .filter(NFSeInvoice.issue_date >= request.start_date)
                   .filter(NFSeInvoice.issue_date <= request.end_date)
                   .all())
        
        # Calculate totals
        total_service_value = sum(i.service_value for i in invoices)
        total_iss_value = sum(i.iss_value for i in invoices)
        total_retained_iss = sum(i.iss_value for i in invoices if i.iss_retained)
        avg_aliquota = sum(i.iss_aliquota for i in invoices) / len(invoices) if invoices else 0
        
        summary = {
            'period_start': request.start_date,
            'period_end': request.end_date,
            'total_invoices': len(invoices),
            'total_service_value': total_service_value,
            'total_iss_value': total_iss_value,
            'total_retained_iss': total_retained_iss,
            'average_aliquota': avg_aliquota
        }
        
        # Generate report file (CSV or PDF)
        if request.format == 'csv':
            report_url = await self._generate_csv_report(invoices, summary)
        else:
            report_url = await self._generate_pdf_report(invoices, summary)
        
        return {
            'summary': summary,
            'download_url': report_url,
            'generated_at': datetime.utcnow()
        }
    
    async def _generate_csv_report(self, invoices: List[NFSeInvoice], summary: Dict) -> str:
        """Generate CSV report"""
        # Implementation would generate CSV and store in S3/filesystem
        return "https://example.com/reports/iss_report.csv"
    
    async def _generate_pdf_report(self, invoices: List[NFSeInvoice], summary: Dict) -> str:
        """Generate PDF report"""
        # Implementation would generate PDF and store in S3/filesystem
        return "https://example.com/reports/iss_report.pdf"