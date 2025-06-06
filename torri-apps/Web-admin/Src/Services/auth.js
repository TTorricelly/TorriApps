import api from "./api"; // Imports the configured Axios instance

// Interface LoginCredentials (for reference, not strictly enforced in JS)
// {
//   email: string;
//   password: string;
// }

// Interface LoginResponse (for reference)
// {
//   access_token: string;
//   token_type: string; // "bearer"
//   tenant_id: string;
// }

export async function loginRequest(credentials) {
  // credentials should be an object like { email: "user@example.com", password: "password123" }
  // Using enhanced-login which doesn't require tenant ID and returns it
  const response = await api.post("/api/v1/auth/enhanced-login", credentials);
  return response.data; // Axios automatically wraps the response in a data object
}

// You can add other auth-related API calls here in the future, e.g.:
// export async function refreshTokenRequest(refreshToken) { ... }
// export async function logoutRequest() { ... }
