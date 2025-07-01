/**
 * Brazilian formatting utilities for CPF, CEP, and address data
 * Provides validation, formatting, and ViaCEP integration
 */

// Brazilian state codes and names
export const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' }
];

/**
 * CPF Formatting and Validation
 */

// Remove all non-digit characters from CPF
export const cleanCpf = (cpf) => {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
};

// Format CPF with dots and dash (123.456.789-10)
export const formatCpf = (cpf) => {
  if (!cpf) return '';
  
  const clean = cleanCpf(cpf);
  
  // Apply formatting if exactly 11 digits
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  
  return cpf; // Return original if invalid length
};

// Validate CPF checksum using Brazilian algorithm
export const validateCpfChecksum = (cpf) => {
  if (!cpf) return true; // Allow empty CPF
  
  const clean = cleanCpf(cpf);
  if (clean.length !== 11) return false;
  
  // Check for repeated digits (invalid CPFs)
  const invalidCpfs = [
    '00000000000', '11111111111', '22222222222', '33333333333',
    '44444444444', '55555555555', '66666666666', '77777777777',
    '88888888888', '99999999999'
  ];
  
  if (invalidCpfs.includes(clean)) return false;
  
  // Calculate first check digit
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(clean[i]) * (10 - i);
  }
  let digit1 = 11 - (sum1 % 11);
  if (digit1 >= 10) digit1 = 0;
  
  // Calculate second check digit
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(clean[i]) * (11 - i);
  }
  let digit2 = 11 - (sum2 % 11);
  if (digit2 >= 10) digit2 = 0;
  
  // Validate both check digits
  return parseInt(clean[9]) === digit1 && parseInt(clean[10]) === digit2;
};

// Format CPF as user types (real-time formatting)
export const handleCpfInput = (value) => {
  const clean = cleanCpf(value);
  
  if (clean.length <= 3) {
    return clean;
  } else if (clean.length <= 6) {
    return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  } else if (clean.length <= 9) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  } else if (clean.length <= 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  
  return value.slice(0, 14); // Limit to formatted length
};

/**
 * CEP Formatting and Validation
 */

// Remove all non-digit characters from CEP
export const cleanCep = (cep) => {
  if (!cep) return '';
  return cep.replace(/\D/g, '');
};

// Format CEP with dash (12345-678)
export const formatCep = (cep) => {
  if (!cep) return '';
  
  const clean = cleanCep(cep);
  
  // Apply formatting if exactly 8 digits
  if (clean.length === 8) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  
  return cep; // Return original if invalid length
};

// Validate CEP format (8 digits)
export const validateCepFormat = (cep) => {
  if (!cep) return true; // Allow empty CEP
  
  const clean = cleanCep(cep);
  return clean.length === 8 && /^\d+$/.test(clean);
};

// Format CEP as user types (real-time formatting)
export const handleCepInput = (value) => {
  const clean = cleanCep(value);
  
  if (clean.length <= 5) {
    return clean;
  } else if (clean.length <= 8) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  
  return value.slice(0, 9); // Limit to formatted length
};

/**
 * ViaCEP Integration
 */

// Lookup address by CEP using ViaCEP API
export const lookupCep = async (cep) => {
  if (!cep) return null;
  
  const clean = cleanCep(cep);
  if (clean.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Check if CEP was found (ViaCEP returns {"erro": true} for invalid CEPs)
      if (!data.erro) {
        return {
          address_street: data.logradouro || '',
          address_complement: data.complemento || '',
          address_neighborhood: data.bairro || '',
          address_city: data.localidade || '',
          address_state: data.uf || '',
          address_cep: formatCep(data.cep) || ''
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error looking up CEP:', error);
    return null;
  }
};

/**
 * State Validation
 */

// Validate Brazilian state code
export const validateBrazilianState = (state) => {
  if (!state) return true; // Allow empty state
  
  const stateUpper = state.toUpperCase().trim();
  return BRAZILIAN_STATES.some(s => s.code === stateUpper);
};

// Get state name from code
export const getStateName = (stateCode) => {
  if (!stateCode) return '';
  const state = BRAZILIAN_STATES.find(s => s.code === stateCode.toUpperCase());
  return state ? state.name : '';
};

/**
 * Address Formatting
 */

// Format complete address for display
export const formatAddress = (addressData) => {
  if (!addressData) return '';
  
  const parts = [];
  
  // Street and number
  if (addressData.address_street) {
    let streetLine = addressData.address_street;
    if (addressData.address_number) {
      streetLine += `, ${addressData.address_number}`;
    }
    parts.push(streetLine);
  }
  
  // Complement
  if (addressData.address_complement) {
    parts.push(addressData.address_complement);
  }
  
  // Neighborhood
  if (addressData.address_neighborhood) {
    parts.push(addressData.address_neighborhood);
  }
  
  // City and state
  if (addressData.address_city || addressData.address_state) {
    let cityState = '';
    if (addressData.address_city) {
      cityState = addressData.address_city;
    }
    if (addressData.address_state) {
      cityState += cityState ? ` - ${addressData.address_state}` : addressData.address_state;
    }
    parts.push(cityState);
  }
  
  // CEP
  if (addressData.address_cep) {
    parts.push(`CEP: ${formatCep(addressData.address_cep)}`);
  }
  
  return parts.join('\n');
};

// Format address in compact form (single line) for table display
export const formatAddressCompact = (addressData) => {
  if (!addressData) return '';
  
  const parts = [];
  
  // Street and number
  if (addressData.address_street) {
    let streetLine = addressData.address_street;
    if (addressData.address_number) {
      streetLine += `, ${addressData.address_number}`;
    }
    parts.push(streetLine);
  }
  
  // Neighborhood
  if (addressData.address_neighborhood) {
    parts.push(addressData.address_neighborhood);
  }
  
  // City
  if (addressData.address_city) {
    parts.push(addressData.address_city);
  }
  
  return parts.join(' - ');
};

/**
 * Form Validation Helpers
 */

// Validate all Brazilian fields
export const validateBrazilianFields = (formData) => {
  const errors = {};
  
  // CPF validation
  if (formData.cpf && !validateCpfChecksum(formData.cpf)) {
    errors.cpf = 'CPF inválido';
  }
  
  // CEP validation
  if (formData.address_cep && !validateCepFormat(formData.address_cep)) {
    errors.address_cep = 'CEP deve ter 8 dígitos';
  }
  
  // State validation
  if (formData.address_state && !validateBrazilianState(formData.address_state)) {
    errors.address_state = 'Estado inválido';
  }
  
  return errors;
};

// Clean and format form data before submission
export const cleanFormData = (formData) => {
  const cleaned = { ...formData };
  
  // Format CPF
  if (cleaned.cpf) {
    cleaned.cpf = formatCpf(cleaned.cpf);
  }
  
  // Format CEP
  if (cleaned.address_cep) {
    cleaned.address_cep = formatCep(cleaned.address_cep);
  }
  
  // Uppercase state
  if (cleaned.address_state) {
    cleaned.address_state = cleaned.address_state.toUpperCase();
  }
  
  return cleaned;
};