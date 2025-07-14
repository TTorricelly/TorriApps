import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../../shared/hooks/useNavigation';
import { ROUTES } from '../../shared/navigation';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Select,
  Option,
  Input,
  Badge,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Chip,
} from '@material-tailwind/react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

import { categoriesApi } from '../../Services/categories';
import { servicesApi, serviceVariationGroupsApi } from '../../Services/services';
import { htmlToPreviewText } from '../../Utils/textUtils';
import { getAssetUrl } from '../../Utils/config';

export default function ServicesPage() {
  const { navigate } = useNavigation();
  
  // State management
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    // Initialize from localStorage or empty string
    return localStorage.getItem('services_selected_category_id') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [variationCounts, setVariationCounts] = useState({});

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load services when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      loadServices();
    } else {
      setServices([]);
    }
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const data = await categoriesApi.getAll();
      setCategories(data);
      
      // Check if stored category still exists, otherwise auto-select first category
      const storedCategoryId = localStorage.getItem('services_selected_category_id');
      const storedCategoryExists = data.some(cat => cat.id === storedCategoryId);
      
      if (storedCategoryExists) {
        // Keep the stored category (selectedCategoryId state is already initialized with it)
        // No need to update state, just ensure localStorage is in sync
      } else if (data.length > 0) {
        // Stored category doesn't exist or no stored category, select first available
        const firstCategoryId = data[0].id;
        setSelectedCategoryId(firstCategoryId);
        localStorage.setItem('services_selected_category_id', firstCategoryId);
      } else {
        // No categories available, clear stored selection
        setSelectedCategoryId('');
        localStorage.removeItem('services_selected_category_id');
      }
    } catch (error) {
      console.error('[ServicesPage] Error loading categories:', error);
      showAlert('Erro ao carregar categorias', 'error');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadServices = async () => {
    if (!selectedCategoryId) {
      return;
    }
    
    try {
      setIsLoadingServices(true);
      const data = await servicesApi.getAll(selectedCategoryId);
      
      // Convert relative image paths to full URLs using centralized helper
      const servicesWithFullUrls = data.map(service => ({
        ...service,
        image: getAssetUrl(service.image),
        image_liso: getAssetUrl(service.image_liso),
        image_ondulado: getAssetUrl(service.image_ondulado),
        image_cacheado: getAssetUrl(service.image_cacheado),
        image_crespo: getAssetUrl(service.image_crespo),
      }));
      
      setServices(servicesWithFullUrls);
      
      // Load variation counts for all services
      loadVariationCounts(servicesWithFullUrls);
    } catch (error) {
      console.error(`[ServicesPage] Error loading services for category ${selectedCategoryId}:`, error);
      showAlert('Erro ao carregar serviços', 'error');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadVariationCounts = async (services) => {
    try {
      const counts = {};
      
      // Load variation counts for each service
      await Promise.all(
        services.map(async (service) => {
          try {
            const variationGroups = await serviceVariationGroupsApi.getByServiceId(service.id);
            const totalVariations = variationGroups.reduce((sum, group) => {
              return sum + (group.variations ? group.variations.length : 0);
            }, 0);
            counts[service.id] = totalVariations;
          } catch (error) {
            console.error(`Error loading variations for service ${service.id}:`, error);
            counts[service.id] = 0;
          }
        })
      );
      
      setVariationCounts(counts);
    } catch (error) {
      console.error('Error loading variation counts:', error);
    }
  };

  // Filter services based on search query
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    
    return services.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery(''); // Clear search when changing category
    
    // Persist selected category to localStorage
    if (categoryId) {
      localStorage.setItem('services_selected_category_id', categoryId);
    } else {
      localStorage.removeItem('services_selected_category_id');
    }
  };

  const handleCreateService = () => {
    if (!selectedCategoryId) {
      showAlert('Selecione uma categoria antes de criar um serviço', 'warning');
      return;
    }
    navigate(`${ROUTES.SERVICES.CREATE}?categoryId=${selectedCategoryId}`);
  };

  const handleEditService = (serviceId) => {
    navigate(ROUTES.SERVICES.EDIT(serviceId));
  };

  const handleMoveServiceUp = async (serviceIndex) => {
    if (serviceIndex === 0) return; // Can't move first item up

    try {
      // Create new array with swapped items
      const newServices = [...services];
      [newServices[serviceIndex], newServices[serviceIndex - 1]] = [newServices[serviceIndex - 1], newServices[serviceIndex]];
      
      // Update display_order for all services
      const reorderData = newServices.map((service, index) => ({
        service_id: service.id,
        display_order: index + 1
      }));

      // Optimistic update
      setServices(newServices);

      // Send to backend
      await servicesApi.reorder(reorderData);
      showAlert('Ordem dos serviços atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao reordenar serviços:', error);
      showAlert('Erro ao reordenar serviços', 'error');
      // Reload services to reset state
      loadServices();
    }
  };

  const handleMoveServiceDown = async (serviceIndex) => {
    if (serviceIndex === services.length - 1) return; // Can't move last item down

    try {
      // Create new array with swapped items
      const newServices = [...services];
      [newServices[serviceIndex], newServices[serviceIndex + 1]] = [newServices[serviceIndex + 1], newServices[serviceIndex]];
      
      // Update display_order for all services
      const reorderData = newServices.map((service, index) => ({
        service_id: service.id,
        display_order: index + 1
      }));

      // Optimistic update
      setServices(newServices);

      // Send to backend
      await servicesApi.reorder(reorderData);
      showAlert('Ordem dos serviços atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao reordenar serviços:', error);
      showAlert('Erro ao reordenar serviços', 'error');
      // Reload services to reset state
      loadServices();
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };


  if (isLoadingCategories) {
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
      
      <Card className="bg-bg-secondary border-bg-tertiary">
        <CardHeader floated={false} shadow={false} className="bg-bg-secondary overflow-visible">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Typography variant="h4" className="text-text-primary">
                Catálogo de Serviços
              </Typography>
           
            </div>
          </div>

          {/* Category Selection and Actions */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative overflow-visible">
            <div className="flex-1 max-w-xs relative">
              {categories.length === 0 ? (
                <Typography className="text-text-secondary">
                  Crie uma categoria antes de adicionar serviços
                </Typography>
              ) : (
                <Select
                  value={selectedCategoryId}
                  onChange={handleCategoryChange}
                  label="Categoria"
                  className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                  labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
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
                  {categories.map((category) => (
                    <Option 
                      key={category.id} 
                      value={category.id}
                      className="text-text-primary hover:bg-bg-tertiary hover:text-white focus:bg-bg-tertiary focus:text-accent-primary selected:bg-accent-primary selected:text-white data-[selected=true]:bg-accent-primary data-[selected=true]:text-white data-[selected=true]:hover:text-white"
                    >
                      {category.name}
                    </Option>
                  ))}
                </Select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                className="border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white flex items-center gap-2"
                onClick={() => navigate(ROUTES.SERVICES.APPOINTMENT_CONFIG)}
              >
                <Cog6ToothIcon className="h-4 w-4" />
                Appointment Config
              </Button>
              
              <Button
                className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
                disabled={!selectedCategoryId}
                onClick={handleCreateService}
              >
                <PlusIcon className="h-4 w-4" />
                Adicionar Serviço
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {selectedCategoryId && (
            <div className="mt-4 max-w-md">
              <Input
                type="text"
                placeholder="Pesquisar serviços por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                containerProps={{ className: "text-text-primary" }}
                icon={<MagnifyingGlassIcon className="h-5 w-5 text-text-tertiary" />}
              />
            </div>
          )}
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          {!selectedCategoryId ? (
            <div className="text-center py-12">
              <Typography className="text-text-secondary">
                Selecione uma categoria para visualizar os serviços
              </Typography>
            </div>
          ) : isLoadingServices ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Typography className="text-text-secondary mb-4">
                {searchQuery 
                  ? 'Nenhum serviço encontrado com esse nome'
                  : `Nenhum serviço cadastrado na categoria "${selectedCategory?.name}"`
                }
              </Typography>
              {!searchQuery && (
                <Button
                  className="bg-accent-primary hover:bg-accent-primary/90"
                  onClick={handleCreateService}
                >
                  Criar Primeiro Serviço
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-left p-4 text-text-primary font-semibold">Imagem</th>
                    <th className="text-left p-4 text-text-primary font-semibold w-24">Ordem</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Nome do Serviço</th>
                    <th className="text-left p-4 text-text-primary font-semibold">SKU</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Duração (min)</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Comissão (%)</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Preço</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Sujeito a Avaliação</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Variações</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Paralelo</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service, index) => (
                    <tr 
                      key={service.id} 
                      className={`border-b border-bg-tertiary hover:bg-bg-primary/50 cursor-pointer ${
                        index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
                      }`}
                      onClick={() => handleEditService(service.id)}
                    >
                      <td className="p-4">
                        <div className="w-16 h-16 bg-bg-tertiary rounded-lg flex items-center justify-center">
                          {(() => {
                            // First check for primary image from new images array
                            const primaryImage = service.images?.find(img => img.is_primary);
                            // Fall back to first image if no primary is set
                            const firstImage = service.images?.[0];
                            // Final fallback to old static images
                            const displayImage = primaryImage?.file_path || 
                                                firstImage?.file_path ||
                                                service.image || 
                                                service.image_liso || 
                                                service.image_ondulado || 
                                                service.image_cacheado || 
                                                service.image_crespo;
                            
                            return displayImage ? (
                              <img
                                src={displayImage}
                                alt={primaryImage?.alt_text || firstImage?.alt_text || service.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="text-text-tertiary text-xs text-center">
                                Sem<br/>Imagem
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-1"
                            onClick={() => handleMoveServiceUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUpIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-1"
                            onClick={() => handleMoveServiceDown(index)}
                            disabled={index === filteredServices.length - 1}
                          >
                            <ArrowDownIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary font-medium">
                          {service.name}
                        </Typography>
                        {service.description && (
                          <Typography className="text-text-secondary text-sm mt-1">
                            {htmlToPreviewText(service.description, 60)}
                          </Typography>
                        )}
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary">
                          {service.service_sku}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary">
                          {service.duration_minutes}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary">
                          {service.commission_percentage || 0}%
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary font-medium">
                          {formatPrice(service.price)}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Chip
                          variant="ghost"
                          color={service.price_subject_to_evaluation ? "amber" : "gray"}
                          size="sm"
                          value={service.price_subject_to_evaluation ? "Sim" : "Não"}
                        />
                      </td>
                      <td className="p-4">
                        <Badge 
                          color={variationCounts[service.id] > 0 ? "blue" : "gray"}
                          className="text-xs w-fit"
                        >
                          {variationCounts[service.id] || 0}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            color={service.parallelable ? "blue" : "gray"}
                            className="text-xs w-fit"
                          >
                            {service.parallelable ? "Sim" : "Não"}
                          </Badge>
                          {service.parallelable && (
                            <Typography className="text-text-secondary text-xs">
                              Máx: {service.max_parallel_pros}
                            </Typography>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          color={service.is_active ? "green" : "orange"}
                          className="text-xs"
                        >
                          {service.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

    </div>
  );
}