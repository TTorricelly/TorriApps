import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import MainAppNavigator from './MainAppNavigator';
import LoginScreen from '../screens/LoginScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAuthScreen, setCurrentAuthScreen] = useState<'login' | 'createAccount'>('login');

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleNavigateToCreateAccount = () => {
    setCurrentAuthScreen('createAccount');
  };

  const handleBackToLogin = () => {
    setCurrentAuthScreen('login');
  };

  const handleAccountCreated = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentAuthScreen('login');
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="MainApp">
            {(props) => <MainAppNavigator {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : currentAuthScreen === 'login' ? (
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen 
                {...props} 
                onLoginSuccess={handleLoginSuccess}
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
                onAccountCreated={handleAccountCreated}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};