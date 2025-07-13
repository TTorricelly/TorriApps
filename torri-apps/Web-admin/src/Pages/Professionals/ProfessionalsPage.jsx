import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Alert,
} from '@material-tailwind/react';
import { 
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

import { professionalsApi } from '../../Services/professionals';
import { servicesApi } from '../../Services/services';
import { categoriesApi } from '../../Services/categories';
import ProfessionalCard from './components/ProfessionalCard';

export default function ProfessionalsPage() {
  const { navigate } = useNavigation();
  
  // State management
  const [professionals, setProfessionals] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Load data on component mount
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      try {
        await Promise.all([
          loadProfessionals(),
          loadAllServices(),
          loadAllCategories()
        ]);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading data:', error);
        }
      }
    };
    
    loadData();
    
    // Cleanup function to abort requests if component unmounts
    return () => {
      abortController.abort();
    };
  }, []);

  const loadProfessionals = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await professionalsApi.getAll();
      setProfessionals(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      showAlert('Erro ao carregar profissionais', 'error');
      setProfessionals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllServices = useCallback(async () => {
    try {
      const data = await servicesApi.getAllServices();
      setAllServices(data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    }
  }, []);

  const loadAllCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getAll();
      setAllCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }, []);

  // Filter professionals based on search query, status, and services
  const filteredProfessionals = useMemo(() => {
    let filtered = Array.isArray(professionals) ? professionals : [];

    // Filter by search query (name or email)
    if (searchQuery.trim()) {
      filtered = filtered.filter(professional =>
        professional.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        professional.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(professional => professional.is_active === isActive);
    }

    // Filter by services (if professional has any of the selected services)
    if (serviceFilter.length > 0) {
      filtered = filtered.filter(professional => {
        // This would need to be implemented based on how services are associated with professionals
        // For now, we'll skip this filter until the backend provides this data
        return true;
      });
    }

    return filtered;
  }, [professionals, searchQuery, statusFilter, serviceFilter]);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleCreateProfessional = () => {
    navigate(ROUTES.PROFESSIONALS.CREATE);
  };

  const handleEditProfessional = useCallback((professionalId) => {
    navigate(ROUTES.PROFESSIONALS.EDIT(professionalId));
  }, [navigate]);


  const handleMoveProfessionalUp = useCallback(async (professionalId) => {
    const currentIndex = professionals.findIndex(p => p.id === professionalId);
    if (currentIndex <= 0) return;

    // Create a copy and swap positions
    const updatedProfessionals = [...professionals];
    [updatedProfessionals[currentIndex], updatedProfessionals[currentIndex - 1]] = 
    [updatedProfessionals[currentIndex - 1], updatedProfessionals[currentIndex]];

    // Assign sequential display_order values based on new positions
    const orderUpdates = updatedProfessionals.map((prof, index) => {
      prof.display_order = index + 1;
      return { professional_id: prof.id, display_order: prof.display_order };
    });

    // Update local state immediately for better UX
    setProfessionals(updatedProfessionals);

    try {
      // Update all professionals with their new order
      await professionalsApi.updateOrder(orderUpdates);
      showAlert('Ordem atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Error updating order:', error);
      showAlert('Erro ao atualizar ordem', 'error');
      // Reload data to sync with server
      loadProfessionals();
    }
  }, [professionals, loadProfessionals]);

  const handleMoveProfessionalDown = useCallback(async (professionalId) => {
    const currentIndex = professionals.findIndex(p => p.id === professionalId);
    if (currentIndex >= professionals.length - 1) return;

    // Create a copy and swap positions
    const updatedProfessionals = [...professionals];
    [updatedProfessionals[currentIndex], updatedProfessionals[currentIndex + 1]] = 
    [updatedProfessionals[currentIndex + 1], updatedProfessionals[currentIndex]];

    // Assign sequential display_order values based on new positions
    const orderUpdates = updatedProfessionals.map((prof, index) => {
      prof.display_order = index + 1;
      return { professional_id: prof.id, display_order: prof.display_order };
    });

    // Update local state immediately for better UX
    setProfessionals(updatedProfessionals);

    try {
      // Update all professionals with their new order
      await professionalsApi.updateOrder(orderUpdates);
      showAlert('Ordem atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Error updating order:', error);
      showAlert('Erro ao atualizar ordem', 'error');
      // Reload data to sync with server
      loadProfessionals();
    }
  }, [professionals, loadProfessionals]);

  const getInitials = useCallback((fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, []);

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
      
      <Card className="bg-bg-secondary border-bg-tertiary">
        <CardHeader floated={false} shadow={false} className="bg-bg-secondary">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Typography variant="h4" className="text-text-primary">
                Equipe de Profissionais
              </Typography>
           
            </div>
            
            <Button
              className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
              onClick={handleCreateProfessional}
            >
              <PlusIcon className="h-4 w-4" />
              Novo Profissional
            </Button>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Pesquisar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                icon={<MagnifyingGlassIcon className="h-5 w-5 text-text-tertiary" />}
              />
            </div>

            {/* Status Filter */}
            <div className="min-w-[140px] relative">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                label="Status"
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                menuProps={{ 
                  className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50"
                }}
              >
                <Option value="" className="text-text-primary hover:bg-bg-tertiary">
                  Todos
                </Option>
                <Option value="active" className="text-text-primary hover:bg-bg-tertiary">
                  Ativos
                </Option>
                <Option value="inactive" className="text-text-primary hover:bg-bg-tertiary">
                  Inativos
                </Option>
              </Select>
            </div>

            {/* Service Filter - Placeholder for future implementation */}
            {(Array.isArray(allServices) ? allServices : []).length > 0 && (
              <div className="min-w-[180px] relative">
                <Select
                  label="Filtrar por Serviço"
                  className="bg-bg-primary border-bg-tertiary text-text-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  containerProps={{ className: "text-text-primary" }}
                  menuProps={{ 
                    className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50"
                  }}
                  multiple
                >
                  {(Array.isArray(allServices) ? allServices : []).map((service) => (
                    <Option 
                      key={service.id} 
                      value={service.id}
                      className="text-text-primary hover:bg-bg-tertiary"
                    >
                      {service.name}
                    </Option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          {filteredProfessionals.length === 0 ? (
            <div className="text-center py-12">
              <Typography className="text-text-secondary mb-4">
                {searchQuery || statusFilter 
                  ? 'Nenhum profissional encontrado com os filtros aplicados'
                  : 'Nenhum profissional cadastrado ainda'
                }
              </Typography>
              {!searchQuery && !statusFilter && (
                <Button
                  className="bg-accent-primary hover:bg-accent-primary/90"
                  onClick={handleCreateProfessional}
                >
                  Criar Primeiro Profissional
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProfessionals.map((professional, index) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                  index={index}
                  allCategories={allCategories}
                  allServices={allServices}
                  canMoveUp={index > 0}
                  canMoveDown={index < filteredProfessionals.length - 1}
                  onEdit={handleEditProfessional}
                  onMoveUp={handleMoveProfessionalUp}
                  onMoveDown={handleMoveProfessionalDown}
                  getInitials={getInitials}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

    </div>
  );
}