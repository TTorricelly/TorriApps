import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Select,
  Option,
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

import { professionalsApi } from '../../Services/professionals';
import { servicesApi } from '../../Services/services';
import { MultiSelect } from '../../Components';

export default function ProfessionalsPage() {
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, professional: null });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const users = await professionalsApi.getAll();
      const servicesData = await servicesApi.getAll();

      const professionalsOnly = users.filter(u => u.role === 'PROFISSIONAL');
      setProfessionals(professionalsOnly);
      setServices(servicesData);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      showAlert('Erro ao carregar profissionais', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const professionalServicesMap = useMemo(() => {
    const map = {};
    services.forEach(service => {
      if (Array.isArray(service.professionals)) {
        service.professionals.forEach(pro => {
          if (!map[pro.id]) map[pro.id] = [];
          map[pro.id].push(service);
        });
      }
    });
    return map;
  }, [services]);

  const filteredProfessionals = useMemo(() => {
    return professionals.filter(pro => {
      const matchesName = pro.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? pro.is_active : !pro.is_active);
      const servicesOfPro = professionalServicesMap[pro.id] || [];
      const matchesService = serviceFilter.length === 0 || serviceFilter.some(id => servicesOfPro.some(s => s.id === id));
      return matchesName && matchesStatus && matchesService;
    });
  }, [professionals, searchQuery, statusFilter, serviceFilter, professionalServicesMap]);

  const handleEdit = (id) => {
    navigate(`edit/${id}`);
  };

  const handleDelete = (professional) => {
    setDeleteDialog({ open: true, professional });
  };

  const confirmDelete = async () => {
    try {
      await professionalsApi.delete(deleteDialog.professional.id);
      showAlert('Profissional excluído com sucesso', 'success');
      setDeleteDialog({ open: false, professional: null });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      showAlert('Erro ao excluir profissional', 'error');
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  return (
    <div className="p-l space-y-l">
      <Card className="bg-bg-secondary text-text-primary">
        <CardHeader floated={false} shadow={false} className="rounded-none p-l flex justify-between items-center">
          <div className="flex items-center gap-m">
            <Input
              label="Buscar por nome"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<MagnifyingGlassIcon className="h-5 w-5 text-text-secondary" />}
            />
            <Select label="Status" value={statusFilter} onChange={(val) => setStatusFilter(val)} className="min-w-32">
              <Option value="all">Todos</Option>
              <Option value="active">Ativos</Option>
              <Option value="inactive">Inativos</Option>
            </Select>
            <MultiSelect
              label="Serviços"
              options={services.map(s => ({ value: s.id, label: s.name }))}
              value={serviceFilter}
              onChange={setServiceFilter}
              className="min-w-40"
            />
          </div>
          <Button color="blue" onClick={() => navigate('create')}>+ Novo Profissional</Button>
        </CardHeader>
        <CardBody className="p-0">
          {alert.show && (
            <Alert color={alert.type === 'error' ? 'red' : 'green'} className="mb-m">
              {alert.message}
            </Alert>
          )}
          {isLoading ? (
            <div className="flex justify-center p-l"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">E-mail</th>
                    <th className="p-4">Serviços</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfessionals.map(pro => (
                    <tr key={pro.id} className="border-t border-bg-tertiary hover:bg-bg-tertiary cursor-pointer">
                      <td className="p-4">{pro.full_name}</td>
                      <td className="p-4">{pro.email}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(professionalServicesMap[pro.id] || []).map(s => (
                            <span key={s.id} className="bg-bg-tertiary px-2 py-1 rounded text-xs">{s.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge color={pro.is_active ? 'green' : 'orange'} className="text-xs">
                          {pro.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outlined" className="border-accent-primary text-accent-primary p-2" onClick={() => handleEdit(pro.id)}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outlined" className="border-status-error text-status-error p-2" onClick={() => handleDelete(pro)}>
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

      <Dialog open={deleteDialog.open} handler={() => setDeleteDialog({ open: false, professional: null })} className="bg-bg-secondary border-bg-tertiary">
        <DialogHeader className="text-text-primary">Confirmar Exclusão</DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir o profissional "{deleteDialog.professional?.full_name}"?
          Esta ação não pode ser desfeita.
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button variant="outlined" onClick={() => setDeleteDialog({ open: false, professional: null })} className="border-bg-tertiary text-text-primary hover:bg-bg-primary">Cancelar</Button>
          <Button onClick={confirmDelete} className="bg-status-error hover:bg-status-error/90">Confirmar Exclusão</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
