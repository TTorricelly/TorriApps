/**
 * Utility functions for client name formatting and display
 */

/**
 * Format client name for selection areas (dropdowns, lists, etc.)
 * Shows "Full Name (Nickname)" if nickname exists, otherwise just "Full Name"
 * @param {Object} client - Client object with full_name/name and nickname/client_nickname
 * @returns {string} Formatted name for selection
 */
export const formatClientNameForSelection = (client) => {
  if (!client) return '';
  
  const fullName = client.full_name || client.name || client.client_name || '';
  const nickname = client.nickname || client.client_nickname;
  
  if (nickname && nickname.trim()) {
    return `${fullName} (${nickname.trim()})`;
  }
  
  return fullName;
};

/**
 * Format client name for cards and compact displays
 * Shows only "Nickname" if it exists, otherwise shows "Full Name"
 * @param {Object} client - Client object with full_name/name and nickname/client_nickname
 * @returns {string} Formatted name for card display
 */
export const formatClientNameForCard = (client) => {
  if (!client) return '';
  
  const nickname = client.nickname || client.client_nickname;
  const fullName = client.full_name || client.name || client.client_name || '';
  
  if (nickname && nickname.trim()) {
    return nickname.trim();
  }
  
  return fullName;
};

/**
 * Extract client name from string for backwards compatibility
 * Handles both direct strings and client objects
 * @param {string|Object} clientNameOrObject - Either a string or client object
 * @param {string} displayType - 'selection' or 'card'
 * @returns {string} Formatted client name
 */
export const getClientDisplayName = (clientNameOrObject, displayType = 'card') => {
  if (!clientNameOrObject) return '';
  
  // If it's already a string, return as-is for backwards compatibility
  if (typeof clientNameOrObject === 'string') {
    return clientNameOrObject;
  }
  
  // Handle appointment objects that might only have clientName field
  if (clientNameOrObject.clientName && typeof clientNameOrObject.clientName === 'string') {
    return clientNameOrObject.clientName;
  }
  
  // If it's a proper client object, use appropriate formatting
  if (displayType === 'selection') {
    return formatClientNameForSelection(clientNameOrObject);
  } else {
    return formatClientNameForCard(clientNameOrObject);
  }
};

/**
 * Check if search term matches client name or nickname
 * @param {Object} client - Client object with full_name/name and nickname/client_nickname, or appointment object with clientName
 * @param {string} searchTerm - Search term to match against
 * @returns {boolean} True if search term matches
 */
export const clientNameMatchesSearch = (client, searchTerm) => {
  if (!client || !searchTerm) return true;
  
  const term = searchTerm.toLowerCase().trim();
  
  // Handle appointment objects with clientName field
  if (client.clientName && typeof client.clientName === 'string') {
    return client.clientName.toLowerCase().includes(term);
  }
  
  // Handle proper client objects
  const fullName = (client.full_name || client.name || client.client_name || '').toLowerCase();
  const nickname = (client.nickname || client.client_nickname || '').toLowerCase();
  
  return fullName.includes(term) || nickname.includes(term);
};