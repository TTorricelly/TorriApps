import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Wizard screens
import SchedulingWizardDateScreen from '../screens/wizard/SchedulingWizardDateScreen';
import SchedulingWizardProfessionalsScreen from '../screens/wizard/SchedulingWizardProfessionalsScreen';
import SchedulingWizardSlotsScreen from '../screens/wizard/SchedulingWizardSlotsScreen';
import SchedulingWizardConfirmationScreen from '../screens/wizard/SchedulingWizardConfirmationScreen';

// Types
export type WizardStackParamList = {
  WizardDate: {
    services: Array<{
      id: string;
      name: string;
      duration_minutes: number;
      price: number;
      parallelable: boolean;
      max_parallel_pros: number;
    }>;
  };
  WizardProfessionals: undefined;
  WizardSlots: undefined;
  WizardConfirmation: undefined;
};

export type WizardNavigationProp<T extends keyof WizardStackParamList> = StackNavigationProp<
  WizardStackParamList,
  T
>;

export type WizardRouteProp<T extends keyof WizardStackParamList> = RouteProp<
  WizardStackParamList,
  T
>;

const Stack = createNativeStackNavigator<WizardStackParamList>();

export const SchedulingWizardNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Disable gesture navigation to force using wizard buttons
        animation: 'slide_from_right',
      }}
      initialRouteName="WizardDate"
    >
      <Stack.Screen
        name="WizardDate"
        component={SchedulingWizardDateScreen}
        options={{
          title: 'Selecionar Data',
        }}
      />
      <Stack.Screen
        name="WizardProfessionals"
        component={SchedulingWizardProfessionalsScreen}
        options={{
          title: 'Profissionais',
        }}
      />
      <Stack.Screen
        name="WizardSlots"
        component={SchedulingWizardSlotsScreen}
        options={{
          title: 'Horários',
        }}
      />
      <Stack.Screen
        name="WizardConfirmation"
        component={SchedulingWizardConfirmationScreen}
        options={{
          title: 'Confirmação',
        }}
      />
    </Stack.Navigator>
  );
};

export default SchedulingWizardNavigator;