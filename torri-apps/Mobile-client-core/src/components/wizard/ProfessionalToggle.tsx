import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ProfessionalToggleProps {
  value: number;
  maxValue: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const ProfessionalToggle: React.FC<ProfessionalToggleProps> = ({
  value,
  maxValue,
  onChange,
  disabled = false,
}) => {
  const options = [
    { value: 1, label: '1 Profissional' },
    { value: 2, label: '2 Profissionais' },
  ];

  const isOptionDisabled = (optionValue: number) => {
    return disabled || optionValue > maxValue;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quantos profissionais?</Text>
      <Text style={styles.subtitle}>
        Escolha 2 profissionais para reduzir o tempo total quando possível
      </Text>
      
      <View style={styles.toggleContainer}>
        {options.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = isOptionDisabled(option.value);
          
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.toggleOption,
                isSelected && styles.selectedOption,
                isDisabled && styles.disabledOption,
              ]}
              onPress={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{
                selected: isSelected,
                disabled: isDisabled,
              }}
            >
              <Text
                style={[
                  styles.toggleText,
                  isSelected && styles.selectedText,
                  isDisabled && styles.disabledText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {maxValue === 1 && (
        <Text style={styles.warningText}>
          Um ou mais serviços selecionados não permitem paralelismo
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: '#ec4899',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledOption: {
    backgroundColor: '#e5e7eb',
    opacity: 0.5,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
  },
  selectedText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledText: {
    color: '#9ca3af',
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ProfessionalToggle;