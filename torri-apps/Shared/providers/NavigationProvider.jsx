import React, { createContext, useContext } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { ROUTES, NAVIGATION_CONFIG } from '../navigation';

/**
 * Navigation Context
 * Provides navigation utilities and routes to entire app
 */
const NavigationContext = createContext(null);

/**
 * Navigation Provider Component
 * Wraps the app to provide navigation context
 */
export const NavigationProvider = ({ children }) => {
  const navigation = useNavigation();
  
  const value = {
    ...navigation,
    routes: ROUTES,
    config: NAVIGATION_CONFIG,
  };
  
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * Hook to use navigation context
 * @returns {Object} Navigation context value
 */
export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};