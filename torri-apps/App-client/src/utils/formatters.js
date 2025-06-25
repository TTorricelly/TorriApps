/**
 * Formatting utilities for consistent data display across the web application
 * Enhanced version of Shared/Utils/Formaters.js with additional Brazilian localization
 */

/**
 * Formats currency values for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: BRL for Brazilian Real)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = 'BRL') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'BRL' ? 'R$ 0,00' : '$0.00';
  }
  
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Formats date values for display in Brazilian format
 * @param {string|Date} date - Date to format
 * @param {string} format - Format style ('short', 'medium', 'long', 'full')
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: '2-digit', month: 'short', year: 'numeric' },
    long: { day: '2-digit', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
  };
  
  return dateObj.toLocaleDateString('pt-BR', options[format] || options.short);
};

/**
 * Formats time values for display in Brazilian format
 * @param {string|Date} time - Time to format
 * @param {boolean} includeSeconds - Whether to include seconds
 * @returns {string} - Formatted time string
 */
export const formatTime = (time, includeSeconds = false) => {
  if (!time) return '';
  
  let timeObj;
  if (typeof time === 'string') {
    // Handle HH:MM format
    if (time.includes(':') && !time.includes('T')) {
      timeObj = new Date(`2000-01-01T${time}`);
    } else {
      timeObj = new Date(time);
    }
  } else {
    timeObj = time;
  }
  
  if (isNaN(timeObj.getTime())) return '';
  
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  if (includeSeconds) {
    options.second = '2-digit';
  }
  
  return timeObj.toLocaleTimeString('pt-BR', options);
};

/**
 * Formats datetime values for display
 * @param {string|Date} datetime - Datetime to format
 * @param {string} dateFormat - Date format style
 * @param {boolean} includeSeconds - Whether to include seconds in time
 * @returns {string} - Formatted datetime string
 */
export const formatDateTime = (datetime, dateFormat = 'short', includeSeconds = false) => {
  if (!datetime) return '';
  
  const dateObj = typeof datetime === 'string' ? new Date(datetime) : datetime;
  if (isNaN(dateObj.getTime())) return '';
  
  const formattedDate = formatDate(dateObj, dateFormat);
  const formattedTime = formatTime(dateObj, includeSeconds);
  
  return `${formattedDate} às ${formattedTime}`;
};

/**
 * Formats phone numbers for display in Brazilian format
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  
  // Import phone utils to avoid circular dependency
  const { formatPhoneForDisplay } = import('./phoneUtils');
  return formatPhoneForDisplay(phone);
};

/**
 * Formats CPF for display
 * @param {string} cpf - CPF to format
 * @returns {string} - Formatted CPF (XXX.XXX.XXX-XX)
 */
export const formatCPF = (cpf) => {
  if (!cpf || typeof cpf !== 'string') return cpf;
  
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return cpf;
  
  return `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9)}`;
};

/**
 * Formats CNPJ for display
 * @param {string} cnpj - CNPJ to format
 * @returns {string} - Formatted CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export const formatCNPJ = (cnpj) => {
  if (!cnpj || typeof cnpj !== 'string') return cnpj;
  
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return cnpj;
  
  return `${cleanCnpj.slice(0, 2)}.${cleanCnpj.slice(2, 5)}.${cleanCnpj.slice(5, 8)}/${cleanCnpj.slice(8, 12)}-${cleanCnpj.slice(12)}`;
};

/**
 * Formats duration in minutes to readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration (e.g., "1h 30min", "45min")
 */
export const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes)) return '0min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
};

/**
 * Formats file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., "1.5 MB", "500 KB")
 */
export const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Formats percentage values
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Formats postal code (CEP) for display
 * @param {string} cep - CEP to format
 * @returns {string} - Formatted CEP (XXXXX-XXX)
 */
export const formatCEP = (cep) => {
  if (!cep || typeof cep !== 'string') return cep;
  
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return cep;
  
  return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
};