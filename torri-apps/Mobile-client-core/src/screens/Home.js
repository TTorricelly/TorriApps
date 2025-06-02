import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = ({ navigation }) => {
  const handleLogout = () => {
    navigation.replace('Login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-brand-lg py-brand-md bg-primary">
          <Text className="text-white text-brand-xl font-brand-bold">
            TorriApps
          </Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text className="text-white text-brand-sm font-brand-medium">
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View className="px-brand-lg py-brand-xl">
          <Text className="text-brand-2xl font-brand-bold text-text mb-brand-xs">
            Welcome to Your Salon
          </Text>
          <Text className="text-brand-md text-text-muted">
            Manage your appointments and services with ease
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-brand-lg">
          <Text className="text-brand-lg font-brand-semibold text-text mb-brand-md">
            Quick Actions
          </Text>
          
          <View className="space-y-brand-sm">
            <TouchableOpacity className="bg-white border border-border rounded-brand-lg p-brand-md shadow-sm">
              <Text className="text-brand-md font-brand-medium text-text">
                📅 View Appointments
              </Text>
              <Text className="text-brand-sm text-text-muted mt-brand-xs">
                Check your upcoming bookings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-white border border-border rounded-brand-lg p-brand-md shadow-sm">
              <Text className="text-brand-md font-brand-medium text-text">
                ✂️ Services
              </Text>
              <Text className="text-brand-sm text-text-muted mt-brand-xs">
                Browse available services
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-white border border-border rounded-brand-lg p-brand-md shadow-sm">
              <Text className="text-brand-md font-brand-medium text-text">
                👤 Profile
              </Text>
              <Text className="text-brand-sm text-text-muted mt-brand-xs">
                Manage your account settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;