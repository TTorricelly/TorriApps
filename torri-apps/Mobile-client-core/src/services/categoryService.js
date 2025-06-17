import apiClient from '../config/api';
import { API_ENDPOINTS } from '../../../Shared/Constans/Api'; // Adjusted path

/**
 * Fetches the list of service categories.
 * @returns {Promise<Array>} A list of category objects.
 * @throws {Error} If the request fails or the server returns an error.
 */
export const getCategories = async () => {
  try {
    // API_ENDPOINTS.SERVICES is '/api/v1/services'
    // The categories endpoint is '/api/v1/categories'
    // We need to construct the correct path.
    // Assuming API_ENDPOINTS.BASE_URL is 'http://localhost:8000' and apiClient handles '/api/v1' prefixing correctly or not.
    // Based on existing services, apiClient seems to expect paths relative to BASE_URL.
    // The categories endpoint is /api/v1/categories.
    // If apiClient is configured with http://localhost:8000/api/v1, then path should be '/categories'.
    // If apiClient is configured with http://localhost:8000, then path should be '/api/v1/categories'.
    // From main.py, categories_router is prefixed with /api/v1/categories.
    // From Mobile-client-core/src/config/api.js, apiClient has baseURL: API_ENDPOINTS.BASE_URL (e.g. http://localhost:8000)
    // So, the path for apiClient.get should be '/api/v1/categories'.

    // Let's check API_ENDPOINTS for a categories specific constant.
    // API_ENDPOINTS.SERVICES is '/api/v1/services'.
    // API_ENDPOINTS.AUTH.LOGIN is '/api/v1/auth/login'.
    // It seems the /api/v1 part is included in the constants.
    // So, if API_ENDPOINTS.CATEGORIES is '/api/v1/categories', we can use that.
    // If not, we construct it.
    // Based on `torri-apps/Shared/Constans/Api.js`, there isn't a direct CATEGORIES endpoint.
    // The backend `main.py` has `app.include_router(categories_router, prefix=f"{API_V1_PREFIX}/categories", ...)`
    // So the full path is `/api/v1/categories`.

    const categoriesPath = '/api/v1/categories'; // Constructing path directly as it's not in API_ENDPOINTS

    const response = await apiClient.get(categoriesPath);
    return response.data; // The backend returns a list of CategorySchema objects
  } catch (error) {
    if (error.response) {
      const errorMessage = error.response.data.detail || `Failed to fetch categories: ${error.response.status}`;
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('Failed to fetch categories: No response from server.');
    } else {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }
};

// Add this function to the existing categoryService.js

/**
 * Fetches the list of services for a given category.
 * @param {string} categoryId - The ID of the category.
 * @returns {Promise<Array>} A list of service objects.
 * @throws {Error} If the request fails or the server returns an error.
 */
export const getServicesByCategory = async (categoryId) => {
  try {
    if (!categoryId) {
      throw new Error('Category ID is required to fetch services.');
    }
    // The backend endpoint is GET /api/v1/services?category_id=<categoryId>
    // API_ENDPOINTS.SERVICES is '/api/v1/services'
    const servicesPath = `${API_ENDPOINTS.SERVICES}?category_id=${categoryId}`;

    const response = await apiClient.get(servicesPath);
    return response.data; // The backend returns a list of ServiceSchema objects
  } catch (error) {
    if (error.response) {
      const errorMessage = error.response.data.detail || `Failed to fetch services for category ${categoryId}: ${error.response.status}`;
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error(`Failed to fetch services for category ${categoryId}: No response from server.`);
    } else {
      throw new Error(`Failed to fetch services for category ${categoryId}: ${error.message}`);
    }
  }
};
