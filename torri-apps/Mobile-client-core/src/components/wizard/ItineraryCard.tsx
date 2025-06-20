import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, User, MapPin, CheckCircle } from 'lucide-react-native';

interface ServiceInSlot {
  service_id: string;
  service_name: string;
  professional_id: string;
  professional_name: string;
  station_id?: string;
  station_name?: string;
  duration_minutes: number;
  price: number;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  total_duration_minutes: number;
  total_price: number;
  execution_type: 'parallel' | 'sequential';
  services: ServiceInSlot[];
}

interface ItineraryCardProps {
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: () => void;
  style?: any;
}

export const ItineraryCard: React.FC<ItineraryCardProps> = ({
  slot,
  isSelected,
  onSelect,
  style,
}) => {
  const formatTime = (timeString: string) => {
    // Extract time from "HH:MM:SS" or "HH:MM" format
    return timeString.substring(0, 5);
  };

  const getExecutionIcon = (type: string) => {
    // Using text symbols since we need simple icons
    return type === 'parallel' ? '║' : '↧';
  };

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const accessibilityLabel = `Horário das ${formatTime(slot.start_time)} às ${formatTime(slot.end_time)}, total ${slot.total_duration_minutes} minutos, ${slot.services.length} serviços, ${formatPrice(slot.total_price)}`;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        style,
      ]}
      onPress={onSelect}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.timeSection}>
          <Text style={styles.timeRange}>
            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
          </Text>
          <View style={styles.durationContainer}>
            <Clock size={14} color="#6b7280" />
            <Text style={styles.totalTime}>
              {slot.total_duration_minutes} min
            </Text>
          </View>
        </View>
        
        <View style={styles.executionSection}>
          <View style={styles.executionTypeContainer}>
            <Text style={styles.executionIcon}>
              {getExecutionIcon(slot.execution_type)}
            </Text>
            <Text style={styles.executionType}>
              {slot.execution_type === 'parallel' ? 'Paralelo' : 'Sequencial'}
            </Text>
          </View>
        </View>
        
        {isSelected && (
          <View style={styles.selectedIcon}>
            <CheckCircle size={24} color="#ec4899" />
          </View>
        )}
      </View>

      {/* Services List */}
      <View style={styles.servicesList}>
        {slot.services.map((service, index) => (
          <View key={index} style={styles.serviceRow}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>
                {service.service_name}
              </Text>
              <Text style={styles.serviceDuration}>
                {service.duration_minutes} min
              </Text>
            </View>
            
            <View style={styles.assignmentInfo}>
              <View style={styles.professionalInfo}>
                <User size={12} color="#6b7280" />
                <Text style={styles.professionalName}>
                  {service.professional_name}
                </Text>
              </View>
              
              {service.station_name && (
                <View style={styles.stationInfo}>
                  <MapPin size={12} color="#6b7280" />
                  <Text style={styles.stationName}>
                    {service.station_name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.totalPrice}>
          {formatPrice(slot.total_price)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedContainer: {
    borderColor: '#ec4899',
    borderWidth: 2,
    backgroundColor: '#fdf2f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timeSection: {
    flex: 1,
  },
  timeRange: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  executionSection: {
    alignItems: 'center',
  },
  executionTypeContainer: {
    alignItems: 'center',
    gap: 4,
  },
  executionIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  executionType: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  selectedIcon: {
    marginLeft: 12,
  },
  servicesList: {
    padding: 16,
    gap: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#6b7280',
  },
  assignmentInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  professionalName: {
    fontSize: 14,
    color: '#4b5563',
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stationName: {
    fontSize: 12,
    color: '#6b7280',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ec4899',
    textAlign: 'center',
  },
});

export default ItineraryCard;