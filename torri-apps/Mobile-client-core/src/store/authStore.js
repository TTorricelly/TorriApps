import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode'; // Ensure this is installed

const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData'; // For persisting decoded user data

const useAuthStore = create((set, get) => ({
  user: null, // Will store { id, email, fullName, role, isActive }
  token: null,
  isAuthenticated: false,
  isLoading: true, // To handle async loading of token from storage

  login: async (tokenData) => {
    try {
      const decodedToken = jwtDecode(tokenData.access_token);
      const userData = {
        id: decodedToken.user_id,
        email: decodedToken.sub, // 'sub' is typically the email
        fullName: decodedToken.full_name,
        role: decodedToken.role,
        isActive: decodedToken.is_active,
      };

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, tokenData.access_token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      set({ user: userData, token: tokenData.access_token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error("Failed to decode token or store data:", error);
      // Handle error appropriately, maybe clear state
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: async () => {
    try {
      set({ isLoading: true });
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedUserJson = await AsyncStorage.getItem(USER_DATA_KEY);

      if (storedToken && storedUserJson) {
        const storedUser = JSON.parse(storedUserJson);
        // Optional: Validate token expiry here if not done elsewhere
        // For now, assume if it's stored, it's valid enough for rehydration
        // A robust solution would check expiry and refresh if needed.
        const decodedToken = jwtDecode(storedToken); // Re-decode to check expiry
        if (decodedToken.exp * 1000 > Date.now()) {
            set({ user: storedUser, token: storedToken, isAuthenticated: true, isLoading: false });
        } else {
            // Token expired
            await get().logout(); // Call logout to clear storage and state
             set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Failed to hydrate auth state:", error);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Action to update user profile data from /users/me endpoint
  setProfile: async (profileData) => {
    console.log('[authStore] setProfile called with profileData:', JSON.stringify(profileData, null, 2));
    try {
      // Merge new profile data with existing user data (especially from JWT)
      // Ensure essential fields from JWT (like id, email, role) are not overwritten if not present in profileData
      // and that profileData (like phone_number, photo_path) is added/updated.

      // Get current user data for logging and merging
      const currentUserData = get().user;
      console.log('[authStore] Current user state before setProfile merge:', JSON.stringify(currentUserData, null, 2));

      const updatedUserData = {
        ...currentUserData, // existing data from JWT
        ...profileData,     // data from /users/me
        id: profileData.id || currentUserData?.id, // Prioritize ID from profile data if available
        email: profileData.email || currentUserData?.email, // Prioritize email from profile data
      };

      // Log the data that will be set
      console.log('[authStore] New user state after setProfile merge (before setting to AsyncStorage and state):', JSON.stringify(updatedUserData, null, 2));

      // Persist the updated user data
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUserData));

      set((state) => {
        // This log is tricky because `set` doesn't immediately give you the newState object
        // to log directly here in the same way. We've already logged updatedUserData which is what user will become.
        // For direct confirmation of what set actually does, you'd typically log outside or use `subscribe`.
        // However, `updatedUserData` is what's being set.
        return { user: updatedUserData };
        // isLoading might be set to false here if a global profile loading state is used
      });
    } catch (error) {
      console.error("[authStore] Failed to set profile data in store:", error);
      // Decide if we need to do anything else on error, e.g., partial update or nothing
    }
  },
}));

// Call hydrate on store initialization (when the app starts)
// This is a common pattern but might need to be triggered from App.tsx or similar entry point.
// For now, let's assume it's called from the main app component.
// useAuthStore.getState().hydrate();
// ^ Better to call this from App.tsx or a similar root component to ensure it's run at the right time.

export default useAuthStore;
