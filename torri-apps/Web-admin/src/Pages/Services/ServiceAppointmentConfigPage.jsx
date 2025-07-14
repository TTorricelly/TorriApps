import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '../../shared/hooks/useNavigation';
import { ROUTES } from '../../shared/navigation';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Badge,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Chip,
  Switch,
  Tooltip,
  IconButton
} from '@material-tailwind/react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { categoriesApi } from '../../Services/categories';
import { servicesApi } from '../../Services/services';

export default function ServiceAppointmentConfigPage() {
  const { navigate } = useNavigation();
  
  // State management
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [compatibilityMatrix, setCompatibilityMatrix] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [editingService, setEditingService] = useState(null);
  const [draggedService, setDraggedService] = useState(null);
  const [hoveredColumn, setHoveredColumn] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load categories, services, and compatibility matrix
      const [categoriesResponse, servicesResponse, matrixResponse] = await Promise.all([
        categoriesApi.getAll(),
        servicesApi.getAll(),
        servicesApi.getCompatibilityMatrix()
      ]);

      console.log('API Responses:', { categoriesResponse, servicesResponse, matrixResponse });

      setCategories(categoriesResponse.data || categoriesResponse || []);
      setServices(servicesResponse.data || servicesResponse || []);
      setCompatibilityMatrix(matrixResponse.data?.matrix || matrixResponse?.matrix || {});
      
      console.log('State after loading:', { 
        categories: categoriesResponse.data || categoriesResponse || [], 
        services: servicesResponse.data || servicesResponse || [],
        matrix: matrixResponse.data?.matrix || matrixResponse?.matrix || {}
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Erro ao carregar dados de configuração do serviço', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Group services by category and execution flexibility
  const groupByCategory = (servicesList) => {
    const grouped = {};
    servicesList.forEach(service => {
      const category = categories.find(cat => cat.id === service.category_id);
      const categoryName = category?.name || 'Uncategorized';
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(service);
    });
    return grouped;
  };

  // Group services by category for column display (maintains order)
  const servicesGroupedByCategory = useMemo(() => {
    // Sort by execution_order first, then display_order
    const sorted = [...services].sort((a, b) => {
      if (a.execution_order !== b.execution_order) {
        return a.execution_order - b.execution_order;
      }
      return a.display_order - b.display_order;
    });

    // Group by category while maintaining order
    const categoryGroups = [];
    const categoriesMap = new Map();
    
    sorted.forEach(service => {
      const category = categories.find(cat => cat.id === service.category_id);
      const categoryName = category?.name || 'Sem Categoria';
      
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, {
          name: categoryName,
          services: [],
          color: category?.color || 'gray'
        });
        categoryGroups.push(categoriesMap.get(categoryName));
      }
      
      categoriesMap.get(categoryName).services.push(service);
    });
    
    return categoryGroups;
  }, [services, categories]);

  const groupedServices = useMemo(() => {
    // Sort by execution_order first, then display_order
    const sorted = [...services].sort((a, b) => {
      if (a.execution_order !== b.execution_order) {
        return a.execution_order - b.execution_order;
      }
      return a.display_order - b.display_order;
    });

    // Group by flexibility
    const strict = sorted.filter(service => !service.execution_flexible);
    const flexible = sorted.filter(service => service.execution_flexible);

    // Group by category for display
    const strictByCategory = groupByCategory(strict);
    const flexibleByCategory = groupByCategory(flexible);

    return { strict: strictByCategory, flexible: flexibleByCategory };
  }, [services, categories]);

  // Get compatibility status between two services
  const getCompatibilityStatus = (serviceAId, serviceBId) => {
    if (serviceAId === serviceBId) return 'self';
    
    const compatibility = compatibilityMatrix[serviceAId]?.[serviceBId] || 
                         compatibilityMatrix[serviceBId]?.[serviceAId];
    
    if (!compatibility) return 'never';
    
    return compatibility.parallel_type || 'never';
  };

  // Get compatibility icon and color
  const getCompatibilityDisplay = (status) => {
    switch (status) {
      case 'full_parallel':
        return { icon: '✅', color: 'green', label: 'Pode executar em paralelo' };
      case 'during_processing_only':
        return { icon: '🟡', color: 'amber', label: 'Apenas durante processamento' };
      case 'never':
        return { icon: '❌', color: 'red', label: 'Não pode executar em paralelo' };
      case 'self':
        return { icon: '—', color: 'gray', label: 'Mesmo serviço' };
      default:
        return { icon: '❌', color: 'red', label: 'Nenhuma regra definida' };
    }
  };

  // Handle service reordering
  const handleServiceReorder = async (serviceId, newOrder, newFlexible) => {
    try {
      setIsSaving(true);
      
      const updates = [{
        service_id: serviceId,
        execution_order: newOrder,
        execution_flexible: newFlexible
      }];

      await servicesApi.updateExecutionOrder(updates);
      
      // Update local state
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === serviceId 
            ? { ...service, execution_order: newOrder, execution_flexible: newFlexible }
            : service
        )
      );
      
      showAlert('Ordem do serviço atualizada com sucesso', 'success');
    } catch (error) {
      console.error('Error updating service order:', error);
      showAlert('Erro ao atualizar ordem do serviço', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle moving service up/down in execution order  
  const handleMoveService = async (serviceId, direction) => {
    try {
      // Find the current service
      const currentService = services.find(s => s.id === serviceId);
      if (!currentService || currentService.execution_flexible) return;

      // Get all strict order services sorted by execution_order
      const strictServices = services
        .filter(s => !s.execution_flexible)
        .sort((a, b) => a.execution_order - b.execution_order);

      const currentIndex = strictServices.findIndex(s => s.id === serviceId);
      
      // Check bounds
      if (direction === 'up' && currentIndex === 0) return;
      if (direction === 'down' && currentIndex === strictServices.length - 1) return;

      // Create new array with swapped items (following ServicesPage pattern)
      const newStrictServices = [...strictServices];
      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [newStrictServices[currentIndex], newStrictServices[swapIndex]] = [newStrictServices[swapIndex], newStrictServices[currentIndex]];

      // Create updates array for all strict services with new execution_order
      const updates = newStrictServices.map((service, index) => ({
        service_id: service.id,
        execution_order: index + 1, // execution_order starts from 1
        execution_flexible: service.execution_flexible
      }));

      // Optimistic update - update only the strict services in local state
      setServices(prevServices => {
        const serviceMap = new Map(newStrictServices.map((service, index) => [
          service.id, 
          { ...service, execution_order: index + 1 }
        ]));
        
        return prevServices.map(service => 
          serviceMap.has(service.id) ? serviceMap.get(service.id) : service
        );
      });

      // Send to backend using execution order endpoint
      await servicesApi.updateExecutionOrder(updates);
      showAlert('Ordem de execução atualizada com sucesso!', 'success');

    } catch (error) {
      console.error('Error moving service:', error);
      showAlert('Erro ao reordenar serviço', 'error');
      // Reload services to reset state on error
      loadData();
    }
  };

  // Handle compatibility matrix update
  const handleCompatibilityUpdate = async (serviceAId, serviceBId, compatibilityData) => {
    try {
      setIsSaving(true);
      
      console.log('Updating compatibility:', { serviceAId, serviceBId, compatibilityData });
      
      // Call API to save to database
      await servicesApi.updateCompatibility(serviceAId, serviceBId, compatibilityData);
      
      // Update local matrix
      setCompatibilityMatrix(prev => ({
        ...prev,
        [serviceAId]: {
          ...prev[serviceAId],
          [serviceBId]: compatibilityData
        },
        [serviceBId]: {
          ...prev[serviceBId],
          [serviceAId]: compatibilityData
        }
      }));
      
      showAlert('Compatibilidade atualizada com sucesso', 'success');
    } catch (error) {
      console.error('Error updating compatibility:', error);
      showAlert('Erro ao atualizar compatibilidade', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle compatibility between two services
  const toggleCompatibility = (serviceAId, serviceBId) => {
    const currentStatus = getCompatibilityStatus(serviceAId, serviceBId);
    let newStatus;
    
    switch (currentStatus) {
      case 'never':
        newStatus = 'full_parallel';
        break;
      case 'full_parallel':
        newStatus = 'during_processing_only';
        break;
      case 'during_processing_only':
        newStatus = 'never';
        break;
      default:
        newStatus = 'full_parallel';
    }
    
    const compatibilityData = {
      can_run_parallel: newStatus !== 'never',
      parallel_type: newStatus,
      reason: 'configured_by_staff',
      notes: 'Atualizado via página de configuração de agendamento'
    };
    
    handleCompatibilityUpdate(serviceAId, serviceBId, compatibilityData);
  };

  // Show alert message
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  // Render service row in matrix
  const renderServiceRow = (service, categoryName, isFlexible) => {
    const compatDisplay = (targetService) => {
      const status = getCompatibilityStatus(service.id, targetService.id);
      const display = getCompatibilityDisplay(status);
      
      return (
        <Tooltip content={display.label}>
          <button
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              status === 'self' 
                ? 'bg-gray-100 cursor-default' 
                : 'hover:bg-gray-50 cursor-pointer'
            }`}
            onClick={() => status !== 'self' && toggleCompatibility(service.id, targetService.id)}
            disabled={status === 'self' || isSaving}
          >
            {display.icon}
          </button>
        </Tooltip>
      );
    };

    return (
      <tr key={service.id} className="border-b border-bg-tertiary hover:bg-bg-tertiary transition-colors duration-fast">
        {/* Service Info Column */}
        <td className="px-4 py-3 sticky left-0 bg-bg-primary z-10 border-r border-bg-tertiary shadow-sm" style={{ width: 'clamp(180px, 25vw, 220px)', minWidth: '180px' }}>
          <div className="flex items-start gap-2 w-full">
            <div className="flex-shrink-0">
              {!isFlexible && (
                <div className="px-2 py-1 bg-accent-primary text-white rounded text-xs font-medium">
                  {service.execution_order}
                </div>
              )}
              {isFlexible && (
                <div className="px-2 py-1 bg-status-warning text-white rounded text-xs font-medium">
                  Flex
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <p className="text-small font-medium text-text-primary truncate w-full">
                {service.name}
              </p>
              <div className="flex flex-wrap items-center gap-1 text-small text-text-secondary">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <ClockIcon className="w-3 h-3 flex-shrink-0 text-text-tertiary" />
                  <span>{service.duration_minutes}min</span>
                </div>
                {service.processing_time && (
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span>•</span>
                    <span>Proc: {service.processing_time}min</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1">
              {/* Reorder arrows - only for strict order services */}
              {!isFlexible && (() => {
                // Check if this is first or last service to disable appropriate buttons
                const strictServices = services
                  .filter(s => !s.execution_flexible)
                  .sort((a, b) => a.execution_order - b.execution_order);
                const currentIndex = strictServices.findIndex(s => s.id === service.id);
                const isFirst = currentIndex === 0;
                const isLast = currentIndex === strictServices.length - 1;

                return (
                  <div className="flex flex-col">
                    <Tooltip content="Mover para cima">
                      <button
                        onClick={() => handleMoveService(service.id, 'up')}
                        disabled={isSaving || isFirst}
                        className={`transition-colors duration-fast p-1 ${
                          isSaving || isFirst 
                            ? 'text-text-tertiary opacity-50 cursor-not-allowed' 
                            : 'text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary rounded'
                        }`}
                      >
                        <ArrowUpIcon className="w-3 h-3" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Mover para baixo">
                      <button
                        onClick={() => handleMoveService(service.id, 'down')}
                        disabled={isSaving || isLast}
                        className={`transition-colors duration-fast p-1 ${
                          isSaving || isLast 
                            ? 'text-text-tertiary opacity-50 cursor-not-allowed' 
                            : 'text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary rounded'
                        }`}
                      >
                        <ArrowDownIcon className="w-3 h-3" />
                      </button>
                    </Tooltip>
                  </div>
                );
              })()}
              <Tooltip content="Editar configurações do serviço">
                <IconButton
                  size="sm"
                  variant="text"
                  onClick={() => setEditingService(service)}
                  className="text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </td>
        
        {/* Compatibility Matrix Columns */}
        {servicesGroupedByCategory.map((categoryGroup, categoryIndex) =>
          categoryGroup.services.map((targetService, serviceIndex) => (
            <td 
              key={targetService.id} 
              className={`px-1 py-3 text-center transition-colors duration-fast ${
                hoveredColumn === targetService.id 
                  ? 'bg-bg-tertiary' 
                  : ''
              } ${serviceIndex === 0 ? 'border-l-2 border-l-bg-tertiary' : ''}`}
              onMouseEnter={() => setHoveredColumn(targetService.id)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {compatDisplay(targetService)}
            </td>
          ))
        )}
      </tr>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-l">{/* Responsive container with design system spacing */}
      {/* Alert */}
      {alert.show && (
        <div className="fixed top-4 right-4 z-50 w-96">
          <Alert
            open={alert.show}
            onClose={() => setAlert({ show: false, message: '', type: 'success' })}
            color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'amber' : 'green'}
            className="mb-4"
          >
            {alert.message}
          </Alert>
        </div>
      )}



      {/* Execution Order & Compatibility Matrix */}
      <div className="w-full max-w-full overflow-hidden bg-bg-secondary rounded-card shadow-card border border-bg-tertiary">
        <div className="p-l border-b border-bg-tertiary">
          <h2 className="text-h2 font-semibold text-text-primary break-words mb-m">
            Ordem de Execução e Matriz de Compatibilidade
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-text-secondary">
            <span className="font-medium text-text-primary whitespace-nowrap">Legenda:</span>
            <span className="flex items-center gap-1 whitespace-nowrap">✅ Paralelo Total</span>
            <span className="flex items-center gap-1 whitespace-nowrap">🟡 Durante Processamento</span>
            <span className="flex items-center gap-1 whitespace-nowrap">❌ Nunca</span>
            <span className="flex items-center gap-1 whitespace-nowrap">🔄 Ordem Flexível</span>
          </div>
        </div>
        <div className="w-full overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-bg-tertiary rounded-lg">
            <table className="w-full table-auto" style={{ minWidth: 'max-content' }}>
              {/* Header */}
              <thead className="bg-bg-secondary sticky top-0 z-20 shadow-sm">
                {/* Category header row */}
                <tr className="border-b border-bg-tertiary">
                  <th className="px-4 py-2 text-left font-semibold text-text-primary sticky left-0 bg-bg-secondary z-30 border-r border-bg-tertiary" style={{ width: 'clamp(180px, 25vw, 220px)', minWidth: '180px' }}>
                    <div className="text-small text-text-secondary">Categoria / Serviço</div>
                  </th>
                  {servicesGroupedByCategory.map((categoryGroup, categoryIndex) => (
                    <th
                      key={`category-${categoryIndex}`}
                      colSpan={categoryGroup.services.length}
                      className={`px-1 py-2 text-center font-semibold text-text-primary text-small border-l-2 bg-bg-secondary ${
                        categoryIndex === 0 ? 'border-l-bg-tertiary' : 'border-l-bg-tertiary'
                      }`}
                    >
                      <Tooltip content={`Categoria: ${categoryGroup.name}`} placement="top">
                        <div className="bg-accent-primary/20 text-accent-primary rounded px-2 py-1 mx-1 cursor-help">
                          {categoryGroup.name}
                        </div>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
                {/* Service header row */}
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary sticky left-0 bg-bg-secondary z-30 border-r border-bg-tertiary" style={{ width: 'clamp(180px, 25vw, 220px)', minWidth: '180px' }}>
                    Serviço
                  </th>
                  {servicesGroupedByCategory.map((categoryGroup, categoryIndex) => 
                    categoryGroup.services.map((service, serviceIndex) => (
                      <th
                        key={service.id}
                        className={`px-1 py-3 text-center font-semibold text-text-primary min-w-[2rem] transition-colors duration-fast ${
                          hoveredColumn === service.id 
                            ? 'bg-bg-tertiary' 
                            : 'bg-bg-secondary hover:bg-bg-tertiary/50'
                        } ${serviceIndex === 0 ? 'border-l-2 border-l-bg-tertiary' : ''}`}
                        onMouseEnter={() => setHoveredColumn(service.id)}
                        onMouseLeave={() => setHoveredColumn(null)}
                      >
                        <Tooltip content={service.name} placement="top">
                          <div className="transform -rotate-45 text-xs truncate max-w-[3rem] cursor-help">
                            {service.name.substring(0, 8)}
                          </div>
                        </Tooltip>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              
              <tbody>
                {/* Strict Order Services */}
                {Object.entries(groupedServices.strict).map(([categoryName, categoryServices]) => (
                  <React.Fragment key={`strict-${categoryName}`}>
                    <tr className="bg-bg-tertiary">
                      <td className="px-4 py-2 sticky left-0 bg-bg-tertiary z-10 border-r border-bg-tertiary shadow-sm" style={{ width: 'clamp(180px, 25vw, 220px)', minWidth: '180px' }}>
                        <p className="text-small font-semibold text-text-primary">
                          Ordem Rígida - {categoryName}
                        </p>
                      </td>
                      <td colSpan={servicesGroupedByCategory.reduce((total, group) => total + group.services.length, 0)} className="px-4 py-2 bg-bg-tertiary">
                      </td>
                    </tr>
                    {categoryServices.map(service => renderServiceRow(service, categoryName, false))}
                  </React.Fragment>
                ))}
                
                {/* Flexible Order Services */}
                {Object.entries(groupedServices.flexible).map(([categoryName, categoryServices]) => (
                  <React.Fragment key={`flexible-${categoryName}`}>
                    <tr className="bg-bg-tertiary">
                      <td className="px-4 py-2 sticky left-0 bg-bg-tertiary z-10 border-r border-bg-tertiary shadow-sm" style={{ width: 'clamp(180px, 25vw, 220px)', minWidth: '180px' }}>
                        <p className="text-small font-semibold text-text-primary">
                          Ordem Flexível - {categoryName}
                        </p>
                      </td>
                      <td colSpan={servicesGroupedByCategory.reduce((total, group) => total + group.services.length, 0)} className="px-4 py-2 bg-bg-tertiary">
                      </td>
                    </tr>
                    {categoryServices.map(service => renderServiceRow(service, categoryName, true))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Service Settings Modal */}
      <Dialog 
        open={!!editingService} 
        handler={() => setEditingService(null)} 
        size="md"
        className="bg-bg-secondary border border-bg-tertiary w-full max-w-[95vw] sm:max-w-md mx-4"
      >
        <DialogHeader className="border-b border-bg-tertiary">
          <h3 className="text-h3 font-semibold text-text-primary break-words">
            Configurações do Serviço: {editingService?.name}
          </h3>
        </DialogHeader>
        <DialogBody className="space-y-4 p-l">
          {editingService && (
            <div className="space-y-4">
              {/* Execution Order */}
              <div>
                <label className="text-small font-medium text-text-primary mb-2 block">
                  Ordem de Execução
                </label>
                <Input
                  type="number"
                  label="Ordem de Execução"
                  className="bg-bg-primary border-bg-tertiary text-text-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  containerProps={{ className: "text-text-primary" }}
                  value={editingService.execution_order}
                  onChange={(e) => setEditingService(prev => ({
                    ...prev,
                    execution_order: parseInt(e.target.value) || 0
                  }))}
                />
              </div>

              {/* Execution Flexibility */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-small font-medium text-text-primary">
                    Execução Flexível
                  </p>
                  <p className="text-small text-text-secondary">
                    Permitir que este serviço seja otimizado no agendamento
                  </p>
                </div>
                <Switch
                  checked={editingService.execution_flexible}
                  onChange={(e) => setEditingService(prev => ({
                    ...prev,
                    execution_flexible: e.target.checked
                  }))}
                />
              </div>

              {/* Timing Information */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Tempo de Processamento (min)"
                  className="bg-bg-primary border-bg-tertiary text-text-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  containerProps={{ className: "text-text-primary" }}
                  value={editingService.processing_time || ''}
                  onChange={(e) => setEditingService(prev => ({
                    ...prev,
                    processing_time: parseInt(e.target.value) || null
                  }))}
                />
                <Input
                  type="number"
                  label="Tempo de Finalização (min)"
                  className="bg-bg-primary border-bg-tertiary text-text-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  containerProps={{ className: "text-text-primary" }}
                  value={editingService.finishing_time || ''}
                  onChange={(e) => setEditingService(prev => ({
                    ...prev,
                    finishing_time: parseInt(e.target.value) || null
                  }))}
                />
              </div>

              {/* Processing Behavior */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-small font-medium text-text-primary">
                    Permite paralelo durante processamento
                  </p>
                  <Switch
                    checked={editingService.allows_parallel_during_processing}
                    onChange={(e) => setEditingService(prev => ({
                      ...prev,
                      allows_parallel_during_processing: e.target.checked
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-small font-medium text-text-primary">
                    Pode ser feito durante processamento
                  </p>
                  <Switch
                    checked={editingService.can_be_done_during_processing}
                    onChange={(e) => setEditingService(prev => ({
                      ...prev,
                      can_be_done_during_processing: e.target.checked
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="border-t border-bg-tertiary pt-m">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 w-full sm:w-auto">
            <button
              onClick={() => setEditingService(null)}
              className="px-m py-s text-status-error border border-status-error rounded-button hover:bg-status-error/10 transition-colors duration-fast sm:mr-s w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (editingService) {
                  handleServiceReorder(
                    editingService.id,
                    editingService.execution_order,
                    editingService.execution_flexible
                  );
                  setEditingService(null);
                }
              }}
              disabled={isSaving}
              className="px-m py-s bg-status-success text-white rounded-button hover:bg-status-success/90 transition-colors duration-fast disabled:opacity-50 w-full sm:w-auto"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </DialogFooter>
      </Dialog>
    </div>
  );
}