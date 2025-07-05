import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  MagnifyingGlassIcon,
  UserIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

import { usersApi } from '../../Services/users.js';

function UsersPage() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  // State management
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  // Load data on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    // Prevent duplicate calls
    if (isLoading) {
      console.log('⏳ Already loading users, skipping duplicate call');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🔍 Loading users from API...');
      const userData = await usersApi.getAllUsers();
      console.log('📋 Received users data:', userData);
      console.log(`📊 Total users found: ${userData?.length || 0}`);
      setUsers(userData || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showAlert('Erro ao carregar usuários', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;

    try {
      await usersApi.deleteUser(deleteDialog.user.id);
      await loadUsers();
      showAlert('Usuário excluído com sucesso!');
      setDeleteDialog({ open: false, user: null });
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert('Erro ao excluir usuário', 'error');
    }
  };

  // Filter users based on search query, role, and status
  const filteredUsers = useMemo(() => {
    // If search query is less than 3 characters and no other filters, show no users
    if ((!searchQuery || searchQuery.trim().length < 3) && !roleFilter && !statusFilter) {
      return [];
    }
    
    return users.filter(user => {
      const matchesSearch = !searchQuery || searchQuery.trim().length < 3 || 
                           user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || 
                           (statusFilter === 'active' && user.is_active) ||
                           (statusFilter === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const getRoleBadgeColor = (role) => {
    const roleColors = {
      'GESTOR': 'purple',
      'ATENDENTE': 'blue',
      'PROFISSIONAL': 'green',
      'CLIENTE': 'gray'
    };
    return roleColors[role] || 'gray';
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'GESTOR': 'Gestor',
      'ATENDENTE': 'Atendente',
      'PROFISSIONAL': 'Profissional',
      'CLIENTE': 'Cliente'
    };
    return roleNames[role] || role;
  };


  return (
    <div className="p-6">
      {alert.show && (
        <Alert
          color={alert.type === 'error' ? 'red' : 'green'}
          className="mb-6 fixed top-4 right-4 z-50 max-w-md"
          onClose={() => setAlert({ show: false, message: '', type: 'success' })}
          dismissible
        >
          {alert.message}
        </Alert>
      )}

      <Card className="bg-bg-secondary">
        <CardHeader floated={false} shadow={false} className="bg-bg-secondary overflow-visible">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Typography variant="h5" color="blue-gray" className="text-text-primary">
                Usuários
              </Typography>
              <Typography color="gray" className="mt-1 font-normal text-text-secondary">
                Gerencie todos os usuários do sistema
              </Typography>
            </div>
            <Button
              className="flex items-center gap-3 bg-accent-primary hover:bg-accent-primary/90"
              size="sm"
              onClick={() => navigate(`/${tenantSlug}/settings/users/create`)}
            >
              <PlusIcon strokeWidth={2} className="h-4 w-4" />
              Novo Usuário
            </Button>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center overflow-visible">
            <div className="flex-1">
              <Input
                label="Buscar usuários..."
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
            </div>
            <div className="w-full md:w-48 relative z-10">
              <Select 
                label="Filtrar por função"
                value={roleFilter}
                onChange={(value) => setRoleFilter(value)}
                className="bg-bg-primary"
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
                <Option value="" className="text-white hover:bg-bg-tertiary">Todas as funções</Option>
                <Option value="GESTOR" className="text-white hover:bg-bg-tertiary">Gestor</Option>
                <Option value="ATENDENTE" className="text-white hover:bg-bg-tertiary">Atendente</Option>
                <Option value="PROFISSIONAL" className="text-white hover:bg-bg-tertiary">Profissional</Option>
                <Option value="CLIENTE" className="text-white hover:bg-bg-tertiary">Cliente</Option>
              </Select>
            </div>
            <div className="w-full md:w-48 relative z-10">
              <Select 
                label="Filtrar por status"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                className="bg-bg-primary"
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
                <Option value="" className="text-white hover:bg-bg-tertiary">Todos os status</Option>
                <Option value="active" className="text-white hover:bg-bg-tertiary">Ativo</Option>
                <Option value="inactive" className="text-white hover:bg-bg-tertiary">Inativo</Option>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardBody className="overflow-scroll px-0 bg-bg-secondary">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <table className="w-full min-w-max table-auto text-left">
              <thead>
                <tr>
                  <th className="border-y border-border-primary bg-bg-tertiary p-4">
                    <Typography variant="small" color="white" className="font-normal leading-none">
                      Usuário
                    </Typography>
                  </th>
                  <th className="border-y border-border-primary bg-bg-tertiary p-4">
                    <Typography variant="small" color="white" className="font-normal leading-none">
                      Email
                    </Typography>
                  </th>
                  <th className="border-y border-border-primary bg-bg-tertiary p-4">
                    <Typography variant="small" color="white" className="font-normal leading-none">
                      Função
                    </Typography>
                  </th>
                  <th className="border-y border-border-primary bg-bg-tertiary p-4">
                    <Typography variant="small" color="white" className="font-normal leading-none">
                      Status
                    </Typography>
                  </th>
                  <th className="border-y border-border-primary bg-bg-tertiary p-4">
                    <Typography variant="small" color="white" className="font-normal leading-none">
                      Ações
                    </Typography>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const isLast = index === filteredUsers.length - 1;
                  const classes = isLast ? "p-4" : "p-4 border-b border-blue-gray-50";

                  return (
                    <tr key={user.id} className="hover:bg-bg-primary/50">
                      <td className={classes}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-gray-50 rounded-full flex items-center justify-center border border-blue-gray-50">
                            <UserIcon className="h-5 w-5 text-blue-gray-500" />
                          </div>
                          <div>
                            <Typography variant="small" color="blue-gray" className="font-normal text-text-primary">
                              {user.full_name || 'Nome não informado'}
                            </Typography>
                            {user.phone_number && (
                              <Typography variant="small" color="blue-gray" className="font-normal opacity-70">
                                {user.phone_number}
                              </Typography>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={classes}>
                        <Typography variant="small" color="blue-gray" className="font-normal text-text-primary">
                          {user.email}
                        </Typography>
                      </td>
                      <td className={classes}>
                        <Badge
                          color={getRoleBadgeColor(user.role)}
                          value={getRoleDisplayName(user.role)}
                          className="text-xs"
                        />
                      </td>
                      <td className={classes}>
                        <Badge
                          color={user.is_active ? 'green' : 'red'}
                          value={user.is_active ? 'Ativo' : 'Inativo'}
                          variant="ghost"
                        />
                      </td>
                      <td className={classes}>
                        <div className="flex gap-2">
                          <Button
                            variant="text"
                            size="sm"
                            className="text-accent-primary hover:bg-accent-primary/10"
                            onClick={() => navigate(`/${tenantSlug}/settings/users/edit/${user.id}`)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="text"
                            size="sm"
                            className="text-status-error hover:bg-red-50"
                            onClick={() => setDeleteDialog({ open: true, user })}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              {(searchQuery || roleFilter || statusFilter) && (
                <>
                  <UserIcon className="h-12 w-12 text-blue-gray-300 mb-4" />
                  <Typography color="blue-gray" className="text-center">
                    Nenhum usuário encontrado
                  </Typography>
                  <Typography color="blue-gray" className="text-center text-sm mt-1 opacity-70">
                    Tente ajustar os filtros de busca
                  </Typography>
                </>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} handler={() => setDeleteDialog({ open: false, user: null })}>
        <DialogHeader>Confirmar Exclusão</DialogHeader>
        <DialogBody>
          Tem certeza que deseja excluir o usuário <strong>{deleteDialog.user?.full_name || deleteDialog.user?.email}</strong>? 
          Esta ação não pode ser desfeita.
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setDeleteDialog({ open: false, user: null })}
            className="mr-2"
          >
            Cancelar
          </Button>
          <Button
            variant="gradient"
            color="red"
            onClick={handleDeleteUser}
          >
            Excluir
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default UsersPage;