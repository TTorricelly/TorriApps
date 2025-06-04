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
      tenantId: null,
      userEmail: null,
      tenantData: null,  // Complete tenant info from login
      userData: null,    // Complete user info from login
      isAuthenticated: false,
      setAuth: (token, tenantId, email, tenantData = null, userData = null) =>
        set({
          accessToken: token,
          tenantId,
          userEmail: email,
          tenantData,     // Store tenant data from login
          userData,       // Store user data from login
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          tenantId: null,
          userEmail: null,
          tenantData: null,
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
        tenantId: state.tenantId,
        userEmail: state.userEmail,
        tenantData: state.tenantData,  // Persist tenant data
        userData: state.userData,      // Persist user data
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
