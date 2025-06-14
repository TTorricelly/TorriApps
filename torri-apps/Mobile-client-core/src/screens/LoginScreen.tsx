import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  return (
    <SafeAreaView className="flex-1 justify-center items-center p-4">
      <Text className="text-3xl font-bold mb-8">Login</Text>
      <TouchableOpacity className="bg-pink-500 py-3 px-6 rounded-lg" onPress={() => navigation.replace("MainApp")}>
        <Text className="text-white font-bold text-lg">Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}