import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View className="flex-1 bg-primary justify-center items-center">
      <Text className="text-white text-brand-2xl font-brand-bold mb-brand-lg">
        TorriApps
      </Text>
      <ActivityIndicator size="large" color="white" />
    </View>
  );
};

export default SplashScreen;