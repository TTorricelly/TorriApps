import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 justify-center items-center">
      <Text className="text-xl">Perfil Screen</Text>
    </SafeAreaView>
  )
}

