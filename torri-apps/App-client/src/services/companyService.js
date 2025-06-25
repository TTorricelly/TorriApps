import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers'
import apiClient from '../config/api'

// Image fields for company data
const COMPANY_IMAGE_FIELDS = ['logo_url', 'banner_url', 'avatar_url'];

export const companyService = {
  async getCompanyInfo() {
    const endpoint = buildApiEndpoint('company/info');
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint),
      {
        defaultValue: {
          id: 'default',
          name: 'Nome do Salão',
          logo_url: null
        },
        transformData: (data) => transformEntityWithImages(data, COMPANY_IMAGE_FIELDS),
        logErrors: false // Don't log company info errors (not critical)
      }
    );
  },

  async updateCompanyInfo(companyData) {
    const endpoint = buildApiEndpoint('company/info');
    
    return withApiErrorHandling(
      () => apiClient.put(endpoint, companyData),
      {
        defaultValue: null,
        transformData: (data) => transformEntityWithImages(data, COMPANY_IMAGE_FIELDS),
        logErrors: true
      }
    );
  }
}