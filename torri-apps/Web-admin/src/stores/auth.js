import { create } from "zustand";
import { persist } from "zustand/middleware";

// Helper function to check if JWT token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired (with 30 second buffer)
    return payload.exp < (currentTime + 30);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Consider invalid tokens as expired
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      // tenantId: null, // Removed
      userEmail: null,
      // tenantData: null,  // Removed
      userData: null,    // Will store decoded JWT payload
      isAuthenticated: false,
      setAuth: (token, decodedTokenPayload) => // Updated signature
        set({
          accessToken: token,
          // tenantId, // Removed
          userEmail: decodedTokenPayload.sub || decodedTokenPayload.email, // Set from decoded payload
          // tenantData, // Removed
          userData: decodedTokenPayload, // Store full decoded payload
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          // tenantId: null, // Removed
          userEmail: null,
          // tenantData: null, // Removed
          userData: null,
          isAuthenticated: false,
        }),
      // Check if current session is valid
      isSessionValid: () => {
        const state = get();
        return state.isAuthenticated && state.accessToken && !isTokenExpired(state.accessToken);
      },
      // Get token only if it's valid, otherwise clear auth
      getValidToken: () => {
        const state = get();
        if (state.accessToken && !isTokenExpired(state.accessToken)) {
          return state.accessToken;
        } else if (state.isAuthenticated) {
          // Token is expired but user thinks they're authenticated - clear auth
          state.clearAuth();
          return null;
        }
        return null;
      },
    }),
    {
      name: "auth-storage", // name of the item in the storage (must be unique)
      // partialize allows you to define which parts of the store should be persisted.
      // By default, the entire store is persisted.
      partialize: (state) => ({
        accessToken: state.accessToken,
        // tenantId: state.tenantId, // Removed
        userEmail: state.userEmail,
        // tenantData: state.tenantData,  // Removed
        userData: state.userData,      // Persist user data (decoded payload)
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
