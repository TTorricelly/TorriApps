import { useMutation } from "@tanstack/react-query";
import { loginRequest } from "../Services/auth"; // Adjusted path
import { useAuthStore } from "../stores/auth";  // Adjusted path
import { useNavigate } from "react-router-dom";

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  return useMutation({ // In React Query v5, useMutation expects an object
    mutationFn: (credentials) => loginRequest(credentials), // credentials should be { email, password }
    onSuccess: (data, variables) => {
      // data is now { access_token, token_type }
      const token = data.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      // The new setAuth signature is (token, decodedTokenPayload)
      setAuth(token, payload);
      
      // The requirement doc mentions:
      // api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
      // api.defaults.headers.common["X-Tenant-ID"] = data.tenant_id;
      // This is generally handled by the axios interceptor in api.js now,
      // so explicitly setting it here might be redundant if the interceptor works correctly on the *next* request.
      // However, if immediate subsequent requests within the same "tick" need it before a refresh/new request cycle,
      // it might be considered. For now, relying on the interceptor.

      navigate("/dashboard");
    },
    onError: (error) => {
      // The component using this hook (e.g., LoginForm) will handle displaying the error message.
      // This onError can be used for logging or side effects if needed.
      console.error("Login failed:", error);
    },
  });
}
