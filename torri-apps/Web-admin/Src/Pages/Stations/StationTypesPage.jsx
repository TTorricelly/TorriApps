import React, { useState, useEffect, useMemo } from 'react';
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
} from '@material-tailwind/react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

import { stationTypesApi } from '../../Services/stations';

export default function StationTypesPage() {
  // State management
  const [stationTypes, setStationTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, stationType: null });
  const [editDialog, setEditDialog] = useState({ open: false, stationType: null, isCreate: false });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Form state
  const [formData, setFormData] = useState({
    name: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load station types on component mount
  useEffect(() => {
    loadStationTypes();
  }, []);

  const loadStationTypes = async () => {
    try {
      setIsLoading(true);
      const data = await stationTypesApi.getAll();
      setStationTypes(data);
    } catch (error) {
      console.error('[StationTypesPage] Error loading station types:', error);
      showAlert('Erro ao carregar tipos de estação', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter station types based on search query
  const filteredStationTypes = useMemo(() => {
    if (!searchQuery.trim()) return stationTypes;
    
    return stationTypes.filter(stationType =>
      stationType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stationType.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stationTypes, searchQuery]);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleCreateStationType = () => {
    setFormData({ name: '' });
    setFormErrors({});
    setEditDialog({ open: true, stationType: null, isCreate: true });
  };

  const handleEditStationType = (stationType) => {
    setFormData({
      name: stationType.name
    });
    setFormErrors({});
    setEditDialog({ open: true, stationType, isCreate: false });
  };

  const handleDeleteStationType = async (stationType) => {
    setDeleteDialog({ open: true, stationType });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      
      if (editDialog.isCreate) {
        await stationTypesApi.create(formData);
        showAlert('Tipo de estação criado com sucesso!', 'success');
      } else {
        await stationTypesApi.update(editDialog.stationType.id, formData);
        showAlert('Tipo de estação atualizado com sucesso!', 'success');
      }
      
      loadStationTypes();
      setEditDialog({ open: false, stationType: null, isCreate: false });
    } catch (error) {
      console.error('Erro ao salvar tipo de estação:', error);
      const message = error.response?.data?.detail || 'Falha ao salvar tipo de estação';
      showAlert(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteStationType = async () => {
    try {
      await stationTypesApi.delete(deleteDialog.stationType.id);
      showAlert('Tipo de estação excluído com sucesso!', 'success');
      loadStationTypes();
    } catch (error) {
      console.error('Erro ao excluir tipo de estação:', error);
      const message = error.response?.data?.detail || 'Falha ao excluir tipo de estação';
      showAlert(message, 'error');
    } finally {
      setDeleteDialog({ open: false, stationType: null });
    }
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
                Tipos de Estação
              </Typography>
              <Typography className="text-text-secondary mt-1">
                Gerencie os tipos de recursos necessários para os serviços
              </Typography>
            </div>
            
            <Button
              className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
              onClick={handleCreateStationType}
            >
              <PlusIcon className="h-4 w-4" />
              Adicionar Tipo
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 max-w-md">
            <Input
              type="text"
              placeholder="Pesquisar tipos de estação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
              icon={<MagnifyingGlassIcon className="h-5 w-5 text-text-tertiary" />}
            />
          </div>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          {filteredStationTypes.length === 0 ? (
            <div className="text-center py-12">
              <Typography className="text-text-secondary mb-4">
                {searchQuery 
                  ? 'Nenhum tipo de estação encontrado'
                  : 'Nenhum tipo de estação cadastrado'
                }
              </Typography>
              {!searchQuery && (
                <Button
                  className="bg-accent-primary hover:bg-accent-primary/90"
                  onClick={handleCreateStationType}
                >
                  Criar Primeiro Tipo
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-left p-4 text-text-primary font-semibold">Nome</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Código</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Estações</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStationTypes.map((stationType, index) => (
                    <tr 
                      key={stationType.id} 
                      className={`border-b border-bg-tertiary hover:bg-bg-primary/50 ${
                        index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
                      }`}
                    >
                      <td className="p-4">
                        <Typography className="text-text-primary font-medium">
                          {stationType.name}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-secondary font-mono text-sm">
                          {stationType.code}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Badge color="blue" className="text-xs">
                          {stationType.stations?.length || 0} estação(ões)
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-2"
                            onClick={() => handleEditStationType(stationType)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-status-error text-status-error hover:bg-status-error/10 p-2"
                            onClick={() => handleDeleteStationType(stationType)}
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

      {/* Edit/Create Dialog */}
      <Dialog
        open={editDialog.open}
        handler={() => setEditDialog({ open: false, stationType: null, isCreate: false })}
        className="bg-bg-secondary border-bg-tertiary"
        size="md"
      >
        <DialogHeader className="text-text-primary">
          {editDialog.isCreate ? 'Criar Tipo de Estação' : 'Editar Tipo de Estação'}
        </DialogHeader>
        <DialogBody className="text-text-primary">
          <div className="flex flex-col gap-4">
            <div>
              <Input
                label="Nome do Tipo de Estação"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                error={!!formErrors.name}
                placeholder="Ex: Cadeira de Corte, Mesa de Manicure, Sala de Spa"
              />
              {formErrors.name && (
                <Typography className="text-status-error text-sm mt-1">
                  {formErrors.name}
                </Typography>
              )}
              <Typography className="text-text-tertiary text-xs mt-1">
                Um código único será gerado automaticamente baseado no nome
              </Typography>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setEditDialog({ open: false, stationType: null, isCreate: false })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitForm}
            className="bg-accent-primary hover:bg-accent-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner className="h-4 w-4" /> : (editDialog.isCreate ? 'Criar' : 'Salvar')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        handler={() => setDeleteDialog({ open: false, stationType: null })}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir o tipo de estação "{deleteDialog.stationType?.name}"? 
          Esta ação não pode ser desfeita e irá remover todas as estações deste tipo.
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, stationType: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteStationType}
            className="bg-status-error hover:bg-status-error/90"
          >
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}