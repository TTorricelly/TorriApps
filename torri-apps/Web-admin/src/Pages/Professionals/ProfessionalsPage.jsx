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
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Avatar,
} from '@material-tailwind/react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  Bars3Icon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

import { professionalsApi } from '../../Services/professionals';
import { servicesApi } from '../../Services/services';

// Optimized Professional Row Component with memoization
const ProfessionalRow = React.memo(({ professional, index, onEdit, onDelete, onMoveUp, onMoveDown, getServiceTags, getInitials, canMoveUp, canMoveDown }) => {
  const [imageError, setImageError] = useState(false);
  
  const handleRowClick = useCallback(() => {
    onEdit(professional.id);
  }, [onEdit, professional.id]);
  
  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit(professional.id);
  }, [onEdit, professional.id]);
  
  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(professional);
  }, [onDelete, professional]);

  const handleMoveUp = useCallback((e) => {
    e.stopPropagation();
    onMoveUp(professional.id);
  }, [onMoveUp, professional.id]);

  const handleMoveDown = useCallback((e) => {
    e.stopPropagation();
    onMoveDown(professional.id);
  }, [onMoveDown, professional.id]);
  
  const serviceTags = useMemo(() => getServiceTags(professional), [getServiceTags, professional]);
  const initials = useMemo(() => getInitials(professional.full_name), [getInitials, professional.full_name]);
  
  return (
    <tr 
      className={`border-b border-bg-tertiary hover:bg-bg-primary/50 cursor-pointer ${
        index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
      }`}
      onClick={handleRowClick}
    >
      <td className="p-4 text-center">
        <Typography className="text-text-primary font-medium">
          {professional.display_order || index + 1}
        </Typography>
      </td>
      <td className="p-4">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="text"
            className={`p-1 ${canMoveUp ? 'text-accent-primary hover:bg-accent-primary/10' : 'text-text-tertiary cursor-not-allowed'}`}
            onClick={handleMoveUp}
            disabled={!canMoveUp}
          >
            <ArrowUpIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="text"
            className={`p-1 ${canMoveDown ? 'text-accent-primary hover:bg-accent-primary/10' : 'text-text-tertiary cursor-not-allowed'}`}
            onClick={handleMoveDown}
            disabled={!canMoveDown}
          >
            <ArrowDownIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
      <td className="p-4">
        <div className="w-10 h-10">
          {professional.photo_url && !imageError ? (
            <Avatar
              src={professional.photo_url}
              alt={professional.full_name}
              className="w-10 h-10"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center">
              <Typography className="text-text-secondary text-sm font-medium">
                {initials}
              </Typography>
            </div>
          )}
        </div>
      </td>
      <td className="p-4">
        <Typography className="text-text-primary font-medium">
          {professional.full_name || 'Nome não informado'}
        </Typography>
      </td>
      <td className="p-4">
        <Typography className="text-text-primary">
          {professional.email}
        </Typography>
      </td>
      <td className="p-4">
        <div className="flex flex-wrap gap-1">
          {serviceTags.length > 0 ? (
            serviceTags.map((service, idx) => (
              <span 
                key={service.id || idx} 
                className="inline-block px-2 py-1 text-xs bg-accent-primary/10 text-accent-primary rounded-md border border-accent-primary/20"
              >
                {service.name}
              </span>
            ))
          ) : (
            <Typography className="text-text-tertiary text-sm">
              Nenhum serviço
            </Typography>
          )}
        </div>
      </td>
      <td className="p-4">
        <Badge 
          color={professional.is_active ? "green" : "orange"}
          className="text-xs"
        >
          {professional.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outlined"
            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-2"
            onClick={handleEdit}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outlined"
            className="border-status-error text-status-error hover:bg-status-error/10 p-2"
            onClick={handleDelete}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

export default function ProfessionalsPage() {
  const { navigate } = useNavigation();
  
  // State management
  const [professionals, setProfessionals] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, professional: null });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Load data on component mount
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      try {
        await Promise.all([
          loadProfessionals(),
          loadAllServices()
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

  const handleDeleteProfessional = useCallback((professional) => {
    setDeleteDialog({ open: true, professional });
  }, []);

  const confirmDeleteProfessional = async () => {
    try {
      await professionalsApi.delete(deleteDialog.professional.id);
      showAlert('Profissional excluído com sucesso!', 'success');
      loadProfessionals(); // Reload professionals list
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      const message = error.response?.data?.detail || 'Falha ao excluir profissional';
      showAlert(message, 'error');
    } finally {
      setDeleteDialog({ open: false, professional: null });
    }
  };

  const handleMoveProfessionalUp = useCallback(async (professionalId) => {
    const currentIndex = professionals.findIndex(p => p.id === professionalId);
    if (currentIndex <= 0) return;

    // Create a copy of professionals array for local update
    const updatedProfessionals = [...professionals];
    
    // Move the professional up by swapping positions
    [updatedProfessionals[currentIndex], updatedProfessionals[currentIndex - 1]] = 
    [updatedProfessionals[currentIndex - 1], updatedProfessionals[currentIndex]];

    // Update local state immediately for better UX
    setProfessionals(updatedProfessionals);

    try {
      // Reassign display_order values based on new positions to ensure uniqueness
      const orderUpdates = updatedProfessionals.map((prof, index) => ({
        professional_id: prof.id,
        display_order: index + 1
      }));

      // Update on server with new sequential ordering
      await professionalsApi.updateOrder(orderUpdates);
      showAlert('Ordem atualizada com sucesso!', 'success');
      // Reload data to sync with server and show correct ordering
      await loadProfessionals();
    } catch (error) {
      console.error('Error updating order:', error);
      showAlert('Erro ao atualizar ordem', 'error');
      // Reload data to sync with server
      await loadProfessionals();
    }
  }, [professionals, loadProfessionals]);

  const handleMoveProfessionalDown = useCallback(async (professionalId) => {
    const currentIndex = professionals.findIndex(p => p.id === professionalId);
    if (currentIndex >= professionals.length - 1) return;

    // Create a copy of professionals array for local update
    const updatedProfessionals = [...professionals];
    
    // Move the professional down by swapping positions
    [updatedProfessionals[currentIndex], updatedProfessionals[currentIndex + 1]] = 
    [updatedProfessionals[currentIndex + 1], updatedProfessionals[currentIndex]];

    // Update local state immediately for better UX
    setProfessionals(updatedProfessionals);

    try {
      // Reassign display_order values based on new positions to ensure uniqueness
      const orderUpdates = updatedProfessionals.map((prof, index) => ({
        professional_id: prof.id,
        display_order: index + 1
      }));

      // Update on server with new sequential ordering
      await professionalsApi.updateOrder(orderUpdates);
      showAlert('Ordem atualizada com sucesso!', 'success');
      // Reload data to sync with server and show correct ordering
      await loadProfessionals();
    } catch (error) {
      console.error('Error updating order:', error);
      showAlert('Erro ao atualizar ordem', 'error');
      // Reload data to sync with server
      await loadProfessionals();
    }
  }, [professionals, loadProfessionals]);

  const getServiceTags = useCallback((professional) => {
    return professional.services_offered || [];
  }, []);

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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-center p-4 text-text-primary font-semibold">Ordem</th>
                    <th className="text-center p-4 text-text-primary font-semibold">Reordenar</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Foto</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Nome Completo</th>
                    <th className="text-left p-4 text-text-primary font-semibold">E-mail</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Serviços</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Status</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfessionals.map((professional, index) => (
                    <ProfessionalRow
                      key={professional.id}
                      professional={professional}
                      index={index}
                      onEdit={handleEditProfessional}
                      onDelete={handleDeleteProfessional}
                      onMoveUp={handleMoveProfessionalUp}
                      onMoveDown={handleMoveProfessionalDown}
                      canMoveUp={index > 0}
                      canMoveDown={index < filteredProfessionals.length - 1}
                      getServiceTags={getServiceTags}
                      getInitials={getInitials}
                    />
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
        handler={() => setDeleteDialog({ open: false, professional: null })}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir o profissional "{deleteDialog.professional?.full_name || deleteDialog.professional?.email}"? 
          Esta ação não pode ser desfeita.
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, professional: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteProfessional}
            className="bg-status-error hover:bg-status-error/90"
          >
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}