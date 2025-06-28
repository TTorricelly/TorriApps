"""add_nfse_tables

Revision ID: nfse_001
Revises: 0a118bc387cd
Create Date: 2025-06-28 21:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'nfse_001'
down_revision: Union[str, None] = '0a118bc387cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add NFS-e tables for Brazilian fiscal invoice management."""
    
    # Create NFSeStatus enum
    op.execute("CREATE TYPE nfsestatus AS ENUM ('TEST', 'ISSUED', 'ERROR', 'CANCELLED')")
    
    # Create CertificateStatus enum
    op.execute("CREATE TYPE certificatestatus AS ENUM ('PENDING', 'TEST_MODE', 'PRODUCTION', 'EXPIRED', 'ERROR')")
    
    # Create nfse_certificates table
    op.create_table(
        'nfse_certificates',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=True),
        sa.Column('cnpj', sa.String(14), nullable=False),
        sa.Column('certificate_subject', sa.String(255), nullable=True),
        sa.Column('certificate_serial', sa.String(50), nullable=True),
        sa.Column('encrypted_pfx_data', sa.LargeBinary(), nullable=False),
        sa.Column('certificate_password_hash', sa.String(255), nullable=False),
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'TEST_MODE', 'PRODUCTION', 'EXPIRED', 'ERROR', name='certificatestatus'), nullable=False),
        sa.Column('test_nf_number', sa.String(15), nullable=True),
        sa.Column('production_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for nfse_certificates
    op.create_index('idx_nfse_cert_tenant_cnpj', 'nfse_certificates', ['tenant_id', 'cnpj'])
    op.create_index('idx_nfse_cert_expiry', 'nfse_certificates', ['valid_until'])
    op.create_index('ix_nfse_certificates_cnpj', 'nfse_certificates', ['cnpj'])
    
    # Create nfse_settings table
    op.create_table(
        'nfse_settings',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=True),
        sa.Column('rps_counter', sa.Integer(), nullable=False, default=0),
        sa.Column('rps_series', sa.String(10), nullable=False, default='001'),
        sa.Column('company_name', sa.String(120), nullable=True),
        sa.Column('company_cnpj', sa.String(14), nullable=True),
        sa.Column('inscricao_municipal', sa.String(20), nullable=True),
        sa.Column('address_street', sa.String(200), nullable=True),
        sa.Column('address_number', sa.String(20), nullable=True),
        sa.Column('address_complement', sa.String(100), nullable=True),
        sa.Column('address_district', sa.String(100), nullable=True),
        sa.Column('address_city', sa.String(100), nullable=True),
        sa.Column('address_state', sa.String(2), nullable=True),
        sa.Column('address_zipcode', sa.String(8), nullable=True),
        sa.Column('default_iss_aliquota', sa.Numeric(5, 2), nullable=False, default=2.0),
        sa.Column('iss_retained', sa.Boolean(), nullable=False, default=False),
        sa.Column('accountant_email', sa.String(120), nullable=True),
        sa.Column('monthly_report_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create nfse_invoices table
    op.create_table(
        'nfse_invoices',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=True),
        sa.Column('nf_number', sa.String(15), nullable=True),
        sa.Column('rps_number', sa.String(15), nullable=False),
        sa.Column('series', sa.String(10), nullable=False, default='001'),
        sa.Column('issue_date', sa.DateTime(), nullable=True),
        sa.Column('competence_date', sa.DateTime(), nullable=False),
        sa.Column('client_name', sa.String(120), nullable=False),
        sa.Column('client_cnpj_cpf', sa.String(14), nullable=True),
        sa.Column('client_email', sa.String(120), nullable=True),
        sa.Column('service_description', sa.Text(), nullable=False),
        sa.Column('service_code', sa.String(10), nullable=True),
        sa.Column('service_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('iss_aliquota', sa.Numeric(5, 2), nullable=False, default=2.0),
        sa.Column('iss_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('iss_retained', sa.Boolean(), nullable=False, default=False),
        sa.Column('deductions_value', sa.Numeric(10, 2), nullable=False, default=0.00),
        sa.Column('net_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('status', sa.Enum('TEST', 'ISSUED', 'ERROR', 'CANCELLED', name='nfsestatus'), nullable=False),
        sa.Column('verification_code', sa.String(32), nullable=True),
        sa.Column('xml_payload', sa.LargeBinary(), nullable=True),
        sa.Column('pdf_url', sa.String(255), nullable=True),
        sa.Column('pdf_generated_at', sa.DateTime(), nullable=True),
        sa.Column('error_code', sa.String(10), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, default=0),
        sa.Column('certificate_id', UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['certificate_id'], ['nfse_certificates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for nfse_invoices
    op.create_index('idx_nfse_invoice_tenant_date', 'nfse_invoices', ['tenant_id', 'issue_date'])
    op.create_index('idx_nfse_invoice_rps', 'nfse_invoices', ['tenant_id', 'rps_number', 'series'])
    op.create_index('idx_nfse_invoice_client', 'nfse_invoices', ['client_cnpj_cpf'])
    op.create_index('idx_nfse_invoice_status', 'nfse_invoices', ['status'])
    op.create_index('ix_nfse_invoices_nf_number', 'nfse_invoices', ['nf_number'])
    op.create_index('ix_nfse_invoices_rps_number', 'nfse_invoices', ['rps_number'])
    
    # Create nfse_audit_logs table
    op.create_table(
        'nfse_audit_logs',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=True),
        sa.Column('operation', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('user_email', sa.String(120), nullable=True),
        sa.Column('request_data', sa.Text(), nullable=True),
        sa.Column('response_data', sa.Text(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('soap_request_id', sa.String(100), nullable=True),
        sa.Column('soap_response_code', sa.String(10), nullable=True),
        sa.Column('soap_latency_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for nfse_audit_logs
    op.create_index('idx_nfse_audit_tenant_date', 'nfse_audit_logs', ['tenant_id', 'created_at'])
    op.create_index('idx_nfse_audit_operation', 'nfse_audit_logs', ['operation'])
    op.create_index('idx_nfse_audit_entity', 'nfse_audit_logs', ['entity_type', 'entity_id'])


def downgrade() -> None:
    """Remove NFS-e tables."""
    
    # Drop indexes first
    op.drop_index('idx_nfse_audit_entity', table_name='nfse_audit_logs')
    op.drop_index('idx_nfse_audit_operation', table_name='nfse_audit_logs')
    op.drop_index('idx_nfse_audit_tenant_date', table_name='nfse_audit_logs')
    
    op.drop_index('ix_nfse_invoices_rps_number', table_name='nfse_invoices')
    op.drop_index('ix_nfse_invoices_nf_number', table_name='nfse_invoices')
    op.drop_index('idx_nfse_invoice_status', table_name='nfse_invoices')
    op.drop_index('idx_nfse_invoice_client', table_name='nfse_invoices')
    op.drop_index('idx_nfse_invoice_rps', table_name='nfse_invoices')
    op.drop_index('idx_nfse_invoice_tenant_date', table_name='nfse_invoices')
    
    op.drop_index('ix_nfse_certificates_cnpj', table_name='nfse_certificates')
    op.drop_index('idx_nfse_cert_expiry', table_name='nfse_certificates')
    op.drop_index('idx_nfse_cert_tenant_cnpj', table_name='nfse_certificates')
    
    # Drop tables
    op.drop_table('nfse_audit_logs')
    op.drop_table('nfse_invoices')
    op.drop_table('nfse_settings')
    op.drop_table('nfse_certificates')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS nfsestatus")
    op.execute("DROP TYPE IF EXISTS certificatestatus")