import { api } from "../api/client"; // Imports the configured Axios instance
import { buildApiEndpoint } from '../Utils/apiHelpers';

// Interface LoginCredentials (for reference, not strictly enforced in JS)
// Frontend sends: { email: string; password: string; }
// Backend expects: { email_or_phone: string; password: string; }

// Interface LoginResponse (for reference)
// {
//   access_token: string;
//   token_type: string; // "bearer"
// }

export async function loginRequest(credentials) {
  // credentials should be an object like { email: "user@example.com", password: "password123" }
  // Backend expects email_or_phone field, so we need to transform the email field
  const loginPayload = {
    email_or_phone: credentials.email,
    password: credentials.password
  };
  
  // Using public login endpoint (no tenant context needed)
  const response = await api.post(buildApiEndpoint("auth/login", "v1", { isPublic: true }), loginPayload);
  return response.data; // Axios automatically wraps the response in a data object
}

// You can add other auth-related API calls here in the future, e.g.:
// export async function refreshTokenRequest(refreshToken) { ... }
// export async function logoutRequest() { ... }
