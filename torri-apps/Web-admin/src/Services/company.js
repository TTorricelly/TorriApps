import api from './api';

/**
 * Company API service for managing salon/business information
 */

/**
 * Get company information (public endpoint)
 * @returns {Promise<Object>} Company information
 */
export const getCompanyInfo = async () => {
  try {
    const response = await api.get('/api/v1/company/info');
    return response.data;
  } catch (error) {
    console.error('Error fetching company info:', error);
    throw error;
  }
};

/**
 * Get all companies (admin only)
 * @param {Object} params - Query parameters
 * @param {number} params.skip - Number of records to skip
 * @param {number} params.limit - Number of records to return
 * @returns {Promise<Array>} List of companies
 */
export const getCompanies = async ({ skip = 0, limit = 100 } = {}) => {
  try {
    const response = await api.get('/api/v1/company', {
      params: { skip, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
};

/**
 * Get company by ID (admin only)
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Company data
 */
export const getCompanyById = async (companyId) => {
  try {
    const response = await api.get(`/api/v1/company/${companyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching company by ID:', error);
    throw error;
  }
};

/**
 * Create a new company (admin only)
 * @param {Object} companyData - Company data
 * @param {string} companyData.name - Company name
 * @param {string} [companyData.logo_url] - Logo URL
 * @param {string} [companyData.contact_email] - Contact email
 * @param {string} [companyData.contact_phone] - Contact phone
 * @returns {Promise<Object>} Created company data
 */
export const createCompany = async (companyData) => {
  try {
    const response = await api.post('/api/v1/company', companyData);
    return response.data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
};

/**
 * Update company information (admin only)
 * @param {string} companyId - Company ID
 * @param {Object} companyData - Updated company data
 * @param {string} [companyData.name] - Company name
 * @param {string} [companyData.logo_url] - Logo URL
 * @param {string} [companyData.contact_email] - Contact email
 * @param {string} [companyData.contact_phone] - Contact phone
 * @param {boolean} [companyData.is_active] - Active status
 * @returns {Promise<Object>} Updated company data
 */
export const updateCompany = async (companyId, companyData) => {
  try {
    const response = await api.put(`/api/v1/company/${companyId}`, companyData);
    return response.data;
  } catch (error) {
    console.error('Error updating company:', error);
    throw error;
  }
};

/**
 * Delete company (admin only)
 * @param {string} companyId - Company ID
 * @returns {Promise<void>}
 */
export const deleteCompany = async (companyId) => {
  try {
    await api.delete(`/api/v1/company/${companyId}`);
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
};