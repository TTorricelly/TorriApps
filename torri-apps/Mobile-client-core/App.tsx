/**
 * Main Application entry point.
 */
import React from 'react';
import Navigation from './src/navigation';   // Adjust path as needed
import { SafeAreaProvider } from 'react-native-safe-area-context';

const App = () => {
  return (
    <SafeAreaProvider>
        <Navigation />
    </SafeAreaProvider>
  );
};

export default App;
