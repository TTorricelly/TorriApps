/**
 * Type definitions and interfaces for the application
 */

/**
 * Label interface
 * @typedef {Object} Label
 * @property {string} id - Unique identifier for the label
 * @property {string} name - Display name of the label
 * @property {string} color - Hex color code for the label (e.g., #FF0000)
 * @property {string} [description] - Optional description of the label
 * @property {boolean} is_active - Whether the label is active/enabled
 * @property {string} [created_at] - ISO timestamp when label was created
 * @property {string} [updated_at] - ISO timestamp when label was last updated
 * @property {number} [usage_count] - Number of users assigned to this label
 */

/**
 * User interface
 * @typedef {Object} User
 * @property {string} id - Unique identifier for the user
 * @property {string} email - User's email address
 * @property {string} full_name - User's full name
 * @property {string} [nickname] - User's nickname or preferred name
 * @property {string} [phone_number] - User's phone number
 * @property {string} [date_of_birth] - User's date of birth (ISO date string)
 * @property {string} [gender] - User's gender (MASCULINO, FEMININO, OUTROS)
 * @property {string} [cpf] - Brazilian CPF document number
 * @property {boolean} [is_active] - Whether the user account is active
 * @property {Label[]} [labels] - Array of labels assigned to the user
 * @property {string} [address_street] - Street address
 * @property {string} [address_number] - Address number
 * @property {string} [address_complement] - Address complement (apt, suite, etc.)
 * @property {string} [address_neighborhood] - Neighborhood
 * @property {string} [address_city] - City
 * @property {string} [address_state] - State (Brazilian state code)
 * @property {string} [address_cep] - Brazilian postal code (CEP)
 * @property {string} [photo_url] - URL to user's profile photo
 * @property {string} [created_at] - ISO timestamp when user was created
 * @property {string} [updated_at] - ISO timestamp when user was last updated
 */

/**
 * API Response interface for paginated results
 * @typedef {Object} PaginatedResponse
 * @property {Array} items - Array of items (users, labels, etc.)
 * @property {number} total - Total number of items
 * @property {number} page - Current page number
 * @property {number} size - Number of items per page
 * @property {number} pages - Total number of pages
 */

/**
 * API Error interface
 * @typedef {Object} ApiError
 * @property {string} detail - Error message
 * @property {number} [status] - HTTP status code
 * @property {string} [code] - Error code
 */

/**
 * Filter options for API requests
 * @typedef {Object} FilterOptions
 * @property {number} [skip] - Number of items to skip (for pagination)
 * @property {number} [limit] - Maximum number of items to return
 * @property {string} [search] - Search term
 * @property {boolean} [is_active] - Filter by active status
 * @property {string} [orderBy] - Field to order by
 * @property {string} [order] - Order direction (asc, desc)
 */

/**
 * Label assignment options
 * @typedef {Object} LabelAssignmentOptions
 * @property {'add'|'remove'|'replace'} action - Type of label operation
 * @property {string[]} labelIds - Array of label IDs to assign/remove
 * @property {string[]} userIds - Array of user IDs to update
 */

// Export types for JSDoc usage
export const Types = {
  Label: 'Label',
  User: 'User',
  PaginatedResponse: 'PaginatedResponse',
  ApiError: 'ApiError',
  FilterOptions: 'FilterOptions',
  LabelAssignmentOptions: 'LabelAssignmentOptions'
};

// Gender options
export const GENDER_OPTIONS = [
  { label: "Masculino", value: "MASCULINO" },
  { label: "Feminino", value: "FEMININO" },
  { label: "Outros", value: "OUTROS" },
];

// Hair type options (deprecated - replaced by labels)
export const HAIR_TYPE_OPTIONS = [
  { label: "Liso", value: "LISO" },
  { label: "Ondulado", value: "ONDULADO" },
  { label: "Cacheado", value: "CACHEADO" },
  { label: "Crespo", value: "CRESPO" },
];

// Default colors for labels
export const DEFAULT_LABEL_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
];

export default Types;