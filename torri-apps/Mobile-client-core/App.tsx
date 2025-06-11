/**
 * Main Application entry point.
 */
import React from 'react';
import Navigation from './src/navigation'; // Adjusted path
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TailwindProvider } from 'nativewind'; // Assuming nativewind v2/v3 setup
                                              // For nativewind v4, this might not be needed at root.
                                              // The existing tailwind.config.js uses 'nativewind/preset', suggesting v2/v3.

const App = () => {
  return (
    <SafeAreaProvider>
      <TailwindProvider>
        <Navigation />
      </TailwindProvider>
    </SafeAreaProvider>
  );
};

export default App;
