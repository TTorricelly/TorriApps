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
  const [editingOrderService, setEditingOrderService] = useState(null);
  const [tempOrderValue, setTempOrderValue] = useState('');

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

      const loadedCategories = categoriesResponse.data || categoriesResponse || [];
      const loadedServices = servicesResponse.data || servicesResponse || [];
      
      setCategories(loadedCategories);
      
      // Normalize execution orders to ensure sequential numbering
      const normalizedServices = normalizeExecutionOrders(loadedServices);
      setServices(normalizedServices);
      
      setCompatibilityMatrix(matrixResponse.data?.matrix || matrixResponse?.matrix || {});
      
      console.log('State after loading:', { 
        categories: loadedCategories, 
        services: normalizedServices,
        matrix: matrixResponse.data?.matrix || matrixResponse?.matrix || {}
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Erro ao carregar dados de configuração do serviço', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize execution orders to ensure sequential numbering (1, 2, 3, etc.)
  const normalizeExecutionOrders = (servicesList) => {
    const strictServices = servicesList
      .filter(s => !s.execution_flexible)
      .sort((a, b) => a.execution_order - b.execution_order);
    
    const flexibleServices = servicesList.filter(s => s.execution_flexible);
    
    // Check if strict services need normalization
    const needsNormalization = strictServices.some((service, index) => 
      service.execution_order !== index + 1
    );
    
    if (needsNormalization) {
      console.log('Normalizing execution orders...');
      
      // Create normalized services with sequential execution orders
      const normalizedStrict = strictServices.map((service, index) => ({
        ...service,
        execution_order: index + 1
      }));
      
      // Combine strict and flexible services
      return [...normalizedStrict, ...flexibleServices];
    }
    
    return servicesList;
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

  // Handle inline editing of execution order
  const startEditingOrder = (service) => {
    setEditingOrderService(service.id);
    setTempOrderValue(service.execution_order.toString());
  };

  const cancelEditingOrder = () => {
    setEditingOrderService(null);
    setTempOrderValue('');
  };

  const saveExecutionOrder = async (serviceId) => {
    try {
      const newOrder = parseInt(tempOrderValue);
      if (isNaN(newOrder) || newOrder < 1) {
        showAlert('Ordem deve ser um número maior que 0', 'error');
        return;
      }

      setIsSaving(true);
      
      // Get all strict services to reorder them properly
      const strictServices = services
        .filter(s => !s.execution_flexible)
        .sort((a, b) => a.execution_order - b.execution_order);
      
      const currentService = strictServices.find(s => s.id === serviceId);
      if (!currentService) return;
      
      // Remove current service from array
      const otherServices = strictServices.filter(s => s.id !== serviceId);
      
      // Insert service at new position (newOrder - 1 because array is 0-indexed)
      const insertIndex = Math.min(Math.max(newOrder - 1, 0), otherServices.length);
      otherServices.splice(insertIndex, 0, currentService);
      
      // Create updates with sequential numbering
      const updates = otherServices.map((service, index) => ({
        service_id: service.id,
        execution_order: index + 1,
        execution_flexible: service.execution_flexible
      }));

      // Update backend
      await servicesApi.updateExecutionOrder(updates);
      
      // Update local state
      setServices(prevServices => {
        const serviceMap = new Map(otherServices.map((service, index) => [
          service.id, 
          { ...service, execution_order: index + 1 }
        ]));
        
        return prevServices.map(service => 
          serviceMap.has(service.id) ? serviceMap.get(service.id) : service
        );
      });
      
      setEditingOrderService(null);
      setTempOrderValue('');
      showAlert('Ordem de execução atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('Error updating execution order:', error);
      showAlert('Erro ao atualizar ordem de execução', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderKeyDown = (e, serviceId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveExecutionOrder(serviceId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditingOrder();
    }
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
                <div className="relative">
                  {editingOrderService === service.id ? (
                    <input
                      type="number"
                      value={tempOrderValue}
                      onChange={(e) => setTempOrderValue(e.target.value)}
                      onKeyDown={(e) => handleOrderKeyDown(e, service.id)}
                      onBlur={() => saveExecutionOrder(service.id)}
                      className="w-8 h-6 px-1 text-xs font-medium text-center bg-accent-primary text-white rounded border-2 border-accent-primary focus:border-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      autoFocus
                      min="1"
                    />
                  ) : (
                    <button
                      onClick={() => startEditingOrder(service)}
                      className="px-2 py-1 bg-accent-primary text-white rounded text-xs font-medium hover:bg-accent-primary/90 transition-colors cursor-pointer"
                      title="Clique para editar ordem (Enter para salvar, Esc para cancelar)"
                    >
                      {service.execution_order}
                    </button>
                  )}
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
                      <td className="px-4 py-3 sticky left-0 bg-bg-tertiary z-10 border-r border-bg-tertiary shadow-sm" style={{ width: 'clamp(180px, 25vw, 220px)', minWidth: '180px' }}>
                        <div className="flex items-center gap-3">
                          {/* Category Image Placeholder */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-white rounded-lg border-2 border-bg-primary/20 shadow-sm flex items-center justify-center overflow-hidden">
                              {(() => {
                                const category = categories.find(cat => cat.name === categoryName);
                                return category?.icon_url ? (
                                  <img 
                                    src={category.icon_url} 
                                    alt={categoryName}
                                    className="w-full h-full object-cover rounded-md"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-accent-primary/10 to-accent-primary/20 flex items-center justify-center rounded-md">
                                    <span className="text-accent-primary text-sm font-semibold">
                                      {categoryName.charAt(0)}
                                    </span>
                                  </div>
                                );
                              })()} 
                            </div>
                          </div>
                          {/* Category Text */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-small font-semibold text-text-primary truncate">
                              {categoryName}
                            </span>
                            <Chip
                              value="Ordem Rígida"
                              size="sm"
                              className="bg-accent-primary/10 text-accent-primary border-accent-primary/20 px-2 py-1 text-xs font-medium flex-shrink-0"
                            />
                          </div>
                        </div>
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
                      <td className="px-4 py-3 sticky left-0 bg-bg-tertiary z-10 border-r border-bg-tertiary shadow-sm" style={{ width: 'clamp(180px, 25vw, 220px)', minWidth: '180px' }}>
                        <div className="flex items-center gap-3">
                          {/* Category Image Placeholder */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-white rounded-lg border-2 border-bg-primary/20 shadow-sm flex items-center justify-center overflow-hidden">
                              {(() => {
                                const category = categories.find(cat => cat.name === categoryName);
                                return category?.icon_url ? (
                                  <img 
                                    src={category.icon_url} 
                                    alt={categoryName}
                                    className="w-full h-full object-cover rounded-md"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-status-warning/10 to-status-warning/20 flex items-center justify-center rounded-md">
                                    <span className="text-status-warning text-sm font-semibold">
                                      {categoryName.charAt(0)}
                                    </span>
                                  </div>
                                );
                              })()} 
                            </div>
                          </div>
                          {/* Category Text */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-small font-semibold text-text-primary truncate">
                              {categoryName}
                            </span>
                            <Chip
                              value="Ordem Flexível"
                              size="sm"
                              className="bg-status-warning/10 text-status-warning border-status-warning/20 px-2 py-1 text-xs font-medium flex-shrink-0"
                            />
                          </div>
                        </div>
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
                <Input
                  type="number"
                  label="Ordem de Execução"
                  className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                  labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
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
                    Permitir encaixe automático sem ordem fixa
                  </p>
                </div>
                <Switch
                  checked={editingService.execution_flexible}
                  onChange={(e) => setEditingService(prev => ({
                    ...prev,
                    execution_flexible: e.target.checked
                  }))}
                  className="h-full w-full checked:bg-accent-primary"
                  containerProps={{
                    className: "w-11 h-6",
                  }}
                  circleProps={{
                    className: "before:hidden left-0.5 border-none",
                  }}
                />
              </div>

              {/* Timing Information */}
              <div className="space-y-3">
                <Typography className="text-small font-medium text-text-primary mb-2">
                  Configuração de Tempo
                </Typography>
                
                {/* All Timing Fields - Individual Layout */}
                <div className="space-y-3">
                  <Input
                    id="duration_minutes"
                    name="duration_minutes"
                    type="number"
                    label="Duração Base (minutos)"
                    className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                    labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                    containerProps={{ className: "text-text-primary" }}
                    value={editingService.duration_minutes}
                    onChange={(e) => setEditingService(prev => ({
                      ...prev,
                      duration_minutes: parseInt(e.target.value) || 0
                    }))}
                  />
                  <Input
                    id="processing_time"
                    name="processing_time"
                    type="number"
                    label="Tempo de Processamento"
                    className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                    labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                    containerProps={{ className: "text-text-primary" }}
                    value={editingService.processing_time}
                    onChange={(e) => setEditingService(prev => ({
                      ...prev,
                      processing_time: parseInt(e.target.value) || 0
                    }))}
                  />
                  <Input
                    id="finishing_time"
                    name="finishing_time"
                    type="number"
                    label="Finalização (min)"
                    className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                    labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                    containerProps={{ className: "text-text-primary" }}
                    value={editingService.finishing_time}
                    onChange={(e) => setEditingService(prev => ({
                      ...prev,
                      finishing_time: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>



                {/* Show total in a simple format */}
                {editingService && (() => {
                  const baseDuration = editingService.duration_minutes || 0;
                  const processingTime = editingService.processing_time || 0;
                  const finishingTime = editingService.finishing_time || 0;
                  const total = baseDuration + processingTime + finishingTime;
                  
                  return (
                    <div className="text-center py-2">
                      <p className="text-small text-text-secondary">
                        = <span className="text-accent-primary font-semibold">{total} min</span> (Duração Total do Agendamento)
                      </p>
                    </div>
                  );
                })()}
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