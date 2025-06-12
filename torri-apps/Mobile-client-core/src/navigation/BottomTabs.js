import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import screen components (placeholders for now)
import CategoriesScreen from '../screens/CategoriesScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';

// --- ICON TROUBLESHOOTING ---
// If you are not seeing the icons below, it's likely an issue with
// react-native-vector-icons setup. Please ensure the following:
//
// 1. `react-native-vector-icons` is in your `package.json`.
// 2. Autolinking should handle most cases, but if issues persist:
//    - For iOS:
//      - Run `cd ios && pod install && cd ..`
//      - Ensure `Ionicons.ttf` (and other fonts if used) are part of "Copy Bundle Resources" in Xcode.
//    - For Android:
//      - Check `android/app/build.gradle` for:
//        `apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"`
//      - Ensure the app is rebuilt: `npx react-native run-android`
// 3. After any of these steps, restart your Metro bundler and rebuild/rerun your app.
// 4. Verify the icon names used are correct for the version of Ionicons bundled
//    with react-native-vector-icons. Common names like 'ios-apps', 'ios-calendar',
//    'ios-person' and their '-outline' variants are generally safe.
//
// For more details, consult the react-native-vector-icons installation guide:
// https://github.com/oblador/react-native-vector-icons#installation
// --- END ICON TROUBLESHOOTING ---

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
