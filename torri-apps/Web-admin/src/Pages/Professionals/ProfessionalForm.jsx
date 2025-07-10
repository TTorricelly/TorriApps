import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../../shared/hooks/useNavigation';
import { ROUTES } from '../../shared/navigation';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Switch,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Select,
  Option,
} from '@material-tailwind/react';
import { 
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  NoSymbolIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

import { professionalsApi } from '../../Services/professionals';
import { servicesApi } from '../../Services/services';

// Service Tag Selector Component
const ServiceTagSelector = ({ services, selectedServices, onServicesChange, showAlert }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter services based on search term and exclude already selected ones
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const notSelected = !selectedServices.includes(service.id);
    return matchesSearch && notSelected;
  });

  const handleAddService = (serviceId) => {
    if (!selectedServices.includes(serviceId)) {
      onServicesChange([...selectedServices, serviceId]);
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleRemoveService = (serviceId) => {
    onServicesChange(selectedServices.filter(id => id !== serviceId));
  };

  const getServiceById = (serviceId) => {
    return services.find(service => service.id === serviceId);
  };

  return (
    <div className="space-y-3">
      {/* Selected Services Tags */}
      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedServices.map((serviceId) => {
            const service = getServiceById(serviceId);
            return service ? (
              <div
                key={serviceId}
                className="flex items-center gap-2 bg-accent-primary/20 text-accent-primary px-3 py-1.5 rounded-full text-sm font-medium border border-accent-primary/30"
              >
                <span>{service.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveService(serviceId)}
                  className="hover:bg-accent-primary/30 rounded-full p-0.5 transition-colors"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Input
          label="Pesquisar e adicionar serviços"
          placeholder="Digite o nome do serviço..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          className="bg-bg-primary border-bg-tertiary text-text-primary"
          labelProps={{ className: "text-text-secondary" }}
          containerProps={{ className: "text-text-primary" }}
          icon={
            <div className="flex items-center gap-2">
              {selectedServices.length > 0 && (
                <div className="bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded text-xs font-medium">
                  {selectedServices.length}
                </div>
              )}
              <div className="text-text-tertiary">
                {isDropdownOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(true)}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          }
        />

        {/* Dropdown with filtered services */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {filteredServices.length > 0 ? (
              <div className="p-1">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleAddService(service.id)}
                    className="w-full text-left px-3 py-2 text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{service.name}</span>
                      <PlusIcon className="h-4 w-4 text-accent-primary" />
                    </div>
                    {service.category && (
                      <span className="text-text-secondary text-sm">{service.category.name}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <Typography className="text-text-secondary text-sm">
                  {searchTerm 
                    ? 'Nenhum serviço encontrado com esse nome'
                    : selectedServices.length === services.length
                      ? 'Todos os serviços já foram selecionados'
                      : 'Digite para pesquisar serviços'
                  }
                </Typography>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <Typography className="text-text-secondary">
          {selectedServices.length > 0 
            ? `${selectedServices.length} serviço${selectedServices.length > 1 ? 's' : ''} selecionado${selectedServices.length > 1 ? 's' : ''}`
            : 'Nenhum serviço selecionado'
          }
        </Typography>
        {selectedServices.length > 0 && (
          <button
            type="button"
            onClick={() => onServicesChange([])}
            className="text-status-error hover:text-status-error/80 text-sm font-medium transition-colors"
          >
            Limpar todos
          </button>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

// Component for basic data tab
const BasicDataTab = ({ 
  formData, 
  handleInputChange, 
  errors, 
  handlePhotoChange, 
  photoPreview, 
  handlePhotoRemove,
  allServices,
  selectedServices,
  setSelectedServices,
  showAlert,
  isEdit 
}) => {
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      showAlert('Arquivo muito grande. Máximo 2MB permitido.', 'error');
      e.target.value = '';
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      showAlert('Apenas arquivos JPEG, JPG e PNG são permitidos.', 'error');
      e.target.value = '';
      return;
    }
    
    handlePhotoChange(file);
  };

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <Typography variant="h6" className="text-text-primary mb-4">
          Informações Pessoais
        </Typography>
        
        <div className="grid gap-4">
          {/* Full Name */}
          <div>
            <Input
              name="full_name"
              label="Nome Completo"
              placeholder="Digite o nome completo"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              error={!!errors.full_name}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
              required
            />
            {errors.full_name && (
              <Typography className="text-status-error text-sm mt-1">
                {errors.full_name}
              </Typography>
            )}
          </div>
          
          {/* Email and Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                name="email"
                label="E-mail"
                type="email"
                placeholder="profissional@exemplo.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                autoComplete="new-email"
                required
              />
              {errors.email && (
                <Typography className="text-status-error text-sm mt-1">
                  {errors.email}
                </Typography>
              )}
            </div>
            
            {!isEdit && (
              <div>
                <Input
                  name="password"
                  label="Senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={!!errors.password}
                  className="bg-bg-primary border-bg-tertiary text-text-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  containerProps={{ className: "text-text-primary" }}
                  autoComplete="new-password"
                  required
                />
                {errors.password && (
                  <Typography className="text-status-error text-sm mt-1">
                    {errors.password}
                  </Typography>
                )}
              </div>
            )}
          </div>

          {/* Role and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Typography className="text-text-secondary text-sm mb-2">
                Função/Role
              </Typography>
              <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-3">
                <Typography className="text-text-primary">
                  PROFISSIONAL
                </Typography>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                color="blue"
              />
              <Typography className="text-text-primary">
                Ativo
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Photo */}
      <div>
        <Typography variant="h6" className="text-text-primary mb-4">
          Foto do Perfil
        </Typography>
        
        <div className="flex flex-col space-y-4">
          {/* Current/Preview Photo */}
          {photoPreview && (
            <div className="flex items-center space-x-4">
              <Typography className="text-text-secondary text-sm">
                {typeof photoPreview === 'string' ? 'Foto atual:' : 'Nova foto:'}
              </Typography>
              <div className="relative">
                <img
                  src={typeof photoPreview === 'string' ? photoPreview : URL.createObjectURL(photoPreview)}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-full border border-bg-tertiary"
                />
                <button
                  type="button"
                  onClick={handlePhotoRemove}
                  className="absolute -top-2 -right-2 bg-status-error text-white rounded-full p-1 hover:bg-status-error/80"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* No photo placeholder */}
          {!photoPreview && (
            <div className="flex items-center space-x-4">
              <Typography className="text-text-secondary text-sm">
                Nenhuma foto:
              </Typography>
              <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center">
                <Typography className="text-text-tertiary text-sm font-medium">
                  {getInitials(formData.full_name)}
                </Typography>
              </div>
            </div>
          )}
          
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="w-full px-3 py-2 rounded-lg border border-bg-tertiary bg-bg-primary text-text-primary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-accent-primary/10 file:text-accent-primary hover:file:bg-accent-primary/20 transition-colors"
          />
          
          <Typography className="text-text-tertiary text-sm">
            {photoPreview ? 'Selecione um novo arquivo para substituir a foto atual.' : 'JPG, PNG (máx. 2MB)'}
          </Typography>
        </div>
      </div>

      {/* Services Association */}
      <div>
        <Typography variant="h6" className="text-text-primary mb-4">
          Serviços Associados
        </Typography>
        
        <ServiceTagSelector
          services={allServices}
          selectedServices={selectedServices}
          onServicesChange={setSelectedServices}
          showAlert={showAlert}
        />
        
              </div>
    </div>
  );
};

// Component for availability tab
const AvailabilityTab = ({ professionalId, showAlert }) => {
  const [availability, setAvailability] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);

  const daysOfWeek = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  // Memoize time slots to prevent recreation on every render
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  useEffect(() => {
    if (professionalId) {
      loadAvailability();
    }
  }, [professionalId]);

  const loadAvailability = async () => {
    try {
      setIsLoading(true);
      setHasLoadError(false);
      const data = await professionalsApi.getAvailability(professionalId);
      
      // Convert array response to object grouped by day
      const availabilityByDay = {};
      data.forEach(period => {
        const day = period.day_of_week;
        if (!availabilityByDay[day]) {
          availabilityByDay[day] = [];
        }
        availabilityByDay[day].push({
          start_time: period.start_time.substring(0, 5), // Convert "09:00:00" to "09:00"
          end_time: period.end_time.substring(0, 5)       // Convert "18:00:00" to "18:00"
        });
      });
      
      setAvailability(availabilityByDay);
    } catch (error) {
      console.error('Erro ao carregar disponibilidade:', error);
      setAvailability({});
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPeriod = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: [
        ...(prev[day] || []),
        { start_time: '09:00', end_time: '18:00' }
      ]
    }));
  };

  const handleRemovePeriod = (day, index) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  // Debounced period change to prevent excessive re-renders
  const handlePeriodChange = useCallback((day, index, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].map((period, i) => 
        i === index ? { ...period, [field]: value } : period
      )
    }));
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Convert time format from "HH:MM" to "HH:MM:SS" for API
      const availabilityForApi = {};
      Object.keys(availability).forEach(day => {
        availabilityForApi[day] = availability[day].map(period => ({
          start_time: period.start_time + ':00',
          end_time: period.end_time + ':00'
        }));
      });
      
      await professionalsApi.updateAvailability(professionalId, availabilityForApi);
      showAlert('Disponibilidade atualizada com sucesso!', 'success');
      setHasLoadError(false);
    } catch (error) {
      console.error('Erro ao salvar disponibilidade:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao salvar disponibilidade';
      showAlert(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!professionalId) {
    return (
      <div className="text-center py-8">
        <Typography className="text-text-secondary">
          Salve os dados básicos primeiro para configurar a disponibilidade
        </Typography>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Typography variant="h6" className="text-text-primary">
          Disponibilidade Semanal
        </Typography>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
        >
          {isSaving && <Spinner className="h-4 w-4" />}
          {isSaving ? 'Salvando...' : 'Salvar Disponibilidade'}
        </Button>
      </div>

      {hasLoadError && (
        <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-4">
          <Typography className="text-text-secondary text-sm">
            ⚠️ <strong>Erro ao carregar:</strong> Não foi possível carregar a disponibilidade atual. 
            Você pode configurar uma nova disponibilidade que será salva.
          </Typography>
        </div>
      )}
      
      {isSaving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Spinner className="h-4 w-4 text-blue-600" />
            <Typography className="text-blue-800 text-sm font-medium">
              Salvando disponibilidade...
            </Typography>
          </div>
        </div>
      )}

      {/* Optimized day sections with reduced re-renders */}
      <div className="space-y-4">
        {daysOfWeek.map(({ key, label }) => {
          const dayPeriods = availability[key] || [];
          
          return (
            <div key={key} className="border border-bg-tertiary rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <Typography className="text-text-primary font-medium">
                  {label}
                </Typography>
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => handleAddPeriod(key)}
                  className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
                >
                  + Adicionar Período
                </Button>
              </div>

              {dayPeriods.length > 0 ? (
                <div className="space-y-2">
                  {dayPeriods.map((period, index) => (
                    <div key={`${key}-${index}`} className="flex items-center gap-4">
                      <Select
                        value={period.start_time}
                        onChange={(value) => handlePeriodChange(key, index, 'start_time', value)}
                        label="Início"
                        className="bg-bg-primary border-bg-tertiary text-text-primary flex-1"
                        labelProps={{ className: "text-text-secondary" }}
                        containerProps={{ className: "text-text-primary" }}
                        menuProps={{ 
                          className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50"
                        }}
                      >
                        {timeSlots.map((time) => (
                          <Option 
                            key={time} 
                            value={time} 
                            className="text-text-primary hover:bg-bg-tertiary hover:text-white focus:bg-bg-tertiary focus:text-accent-primary"
                          >
                            {time}
                          </Option>
                        ))}
                      </Select>

                      <Select
                        value={period.end_time}
                        onChange={(value) => handlePeriodChange(key, index, 'end_time', value)}
                        label="Fim"
                        className="bg-bg-primary border-bg-tertiary text-text-primary flex-1"
                        labelProps={{ className: "text-text-secondary" }}
                        containerProps={{ className: "text-text-primary" }}
                        menuProps={{ 
                          className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50"
                        }}
                      >
                        {timeSlots.map((time) => (
                          <Option 
                            key={time} 
                            value={time} 
                            className="text-text-primary hover:bg-bg-tertiary hover:text-white focus:bg-bg-tertiary focus:text-accent-primary"
                          >
                            {time}
                          </Option>
                        ))}
                      </Select>

                      <Button
                        size="sm"
                        variant="outlined"
                        onClick={() => handleRemovePeriod(key, index)}
                        className="border-status-error text-status-error hover:bg-status-error/10"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Typography className="text-text-tertiary text-sm">
                  Nenhum período configurado
                </Typography>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Component for blocked periods tab
const BlockedPeriodsTab = ({ professionalId, showAlert }) => {
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBlock, setNewBlock] = useState({
    blocked_date: '',
    start_time: '09:00',
    end_time: '18:00',
    block_type: 'break',
    reason: ''
  });

  const blockTypes = [
    { value: 'break', label: 'Pausa' },
    { value: 'vacation', label: 'Férias' },
    { value: 'sick_leave', label: 'Licença Médica' },
    { value: 'other', label: 'Outro' }
  ];

  useEffect(() => {
    if (professionalId) {
      loadBlockedPeriods();
    }
  }, [professionalId]);

  const loadBlockedPeriods = async () => {
    try {
      setIsLoading(true);
      const data = await professionalsApi.getBlockedPeriods(professionalId);
      
      // Convert time format from "HH:MM:SS" to "HH:MM" for UI consistency
      const periodsForUI = data.map(period => ({
        ...period,
        start_time: period.start_time.substring(0, 5), // Convert "09:00:00" to "09:00"
        end_time: period.end_time.substring(0, 5)       // Convert "18:00:00" to "18:00"
      }));
      
      setBlockedPeriods(periodsForUI);
    } catch (error) {
      console.error('Erro ao carregar períodos bloqueados:', error);
      setBlockedPeriods([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBlock = async () => {
    try {
      // Convert time format from "HH:MM" to "HH:MM:SS" for API
      const blockForApi = {
        ...newBlock,
        start_time: newBlock.start_time + ':00',  // Convert "09:00" to "09:00:00"
        end_time: newBlock.end_time + ':00'       // Convert "18:00" to "18:00:00"
      };
      
      await professionalsApi.createBlockedPeriod(professionalId, blockForApi);
      showAlert('Período bloqueado criado com sucesso!', 'success');
      setShowAddForm(false);
      setNewBlock({
        blocked_date: '',
        start_time: '09:00',
        end_time: '18:00',
        block_type: 'break',
        reason: ''
      });
      loadBlockedPeriods();
    } catch (error) {
      console.error('Erro ao criar período bloqueado:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao criar período bloqueado';
      showAlert(errorMessage, 'error');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      await professionalsApi.deleteBlockedPeriod(professionalId, blockId);
      showAlert('Período bloqueado excluído com sucesso!', 'success');
      loadBlockedPeriods();
    } catch (error) {
      console.error('Erro ao excluir período bloqueado:', error);
      showAlert('Erro ao excluir período bloqueado', 'error');
    }
  };

  if (!professionalId) {
    return (
      <div className="text-center py-8">
        <Typography className="text-text-secondary">
          Salve os dados básicos primeiro para configurar períodos bloqueados
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Typography variant="h6" className="text-text-primary">
          Períodos Bloqueados
        </Typography>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-accent-primary hover:bg-accent-primary/90"
        >
          + Novo Bloqueio
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="bg-bg-primary border-bg-tertiary">
          <CardBody className="space-y-4">
            <Typography variant="h6" className="text-text-primary">
              Adicionar Novo Bloqueio
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Data"
                value={newBlock.blocked_date}
                onChange={(e) => {
                  setNewBlock({...newBlock, blocked_date: e.target.value});
                }}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
              
              <Select
                value={newBlock.block_type}
                onChange={(value) => setNewBlock({...newBlock, block_type: value})}
                label="Tipo de Bloqueio"
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                menuProps={{ 
                  className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50",
                  style: { 
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    zIndex: 9999
                  }
                }}
              >
                {blockTypes.map((type) => (
                  <Option key={type.value} value={type.value} className="text-text-primary hover:bg-bg-tertiary hover:text-white focus:bg-bg-tertiary focus:text-accent-primary selected:bg-accent-primary selected:text-white data-[selected=true]:bg-accent-primary data-[selected=true]:text-white data-[selected=true]:hover:text-white">
                    {type.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="time"
                label="Hora Início"
                value={newBlock.start_time}
                onChange={(e) => setNewBlock({...newBlock, start_time: e.target.value})}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
              
              <Input
                type="time"
                label="Hora Fim"
                value={newBlock.end_time}
                onChange={(e) => setNewBlock({...newBlock, end_time: e.target.value})}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
            </div>

            <Input
              label="Motivo"
              value={newBlock.reason}
              onChange={(e) => setNewBlock({...newBlock, reason: e.target.value})}
              className="bg-bg-secondary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleAddBlock}
                className="bg-accent-primary hover:bg-accent-primary/90"
              >
                Salvar
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowAddForm(false)}
                className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
              >
                Cancelar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Blocked periods list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-8 w-8" />
        </div>
      ) : blockedPeriods.length === 0 ? (
        <div className="text-center py-8">
          <Typography className="text-text-secondary">
            Nenhum período bloqueado cadastrado
          </Typography>
        </div>
      ) : (
        <div className="space-y-2">
          {blockedPeriods.map((block) => (
            <div key={block.id} className="flex items-center justify-between p-4 border border-bg-tertiary rounded-lg">
              <div className="flex-1">
                <Typography className="text-text-primary font-medium">
                  {new Date(block.blocked_date).toLocaleDateString('pt-BR')} • {block.start_time} - {block.end_time}
                </Typography>
                <Typography className="text-text-secondary text-sm">
                  {blockTypes.find(t => t.value === block.block_type)?.label || block.block_type} - {block.reason}
                </Typography>
              </div>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => handleDeleteBlock(block.id)}
                className="border-status-error text-status-error hover:bg-status-error/10"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component for recurring breaks tab
const RecurringBreaksTab = ({ professionalId, showAlert }) => {
  const [breaks, setBreaks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBreak, setNewBreak] = useState({
    day_of_week: 'monday',
    start_time: '12:00',
    end_time: '13:00',
    name: 'Almoço'
  });

  const daysOfWeek = [
    { value: 'monday', label: 'Segunda-feira' },
    { value: 'tuesday', label: 'Terça-feira' },
    { value: 'wednesday', label: 'Quarta-feira' },
    { value: 'thursday', label: 'Quinta-feira' },
    { value: 'friday', label: 'Sexta-feira' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];

  useEffect(() => {
    if (professionalId) {
      loadBreaks();
    }
  }, [professionalId]);

  const loadBreaks = async () => {
    try {
      setIsLoading(true);
      const data = await professionalsApi.getBreaks(professionalId);
      
      // Convert time format from "HH:MM:SS" to "HH:MM" for UI consistency
      const breaksForUI = data.map(breakItem => ({
        ...breakItem,
        start_time: breakItem.start_time.substring(0, 5), // Convert "12:00:00" to "12:00"
        end_time: breakItem.end_time.substring(0, 5)       // Convert "13:00:00" to "13:00"
      }));
      
      setBreaks(breaksForUI);
    } catch (error) {
      console.error('Erro ao carregar pausas:', error);
      setBreaks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBreak = async () => {
    try {
      // Convert time format from "HH:MM" to "HH:MM:SS" for API
      const breakForApi = {
        ...newBreak,
        start_time: newBreak.start_time + ':00',  // Convert "12:00" to "12:00:00"
        end_time: newBreak.end_time + ':00'       // Convert "13:00" to "13:00:00"
      };
      
      await professionalsApi.createBreak(professionalId, breakForApi);
      showAlert('Pausa criada com sucesso!', 'success');
      setShowAddForm(false);
      setNewBreak({
        day_of_week: 'monday',
        start_time: '12:00',
        end_time: '13:00',
        name: 'Almoço'
      });
      loadBreaks();
    } catch (error) {
      console.error('Erro ao criar pausa:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao criar pausa';
      showAlert(errorMessage, 'error');
    }
  };

  const handleDeleteBreak = async (breakId) => {
    try {
      await professionalsApi.deleteBreak(professionalId, breakId);
      showAlert('Pausa excluída com sucesso!', 'success');
      loadBreaks();
    } catch (error) {
      console.error('Erro ao excluir pausa:', error);
      showAlert('Erro ao excluir pausa', 'error');
    }
  };

  if (!professionalId) {
    return (
      <div className="text-center py-8">
        <Typography className="text-text-secondary">
          Salve os dados básicos primeiro para configurar pausas recorrentes
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Typography variant="h6" className="text-text-primary">
          Pausas Recorrentes
        </Typography>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-accent-primary hover:bg-accent-primary/90"
        >
          + Nova Pausa
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="bg-bg-primary border-bg-tertiary">
          <CardBody className="space-y-4">
            <Typography variant="h6" className="text-text-primary">
              Adicionar Nova Pausa
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={newBreak.day_of_week}
                onChange={(value) => setNewBreak({...newBreak, day_of_week: value})}
                label="Dia da Semana"
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                menuProps={{ 
                  className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50",
                  style: { 
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    zIndex: 9999
                  }
                }}
              >
                {daysOfWeek.map((day) => (
                  <Option key={day.value} value={day.value} className="text-text-primary hover:bg-bg-tertiary hover:text-white focus:bg-bg-tertiary focus:text-accent-primary selected:bg-accent-primary selected:text-white data-[selected=true]:bg-accent-primary data-[selected=true]:text-white data-[selected=true]:hover:text-white">
                    {day.label}
                  </Option>
                ))}
              </Select>
              
              <Input
                label="Nome da Pausa"
                value={newBreak.name}
                onChange={(e) => setNewBreak({...newBreak, name: e.target.value})}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="time"
                label="Hora Início"
                value={newBreak.start_time}
                onChange={(e) => setNewBreak({...newBreak, start_time: e.target.value})}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
              
              <Input
                type="time"
                label="Hora Fim"
                value={newBreak.end_time}
                onChange={(e) => setNewBreak({...newBreak, end_time: e.target.value})}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddBreak}
                className="bg-accent-primary hover:bg-accent-primary/90"
              >
                Salvar
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowAddForm(false)}
                className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
              >
                Cancelar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Breaks list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-8 w-8" />
        </div>
      ) : breaks.length === 0 ? (
        <div className="text-center py-8">
          <Typography className="text-text-secondary">
            Nenhuma pausa recorrente cadastrada
          </Typography>
        </div>
      ) : (
        <div className="space-y-2">
          {breaks.map((breakItem) => (
            <div key={breakItem.id} className="flex items-center justify-between p-4 border border-bg-tertiary rounded-lg">
              <div className="flex-1">
                <Typography className="text-text-primary font-medium">
                  {daysOfWeek.find(d => d.value === breakItem.day_of_week)?.label} • {breakItem.start_time} - {breakItem.end_time}
                </Typography>
                <Typography className="text-text-secondary text-sm">
                  {breakItem.name}
                </Typography>
              </div>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => handleDeleteBreak(breakItem.id)}
                className="border-status-error text-status-error hover:bg-status-error/10"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ProfessionalForm() {
  const { navigate } = useNavigation();
  const { professionalId } = useParams();
  const isEdit = Boolean(professionalId);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    is_active: true,
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('basic');
  const [allServices, setAllServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Load data on component mount
  useEffect(() => {
    loadAllServices();
    if (isEdit) {
      loadProfessional();
    }
  }, [professionalId]);
  
  // Track initial state for comparison
  const [initialFormData, setInitialFormData] = useState(null);
  
  // Track changes
  useEffect(() => {
    if (initialFormData) {
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData) || photoFile !== null;
      setHasUnsavedChanges(hasChanged);
    }
  }, [formData, photoFile, initialFormData]);
  
  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };
  
  const loadAllServices = async () => {
    try {
      const data = await servicesApi.getAllServices();
      setAllServices(data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    }
  };
  
  const loadProfessional = async () => {
    try {
      setIsLoading(true);
      const data = await professionalsApi.getById(professionalId);
      
      const loadedFormData = {
        full_name: data.full_name || '',
        email: data.email || '',
        password: '', // Never load password
        is_active: data.is_active ?? true,
      };
      
      setFormData(loadedFormData);
      setInitialFormData(loadedFormData);
      
      // Load photo if exists
      if (data.photo_url) {
        setPhotoPreview(data.photo_url);
      }
      
      // Load associated services from services_offered field
      if (data.services_offered && Array.isArray(data.services_offered)) {
        setSelectedServices(data.services_offered.map(s => s.id));
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Erro ao carregar profissional:', error);
      showAlert('Erro ao carregar dados do profissional', 'error');
      navigate(ROUTES.PROFESSIONALS.LIST);
    } finally {
      setIsLoading(false);
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail deve ter um formato válido';
    }
    
    if (!isEdit && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const handlePhotoChange = (file) => {
    setPhotoFile(file);
    setPhotoPreview(file);
  };
  
  const handlePhotoRemove = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      const professionalData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        is_active: formData.is_active,
      };
      
      // Add password only for new professionals
      if (!isEdit) {
        professionalData.password = formData.password;
      }
      
      let result;
      if (isEdit) {
        result = await professionalsApi.update(professionalId, professionalData);
        showAlert('Profissional atualizado com sucesso!', 'success');
      } else {
        result = await professionalsApi.create(professionalData);
        showAlert('Profissional criado com sucesso!', 'success');
      }
      
      // Handle photo upload if any file was selected
      if (photoFile && typeof photoFile === 'object' && photoFile.name) {
        try {
          await professionalsApi.uploadPhoto(result.id || professionalId, photoFile);
        } catch (error) {
          console.error('Erro ao fazer upload da foto:', error);
          showAlert('Profissional salvo, mas houve erro no upload da foto', 'warning');
        }
      }
      
      // Update services association
      const profId = result?.id || professionalId;
      if (selectedServices.length > 0 || isEdit) {
        try {
          await professionalsApi.updateProfessionalServices(profId, selectedServices);
        } catch (error) {
          console.error('Erro ao associar serviços:', error, error.response?.data);
          showAlert('Profissional salvo, mas houve erro na associação de serviços', 'warning');
        }
      }
      
      // If creating, redirect to edit mode with all tabs available
      if (!isEdit) {
        navigate(ROUTES.PROFESSIONALS.EDIT(result.id));
      } else {
        // Update initial state and clear unsaved changes flag
        setInitialFormData(formData);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Erro ao salvar profissional:', error);
      if (error.response?.data?.detail) {
        showAlert(`Erro ao salvar profissional: ${error.response.data.detail}`, 'error');
      } else {
        showAlert('Falha ao salvar profissional', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelDialog(true);
    } else {
      navigate(ROUTES.PROFESSIONALS.LIST);
    }
  };
  
  const confirmCancel = () => {
    setCancelDialog(false);
    navigate(ROUTES.PROFESSIONALS.LIST);
  };
  
  const handleTabChange = (value) => {
    if (hasUnsavedChanges && activeTab === 'basic') {
      // If there are unsaved changes in basic tab, ask to save first
      if (window.confirm('Você tem alterações não salvas. Deseja salvar antes de trocar de aba?')) {
        return; // Stay on current tab
      }
    }
    setActiveTab(value);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-bg-primary min-h-screen">
      {/* Alert Component */}
      {alert.show && (
        <div className="fixed top-4 right-4 z-50 w-96">
          <Alert
            open={alert.show}
            onClose={() => setAlert({ ...alert, show: false })}
            color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'amber' : 'green'}
            className="mb-4"
          >
            {alert.message}
          </Alert>
        </div>
      )}
      
      <Card className="bg-bg-secondary border-bg-tertiary max-w-5xl mx-auto">
        <CardHeader floated={false} shadow={false} className="bg-bg-secondary">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="text"
              className="flex items-center gap-2 text-accent-primary hover:bg-accent-primary/10"
              onClick={handleCancel}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Voltar para Profissionais
            </Button>
          </div>
          
          <div className="mb-6">
            <Typography variant="h4" className="text-text-primary">
              {isEdit ? 'Editar Profissional' : 'Criar Novo Profissional'}
            </Typography>
            {isEdit && formData.full_name && (
              <Typography className="text-text-secondary mt-1">
                Editando: {formData.full_name}
              </Typography>
            )}
          </div>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          {/* Tabs */}
          <Tabs value={activeTab} onChange={handleTabChange}>
            <TabsHeader className="bg-bg-primary">
              <Tab 
                value="basic" 
                className={`${activeTab === 'basic' ? 'text-accent-primary' : 'text-text-secondary'} hover:text-accent-primary`}
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Dados Básicos
                </div>
              </Tab>
              
              {isEdit && (
                <>
                  <Tab 
                    value="availability" 
                    className={`${activeTab === 'availability' ? 'text-accent-primary' : 'text-text-secondary'} hover:text-accent-primary`}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Disponibilidade
                    </div>
                  </Tab>
                  
                  <Tab 
                    value="blocked" 
                    className={`${activeTab === 'blocked' ? 'text-accent-primary' : 'text-text-secondary'} hover:text-accent-primary`}
                  >
                    <div className="flex items-center gap-2">
                      <NoSymbolIcon className="h-4 w-4" />
                      Bloqueios
                    </div>
                  </Tab>
                  
                  <Tab 
                    value="breaks" 
                    className={`${activeTab === 'breaks' ? 'text-accent-primary' : 'text-text-secondary'} hover:text-accent-primary`}
                  >
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      Pausas
                    </div>
                  </Tab>
                </>
              )}
            </TabsHeader>
            
            <TabsBody className="mt-6">
              <TabPanel value="basic" className="p-0">
                <form onSubmit={handleSubmit}>
                  <BasicDataTab
                    formData={formData}
                    handleInputChange={handleInputChange}
                    errors={errors}
                    handlePhotoChange={handlePhotoChange}
                    photoPreview={photoPreview}
                    handlePhotoRemove={handlePhotoRemove}
                    allServices={allServices}
                    selectedServices={selectedServices}
                    setSelectedServices={setSelectedServices}
                    showAlert={showAlert}
                    isEdit={isEdit}
                  />
                  
                  {/* Action Buttons for Basic Tab */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t border-bg-tertiary mt-8">
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
                    >
                      Cancelar
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-accent-primary hover:bg-accent-primary/90 flex items-center justify-center gap-2"
                    >
                      {isSaving && <Spinner className="h-4 w-4" />}
                      {isSaving ? 'Salvando...' : 'Salvar Profissional'}
                    </Button>
                  </div>
                </form>
              </TabPanel>
              
              {isEdit && (
                <>
                  <TabPanel value="availability" className="p-0">
                    <AvailabilityTab 
                      professionalId={professionalId}
                      showAlert={showAlert}
                    />
                  </TabPanel>
                  
                  <TabPanel value="blocked" className="p-0">
                    <BlockedPeriodsTab 
                      professionalId={professionalId}
                      showAlert={showAlert}
                    />
                  </TabPanel>
                  
                  <TabPanel value="breaks" className="p-0">
                    <RecurringBreaksTab 
                      professionalId={professionalId}
                      showAlert={showAlert}
                    />
                  </TabPanel>
                </>
              )}
            </TabsBody>
          </Tabs>
        </CardBody>
      </Card>
      
      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialog}
        handler={() => setCancelDialog(false)}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Alterações Não Salvas
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Há alterações não salvas. Deseja descartar e voltar?
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setCancelDialog(false)}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Manter Edição
          </Button>
          <Button
            onClick={confirmCancel}
            className="bg-status-error hover:bg-status-error/90"
          >
            Descartar e Voltar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
