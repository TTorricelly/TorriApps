import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

const AppointmentsScreen = () => {
  return (
    <StyledView className="flex-1 justify-center items-center">
      <StyledText className="text-lg">TODO: Appointments Screen</StyledText>
    </StyledView>
  );
};
export default AppointmentsScreen;
