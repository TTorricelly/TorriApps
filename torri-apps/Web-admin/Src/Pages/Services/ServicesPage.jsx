import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@material-tailwind/react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

import { categoriesApi } from '../../Services/categories';
import { servicesApi } from '../../Services/services';
import { htmlToPreviewText } from '../../Utils/textUtils';

export default function ServicesPage() {
  const navigate = useNavigate();
  
  // State management
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, service: null });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

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
      console.log('[ServicesPage] Categories fetched:', JSON.stringify(data, null, 2));
      setCategories(data);
      
      // Auto-select first category if available
      if (data.length > 0) {
        setSelectedCategoryId(data[0].id);
        console.log('[ServicesPage] Auto-selected categoryId:', data[0].id);
      } else {
        console.log('[ServicesPage] No categories found, selectedCategoryId reset.');
      }
    } catch (error) {
      console.error('[ServicesPage] Error loading categories:', error);
      showAlert('Erro ao carregar categorias', 'error');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadServices = async () => {
    console.log('[ServicesPage] loadServices called with selectedCategoryId:', selectedCategoryId);
    if (!selectedCategoryId) {
      console.log('[ServicesPage] No selectedCategoryId, skipping service load.');
      return;
    }
    
    try {
      setIsLoadingServices(true);
      const data = await servicesApi.getAll(selectedCategoryId);
      console.log(`[ServicesPage] Services fetched for category ${selectedCategoryId}:`, JSON.stringify(data, null, 2));
      
      // Convert relative image paths to full URLs
      const servicesWithFullUrls = data.map(service => ({
        ...service,
        image_liso: service.image_liso ? `http://localhost:8000${service.image_liso}` : null,
        image_ondulado: service.image_ondulado ? `http://localhost:8000${service.image_ondulado}` : null,
        image_cacheado: service.image_cacheado ? `http://localhost:8000${service.image_cacheado}` : null,
        image_crespo: service.image_crespo ? `http://localhost:8000${service.image_crespo}` : null,
      }));
      
      setServices(servicesWithFullUrls);
    } catch (error) {
      console.error(`[ServicesPage] Error loading services for category ${selectedCategoryId}:`, error);
      showAlert('Erro ao carregar serviços', 'error');
    } finally {
      setIsLoadingServices(false);
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
  };

  const handleCreateService = () => {
    if (!selectedCategoryId) {
      showAlert('Selecione uma categoria antes de criar um serviço', 'warning');
      return;
    }
    navigate(`/services/create?categoryId=${selectedCategoryId}`);
  };

  const handleEditService = (serviceId) => {
    navigate(`/services/edit/${serviceId}`);
  };

  const handleDeleteService = async (service) => {
    setDeleteDialog({ open: true, service });
  };

  const confirmDeleteService = async () => {
    try {
      await servicesApi.delete(deleteDialog.service.id);
      showAlert('Serviço excluído com sucesso!', 'success');
      loadServices(); // Reload services list
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      const message = error.response?.data?.detail || 'Falha ao excluir serviço';
      showAlert(message, 'error');
    } finally {
      setDeleteDialog({ open: false, service: null });
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

  console.log('[ServicesPage] Data for rendering - isLoadingCategories:', isLoadingCategories, 'isLoadingServices:', isLoadingServices, 'selectedCategoryId:', selectedCategoryId, 'filteredServices count:', filteredServices.length);
  if (filteredServices.length > 0) {
      console.log('[ServicesPage] First few filteredServices:', JSON.stringify(filteredServices.slice(0,2), null, 2));
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
                  className="bg-bg-primary border-bg-tertiary text-text-primary"
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

            <Button
              className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
              disabled={!selectedCategoryId}
              onClick={handleCreateService}
            >
              <PlusIcon className="h-4 w-4" />
              Adicionar Serviço
            </Button>
          </div>

          {/* Search Bar */}
          {selectedCategoryId && (
            <div className="mt-4 max-w-md">
              <Input
                type="text"
                placeholder="Pesquisar serviços por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
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
                    <th className="text-left p-4 text-text-primary font-semibold">Nome do Serviço</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Duração (min)</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Comissão (%)</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Preço</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Status</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Ações</th>
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
                            // Find the first available image from any hair type
                            const firstImage = service.image_liso || service.image_ondulado || service.image_cacheado || service.image_crespo;
                            
                            return firstImage ? (
                              <img
                                src={firstImage}
                                alt={service.name}
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
                        <Badge 
                          color={service.is_active ? "green" : "orange"}
                          className="text-xs"
                        >
                          {service.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-2"
                            onClick={() => handleEditService(service.id)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-status-error text-status-error hover:bg-status-error/10 p-2"
                            onClick={() => handleDeleteService(service)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        handler={() => setDeleteDialog({ open: false, service: null })}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir o serviço "{deleteDialog.service?.name}"? 
          Esta ação não pode ser desfeita.
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, service: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteService}
            className="bg-status-error hover:bg-status-error/90"
          >
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}