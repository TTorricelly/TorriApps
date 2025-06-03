import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
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
