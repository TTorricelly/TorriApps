/**
 * Centralized error message handling for Portuguese validation messages
 * Maps API validation errors to user-friendly Portuguese messages
 */

/**
 * Common validation error messages in Portuguese
 */
export const VALIDATION_MESSAGES = {
  // Required field errors
  required: 'Este campo é obrigatório',
  required_field: 'Campo obrigatório',
  
  // String validation
  string_too_short: 'Texto muito curto',
  string_too_long: 'Texto muito longo',
  string_pattern: 'Formato inválido',
  
  // Number validation
  value_error: 'Valor inválido',
  number_too_small: 'Valor muito pequeno',
  number_too_large: 'Valor muito grande',
  not_a_valid_number: 'Deve ser um número válido',
  
  // Email validation
  value_is_not_a_valid_email: 'E-mail inválido',
  email_invalid: 'Formato de e-mail inválido',
  
  // Service-specific validations
  service_name_required: 'Nome do serviço é obrigatório',
  service_price_invalid: 'Preço deve ser um valor positivo',
  service_duration_invalid: 'Duração deve estar entre 5 e 480 minutos',
  service_commission_invalid: 'Comissão deve estar entre 0 e 100%',
  service_max_parallel_invalid: 'Máximo de profissionais deve estar entre 1 e 10',
  service_description_too_long: 'Descrição muito longa (máximo 5000 caracteres)',
  service_sku_duplicate: 'Este SKU já está sendo usado por outro serviço',
  service_sku_invalid: 'SKU deve ter no máximo 10 caracteres',
  
  // Category validation
  category_name_required: 'Nome da categoria é obrigatório',
  category_already_exists: 'Já existe uma categoria com este nome',
  
  // Professional validation
  professional_name_required: 'Nome do profissional é obrigatório',
  professional_email_required: 'E-mail é obrigatório',
  professional_phone_required: 'Telefone é obrigatório',
  professional_cpf_invalid: 'CPF inválido',
  
  // Station validation
  station_name_required: 'Nome da estação é obrigatório',
  station_type_required: 'Tipo de estação é obrigatório',
  
  // Generic database errors
  duplicate_key_value: 'Este valor já está em uso',
  foreign_key_violation: 'Referência inválida',
  unique_constraint: 'Este valor deve ser único',
  
  // General errors
  server_error: 'Erro interno do servidor',
  network_error: 'Erro de conexão',
  unknown_error: 'Erro desconhecido',
  validation_failed: 'Falha na validação dos dados'
};

/**
 * Field-specific error message mappings
 * Maps API field names to Portuguese field names
 */
export const FIELD_NAMES = {
  name: 'Nome',
  service_name: 'Nome do serviço',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
  price: 'Preço',
  duration_minutes: 'Duração',
  commission_percentage: 'Comissão',
  max_parallel_pros: 'Máximo de profissionais',
  description: 'Descrição',
  category_id: 'Categoria',
  service_sku: 'SKU do serviço',
  is_active: 'Status ativo',
  parallelable: 'Serviço paralelizável',
  price_subject_to_evaluation: 'Preço sujeito à avaliação',
  station_type_id: 'Tipo de estação',
  qty: 'Quantidade'
};

/**
 * Parse API validation error and return user-friendly Portuguese message
 * @param {Object} error - Axios error object
 * @returns {Object} Processed error information
 */
export const parseApiError = (error) => {
  const result = {
    message: VALIDATION_MESSAGES.unknown_error,
    fieldErrors: {},
    isValidationError: false
  };

  // Handle network errors
  if (!error.response) {
    result.message = VALIDATION_MESSAGES.network_error;
    return result;
  }

  const { status, data } = error.response;

  // Handle different HTTP status codes
  switch (status) {
    case 422: // Validation Error
      result.isValidationError = true;
      if (data?.detail) {
        if (Array.isArray(data.detail)) {
          // Pydantic validation errors (array format)
          result.fieldErrors = parseValidationErrors(data.detail);
          result.message = 'Por favor, corrija os erros nos campos destacados';
        } else if (typeof data.detail === 'string') {
          // Simple string error
          result.message = translateErrorMessage(data.detail);
        } else if (typeof data.detail === 'object') {
          // Object with field errors
          result.fieldErrors = parseObjectErrors(data.detail);
          result.message = 'Por favor, corrija os erros nos campos destacados';
        }
      } else {
        result.message = VALIDATION_MESSAGES.validation_failed;
      }
      break;

    case 400: // Bad Request
      result.message = data?.detail ? translateErrorMessage(data.detail) : 'Solicitação inválida';
      break;

    case 404: // Not Found
      result.message = 'Registro não encontrado';
      break;

    case 409: // Conflict
      result.message = data?.detail ? translateErrorMessage(data.detail) : 'Conflito de dados';
      break;

    case 500: // Internal Server Error
    default:
      result.message = VALIDATION_MESSAGES.server_error;
      break;
  }

  return result;
};

/**
 * Parse Pydantic validation errors (array format)
 * @param {Array} errors - Array of validation error objects
 * @returns {Object} Field errors object
 */
export const parseValidationErrors = (errors) => {
  const fieldErrors = {};

  errors.forEach(error => {
    const { loc, msg, type } = error;
    
    // Extract field name from location array
    const fieldName = Array.isArray(loc) ? loc[loc.length - 1] : loc;
    const fieldDisplayName = FIELD_NAMES[fieldName] || fieldName;
    
    // Translate error message
    let message = translateErrorMessage(msg, type);
    
    // Add field name context if not already included
    if (!message.toLowerCase().includes(fieldDisplayName.toLowerCase())) {
      message = `${fieldDisplayName}: ${message}`;
    }
    
    fieldErrors[fieldName] = message;
  });

  return fieldErrors;
};

/**
 * Parse object-style errors
 * @param {Object} errors - Object with field errors
 * @returns {Object} Field errors object
 */
export const parseObjectErrors = (errors) => {
  const fieldErrors = {};

  Object.keys(errors).forEach(fieldName => {
    const fieldDisplayName = FIELD_NAMES[fieldName] || fieldName;
    const errorValue = errors[fieldName];
    
    let message;
    if (Array.isArray(errorValue)) {
      message = errorValue.map(err => translateErrorMessage(err)).join(', ');
    } else {
      message = translateErrorMessage(errorValue);
    }
    
    // Add field name context if not already included
    if (!message.toLowerCase().includes(fieldDisplayName.toLowerCase())) {
      message = `${fieldDisplayName}: ${message}`;
    }
    
    fieldErrors[fieldName] = message;
  });

  return fieldErrors;
};

/**
 * Translate error message to Portuguese
 * @param {string} message - Original error message
 * @param {string} type - Error type (optional)
 * @returns {string} Translated message
 */
export const translateErrorMessage = (message, type = null) => {
  if (!message) return VALIDATION_MESSAGES.unknown_error;

  const lowerMessage = message.toLowerCase();

  // Direct mapping for common validation messages
  if (VALIDATION_MESSAGES[message] || VALIDATION_MESSAGES[type]) {
    return VALIDATION_MESSAGES[message] || VALIDATION_MESSAGES[type];
  }

  // Pattern matching for common error patterns
  if (lowerMessage.includes('required') || lowerMessage.includes('field required')) {
    return VALIDATION_MESSAGES.required;
  }
  
  if (lowerMessage.includes('email') && lowerMessage.includes('valid')) {
    return VALIDATION_MESSAGES.value_is_not_a_valid_email;
  }
  
  if (lowerMessage.includes('too short') || lowerMessage.includes('minimum')) {
    return VALIDATION_MESSAGES.string_too_short;
  }
  
  if (lowerMessage.includes('too long') || lowerMessage.includes('maximum')) {
    return VALIDATION_MESSAGES.string_too_long;
  }
  
  if (lowerMessage.includes('not a valid number') || lowerMessage.includes('invalid number')) {
    return VALIDATION_MESSAGES.not_a_valid_number;
  }
  
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
    // Check if it's specifically about service_sku
    if (lowerMessage.includes('service_sku') || lowerMessage.includes('sku')) {
      return VALIDATION_MESSAGES.service_sku_duplicate;
    }
    return VALIDATION_MESSAGES.duplicate_key_value;
  }
  
  if (lowerMessage.includes('foreign key') || lowerMessage.includes('reference')) {
    return VALIDATION_MESSAGES.foreign_key_violation;
  }

  // Service-specific patterns
  if (lowerMessage.includes('price') && (lowerMessage.includes('positive') || lowerMessage.includes('greater'))) {
    return VALIDATION_MESSAGES.service_price_invalid;
  }
  
  if (lowerMessage.includes('duration') && lowerMessage.includes('between')) {
    return VALIDATION_MESSAGES.service_duration_invalid;
  }
  
  if (lowerMessage.includes('commission') && lowerMessage.includes('percentage')) {
    return VALIDATION_MESSAGES.service_commission_invalid;
  }

  // Return original message if no translation found
  return message;
};

/**
 * Enhanced error handling for service forms
 * @param {Object} error - Axios error object  
 * @param {Function} setErrors - Function to set field errors
 * @param {Function} showAlert - Function to show alert message
 */
export const handleServiceFormError = (error, setErrors, showAlert) => {
  const parsedError = parseApiError(error);
  
  // Set field-specific errors
  if (Object.keys(parsedError.fieldErrors).length > 0) {
    setErrors(parsedError.fieldErrors);
  }
  
  // Show general error message
  showAlert(parsedError.message, 'error');
  
  return parsedError;
};

/**
 * Get user-friendly error message for display
 * @param {Object} error - Axios error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  const parsedError = parseApiError(error);
  return parsedError.message;
};

/**
 * Check if error has field-specific validation errors
 * @param {Object} error - Axios error object
 * @returns {boolean} True if has field errors
 */
export const hasFieldErrors = (error) => {
  const parsedError = parseApiError(error);
  return Object.keys(parsedError.fieldErrors).length > 0;
};