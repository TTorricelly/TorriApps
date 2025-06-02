import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Simulate login
    navigation.replace('Home');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-brand-lg">
        <Text className="text-brand-2xl font-brand-bold text-text text-center mb-brand-xl">
          Welcome Back
        </Text>
        
        <View className="mb-brand-md">
          <Text className="text-brand-sm font-brand-medium text-text mb-brand-xs">
            Email
          </Text>
          <TextInput
            className="border border-border rounded-brand-md px-brand-md py-brand-sm text-text"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="mb-brand-lg">
          <Text className="text-brand-sm font-brand-medium text-text mb-brand-xs">
            Password
          </Text>
          <TextInput
            className="border border-border rounded-brand-md px-brand-md py-brand-sm text-text"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          className="bg-primary rounded-brand-md py-brand-md"
          onPress={handleLogin}
        >
          <Text className="text-white text-brand-md font-brand-medium text-center">
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;