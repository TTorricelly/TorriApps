# Especificação Técnica: Wizard de Agendamento Multiserviço

## Resumo Executivo

O Wizard de Agendamento Multiserviço é uma funcionalidade que permite aos clientes agendar múltiplos serviços em um único fluxo, otimizando o tempo total através de paralelismo quando possível e respeitando as restrições de profissionais, estações e configurações do sistema.

## Histórias de Usuário e Critérios de Aceite

### US-WIZ-01: Seleção de Data
**Como cliente, quero escolher o dia antes de tudo, para ver horários disponíveis de todos os serviços juntos.**

**Critérios de Aceite:**
- ✓ Calendário mensal mostra apenas dias futuros
- ✓ Tap em um dia chama algoritmo de disponibilidade e carrega passo ②
- ✓ Dias sem qualquer slot válido exibem tooltip "Sem horários para os serviços escolhidos"

### US-WIZ-02: Configuração de Paralelismo
**Como cliente, quero decidir se desejo 1 ou 2 profissionais para reduzir meu tempo total.**

**Critérios de Aceite:**
- ✓ Toggle 1×/2× respeita services.max_parallel_pros (se algum serviço tem 1, opção 2× é desativada)
- ✓ Valor inicial do toggle = app_settings.default_pros_suggested (desde que permitido)
- ✓ Alterar toggle força recálculo de horários no passo ③

### US-WIZ-03: Seleção de Profissionais
**Como cliente, quero escolher quem irá me atender (quando existir mais de uma opção) sem ver nomes de profissionais indisponíveis.**

**Critérios de Aceite:**
- ✓ Lista mostra somente profissionais livres no dia escolhido
- ✓ Se 2× pros, aparecem dois drop-downs independentes (Pro A / Pro B) filtrados pelo tipo de serviço
- ✓ Selecionar/Ajustar profissional recarrega slots no passo ③

### US-WIZ-04: Visualização de Itinerários
**Como cliente, quero ver cartões-itinerário que indiquem sequência/paralelismo, tempo total e horário exato.**

**Critérios de Aceite:**
- ✓ Cada cartão mostra intervalo (ex. 15:00 – 16:30) + total (90 min)
- ✓ Linha por serviço: nome, duração, profissional, estação (label)
- ✓ Ícones diferentes para paralelo (║) e sequencial (↧)
- ✓ Máximo de 3 cartões visíveis + botão "Ver mais horários"

### US-WIZ-05: Confirmação Final
**Como cliente, quero confirmar o itinerário desejado e receber um resumo final.**

**Critérios de Aceite:**
- ✓ Tap em cartão marca "Selecionado"
- ✓ Botão "Confirmar agendamento" leva à tela de resumo com QR opcional
- ✓ Botão "Adicionar ao Calendário" e CTA "Voltar à Home"

## Arquitetura Técnica

### Backend: Mudanças no Banco de Dados

#### 1. Novo Modelo: AppointmentGroup
```python
class AppointmentGroup(Base):
    __tablename__ = "appointment_groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    total_duration_minutes = Column(Integer, nullable=False)
    total_price = Column(DECIMAL(10, 2), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(AppointmentGroupStatus), default=AppointmentGroupStatus.SCHEDULED)
    notes_by_client = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("User", back_populates="appointment_groups")
    appointments = relationship("Appointment", back_populates="appointment_group")
```

#### 2. Modificação no Modelo Appointment
```python
class Appointment(Base):
    # ... campos existentes ...
    
    # Novo campo para agrupar appointments relacionados
    group_id = Column(UUID(as_uuid=True), ForeignKey("appointment_groups.id"), nullable=True)
    
    # Nova relationship
    appointment_group = relationship("AppointmentGroup", back_populates="appointments")
```

#### 3. Novo Enum: AppointmentGroupStatus
```python
class AppointmentGroupStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PARTIALLY_COMPLETED = "partially_completed"
```

### Backend: Novos Endpoints da API

#### 1. GET /api/v1/appointments/wizard/availability
**Verifica disponibilidade para múltiplos serviços**

```python
@router.get("/wizard/availability")
async def get_multi_service_availability(
    service_ids: List[UUID] = Query(...),
    date: date = Query(...),
    professionals_requested: int = Query(default=1),
    db: Session = Depends(get_db)
):
    """
    Retorna slots disponíveis para múltiplos serviços
    considerando paralelismo e recursos
    """
```

**Resposta:**
```json
{
    "date": "2024-01-15",
    "available_slots": [
        {
            "start_time": "15:00",
            "end_time": "16:30",
            "total_duration_minutes": 90,
            "total_price": 150.00,
            "execution_type": "parallel",
            "services": [
                {
                    "service_id": "uuid1",
                    "service_name": "Corte",
                    "professional_id": "uuid_prof1",
                    "professional_name": "Carlos",
                    "station_id": "uuid_station1",
                    "station_name": "Cadeira 1",
                    "duration_minutes": 30,
                    "price": 50.00
                }
            ]
        }
    ]
}
```

#### 2. POST /api/v1/appointments/wizard/book
**Cria agendamento com múltiplos serviços**

```python
@router.post("/wizard/book")
async def create_multi_service_appointment(
    booking_data: MultiServiceBookingSchema,
    db: Session = Depends(get_db)
):
    """
    Cria um AppointmentGroup com múltiplos Appointments
    """
```

**Payload:**
```json
{
    "client_id": "uuid",
    "selected_slot": {
        "start_time": "15:00",
        "end_time": "16:30",
        "services": [
            {
                "service_id": "uuid1",
                "professional_id": "uuid_prof1",
                "station_id": "uuid_station1"
            }
        ]
    },
    "notes_by_client": "Observações opcionais"
}
```

#### 3. GET /api/v1/appointments/wizard/professionals
**Lista profissionais disponíveis para data/serviços**

```python
@router.get("/wizard/professionals")
async def get_available_professionals(
    service_ids: List[UUID] = Query(...),
    date: date = Query(...),
    db: Session = Depends(get_db)
):
    """
    Retorna profissionais disponíveis e qualificados
    para os serviços na data especificada
    """
```

### Backend: MultiServiceAvailabilityService

#### Algoritmo Principal
```python
class MultiServiceAvailabilityService:
    def get_available_slots(
        self,
        services: List[Service],
        target_date: date,
        professionals_requested: int = 1
    ) -> List[TimeSlot]:
        """
        Algoritmo principal de busca de slots
        
        1. Expansão de requisitos por serviço
        2. Filtragem de profissionais elegíveis
        3. Geração de combinações de recursos
        4. Construção de itinerários paralelos/sequenciais
        5. Ranking e corte dos melhores resultados
        """
        
        # 1. Expandir requisitos
        service_requirements = self._expand_service_requirements(services)
        
        # 2. Filtrar profissionais elegíveis
        eligible_professionals = self._get_eligible_professionals(
            services, target_date
        )
        
        # 3. Gerar combinações de recursos
        resource_combinations = self._generate_resource_combinations(
            service_requirements, eligible_professionals, professionals_requested
        )
        
        # 4. Construir itinerários
        itineraries = []
        for combination in resource_combinations:
            parallel_slots = self._build_parallel_itinerary(combination)
            sequential_slots = self._build_sequential_itinerary(combination)
            itineraries.extend(parallel_slots + sequential_slots)
        
        # 5. Ranking e corte
        ranked_slots = self._rank_and_filter_slots(itineraries)
        
        return ranked_slots[:10]  # Máximo 10 opções
```

#### Lógica de Paralelismo
```python
def _build_parallel_itinerary(self, resource_combination: ResourceCombination) -> List[TimeSlot]:
    """
    Constrói itinerário paralelo quando possível
    
    Regras:
    - Todos os serviços devem ter parallelable=True
    - Não pode exceder max_parallel_pros de nenhum serviço
    - Estações devem estar disponíveis simultaneamente
    - Tempo total = maior duração do grupo
    """
    
    if not self._can_execute_in_parallel(resource_combination.services):
        return []
    
    # Encontrar slots simultâneos para todos os recursos
    simultaneous_slots = self._find_simultaneous_availability(
        resource_combination.professionals,
        resource_combination.stations,
        max(service.duration_minutes for service in resource_combination.services)
    )
    
    return self._build_time_slots(simultaneous_slots, "parallel")
```

#### Lógica Sequencial
```python
def _build_sequential_itinerary(self, resource_combination: ResourceCombination) -> List[TimeSlot]:
    """
    Constrói itinerário sequencial
    
    Regras:
    - Serviços executados em ordem otimizada
    - Pode reutilizar profissionais e estações
    - Tempo total = soma das durações + tempo de setup
    - Priorizar ordem: cabelo → coloração → manicure → pedicure
    """
    
    # Otimizar ordem dos serviços
    optimized_order = self._optimize_service_order(resource_combination.services)
    
    # Encontrar slots consecutivos
    consecutive_slots = self._find_consecutive_availability(
        resource_combination.professionals,
        resource_combination.stations,
        optimized_order
    )
    
    return self._build_time_slots(consecutive_slots, "sequential")
```

### Mobile: Estrutura de Navegação

#### 1. SchedulingWizardNavigator
```typescript
// Navigation/SchedulingWizardNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export const SchedulingWizardNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: false // Força uso dos botões do wizard
      }}
    >
      <Stack.Screen 
        name="WizardDate" 
        component={SchedulingWizardDateScreen} 
      />
      <Stack.Screen 
        name="WizardProfessionals" 
        component={SchedulingWizardProfessionalsScreen} 
      />
      <Stack.Screen 
        name="WizardSlots" 
        component={SchedulingWizardSlotsScreen} 
      />
      <Stack.Screen 
        name="WizardConfirmation" 
        component={SchedulingWizardConfirmationScreen} 
      />
    </Stack.Navigator>
  );
};
```

#### 2. Integração com Navegação Principal
```typescript
// Navigation/MainAppNavigator.tsx - Modificação
const Tab = createBottomTabNavigator();

export const MainAppNavigator = () => {
  return (
    <Tab.Navigator>
      {/* Tabs existentes... */}
      <Tab.Screen
        name="Serviços"
        component={ServicesScreenWithWizard} // Modificado
        options={{ title: "Serviços" }}
      />
    </Tab.Navigator>
  );
};

// Nova versão do ServicesScreen com integração do wizard
const ServicesScreenWithWizard = () => {
  const { selectedServices } = useServicesStore();
  const navigation = useNavigation();
  
  const handleScheduleServices = () => {
    if (selectedServices.length > 0) {
      navigation.navigate('SchedulingWizard', { 
        screen: 'WizardDate',
        params: { services: selectedServices }
      });
    }
  };
  
  return (
    <ServicesScreen onSchedulePress={handleScheduleServices} />
  );
};
```

### Mobile: Gerenciamento de Estado

#### 1. wizardStore (Zustand)
```typescript
// store/wizardStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWizardStore = create(
  persist(
    (set, get) => ({
      // Estado do wizard
      currentStep: 1,
      selectedServices: [],
      selectedDate: null,
      professionalsRequested: 1,
      selectedProfessionals: [],
      availableSlots: [],
      selectedSlot: null,
      isLoading: false,
      error: null,
      
      // Actions
      setCurrentStep: (step) => set({ currentStep: step }),
      
      setSelectedServices: (services) => set({ 
        selectedServices: services,
        // Reset estados dependentes
        selectedDate: null,
        selectedProfessionals: [],
        availableSlots: [],
        selectedSlot: null
      }),
      
      setSelectedDate: (date) => set({ 
        selectedDate: date,
        // Reset estados dependentes do passo seguinte
        availableSlots: [],
        selectedSlot: null
      }),
      
      setProfessionalsRequested: (count) => set({ 
        professionalsRequested: count,
        // Reset seleções de profissionais se necessário
        selectedProfessionals: count === 1 
          ? get().selectedProfessionals.slice(0, 1)
          : get().selectedProfessionals
      }),
      
      setSelectedProfessionals: (professionals) => set({ 
        selectedProfessionals: professionals,
        // Reset slots quando profissionais mudam
        availableSlots: [],
        selectedSlot: null
      }),
      
      setAvailableSlots: (slots) => set({ 
        availableSlots: slots,
        selectedSlot: null
      }),
      
      setSelectedSlot: (slot) => set({ selectedSlot: slot }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      // Reset completo do wizard
      resetWizard: () => set({
        currentStep: 1,
        selectedDate: null,
        professionalsRequested: 1,
        selectedProfessionals: [],
        availableSlots: [],
        selectedSlot: null,
        isLoading: false,
        error: null
      }),
      
      // Validações
      canProceedToStep: (step) => {
        const state = get();
        switch (step) {
          case 2:
            return state.selectedDate !== null;
          case 3:
            return state.selectedProfessionals.length === state.professionalsRequested;
          case 4:
            return state.selectedSlot !== null;
          default:
            return true;
        }
      }
    }),
    {
      name: 'wizard-storage',
      // Apenas persistir dados essenciais
      partialize: (state) => ({
        selectedServices: state.selectedServices,
        selectedDate: state.selectedDate,
        professionalsRequested: state.professionalsRequested,
        selectedProfessionals: state.selectedProfessionals,
        selectedSlot: state.selectedSlot
      })
    }
  )
);
```

### Mobile: Telas do Wizard

#### 1. SchedulingWizardDateScreen
```typescript
// screens/SchedulingWizardDateScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { WizardHeader, WizardContainer } from '../components/wizard';
import { useWizardStore } from '../store/wizardStore';
import { wizardApiService } from '../services/wizardApiService';

export const SchedulingWizardDateScreen = ({ navigation, route }) => {
  const {
    selectedServices,
    selectedDate,
    setSelectedDate,
    setCurrentStep,
    setLoading,
    setError
  } = useWizardStore();
  
  const [markedDates, setMarkedDates] = useState({});
  const [availableDates, setAvailableDates] = useState(new Set());
  
  useEffect(() => {
    setCurrentStep(1);
    loadAvailableDates();
  }, [selectedServices]);
  
  const loadAvailableDates = async () => {
    setLoading(true);
    try {
      const serviceIds = selectedServices.map(s => s.id);
      const dates = await wizardApiService.getAvailableDates(serviceIds);
      
      setAvailableDates(new Set(dates));
      
      // Configurar marcadores do calendário
      const marked = {};
      dates.forEach(date => {
        marked[date] = { 
          marked: true, 
          dotColor: '#ec4899',
          disabled: false
        };
      });
      
      setMarkedDates(marked);
    } catch (error) {
      setError('Erro ao carregar datas disponíveis');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateSelect = (day) => {
    const dateString = day.dateString;
    
    if (!availableDates.has(dateString)) {
      // Mostrar tooltip explicativo
      showUnavailabilityTooltip(dateString);
      return;
    }
    
    setSelectedDate(dateString);
    
    // Navegar automaticamente para próximo passo
    navigation.navigate('WizardProfessionals');
  };
  
  const showUnavailabilityTooltip = (date) => {
    // Implementar tooltip com mensagem contextual
    Alert.alert(
      'Data Indisponível',
      'Não há horários disponíveis para os serviços escolhidos nesta data.',
      [{ text: 'OK' }]
    );
  };
  
  return (
    <WizardContainer>
      <WizardHeader
        currentStep={1}
        totalSteps={3}
        title="Selecionar data"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={handleDateSelect}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...markedDates[selectedDate],
              selected: true,
              selectedColor: '#ec4899'
            }
          }}
          minDate={new Date().toISOString().split('T')[0]}
          theme={{
            selectedDayBackgroundColor: '#ec4899',
            todayTextColor: '#ec4899',
            arrowColor: '#ec4899',
          }}
        />
      </View>
      
      {selectedDate && (
        <View style={styles.selectedDateInfo}>
          <Text style={styles.selectedDateText}>
            Data selecionada: {formatDate(selectedDate)}
          </Text>
        </View>
      )}
    </WizardContainer>
  );
};
```

#### 2. SchedulingWizardProfessionalsScreen
```typescript
// screens/SchedulingWizardProfessionalsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfessionalToggle, ProfessionalDropdown } from '../components/wizard';
import { useWizardStore } from '../store/wizardStore';
import { wizardApiService } from '../services/wizardApiService';

export const SchedulingWizardProfessionalsScreen = ({ navigation }) => {
  const {
    selectedServices,
    selectedDate,
    professionalsRequested,
    selectedProfessionals,
    setProfessionalsRequested,
    setSelectedProfessionals,
    setCurrentStep,
    canProceedToStep
  } = useWizardStore();
  
  const [availableProfessionals, setAvailableProfessionals] = useState([]);
  const [maxParallelPros, setMaxParallelPros] = useState(2);
  const [defaultProsRequested, setDefaultProsRequested] = useState(1);
  
  useEffect(() => {
    setCurrentStep(2);
    loadConfiguration();
    loadAvailableProfessionals();
  }, [selectedDate]);
  
  const loadConfiguration = async () => {
    try {
      // Carregar configuração padrão de profissionais sugeridos
      const defaultPros = await wizardApiService.getDefaultProsRequested();
      setDefaultProsRequested(defaultPros);
      
      // Calcular máximo de profissionais baseado nos serviços
      const maxPros = Math.min(
        ...selectedServices.map(s => s.max_parallel_pros)
      );
      setMaxParallelPros(maxPros);
      
      // Definir valor inicial do toggle
      const initialPros = Math.min(defaultPros, maxPros);
      setProfessionalsRequested(initialPros);
      
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };
  
  const loadAvailableProfessionals = async () => {
    try {
      const serviceIds = selectedServices.map(s => s.id);
      const professionals = await wizardApiService.getAvailableProfessionals(
        serviceIds,
        selectedDate
      );
      
      setAvailableProfessionals(professionals);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    }
  };
  
  const handleProfessionalsCountChange = (count) => {
    setProfessionalsRequested(count);
    
    // Ajustar seleções se necessário
    if (count < selectedProfessionals.length) {
      setSelectedProfessionals(selectedProfessionals.slice(0, count));
    }
  };
  
  const handleProfessionalSelect = (index, professional) => {
    const newProfessionals = [...selectedProfessionals];
    newProfessionals[index] = professional;
    setSelectedProfessionals(newProfessionals);
  };
  
  const handleContinue = () => {
    if (canProceedToStep(3)) {
      navigation.navigate('WizardSlots');
    }
  };
  
  return (
    <WizardContainer>
      <WizardHeader
        currentStep={2}
        totalSteps={3}
        title="Profissionais & paralelismo"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <ProfessionalToggle
          value={professionalsRequested}
          maxValue={maxParallelPros}
          onChange={handleProfessionalsCountChange}
          disabled={maxParallelPros === 1}
        />
        
        {Array.from({ length: professionalsRequested }).map((_, index) => (
          <ProfessionalDropdown
            key={index}
            label={`Profissional ${index + 1}`}
            professionals={availableProfessionals}
            selectedProfessional={selectedProfessionals[index]}
            onSelect={(professional) => handleProfessionalSelect(index, professional)}
            excludeIds={selectedProfessionals
              .filter((_, i) => i !== index)
              .map(p => p?.id)
              .filter(Boolean)
            }
          />
        ))}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canProceedToStep(3) && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!canProceedToStep(3)}
        >
          <Text style={styles.continueButtonText}>
            Ver Horários
          </Text>
        </TouchableOpacity>
      </View>
    </WizardContainer>
  );
};
```

#### 3. SchedulingWizardSlotsScreen
```typescript
// screens/SchedulingWizardSlotsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { ItineraryCard } from '../components/wizard';
import { useWizardStore } from '../store/wizardStore';
import { wizardApiService } from '../services/wizardApiService';

export const SchedulingWizardSlotsScreen = ({ navigation }) => {
  const {
    selectedServices,
    selectedDate,
    professionalsRequested,
    selectedProfessionals,
    availableSlots,
    selectedSlot,
    setAvailableSlots,
    setSelectedSlot,
    setCurrentStep,
    setLoading,
    setError
  } = useWizardStore();
  
  const [visibleSlots, setVisibleSlots] = useState(3);
  
  useEffect(() => {
    setCurrentStep(3);
    loadAvailableSlots();
  }, [selectedProfessionals]);
  
  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const serviceIds = selectedServices.map(s => s.id);
      const professionalIds = selectedProfessionals.map(p => p.id);
      
      const slots = await wizardApiService.getAvailableSlots({
        serviceIds,
        date: selectedDate,
        professionalsRequested,
        professionalIds
      });
      
      setAvailableSlots(slots);
    } catch (error) {
      setError('Erro ao carregar horários disponíveis');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };
  
  const handleShowMore = () => {
    setVisibleSlots(prev => Math.min(prev + 3, availableSlots.length));
  };
  
  const handleConfirm = () => {
    if (selectedSlot) {
      navigation.navigate('WizardConfirmation');
    }
  };
  
  const renderSlot = ({ item, index }) => (
    <ItineraryCard
      slot={item}
      isSelected={selectedSlot?.id === item.id}
      onSelect={() => handleSlotSelect(item)}
      style={[
        styles.slotCard,
        index >= visibleSlots && styles.hiddenCard
      ]}
    />
  );
  
  return (
    <WizardContainer>
      <WizardHeader
        currentStep={3}
        totalSteps={3}
        title="Horários disponíveis"
        onBack={() => navigation.goBack()}
      />
      
      <FlatList
        data={availableSlots.slice(0, visibleSlots)}
        renderItem={renderSlot}
        keyExtractor={(item) => item.id}
        style={styles.slotsList}
        showsVerticalScrollIndicator={false}
      />
      
      {visibleSlots < availableSlots.length && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={handleShowMore}
        >
          <Text style={styles.showMoreText}>
            Ver mais horários
          </Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedSlot && styles.disabledButton
          ]}
          onPress={handleConfirm}
          disabled={!selectedSlot}
        >
          <Text style={styles.confirmButtonText}>
            Confirmar agendamento
          </Text>
        </TouchableOpacity>
      </View>
    </WizardContainer>
  );
};
```

### Mobile: Componentes do Wizard

#### 1. WizardHeader
```typescript
// components/wizard/WizardHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WizardHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  totalSteps,
  title,
  onBack
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.title}>{title}</Text>
        
        <View style={styles.spacer} />
      </View>
      
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < currentStep ? styles.completedDot : styles.incompleteDot,
              index === currentStep - 1 && styles.currentDot
            ]}
          />
        ))}
      </View>
    </View>
  );
};
```

#### 2. ItineraryCard
```typescript
// components/wizard/ItineraryCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  style
}) => {
  const formatTime = (time: string) => {
    return time.substring(0, 5); // "15:00:00" -> "15:00"
  };
  
  const getExecutionIcon = (type: string) => {
    return type === 'parallel' ? '║' : '↧';
  };
  
  const accessibilityLabel = `Horário das ${formatTime(slot.start_time)} às ${formatTime(slot.end_time)}, total ${slot.total_duration_minutes} minutos, ${slot.services.length} serviços`;
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        style
      ]}
      onPress={onSelect}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <Text style={styles.timeRange}>
          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
        </Text>
        <Text style={styles.totalTime}>
          Total {slot.total_duration_minutes} min
        </Text>
        <Text style={styles.executionIcon}>
          {getExecutionIcon(slot.execution_type)}
        </Text>
      </View>
      
      <View style={styles.servicesList}>
        {slot.services.map((service, index) => (
          <View key={index} style={styles.serviceRow}>
            <Text style={styles.serviceName}>
              {service.service_name} ({service.duration_minutes} min)
            </Text>
            <Text style={styles.professionalName}>
              {service.professional_name}
            </Text>
            <Text style={styles.stationName}>
              {service.station_name}
            </Text>
          </View>
        ))}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.totalPrice}>
          R$ {slot.total_price.toFixed(2)}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#ec4899" />
        )}
      </View>
    </TouchableOpacity>
  );
};
```

### Serviços da API

#### 1. wizardApiService
```typescript
// services/wizardApiService.js
import { apiClient } from './api';

class WizardApiService {
  async getDefaultProsRequested() {
    try {
      const response = await apiClient.get('/settings/default-pros-suggested');
      return response.data.value;
    } catch (error) {
      console.error('Erro ao buscar configuração padrão:', error);
      return 1; // Fallback
    }
  }
  
  async getAvailableDates(serviceIds) {
    try {
      const params = new URLSearchParams();
      serviceIds.forEach(id => params.append('service_ids', id));
      
      const response = await apiClient.get(
        `/appointments/wizard/available-dates?${params}`
      );
      return response.data.available_dates;
    } catch (error) {
      console.error('Erro ao buscar datas disponíveis:', error);
      throw error;
    }
  }
  
  async getAvailableProfessionals(serviceIds, date) {
    try {
      const params = new URLSearchParams();
      serviceIds.forEach(id => params.append('service_ids', id));
      params.append('date', date);
      
      const response = await apiClient.get(
        `/appointments/wizard/professionals?${params}`
      );
      return response.data.professionals;
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      throw error;
    }
  }
  
  async getAvailableSlots({
    serviceIds,
    date,
    professionalsRequested,
    professionalIds = []
  }) {
    try {
      const params = new URLSearchParams();
      serviceIds.forEach(id => params.append('service_ids', id));
      professionalIds.forEach(id => params.append('professional_ids', id));
      params.append('date', date);
      params.append('professionals_requested', professionalsRequested.toString());
      
      const response = await apiClient.get(
        `/appointments/wizard/availability?${params}`
      );
      return response.data.available_slots;
    } catch (error) {
      console.error('Erro ao buscar slots disponíveis:', error);
      throw error;
    }
  }
  
  async createMultiServiceAppointment(bookingData) {
    try {
      const response = await apiClient.post(
        '/appointments/wizard/book',
        bookingData
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      throw error;
    }
  }
}

export const wizardApiService = new WizardApiService();
```

## Plano de Implementação

### Fase 1: Infraestrutura Backend (Semana 1)
**Objetivo:** Estabelecer base de dados e APIs fundamentais

**Tarefas:**
1. **Criar modelo AppointmentGroup** e migração de banco
2. **Modificar modelo Appointment** para incluir group_id
3. **Implementar enum AppointmentGroupStatus**
4. **Criar schemas Pydantic** para requests/responses
5. **Implementar endpoints básicos** da API wizard
6. **Criar MultiServiceAvailabilityService** base
7. **Testes unitários** para novos modelos

**Critérios de Aceite:**
- ✓ Migração de banco executa sem erros
- ✓ Endpoints respondem com estrutura JSON correta
- ✓ Testes de modelo passam
- ✓ Backward compatibility mantida

### Fase 2: Algoritmo de Agendamento (Semana 1-2)
**Objetivo:** Implementar lógica inteligente de agendamento

**Tarefas:**
1. **Implementar algoritmo de disponibilidade** multi-serviço
2. **Criar lógica de paralelismo** para serviços compatíveis
3. **Implementar agendamento sequencial** otimizado
4. **Integrar verificação de estações** e recursos
5. **Criar sistema de ranking** de horários
6. **Implementar sugestões alternativas**
7. **Testes de integração** para algoritmo

**Critérios de Aceite:**
- ✓ Algoritmo retorna slots válidos para serviços paralelos
- ✓ Sequenciamento otimiza tempo total
- ✓ Recursos não são duplo-agendados
- ✓ Performance < 2 segundos para consultas típicas

### Fase 3: Mobile - Estrutura e Navegação (Semana 2)
**Objetivo:** Criar estrutura base do wizard mobile

**Tarefas:**
1. **Criar SchedulingWizardNavigator** e telas base
2. **Implementar wizardStore** com Zustand
3. **Criar componentes base** (WizardHeader, WizardContainer)
4. **Integrar wizard com ServicesScreen** existente
5. **Implementar navegação entre passos**
6. **Criar wizardApiService** para comunicação
7. **Testes de navegação** e estado

**Critérios de Aceite:**
- ✓ Navegação entre passos funciona corretamente
- ✓ Estado persiste durante navegação
- ✓ Integração com carrinho de serviços funciona
- ✓ Botão "Escolher data" direciona para wizard

### Fase 4: Mobile - Telas do Wizard (Semana 2-3)
**Objetivo:** Implementar interface completa do wizard

**Tarefas:**
1. **Implementar SchedulingWizardDateScreen** com calendário
2. **Criar SchedulingWizardProfessionalsScreen** com toggles
3. **Implementar SchedulingWizardSlotsScreen** com cartões
4. **Criar SchedulingWizardConfirmationScreen**
5. **Implementar componentes especializados** (ItineraryCard, etc.)
6. **Adicionar estados de loading** e erro
7. **Implementar acessibilidade**

**Critérios de Aceite:**
- ✓ Todas as telas seguem design especificado
- ✓ Calendário mostra disponibilidade corretamente
- ✓ Cartões de itinerário exibem informações completas
- ✓ Estados de loading e erro funcionam
- ✓ Acessibilidade atende padrões

### Fase 5: Integração E2E (Semana 3)
**Objetivo:** Conectar todos os componentes e testar fluxo completo

**Tarefas:**
1. **Integrar APIs backend** com telas mobile
2. **Implementar tratamento de erros** robusto
3. **Otimizar performance** de carregamento
4. **Criar testes end-to-end**
5. **Implementar analytics** para monitoramento
6. **Documentar APIs** e componentes
7. **Testes de usabilidade**

**Critérios de Aceite:**
- ✓ Fluxo completo funciona sem erros
- ✓ Performance atende requisitos (< 3s por passo)
- ✓ Tratamento de erros é informativo
- ✓ Testes E2E passam
- ✓ Documentação está completa

### Fase 6: Polimento e Lançamento (Semana 3-4)
**Objetivo:** Preparar para produção

**Tarefas:**
1. **Otimizar performance** final
2. **Implementar feature flags** para rollout gradual
3. **Criar monitoramento** e alertas
4. **Testes de carga** no backend
5. **Revisão de segurança**
6. **Documentação de deployment**
7. **Treinamento da equipe**

**Critérios de Aceite:**
- ✓ Performance em produção atende SLA
- ✓ Feature flags permitem rollback
- ✓ Monitoramento captura métricas importantes
- ✓ Sistema suporta carga esperada
- ✓ Equipe treinada para suporte

## Considerações de UX

### Estados de Loading
- **Feedback imediato**: Máximo 300ms para resposta visual
- **Skeleton screens**: Para listas de horários e professonais
- **Progress indicators**: Para operações > 2 segundos
- **Debounced requests**: Para evitar requests desnecessários

### Tratamento de Erros
- **Mensagens contextuais**: Específicas por tipo de erro
- **Ações de recuperação**: Botões de "Tentar novamente"
- **Fallbacks graceful**: Alternativas quando possível
- **Logs detalhados**: Para debugging em produção

### Acessibilidade
- **Screen readers**: Labels descritivos para todos os elementos
- **Contrast ratio**: WCAG AA compliance
- **Touch targets**: Mínimo 44x44 pontos
- **Keyboard navigation**: Para elementos interativos

### Performance
- **Lazy loading**: Carregar apenas dados necessários
- **Caching**: Para profissionais e configurações
- **Optimistic updates**: Para melhor percepção de performance
- **Batch operations**: Agrupar requests quando possível

## Métricas de Sucesso

### Métricas de Negócio
- **Taxa de conversão**: % de carrinho → agendamento confirmado
- **Tempo médio de agendamento**: Meta < 3 minutos
- **Taxa de abandono por passo**: Identificar gargalos
- **Satisfação do usuário**: NPS ≥ 8

### Métricas Técnicas
- **Tempo de resposta da API**: P95 < 2 segundos
- **Taxa de erro**: < 1% das requisições
- **Disponibilidade**: > 99.9% uptime
- **Performance mobile**: Tempo de carregamento < 3s

### Métricas de Adoção
- **Uso do wizard**: % de agendamentos via wizard vs. fluxo antigo
- **Agendamentos multi-serviço**: Aumento em relação ao baseline
- **Retenção de usuários**: Impacto na retenção mensal
- **Feedback qualitativo**: Reviews e suporte

## Riscos e Mitigações

### Riscos Técnicos
**Risco:** Complexidade do algoritmo de agendamento
**Mitigação:** Implementação incremental com testes extensivos

**Risco:** Performance com múltiplos serviços
**Mitigação:** Otimização de queries e caching estratégico

**Risco:** Conflicts de recursos
**Mitigação:** Validação rigorosa e tratamento de conflitos

### Riscos de UX
**Risco:** Interface muito complexa
**Mitigação:** Testes de usabilidade e simplificação iterativa

**Risco:** Tempo de carregamento alto
**Mitigação:** Loading states e otimização de performance

### Riscos de Negócio
**Risco:** Baixa adoção pelos usuários
**Mitigação:** Feature flags e rollout gradual com feedback

**Risco:** Impacto no fluxo existente
**Mitigação:** Manter compatibilidade com sistema atual

## Cronograma Detalhado

### Semana 1: Backend Foundation
**Dias 1-2:** Modelos de banco e migrações
**Dias 3-4:** APIs básicas e schemas
**Dias 5-7:** Algoritmo de disponibilidade base

### Semana 2: Mobile Structure + Algorithm
**Dias 8-9:** Navegação e store do wizard
**Dias 10-11:** Lógica de paralelismo/sequencial
**Dias 12-14:** Telas básicas do wizard

### Semana 3: Complete Implementation
**Dias 15-16:** Componentes especializados
**Dias 17-18:** Integração E2E
**Dias 19-21:** Testes e refinamentos

### Semana 4: Polish and Launch
**Dias 22-23:** Performance e polimento
**Dias 24-25:** Feature flags e monitoramento
**Dias 26-28:** Documentação e lançamento

---

## Aprovação e Próximos Passos

Este documento serve como especificação completa para implementação do Wizard de Agendamento Multiserviço. A implementação seguirá as fases definidas, com checkpoints regulares para validação de progresso e ajustes necessários.

**Data de criação:** {current_date}
**Versão:** 1.0
**Status:** Aguardando aprovação

**Aprovações necessárias:**
- [ ] Tech Lead - Arquitetura Backend
- [ ] Mobile Lead - Arquitetura Mobile  
- [ ] Product Owner - Requisitos de Negócio
- [ ] UX Designer - Interface e Experiência

**Próximos passos após aprovação:**
1. Setup do ambiente de desenvolvimento
2. Criação das branches de feature
3. Início da Fase 1: Backend Foundation
4. Daily standups para acompanhamento do progresso