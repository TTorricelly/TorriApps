import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface WizardContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default WizardContainer;