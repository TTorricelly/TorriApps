import {create} from 'zustand';

// Example structure, expand as needed
export const useAuthStore = create(set => ({
  user: null,
  isAuthenticated: false,
  setUser: (userData) => set({ user: userData, isAuthenticated: !!userData }),
  logout: () => set({ user: null, isAuthenticated: false }),
  // add fetchUser/me function here later
}));
