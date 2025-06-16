import React, { useEffect } from 'react'; // Removed useState, added useEffect
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native'; // Added for loading
import MainAppNavigator from './MainAppNavigator';
import useAuthStore from '../store/authStore'; // Import the auth store
import LoginScreen from '../screens/LoginScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// Basic Loading Spinner Component
const LoadingSpinner = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#ec4899" />
  </View>
);

export default function Navigation() {
  // Get state and actions from the Zustand store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoadingAuth = useAuthStore((state) => state.isLoading);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const storeLogout = useAuthStore((state) => state.logout);

  // Local state for managing which auth screen to show (login or create account)
  // This remains local as it's specific to the navigation flow when not authenticated.
  const [currentAuthScreen, setCurrentAuthScreen] = React.useState<'login' | 'createAccount'>('login');

  useEffect(() => {
    hydrateAuth(); // Attempt to rehydrate auth state on app start
  }, [hydrateAuth]);

  // This function is called by LoginScreen upon successful API login & store update
  // Its role here is to ensure navigation reacts, though isAuthenticated from store is the source of truth
  const handleLoginSuccess = () => {
    // setIsLoggedIn(true) -> This is now handled by the store directly
    // The component will re-render because isAuthenticated from the store will change.
    // No explicit state change needed here for isLoggedIn.
  };

  const handleNavigateToCreateAccount = () => {
    setCurrentAuthScreen('createAccount');
  };

  const handleBackToLogin = () => {
    setCurrentAuthScreen('login');
  };

  // Called by CreateAccountScreen upon successful account creation & store update
  const handleAccountCreated = () => {
    // Similar to handleLoginSuccess, the store handles the auth state.
    // Navigation will react to isAuthenticated changing.
  };

  // This is passed to MainAppNavigator to allow logout from within the app
  const handleLogout = async () => {
    await storeLogout();
    setCurrentAuthScreen('login'); // Reset to login screen after logout
  };

  if (isLoadingAuth) {
    return <LoadingSpinner />; // Show loading spinner while checking auth status
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainApp">
            {(props) => <MainAppNavigator {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : currentAuthScreen === 'login' ? (
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen
                {...props}
                onLoginSuccess={handleLoginSuccess} // Still useful to signal navigation
                onNavigateToCreateAccount={handleNavigateToCreateAccount}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="CreateAccount">
            {(props) => (
              <CreateAccountScreen
                {...props}
                onBackPress={handleBackToLogin}
                onAccountCreated={handleAccountCreated} // Still useful to signal navigation
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white', // Or your app's background color
  },
});