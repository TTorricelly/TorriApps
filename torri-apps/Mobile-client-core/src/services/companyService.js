import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import apiClient from '../config/api';

// Image fields for company data
const COMPANY_IMAGE_FIELDS = ['logo_url', 'banner_url', 'favicon_url'];

/**
 * Fetches basic company information for the mobile app.
 * This is a public endpoint that doesn't require authentication.
 * @returns {Promise<object>} The company information (id, name, logo_url).
 */
export const getCompanyInfo = async () => {
  const endpoint = buildApiEndpoint('company/info');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: { name: 'Nome do Salão' }, // Fallback company info
      transformData: (data) => transformEntityWithImages(data, COMPANY_IMAGE_FIELDS)
    }
  );
};