import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { formatDuration } from '../../utils/dateUtils';

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

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  // Calculate individual service start times based on execution type
  const calculateServiceTimes = () => {
    const services = slot.services.map((service, index) => {
      let startTime: string;
      
      if (slot.execution_type === 'parallel') {
        // All services start at the same time (parallel execution)
        startTime = slot.start_time;
      } else {
        // Sequential execution - calculate cumulative start time
        const previousDurations = slot.services
          .slice(0, index)
          .reduce((total, prev) => total + prev.duration_minutes, 0);
        
        const slotStartDate = new Date(`1970-01-01T${slot.start_time}`);
        slotStartDate.setMinutes(slotStartDate.getMinutes() + previousDurations);
        startTime = slotStartDate.toTimeString().substring(0, 5);
      }
      
      return { ...service, calculated_start_time: startTime };
    });
    
    return services;
  };

  const servicesWithTimes = calculateServiceTimes();
  const professionalCount = new Set(slot.services.map(s => s.professional_id)).size;

  const accessibilityLabel = `Horário das ${formatTime(slot.start_time)} às ${formatTime(slot.end_time)}, total ${formatDuration(slot.total_duration_minutes)}, ${slot.services.length} serviços, ${formatPrice(slot.total_price)}`;

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
      {/* Header with time range and summary */}
      <View style={styles.headerRow}>
        <Text style={styles.timeRange}>
          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
        </Text>
        <Text style={styles.totalDuration}>• Total {formatDuration(slot.total_duration_minutes)}</Text>
      </View>

      {/* Summary row with professionals count and price */}
      <View style={styles.summaryRow}>
        <Text style={styles.professionalsCount}>👥 {professionalCount} profissionais</Text>
        <Text style={styles.totalPrice}>{formatPrice(slot.total_price)}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Services List */}
      <View style={styles.servicesList}>
        {servicesWithTimes.map((service, index) => (
          <View key={index} style={styles.serviceRow}>
            <Text style={styles.serviceTime}>{service.calculated_start_time}</Text>
            <Text style={styles.serviceName}>{service.service_name}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.professionalName}>{service.professional_name}</Text>
          </View>
        ))}
      </View>

      {/* Execution type indicator */}
      <View style={styles.executionIndicator}>
        <Text style={styles.executionIcon}>
          {slot.execution_type === 'parallel' ? '║' : '↧'}
        </Text>
        <Text style={styles.executionLabel}>
          {slot.execution_type === 'parallel' ? 'Paralelo' : 'Sequencial'}
        </Text>
      </View>

      {/* Selected indicator */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <CheckCircle size={20} color="#ec4899" />
        </View>
      )}
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
    padding: 16,
    position: 'relative',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeRange: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  totalDuration: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  professionalsCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  servicesList: {
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  serviceTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    width: 50,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginRight: 8,
  },
  separator: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: 8,
  },
  professionalName: {
    fontSize: 14,
    color: '#6b7280',
  },
  executionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  executionIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ec4899',
    marginRight: 6,
  },
  executionLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
});

export default ItineraryCard;