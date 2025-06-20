import apiClient from '../config/api';
import { API_ENDPOINTS } from '../../../Shared/Constans/Api'; // Adjust path as needed

export const login = async (emailOrPhone, password) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      email_or_phone: emailOrPhone,
      password,
    });
    // Assuming the token is in response.data.access_token
    // User details are expected to be in the JWT itself.
    return response.data;
  } catch (error) {
    // Enhance error handling based on actual API error structure
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(error.response.data.detail || 'Login failed');
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Login failed: No response from server.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Login failed: ${error.message}`);
    }
  }
};

export const register = async (userData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  } catch (error) {
    // Enhanced error handling based on actual API error structure
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(error.response.data.detail || 'Registration failed');
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Registration failed: No response from server.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
};

// Example for a potential future function:
// export const refreshToken = async (currentToken) => {
//   try {
//     const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { token: currentToken });
//     return response.data;
//   } catch (error) {
//     throw new Error(error.response?.data?.detail || 'Token refresh failed');
//   }
// };
