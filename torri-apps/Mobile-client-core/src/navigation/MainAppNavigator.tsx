import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, Grid, Calendar, User } from "lucide-react-native";

// Import screen components
import CategoriesScreen from '../screens/CategoriesScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Services"
        component={HomeScreen}
        options={{
          headerStyle: { backgroundColor: "#ec4899" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
          headerTitle: "Nome do Salão",
          headerTitleAlign: "center",
        }}
      />
    </HomeStack.Navigator>
  )
};

const BottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let icon

          if (route.name === "Início") {
            icon = <Home size={size} color={color} />
          } else if (route.name === "Categorias") {
            icon = <Grid size={size} color={color} />
          } else if (route.name === "Pedidos") {
            icon = <Calendar size={size} color={color} />
          } else if (route.name === "Perfil") {
            icon = <User size={size} color={color} />
          }

          return icon
        },
        tabBarActiveTintColor: "#ec4899",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: { paddingBottom: 5, height: 60 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Início" component={HomeStackNavigator} />
      <Tab.Screen name="Categorias" component={CategoriesScreen} />
      <Tab.Screen name="Pedidos" component={AppointmentsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabs;
