import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Spinner,
  Alert,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@material-tailwind/react';
import { 
  PlusIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

import { serviceVariationGroupsApi } from '../../Services/services';
import VariationGroup from './VariationGroup';
import VariationForm from './VariationForm';
import VariationGuide from './VariationGuide';

const ServiceVariationManager = ({ 
  serviceId, 
  serviceData, 
  onVariationsChange,
  isReadOnly = false 
}) => {
  // State management
  const [variationGroups, setVariationGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Dialog states
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, group: null });
  const [showGuide, setShowGuide] = useState(false);

  // Load variation groups on component mount
  useEffect(() => {
    if (serviceId) {
      loadVariationGroups();
    }
  }, [serviceId]);

  // Notify parent component when variations change
  useEffect(() => {
    if (onVariationsChange) {
      onVariationsChange(variationGroups);
    }
  }, [variationGroups]); // Remove onVariationsChange from dependencies to prevent infinite loop

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const loadVariationGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use optimized API that loads groups with variations in one request
      const groups = await serviceVariationGroupsApi.getFullByServiceId(serviceId);
      setVariationGroups(groups || []);
    } catch (error) {
      console.error('Error loading variation groups:', error);
      setError('Erro ao carregar grupos de variações');
      showAlert('Erro ao carregar grupos de variações', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const newGroup = await serviceVariationGroupsApi.create({
        ...groupData,
        service_id: serviceId
      });
      
      if (newGroup) {
        setVariationGroups(prev => [...prev, { ...newGroup, variations: [] }]);
        showAlert('Grupo de variações criado com sucesso!', 'success');
        setShowGroupForm(false);
      }
    } catch (error) {
      console.error('Error creating variation group:', error);
      showAlert('Erro ao criar grupo de variações', 'error');
    }
  };

  const handleUpdateGroup = async (groupId, groupData) => {
    try {
      const updatedGroup = await serviceVariationGroupsApi.update(groupId, groupData);
      
      if (updatedGroup) {
        setVariationGroups(prev => 
          prev.map(group => 
            group.id === groupId 
              ? { ...group, ...updatedGroup }
              : group
          )
        );
        showAlert('Grupo de variações atualizado com sucesso!', 'success');
        setEditingGroup(null);
      }
    } catch (error) {
      console.error('Error updating variation group:', error);
      showAlert('Erro ao atualizar grupo de variações', 'error');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      const success = await serviceVariationGroupsApi.delete(groupId);
      
      if (success) {
        setVariationGroups(prev => prev.filter(group => group.id !== groupId));
        showAlert('Grupo de variações excluído com sucesso!', 'success');
        setDeleteDialog({ open: false, group: null });
      }
    } catch (error) {
      console.error('Error deleting variation group:', error);
      showAlert('Erro ao excluir grupo de variações', 'error');
    }
  };

  const handleVariationsChange = useCallback((groupId, variations) => {
    setVariationGroups(prev => 
      prev.map(group => 
        group.id === groupId 
          ? { ...group, variations }
          : group
      )
    );
  }, []);


  const calculateTotalVariations = () => {
    return variationGroups.reduce((total, group) => {
      return total + (group.variations?.length || 0);
    }, 0);
  };

  const calculatePriceRange = () => {
    const basePrice = parseFloat(serviceData?.price || 0);
    let minPrice = basePrice;
    let maxPrice = basePrice;

    variationGroups.forEach(group => {
      group.variations?.forEach(variation => {
        const delta = parseFloat(variation.price_delta || 0);
        minPrice = Math.min(minPrice, basePrice + delta);
        maxPrice = Math.max(maxPrice, basePrice + delta);
      });
    });

    return { minPrice, maxPrice };
  };

  if (!serviceId) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-bg-tertiary mb-4">
          <InformationCircleIcon className="w-8 h-8 text-text-secondary" />
        </div>
        <Typography variant="h6" className="text-text-primary mb-2">
          Salve o serviço primeiro
        </Typography>
        <Typography variant="small" className="text-text-secondary">
          Para gerenciar variações, você precisa salvar o serviço primeiro.
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Component */}
      {alert.show && (
        <Alert
          open={alert.show}
          onClose={() => setAlert({ ...alert, show: false })}
          color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'amber' : 'green'}
          className="mb-4"
        >
          {alert.message}
        </Alert>
      )}

      {/* Header Section */}
      <Card className="bg-bg-secondary border-bg-tertiary">
        <CardHeader floated={false} shadow={false} className="bg-bg-secondary pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h6" className="text-text-primary">
                Variações do Serviço
              </Typography>
              <Typography variant="small" className="text-text-secondary">
                {calculateTotalVariations()} variações em {variationGroups.length} grupos
              </Typography>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="text"
                onClick={() => setShowGuide(true)}
                className="text-text-secondary hover:bg-bg-primary flex items-center gap-2"
                title="Abrir guia de ajuda"
              >
                <QuestionMarkCircleIcon className="h-4 w-4" />
                Ajuda
              </Button>
              
              {!isReadOnly && (
                <Button
                  size="sm"
                  className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
                  onClick={() => setShowGroupForm(true)}
                >
                  <PlusIcon className="h-4 w-4" />
                  Adicionar Grupo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Price Range Summary */}
        {variationGroups.length > 0 && (
          <CardBody className="bg-bg-secondary pt-0">
            <div className="bg-bg-primary p-4 rounded-lg">
              <Typography variant="small" className="text-text-secondary mb-2">
                Faixa de Preço com Variações
              </Typography>
              <div className="flex items-center gap-4">
                <div className="text-text-primary">
                  <span className="text-sm text-text-secondary">De:</span>
                  <span className="font-semibold ml-1">
                    R$ {calculatePriceRange().minPrice.toFixed(2)}
                  </span>
                </div>
                <div className="text-text-primary">
                  <span className="text-sm text-text-secondary">Até:</span>
                  <span className="font-semibold ml-1">
                    R$ {calculatePriceRange().maxPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert color="red" className="mb-4">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {error}
        </Alert>
      )}

      {/* Variation Groups List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {variationGroups.length === 0 ? (
            <Card className="bg-bg-secondary border-bg-tertiary">
              <CardBody className="text-center py-12">
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-bg-tertiary mb-4">
                  <InformationCircleIcon className="w-8 h-8 text-text-secondary" />
                </div>
                <Typography variant="h6" className="text-text-primary mb-2">
                  Nenhuma variação cadastrada
                </Typography>
                <Typography variant="small" className="text-text-secondary mb-4">
                  Crie grupos de variações para organizar diferentes opções deste serviço.
                </Typography>
                {!isReadOnly && (
                  <Button
                    variant="outlined"
                    onClick={() => setShowGroupForm(true)}
                    className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
                  >
                    Criar Primeiro Grupo
                  </Button>
                )}
              </CardBody>
            </Card>
          ) : (
            variationGroups.map((group) => (
              <VariationGroup
                key={group.id}
                group={group}
                serviceData={serviceData}
                onUpdate={(groupData) => handleUpdateGroup(group.id, groupData)}
                onEdit={() => setEditingGroup(group)}
                onDelete={() => setDeleteDialog({ open: true, group })}
                onVariationsChange={(variations) => handleVariationsChange(group.id, variations)}
                isReadOnly={isReadOnly}
              />
            ))
          )}
        </div>
      )}

      {/* Create/Edit Group Dialog */}
      <VariationForm
        open={showGroupForm || !!editingGroup}
        onClose={() => {
          setShowGroupForm(false);
          setEditingGroup(null);
        }}
        onSubmit={editingGroup ? 
          (data) => handleUpdateGroup(editingGroup.id, data) : 
          handleCreateGroup
        }
        initialData={editingGroup}
        title={editingGroup ? 'Editar Grupo de Variações' : 'Criar Grupo de Variações'}
        isGroup={true}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        handler={() => setDeleteDialog({ open: false, group: null })}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir o grupo "{deleteDialog.group?.name}"?
          {deleteDialog.group?.variations?.length > 0 && (
            <div className="mt-2 text-status-error">
              Este grupo possui {deleteDialog.group.variations.length} variações que também serão excluídas.
            </div>
          )}
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, group: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleDeleteGroup(deleteDialog.group?.id)}
            className="bg-status-error hover:bg-status-error/90"
          >
            Excluir
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Help Guide */}
      <VariationGuide
        open={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
};

export default ServiceVariationManager;