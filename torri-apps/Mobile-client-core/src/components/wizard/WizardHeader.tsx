import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WizardHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
  showBackButton?: boolean;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  totalSteps,
  title,
  onBack,
  showBackButton = true,
}) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={onBack}
              accessibilityLabel="Voltar"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color="#333" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>
        
        <View style={styles.centerSection}>
          <Text style={styles.title}>{title}</Text>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={styles.stepIndicator}>
            Passo {currentStep} de {totalSteps}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill,
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ec4899',
    borderRadius: 2,
  },
});

export default WizardHeader;