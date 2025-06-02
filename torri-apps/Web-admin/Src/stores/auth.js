import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      tenantId: null,
      userEmail: null,
      isAuthenticated: false,
      setAuth: (token, tenantId, email) =>
        set({
          accessToken: token,
          tenantId,
          userEmail: email,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          tenantId: null,
          userEmail: null,
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
        userEmail: state.userEmail, // Persist userEmail as well
        isAuthenticated: state.isAuthenticated, // Persist isAuthenticated status
      }),
    }
  )
);
