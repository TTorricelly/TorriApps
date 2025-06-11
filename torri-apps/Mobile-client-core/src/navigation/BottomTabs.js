import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import screen components (placeholders for now)
import CategoriesScreen from '../screens/CategoriesScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="Categorias"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Categorias') {
            iconName = focused ? 'ios-apps' : 'ios-apps-outline';
          } else if (route.name === 'Agendamentos') {
            iconName = focused ? 'ios-calendar' : 'ios-calendar-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'ios-person' : 'ios-person-outline';
          }

          // Adjust size if needed, default is usually fine (e.g., 20-25)
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#d7197f', // Active tab color
        tabBarInactiveTintColor: '#6b7280', // Inactive tab color
        tabBarLabelStyle: {
          fontSize: 14, // Label font size
          // paddingBottom: 5, // Add some padding if icons are too close to label
        },
        tabBarStyle: {
          // height: 60, // Adjust overall tab bar height if needed
          // paddingTop: 5, // Add padding at the top of the tab bar
        },
        headerShown: false, // We'll implement custom headers in each screen
      })}
    >
      <Tab.Screen
        name="Categorias"
        component={CategoriesScreen}
      />
      <Tab.Screen
        name="Agendamentos"
        component={AppointmentsScreen}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

export default BottomTabs;
