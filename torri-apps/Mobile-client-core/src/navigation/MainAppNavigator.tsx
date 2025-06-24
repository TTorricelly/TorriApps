import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, StyleSheet } from 'react-native';
import { Home, Calendar, User, ShoppingCart } from "lucide-react-native";
import useServicesStore from '../store/servicesStore';

// Import screen components
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import ServicesScreen from '../screens/ServicesScreen';
import SchedulingWizardNavigator from './SchedulingWizardNavigator';

interface HomeScreenRef {
  resetToCategories: () => void;
  navigateToCategories: () => void;
  navigateToOrders: () => void;
  navigateToCategoryServices: (categoryId: string) => void;
}

interface MainAppNavigatorProps {
  onLogout: () => void;
}

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

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

// Custom Shopping Cart Icon with Badge
const ShoppingCartWithBadge = ({ color, size }: { color: string; size: number }) => {
  const { selectedServices } = useServicesStore();
  const count = selectedServices.length;

  return (
    <View style={styles.iconContainer}>
      <ShoppingCart size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {count > 99 ? '99+' : count.toString()}
          </Text>
        </View>
      )}
    </View>
  );
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
          } else if (route.name === "Serviços") {
            icon = <ShoppingCartWithBadge color={color} size={size} />
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
          
          // Handle Home tab press - navigate to categories without clearing cart
          if (routeName === 'Início' && homeScreenRef.current) {
            homeScreenRef.current?.navigateToCategories();
          }
          
          // Note: Removed Agendamentos tab press handler to allow normal navigation to AppointmentsScreen
        },
      })}
    >
      <Tab.Screen name="Início">
        {(props) => <HomeStackNavigator {...props} homeScreenRef={homeScreenRef} />}
      </Tab.Screen>
      <Tab.Screen name="Serviços">
        {(props) => <ServicesScreen {...props} homeScreenRef={homeScreenRef} />}
      </Tab.Screen>
      <Tab.Screen name="Agendamentos" component={AppointmentsScreen} />
      <Tab.Screen name="Perfil">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const MainAppNavigator: React.FC<MainAppNavigatorProps> = ({ onLogout }) => {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="BottomTabs">
        {(props) => <BottomTabs {...props} onLogout={onLogout} />}
      </RootStack.Screen>
      <RootStack.Screen
        name="SchedulingWizard"
        component={SchedulingWizardNavigator}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </RootStack.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MainAppNavigator;
