import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
} from '@material-tailwind/react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

import { stationTypesApi, stationsApi } from '../../Services/stations';

export default function StationsPage() {
  // State management
  const [stationTypes, setStationTypes] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [showInactiveStations, setShowInactiveStations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, station: null });
  const [editDialog, setEditDialog] = useState({ open: false, station: null, isCreate: false });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Form state
  const [formData, setFormData] = useState({
    type_id: '',
    label: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load station types on component mount
  useEffect(() => {
    loadStationTypes();
  }, []);

  // Load stations when filters change
  useEffect(() => {
    loadStations();
  }, [selectedTypeId, showInactiveStations]);

  const loadStationTypes = async () => {
    try {
      setIsLoadingTypes(true);
      const data = await stationTypesApi.getAll();
      setStationTypes(data);
    } catch (error) {
      console.error('[StationsPage] Error loading station types:', error);
      showAlert('Erro ao carregar tipos de estação', 'error');
    } finally {
      setIsLoadingTypes(false);
    }
  };

  const loadStations = async () => {
    try {
      setIsLoadingStations(true);
      const data = await stationsApi.getAll(
        selectedTypeId || null, 
        !showInactiveStations // activeOnly = !showInactiveStations
      );
      setStations(data);
    } catch (error) {
      console.error('[StationsPage] Error loading stations:', error);
      showAlert('Erro ao carregar estações', 'error');
    } finally {
      setIsLoadingStations(false);
    }
  };

  // Filter stations based on search query
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    
    return stations.filter(station =>
      station.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.station_type?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stations, searchQuery]);

  const selectedType = stationTypes.find(type => type.id === selectedTypeId);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleTypeChange = (typeId) => {
    setSelectedTypeId(typeId);
    setSearchQuery(''); // Clear search when changing type
  };

  const handleCreateStation = () => {
    if (stationTypes.length === 0) {
      showAlert('Crie um tipo de estação antes de adicionar estações', 'warning');
      return;
    }
    
    setFormData({
      type_id: selectedTypeId || stationTypes[0]?.id || '',
      label: '',
      is_active: true
    });
    setFormErrors({});
    setEditDialog({ open: true, station: null, isCreate: true });
  };

  const handleEditStation = (station) => {
    setFormData({
      type_id: station.type_id,
      label: station.label,
      is_active: station.is_active
    });
    setFormErrors({});
    setEditDialog({ open: true, station, isCreate: false });
  };

  const handleDeleteStation = async (station) => {
    setDeleteDialog({ open: true, station });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.type_id) {
      errors.type_id = 'Tipo de estação é obrigatório';
    }
    
    if (!formData.label.trim()) {
      errors.label = 'Nome da estação é obrigatório';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      
      if (editDialog.isCreate) {
        await stationsApi.create(formData);
        showAlert('Estação criada com sucesso!', 'success');
      } else {
        await stationsApi.update(editDialog.station.id, formData);
        showAlert('Estação atualizada com sucesso!', 'success');
      }
      
      loadStations();
      setEditDialog({ open: false, station: null, isCreate: false });
    } catch (error) {
      console.error('Erro ao salvar estação:', error);
      const message = error.response?.data?.detail || 'Falha ao salvar estação';
      showAlert(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteStation = async () => {
    try {
      await stationsApi.delete(deleteDialog.station.id);
      showAlert('Estação excluída com sucesso!', 'success');
      loadStations();
    } catch (error) {
      console.error('Erro ao excluir estação:', error);
      const message = error.response?.data?.detail || 'Falha ao excluir estação';
      showAlert(message, 'error');
    } finally {
      setDeleteDialog({ open: false, station: null });
    }
  };

  if (isLoadingTypes) {
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
                Estações
              </Typography>
              <Typography className="text-text-secondary mt-1">
                Gerencie as estações físicas disponíveis para agendamentos
              </Typography>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative overflow-visible">
            <div className="flex gap-4 items-center">
              <div className="flex-1 max-w-xs relative">
                <Select
                  value={selectedTypeId}
                  onChange={handleTypeChange}
                  label="Filtrar por Tipo"
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
                  <Option value="" className="text-text-primary hover:bg-bg-tertiary">
                    Todos os tipos
                  </Option>
                  {stationTypes.map((type) => (
                    <Option 
                      key={type.id} 
                      value={type.id}
                      className="text-text-primary hover:bg-bg-tertiary hover:text-white focus:bg-bg-tertiary focus:text-accent-primary selected:bg-accent-primary selected:text-white"
                    >
                      {type.name}
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={showInactiveStations}
                  onChange={(e) => setShowInactiveStations(e.target.checked)}
                  className="checked:bg-accent-primary"
                />
                <Typography className="text-text-secondary text-sm">
                  Mostrar inativas
                </Typography>
              </div>
            </div>

            <Button
              className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
              onClick={handleCreateStation}
            >
              <PlusIcon className="h-4 w-4" />
              Adicionar Estação
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 max-w-md">
            <Input
              type="text"
              placeholder="Pesquisar estações por nome..."
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
          {isLoadingStations ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredStations.length === 0 ? (
            <div className="text-center py-12">
              <Typography className="text-text-secondary mb-4">
                {searchQuery 
                  ? 'Nenhuma estação encontrada'
                  : selectedType
                    ? `Nenhuma estação do tipo "${selectedType.name}" encontrada`
                    : 'Nenhuma estação cadastrada'
                }
              </Typography>
              {!searchQuery && (
                <Button
                  className="bg-accent-primary hover:bg-accent-primary/90"
                  onClick={handleCreateStation}
                >
                  Criar Primeira Estação
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-left p-4 text-text-primary font-semibold">Nome da Estação</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Tipo</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Status</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStations.map((station, index) => (
                    <tr 
                      key={station.id} 
                      className={`border-b border-bg-tertiary hover:bg-bg-primary/50 cursor-pointer ${
                        index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
                      }`}
                      onClick={() => handleEditStation(station)}
                    >
                      <td className="p-4">
                        <Typography className="text-text-primary font-medium">
                          {station.label}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <Typography className="text-text-primary">
                            {station.station_type?.name}
                          </Typography>
                          <Typography className="text-text-secondary text-sm font-mono">
                            {station.station_type?.code}
                          </Typography>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          color={station.is_active ? "green" : "orange"}
                          className="text-xs"
                        >
                          {station.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-2"
                            onClick={() => handleEditStation(station)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-status-error text-status-error hover:bg-status-error/10 p-2"
                            onClick={() => handleDeleteStation(station)}
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
        handler={() => setEditDialog({ open: false, station: null, isCreate: false })}
        className="bg-bg-secondary border-bg-tertiary"
        size="md"
      >
        <DialogHeader className="text-text-primary">
          {editDialog.isCreate ? 'Criar Estação' : 'Editar Estação'}
        </DialogHeader>
        <DialogBody className="text-text-primary">
          <div className="flex flex-col gap-4">
            <div>
              <Select
                value={formData.type_id}
                onChange={(value) => setFormData({ ...formData, type_id: value })}
                label="Tipo de Estação"
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                error={!!formErrors.type_id}
              >
                {stationTypes.map((type) => (
                  <Option key={type.id} value={type.id} className="text-text-primary">
                    {type.name}
                  </Option>
                ))}
              </Select>
              {formErrors.type_id && (
                <Typography className="text-status-error text-sm mt-1">
                  {formErrors.type_id}
                </Typography>
              )}
            </div>
            
            <div>
              <Input
                label="Nome da Estação"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                error={!!formErrors.label}
              />
              {formErrors.label && (
                <Typography className="text-status-error text-sm mt-1">
                  {formErrors.label}
                </Typography>
              )}
              <Typography className="text-text-tertiary text-xs mt-1">
                Exemplo: Cadeira de Corte #1, Mesa de Manicure A, Sala de Spa Premium
              </Typography>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="checked:bg-accent-primary"
              />
              <Typography className="text-text-primary">
                Estação ativa
              </Typography>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setEditDialog({ open: false, station: null, isCreate: false })}
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
        handler={() => setDeleteDialog({ open: false, station: null })}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir a estação "{deleteDialog.station?.label}"? 
          Esta ação não pode ser desfeita.
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, station: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteStation}
            className="bg-status-error hover:bg-status-error/90"
          >
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}