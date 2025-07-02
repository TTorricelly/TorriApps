"""
Brazilian validation utilities for CPF, CEP, and state codes.
Provides validation and formatting functions for Brazilian-specific data.
"""

import re
from typing import Optional


# Brazilian state codes mapping
BRAZILIAN_STATES = {
    'AC': 'Acre',
    'AL': 'Alagoas', 
    'AP': 'Amapá',
    'AM': 'Amazonas',
    'BA': 'Bahia',
    'CE': 'Ceará',
    'DF': 'Distrito Federal',
    'ES': 'Espírito Santo',
    'GO': 'Goiás',
    'MA': 'Maranhão',
    'MT': 'Mato Grosso',
    'MS': 'Mato Grosso do Sul',
    'MG': 'Minas Gerais',
    'PA': 'Pará',
    'PB': 'Paraíba',
    'PR': 'Paraná',
    'PE': 'Pernambuco',
    'PI': 'Piauí',
    'RJ': 'Rio de Janeiro',
    'RN': 'Rio Grande do Norte',
    'RS': 'Rio Grande do Sul',
    'RO': 'Rondônia',
    'RR': 'Roraima',
    'SC': 'Santa Catarina',
    'SP': 'São Paulo',
    'SE': 'Sergipe',
    'TO': 'Tocantins'
}


def clean_cpf(cpf: str) -> str:
    """Remove all non-digit characters from CPF."""
    if not cpf:
        return ""
    return re.sub(r'\D', '', cpf)


def format_cpf(cpf: str) -> str:
    """Format CPF with dots and dash (123.456.789-10)."""
    if not cpf:
        return ""
    
    # Clean the CPF first
    clean = clean_cpf(cpf)
    
    # Apply formatting if exactly 11 digits
    if len(clean) == 11:
        return f"{clean[:3]}.{clean[3:6]}.{clean[6:9]}-{clean[9:]}"
    
    return cpf  # Return original if invalid length


def validate_cpf_checksum(cpf: str) -> bool:
    """Validate CPF checksum using Brazilian algorithm."""
    if not cpf:
        return True  # Allow empty CPF
    
    # Clean and validate length
    clean = clean_cpf(cpf)
    if len(clean) != 11:
        return False
    
    # Check for repeated digits (invalid CPFs)
    if clean in ['00000000000', '11111111111', '22222222222', 
                 '33333333333', '44444444444', '55555555555',
                 '66666666666', '77777777777', '88888888888', '99999999999']:
        return False
    
    # Calculate first check digit
    sum1 = sum(int(clean[i]) * (10 - i) for i in range(9))
    digit1 = 11 - (sum1 % 11)
    if digit1 >= 10:
        digit1 = 0
    
    # Calculate second check digit
    sum2 = sum(int(clean[i]) * (11 - i) for i in range(10))
    digit2 = 11 - (sum2 % 11)
    if digit2 >= 10:
        digit2 = 0
    
    # Validate both check digits
    return int(clean[9]) == digit1 and int(clean[10]) == digit2


def validate_and_format_cpf(cpf: Optional[str]) -> Optional[str]:
    """Validate CPF and return formatted version if valid."""
    if not cpf:
        return None
    
    # Handle whitespace-only strings
    if isinstance(cpf, str) and not cpf.strip():
        return None
    
    # Clean the CPF
    clean = clean_cpf(cpf)
    
    # If cleaning results in empty string, return None
    if not clean:
        return None
    
    # Validate length
    if len(clean) != 11:
        raise ValueError("CPF deve ter 11 dígitos")
    
    # Validate checksum
    if not validate_cpf_checksum(clean):
        raise ValueError("CPF inválido")
    
    # Return formatted CPF
    return format_cpf(clean)


def clean_cep(cep: str) -> str:
    """Remove all non-digit characters from CEP."""
    if not cep:
        return ""
    return re.sub(r'\D', '', cep)


def format_cep(cep: str) -> str:
    """Format CEP with dash (12345-678)."""
    if not cep:
        return ""
    
    # Clean the CEP first
    clean = clean_cep(cep)
    
    # Apply formatting if exactly 8 digits
    if len(clean) == 8:
        return f"{clean[:5]}-{clean[5:]}"
    
    return cep  # Return original if invalid length


def validate_cep_format(cep: str) -> bool:
    """Validate CEP format (8 digits)."""
    if not cep:
        return True  # Allow empty CEP
    
    clean = clean_cep(cep)
    return len(clean) == 8 and clean.isdigit()


def validate_and_format_cep(cep: Optional[str]) -> Optional[str]:
    """Validate CEP and return formatted version if valid."""
    if not cep:
        return None
    
    # Handle whitespace-only strings
    if isinstance(cep, str) and not cep.strip():
        return None
    
    # Clean the CEP
    clean = clean_cep(cep)
    
    # If cleaning results in empty string, return None
    if not clean:
        return None
    
    # Validate length and format
    if len(clean) != 8 or not clean.isdigit():
        raise ValueError("CEP deve ter 8 dígitos")
    
    # Return formatted CEP
    return format_cep(clean)


def validate_brazilian_state(state: Optional[str]) -> Optional[str]:
    """Validate Brazilian state code."""
    if not state:
        return None
    
    # Handle whitespace-only strings
    if isinstance(state, str) and not state.strip():
        return None
    
    state_upper = state.upper().strip()
    
    # If after stripping it's empty, return None
    if not state_upper:
        return None
    
    if state_upper not in BRAZILIAN_STATES:
        raise ValueError(f"Estado inválido: {state}. Use códigos como SP, RJ, MG, etc.")
    
    return state_upper


def get_state_name(state_code: str) -> Optional[str]:
    """Get full state name from state code."""
    if not state_code:
        return None
    return BRAZILIAN_STATES.get(state_code.upper())


def get_brazilian_states_list() -> list:
    """Get list of all Brazilian states for dropdowns."""
    return [{"code": code, "name": name} for code, name in BRAZILIAN_STATES.items()]


# Validation functions for use in Pydantic models
def cpf_validator(v: Optional[str]) -> Optional[str]:
    """Pydantic validator for CPF field."""
    return validate_and_format_cpf(v)


def cep_validator(v: Optional[str]) -> Optional[str]:
    """Pydantic validator for CEP field."""
    return validate_and_format_cep(v)


def state_validator(v: Optional[str]) -> Optional[str]:
    """Pydantic validator for Brazilian state field."""
    return validate_brazilian_state(v)