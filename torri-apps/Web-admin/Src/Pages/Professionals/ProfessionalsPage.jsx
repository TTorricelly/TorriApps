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
  Avatar,
} from '@material-tailwind/react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon
} from '@heroicons/react/24/outline';

import { professionalsApi } from '../../Services/professionals';
import { servicesApi } from '../../Services/services';

export default function ProfessionalsPage() {
  const navigate = useNavigate();
  
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
    Promise.all([
      loadProfessionals(),
      loadAllServices()
    ]);
  }, []);

  const loadProfessionals = async () => {
    try {
      setIsLoading(true);
      const data = await professionalsApi.getAll();
      setProfessionals(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      showAlert('Erro ao carregar profissionais', 'error');
      setProfessionals([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllServices = async () => {
    try {
      // Get all services from all categories for filtering
      const data = await servicesApi.getAllServices();
      setAllServices(data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      // Don't show error for services as it's not critical for main functionality
    }
  };

  // Filter professionals based on search query, status, and services
  const filteredProfessionals = useMemo(() => {
    let filtered = professionals;

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
    navigate('/professionals/create');
  };

  const handleEditProfessional = (professionalId) => {
    navigate(`/professionals/edit/${professionalId}`);
  };

  const handleDeleteProfessional = (professional) => {
    setDeleteDialog({ open: true, professional });
  };

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

  const getServiceTags = (professional) => {
    // Return services from the professional object
    return professional.services_offered || [];
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
            {allServices.length > 0 && (
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
                  {allServices.map((service) => (
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
                    <tr 
                      key={professional.id} 
                      className={`border-b border-bg-tertiary hover:bg-bg-primary/50 cursor-pointer ${
                        index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
                      }`}
                      onClick={() => handleEditProfessional(professional.id)}
                    >
                      <td className="p-4">
                        <div className="w-10 h-10">
                          {professional.photo_url ? (
                            <Avatar
                              src={professional.photo_url}
                              alt={professional.full_name}
                              className="w-10 h-10"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center">
                              <Typography className="text-text-secondary text-sm font-medium">
                                {getInitials(professional.full_name)}
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
                          {getServiceTags(professional).length > 0 ? (
                            getServiceTags(professional).map((service, idx) => (
                              <span 
                                key={idx} 
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
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-2"
                            onClick={() => handleEditProfessional(professional.id)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-status-error text-status-error hover:bg-status-error/10 p-2"
                            onClick={() => handleDeleteProfessional(professional)}
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