import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigation } from '../../shared/hooks/useNavigation';
import { ROUTES } from '../../shared/navigation';
import { getClientDisplayName, clientNameMatchesSearch } from '../../Utils/clientUtils';
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
import { labelsApi } from '../../Services/labels.js';
import ClientLabels from '../../Components/Clients/ClientLabels.jsx';
import BulkLabelAssignment from '../../Components/Clients/BulkLabelAssignment.jsx';
// import { servicesApi } from '../../Services/services'; // Removed as service filter is not used

function ClientsPage() { // Renamed component and removed default export from here
  const { navigate } = useNavigation();

  // State management
  const [clients, setClients] = useState([]); // Renamed state
  // const [allServices, setAllServices] = useState([]); // Removed
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availableLabels, setAvailableLabels] = useState([]);
  const [selectedLabelFilters, setSelectedLabelFilters] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, client: null }); // Added deleteDialog state

  // Load labels on component mount (but not clients)
  useEffect(() => {
    loadAvailableLabels();
  }, []);


  // Add search effect with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadClients(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadClients = async (searchQuery = '') => {
    // Prevent duplicate calls
    if (isLoading) {
      console.log('⏳ Already loading clients, skipping duplicate call');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🔍 Loading clients from API...', { searchQuery });
      
      // Only search if there's a query, otherwise show empty results
      const data = searchQuery ? await clientsApi.searchClients(searchQuery) : [];
      
      console.log('📋 Received clients data:', data);
      console.log(`📊 Total clients found: ${data?.length || 0}`);
      
      // Validate client data integrity
      if (data && Array.isArray(data)) {
        const clientsWithoutIds = data.filter(client => !client || !client.id);
        if (clientsWithoutIds.length > 0) {
          console.warn('Some clients have invalid IDs and will be filtered out');
        }
      }
      
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      showAlert('Erro ao carregar clientes. Verifique a consola para mais detalhes.', 'error');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableLabels = async () => {
    try {
      const response = await labelsApi.getAll({ limit: 100, is_active: true });
      setAvailableLabels(response.items || []);
    } catch (error) {
      console.error('Erro ao carregar labels:', error);
      // Don't show error for labels as it's not critical for main functionality
    }
  };

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


  // Filter clients based on status and labels (search is now server-side)
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply status filter
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(client => client.is_active === isActive);
    }

    // Apply label filters
    if (selectedLabelFilters.length > 0) {
      filtered = filtered.filter(client => {
        const clientLabels = client.labels || [];
        return selectedLabelFilters.some(filterLabel => 
          clientLabels.some(clientLabel => clientLabel.id === filterLabel.id)
        );
      });
    }

    return filtered;
  }, [clients, statusFilter, selectedLabelFilters]);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const updateClientInList = (updatedClient) => {
    setClients(prev => prev.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    ));
  };

  const handleClientSelect = (clientId, checked) => {
    // Add validation to prevent undefined IDs
    if (!clientId) {
      console.error('Attempted to select client with undefined ID');
      return;
    }
    
    if (checked) {
      setSelectedClientIds(prev => [...prev, clientId]);
    } else {
      setSelectedClientIds(prev => prev.filter(id => id !== clientId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      // Filter out any clients without valid IDs
      const validClientIds = filteredClients
        .filter(client => client && client.id && typeof client.id === 'string')
        .map(client => client.id);
        
      setSelectedClientIds(validClientIds);
    } else {
      setSelectedClientIds([]);
    }
  };

  const handleBulkComplete = () => {
    setSelectedClientIds([]);
    loadClients(); // Reload to get updated data
    showAlert('Labels atualizados em lote com sucesso!', 'success');
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
            <div className="flex gap-2">
              {selectedClientIds.length > 0 && (
                <BulkLabelAssignment
                  selectedClients={selectedClientIds}
                  onComplete={handleBulkComplete}
                />
              )}
              
              <Button
                className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
                onClick={() => navigate(ROUTES.CLIENTS.CREATE)}
              >
                <PlusIcon className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end mb-8">
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
              <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-bg-tertiary text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              >
                <option value="">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            {/* Label Filter */}
            <div className="min-w-[200px] relative">
              <label className="block text-sm font-medium text-text-secondary mb-1">Filtrar por preferências</label>
              <select
                value={selectedLabelFilters.length > 0 ? selectedLabelFilters[0]?.id || '' : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const label = availableLabels.find(l => l.id === value);
                    if (label) {
                      setSelectedLabelFilters([label]);
                    }
                  } else {
                    setSelectedLabelFilters([]);
                  }
                }}
                className="w-full px-3 py-2 bg-bg-primary border border-bg-tertiary text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              >
                <option value="">Todas as preferências</option>
                {availableLabels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              {!searchQuery ? (
                <div>
                  <MagnifyingGlassIcon className="h-16 w-16 mx-auto text-text-tertiary mb-4" />
                  <Typography className="text-text-secondary mb-2">
                    Digite para pesquisar clientes
                  </Typography>
                  <Typography className="text-text-tertiary text-sm">
                    Use o campo de busca acima para encontrar clientes por nome, email ou CPF
                  </Typography>
                </div>
              ) : (
                <div>
                  <UserIcon className="h-16 w-16 mx-auto text-text-tertiary mb-4" />
                  <Typography className="text-text-secondary mb-4">
                    Nenhum cliente encontrado com os filtros aplicados
                  </Typography>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-left p-4 text-text-primary font-semibold w-12">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-bg-tertiary"
                      />
                    </th>
                    <th className="text-left p-4 text-text-primary font-semibold">Foto</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Nome Completo</th>
                    <th className="text-left p-4 text-text-primary font-semibold">E-mail</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Telefone</th>
                    <th className="text-left p-4 text-text-primary font-semibold">CPF</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Endereço</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Labels</th>
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
                      onClick={() => navigate(ROUTES.CLIENTS.EDIT(client.id))}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedClientIds.includes(client.id)}
                          onChange={(e) => handleClientSelect(client.id, e.target.checked)}
                          className="rounded border-bg-tertiary"
                        />
                      </td>
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
                          {getClientDisplayName(client, 'selection') || 'Nome não informado'} {/* Use client */}
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
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <ClientLabels 
                          client={client} 
                          editable={false}
                          onUpdate={updateClientInList}
                        />
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
