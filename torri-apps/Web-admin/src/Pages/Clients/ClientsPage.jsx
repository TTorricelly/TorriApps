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
  MagnifyingGlassIcon,
  UserIcon,
  TrashIcon // Added TrashIcon
} from '@heroicons/react/24/outline';

import { clientsApi } from '../../Services/clients.js';
import { formatCpf, formatAddressCompact } from '../../Utils/brazilianFormatters';
// import { servicesApi } from '../../Services/services'; // Removed as service filter is not used

function ClientsPage() { // Renamed component and removed default export from here
  const navigate = useNavigate();

  // State management
  const [clients, setClients] = useState([]); // Renamed state
  // const [allServices, setAllServices] = useState([]); // Removed
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, client: null }); // Added deleteDialog state

  // Load data on component mount
  useEffect(() => {
    // Promise.all([ // Removed Promise.all as only one data source is loaded
    loadClients();
    // loadAllServices() // Removed
    // ]);
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const data = await clientsApi.getAllClients();
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      showAlert('Erro ao carregar clientes. Verifique a consola para mais detalhes.', 'error'); // Updated alert message
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // const loadAllServices = async () => { // Removed function
  //   try {
  //     // Get all services from all categories for filtering
  //     const data = await servicesApi.getAllServices();
  //     setAllServices(data);
  //   } catch (error) {
  //     console.error('Erro ao carregar serviços:', error);
  //     // Don't show error for services as it's not critical for main functionality
  //   }
  // };

  const handleDeleteClient = (client) => {
    setDeleteDialog({ open: true, client });
  };

  const confirmDeleteClient = async () => {
    if (!deleteDialog.client) return;

    try {
      await clientsApi.deleteClient(deleteDialog.client.id);
      showAlert('Cliente excluído com sucesso!', 'success');
      loadClients(); // Reload clients list
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      const message = error.response?.data?.detail || 'Falha ao excluir cliente';
      showAlert(message, 'error');
    } finally {
      setDeleteDialog({ open: false, client: null });
    }
  };

  // Filter clients based on search query and status
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by search query (name, email, or CPF)
    if (searchQuery.trim()) {
      filtered = filtered.filter(client => // Changed variable name
        client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.cpf?.replace(/\D/g, '').includes(searchQuery.replace(/\D/g, ''))
      );
    }

    // Filter by status
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(client => client.is_active === isActive); // Changed variable name
    }

    // Filter by services (if professional has any of the selected services)
    // if (serviceFilter.length > 0) { // Removed service filter logic
    //   filtered = filtered.filter(professional => {
    //     // This would need to be implemented based on how services are associated with professionals
    //     // For now, we'll skip this filter until the backend provides this data
    //     return true;
    //   });
    // }

    return filtered;
  }, [clients, searchQuery, statusFilter]); // Updated dependencies

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  // const handleCreateProfessional = () => { // Removed function
  //   navigate('/professionals/create');
  // };

  // const handleEditProfessional = (professionalId) => { // Removed function
  //   navigate(`/professionals/edit/${professionalId}`);
  // };

  // const handleDeleteProfessional = (professional) => { // Removed function
  //   setDeleteDialog({ open: true, professional });
  // };

  // const confirmDeleteProfessional = async () => { // Removed function
  //   try {
  //     await professionalsApi.delete(deleteDialog.professional.id);
  //     showAlert('Profissional excluído com sucesso!', 'success');
  //     loadProfessionals(); // Reload professionals list
  //   } catch (error) {
  //     console.error('Erro ao excluir profissional:', error);
  //     const message = error.response?.data?.detail || 'Falha ao excluir profissional';
  //     showAlert(message, 'error');
  //   } finally {
  //     setDeleteDialog({ open: false, professional: null });
  //   }
  // };

  // const getServiceTags = (professional) => { // Removed function
  //   // Return services from the professional object
  //   return professional.services_offered || [];
  // };

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
                Clientes
              </Typography>
            </div>
            <Button
              className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
              onClick={() => navigate('/clients/create')}
            >
              <PlusIcon className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Pesquisar por nome, email ou CPF..."
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
                  className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50",
                  style: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', zIndex: 9999 }
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

            {/* Service Filter Removed */}
          </div>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          {filteredClients.length === 0 ? ( // Use filteredClients
            <div className="text-center py-12">
              <Typography className="text-text-secondary mb-4">
                {searchQuery || statusFilter
                  ? 'Nenhum cliente encontrado com os filtros aplicados' // Updated message
                  : 'Nenhum cliente cadastrado ainda' // Updated message
                }
              </Typography>
              {/* Removed "Criar Primeiro Profissional" button as there's no "Novo Cliente" button */}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-left p-4 text-text-primary font-semibold">Foto</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Nome Completo</th>
                    <th className="text-left p-4 text-text-primary font-semibold">E-mail</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Telefone</th>
                    <th className="text-left p-4 text-text-primary font-semibold">CPF</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Endereço</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Status</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client, index) => (
                    <tr
                      key={client.id}
                      className={`border-b border-bg-tertiary hover:bg-bg-primary/50 cursor-pointer ${
                        index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
                      }`}
                      onClick={() => navigate(`/clients/edit/${client.id}`)}
                    >
                      <td className="p-4">
                        <div className="w-10 h-10">
                          {client.photo_url ? ( // Use client
                            <Avatar
                              src={client.photo_url} // Use client
                              alt={client.full_name} // Use client
                              className="w-10 h-10"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center">
                              <Typography className="text-text-secondary text-sm font-medium">
                                {getInitials(client.full_name)} {/* Use client */}
                              </Typography>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary font-medium">
                          {client.full_name || 'Nome não informado'} {/* Use client */}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary">
                          {client.email} {/* Use client */}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary">
                          {client.phone_number || 'Não informado'}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary">
                          {client.cpf ? formatCpf(client.cpf) : 'Não informado'}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-primary text-sm">
                          {client.address_street || client.address_city || client.address_cep ? 
                            formatAddressCompact(client) : 'Não informado'
                          }
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Badge
                          color={client.is_active ? "green" : "orange"}
                          className="text-xs"
                        >
                          {client.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-status-error text-status-error hover:bg-status-error/10 p-2"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleDeleteClient(client);
                            }}
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
        handler={() => setDeleteDialog({ open: false, client: null })}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir o cliente "{deleteDialog.client?.full_name || deleteDialog.client?.email}"?
          Esta ação não pode ser desfeita.
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, client: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteClient}
            className="bg-status-error hover:bg-status-error/90"
          >
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default ClientsPage;
