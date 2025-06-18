import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, Calendar, User } from "lucide-react-native";

// Import screen components
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';

interface HomeScreenRef {
  resetToCategories: () => void;
  navigateToOrders: () => void;
}

interface MainAppNavigatorProps {
  onLogout: () => void;
}

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator({ homeScreenRef }: { homeScreenRef: React.RefObject<HomeScreenRef> }) {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Services"
        options={{
          headerShown: false,
        }}
      >
        {(props) => <HomeScreen {...props} ref={homeScreenRef} />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  )
};

const BottomTabs: React.FC<MainAppNavigatorProps> = ({ onLogout }) => {
  const homeScreenRef = useRef<HomeScreenRef>(null);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let icon

          if (route.name === "Início") {
            icon = <Home size={size} color={color} />
          } else if (route.name === "Agendamentos") {
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
      screenListeners={({ navigation }) => ({
        tabPress: (e) => {
          const routeName = e.target?.split('-')[0];
          
          // Handle Home tab press - reset to categories screen (beginning)
          if (routeName === 'Início' && homeScreenRef.current) {
            homeScreenRef.current?.resetToCategories();
          }
          
          // Note: Removed Agendamentos tab press handler to allow normal navigation to AppointmentsScreen
        },
      })}
    >
      <Tab.Screen name="Início">
        {(props) => <HomeStackNavigator {...props} homeScreenRef={homeScreenRef} />}
      </Tab.Screen>
      <Tab.Screen name="Agendamentos" component={AppointmentsScreen} />
      <Tab.Screen name="Perfil">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default BottomTabs;
