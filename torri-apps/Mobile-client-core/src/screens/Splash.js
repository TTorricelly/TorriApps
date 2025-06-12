import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-primary justify-center items-center">
      <StatusBar
        backgroundColor="#d7197f"  // or use your theme’s primary color
        barStyle="light-content"
      />
      <Text className="text-white text-brand-2xl font-brand-bold mb-brand-lg">
        Reilo
      </Text>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </SafeAreaView>
  );
};

export default SplashScreen;
