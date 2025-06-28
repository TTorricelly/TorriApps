from enum import Enum

class NFSeStatus(Enum):
    """Status of NFS-e invoice"""
    TEST = "TEST"
    ISSUED = "ISSUED" 
    ERROR = "ERROR"
    CANCELLED = "CANCELLED"

class CertificateStatus(Enum):
    """Status of fiscal certificate"""
    PENDING = "PENDING"
    TEST_MODE = "TEST_MODE"
    PRODUCTION = "PRODUCTION"
    EXPIRED = "EXPIRED"
    ERROR = "ERROR"

class NFSeErrorCode(Enum):
    """Common NFS-e error codes from Goiânia web service"""
    INVALID_CNPJ = "L002"
    DUPLICATE_RPS = "L101"
    INVALID_CERTIFICATE = "L003"
    SERVICE_UNAVAILABLE = "L999"
    TIMEOUT = "T001"

# SOAP endpoint for Goiânia NFS-e service
GOIANIA_SOAP_ENDPOINT = "https://nfse.goiania.go.gov.br/ws/nfse.asmx"
GOIANIA_WSDL_URL = "https://nfse.goiania.go.gov.br/ws/nfse.asmx?wsdl"

# Test series for homologation
TEST_RPS_SERIES = "TESTE"

# Default ISS aliquota (rate) for services in percentage
DEFAULT_ISS_ALIQUOTA = 2.0

# Certificate expiry warning days
CERT_EXPIRY_WARNING_DAYS = 30

# PDF size limit in bytes (500KB as per PRD)
PDF_SIZE_LIMIT = 500 * 1024

# Maximum certificate file size (10MB as per PRD)
CERT_FILE_SIZE_LIMIT = 10 * 1024 * 1024

# Goiânia municipal support email
MUNICIPAL_SUPPORT_EMAIL = "suporte.nfse@goiania.go.gov.br"