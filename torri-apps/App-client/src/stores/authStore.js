import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { jwtDecode } from 'jwt-decode'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (tokenData) => {
        try {
          set({ isLoading: true })
          
          // Decode JWT token using proper library
          const decodedToken = jwtDecode(tokenData.access_token);
          
          // Skip token expiry check for persistent login
          // Token will only be invalidated on manual logout
          
          // Map backend roles to frontend roles for consistency
          const roleMapping = {
            'manager': 'GESTOR',
            'admin': 'GESTOR', 
            'receptionist': 'ATENDENTE',
            'professional': 'PROFISSIONAL',
            'client': 'CLIENTE'
          };
          
          const backendRole = decodedToken.role || 'client';
          const mappedRole = roleMapping[backendRole] || backendRole;
          
          // Standardize user data structure to match mobile app
          const user = {
            id: decodedToken.user_id || decodedToken.sub,
            email: decodedToken.sub || decodedToken.email, // 'sub' is typically the email
            fullName: decodedToken.full_name || decodedToken.name || 'User',
            role: mappedRole,
            originalRole: backendRole, // Keep original for debugging
            isActive: decodedToken.is_active !== false // Default to true if not specified
          }

          // Store token in the standardized location for API client
          localStorage.setItem('authToken', tokenData.access_token);

          set({
            user,
            token: tokenData.access_token,
            isAuthenticated: true,
            isLoading: false
          })

          return user
        } catch (error) {
          set({ isLoading: false })
          throw new Error('Failed to process login token')
        }
      },

      logout: () => {
        // Clear both storage locations
        localStorage.removeItem('authToken');
        localStorage.removeItem('torri-auth-storage');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      // Helper to get current user
      getCurrentUser: () => get().user,
      
      // Helper to get auth token
      getToken: () => get().token,

      // Validate stored token on app startup
      validateStoredToken: () => {
        const state = get();
        let token = state.token;
        
        // If no token in state, try to get from localStorage
        if (!token) {
          token = localStorage.getItem('authToken');
          if (!token) {
            // Try fallback location
            const authStorage = localStorage.getItem('torri-auth-storage');
            if (authStorage) {
              try {
                const parsedStorage = JSON.parse(authStorage);
                token = parsedStorage.state?.token;
              } catch (error) {
              }
            }
          }
        }
        
        if (!token) {
          return false;
        }

        try {
          const decodedToken = jwtDecode(token);
          
          // Skip token expiry check for persistent login
          // Users will only be logged out manually
          
          // If token is valid but not in state, restore it
          if (!state.token) {
            
            // Apply the same role mapping as in login
            const roleMapping = {
              'manager': 'GESTOR',
              'admin': 'GESTOR', 
              'receptionist': 'ATENDENTE',
              'professional': 'PROFISSIONAL',
              'client': 'CLIENTE'
            };
            
            const backendRole = decodedToken.role || 'client';
            const mappedRole = roleMapping[backendRole] || backendRole;
            
            const user = {
              id: decodedToken.user_id || decodedToken.sub,
              email: decodedToken.sub || decodedToken.email,
              fullName: decodedToken.full_name || decodedToken.name || 'User',
              role: mappedRole,
              originalRole: backendRole,
              isActive: decodedToken.is_active !== false
            };
            
            // Ensure token is in standardized location
            localStorage.setItem('authToken', token);
            
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false
            });
          }
          
          return true;
        } catch (error) {
          state.logout();
          return false;
        }
      },

      // Update user profile data (similar to mobile app)
      setProfile: (profileData) => {
        const currentUser = get().user;
        
        const updatedUser = {
          ...currentUser,
          ...profileData,
          // Ensure essential fields from JWT are not overwritten
          id: profileData.id || currentUser?.id,
          email: profileData.email || currentUser?.email,
        };

        set({ user: updatedUser });
      },

      // Role-based helper functions
      isClient: () => {
        const user = get().user;
        return user?.role === 'CLIENTE';
      },

      isProfessional: () => {
        const user = get().user;
        return ['PROFISSIONAL', 'ATENDENTE', 'GESTOR'].includes(user?.role);
      },

      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
      },

      getUserRole: () => {
        const user = get().user;
        return user?.role || 'CLIENTE';
      },
    }),
    {
      name: 'torri-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)