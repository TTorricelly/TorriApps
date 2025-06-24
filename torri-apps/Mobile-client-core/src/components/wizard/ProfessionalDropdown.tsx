import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { ChevronDown, User, Check } from 'lucide-react-native';
import { Professional } from '../../types';

interface ProfessionalDropdownProps {
  label: string;
  professionals: Professional[];
  selectedProfessional?: Professional;
  onSelect: (professional: Professional) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export const ProfessionalDropdown: React.FC<ProfessionalDropdownProps> = ({
  label,
  professionals,
  selectedProfessional,
  onSelect,
  excludeIds = [],
  placeholder = 'Selecione um profissional',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter out excluded professionals
  const availableProfessionals = professionals.filter(
    (prof) => !excludeIds.includes(prof.id)
  );

  const handleSelect = (professional: Professional) => {
    onSelect(professional);
    setIsOpen(false);
  };

  const renderProfessionalItem = ({ item }: { item: Professional }) => {
    const isSelected = selectedProfessional?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.dropdownItem,
          isSelected && styles.selectedItem,
        ]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.professionalInfo}>
          <View style={styles.avatarPlaceholder}>
            <User size={20} color="#6b7280" />
          </View>
          <View style={styles.professionalDetails}>
            <Text style={styles.professionalName}>
              {item.full_name || item.email}
            </Text>
            <Text style={styles.professionalEmail}>
              {item.email}
            </Text>
          </View>
        </View>
        {isSelected && (
          <Check size={20} color="#ec4899" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity
        style={[
          styles.selector,
          isOpen && styles.selectorOpen,
          availableProfessionals.length === 0 && styles.selectorDisabled,
        ]}
        onPress={() => setIsOpen(true)}
        disabled={availableProfessionals.length === 0}
        accessibilityLabel={`${label}. ${selectedProfessional ? `Selecionado: ${selectedProfessional.full_name || selectedProfessional.email}` : placeholder}`}
        accessibilityRole="button"
      >
        <View style={styles.selectorContent}>
          {selectedProfessional ? (
            <View style={styles.selectedProfessionalDisplay}>
              <View style={styles.avatarPlaceholder}>
                <User size={16} color="#6b7280" />
              </View>
              <Text style={styles.selectedProfessionalText}>
                {selectedProfessional.full_name || selectedProfessional.email}
              </Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              {availableProfessionals.length === 0 
                ? 'Nenhum profissional disponível' 
                : placeholder
              }
            </Text>
          )}
        </View>
        
        <ChevronDown 
          size={20} 
          color={availableProfessionals.length === 0 ? "#9ca3af" : "#6b7280"} 
          style={[
            styles.chevron,
            isOpen && styles.chevronOpen,
          ]}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            
            <FlatList
              data={availableProfessionals}
              keyExtractor={(item) => item.id}
              renderItem={renderProfessionalItem}
              style={styles.professionalsList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    minHeight: 48,
  },
  selectorOpen: {
    borderColor: '#ec4899',
  },
  selectorDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  selectorContent: {
    flex: 1,
  },
  selectedProfessionalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedProfessionalText: {
    fontSize: 16,
    color: '#1f2937',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  chevron: {
    marginLeft: 8,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  professionalsList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedItem: {
    backgroundColor: '#fdf2f8',
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  professionalDetails: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  professionalEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
});

export default ProfessionalDropdown;