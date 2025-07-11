import React from 'react';
import { Typography, Alert } from '@material-tailwind/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Display field-specific validation errors
 * @param {Object} props - Component props
 * @param {Object} props.errors - Object with field errors
 * @param {string} props.className - Additional CSS classes
 */
export const FieldErrors = ({ errors = {}, className = "" }) => {
  const errorEntries = Object.entries(errors).filter(([, message]) => message);
  
  if (errorEntries.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {errorEntries.map(([field, message]) => (
        <div key={field} className="flex items-start gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 text-status-error mt-0.5 flex-shrink-0" />
          <Typography className="text-status-error text-sm">
            {message}
          </Typography>
        </div>
      ))}
    </div>
  );
};

/**
 * Display validation error summary with expandable details
 * @param {Object} props - Component props
 * @param {Object} props.errors - Object with field errors
 * @param {string} props.message - General error message
 * @param {boolean} props.show - Whether to show the component
 * @param {Function} props.onClose - Close handler
 */
export const ValidationErrorSummary = ({ 
  errors = {}, 
  message = "Por favor, corrija os erros nos campos destacados", 
  show = false, 
  onClose 
}) => {
  const errorEntries = Object.entries(errors).filter(([, errorMessage]) => errorMessage);
  
  if (!show || errorEntries.length === 0) return null;

  return (
    <Alert 
      open={show}
      onClose={onClose}
      color="red"
      className="mb-4"
      icon={<ExclamationTriangleIcon className="h-6 w-6" />}
    >
      <div className="space-y-2">
        <Typography className="font-medium">
          {message}
        </Typography>
        
        {errorEntries.length > 0 && (
          <div className="space-y-1 pl-2 border-l-2 border-red-200">
            {errorEntries.map(([field, errorMessage]) => (
              <Typography key={field} className="text-sm">
                • {errorMessage}
              </Typography>
            ))}
          </div>
        )}
      </div>
    </Alert>
  );
};

/**
 * Simple error message display for individual fields
 * @param {Object} props - Component props
 * @param {string} props.error - Error message
 * @param {string} props.className - Additional CSS classes
 */
export const FieldError = ({ error, className = "" }) => {
  if (!error) return null;
  
  return (
    <Typography className={`text-status-error text-sm mt-1 ${className}`}>
      {error}
    </Typography>
  );
};

/**
 * Enhanced Alert component with better error handling
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the alert
 * @param {string} props.message - Alert message
 * @param {string} props.type - Alert type (success, error, warning, info)
 * @param {Function} props.onClose - Close handler
 * @param {number} props.autoClose - Auto close time in milliseconds
 */
export const EnhancedAlert = ({ 
  show = false, 
  message = "", 
  type = "info", 
  onClose, 
  autoClose = 5000 
}) => {
  React.useEffect(() => {
    if (show && autoClose > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoClose);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoClose, onClose]);

  if (!show) return null;

  const colorMap = {
    success: 'green',
    error: 'red',
    warning: 'amber',
    info: 'blue'
  };

  return (
    <Alert
      open={show}
      onClose={onClose}
      color={colorMap[type] || 'blue'}
      className="mb-4"
    >
      {message}
    </Alert>
  );
};

export default {
  FieldErrors,
  ValidationErrorSummary,
  FieldError,
  EnhancedAlert
};