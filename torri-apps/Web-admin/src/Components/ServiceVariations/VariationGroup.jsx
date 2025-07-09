import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Collapse,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Checkbox,
  Badge,
} from '@material-tailwind/react';
import { 
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { serviceVariationsApi } from '../../Services/services';
import VariationItem from './VariationItem';
import VariationForm from './VariationForm';
import BulkEditModal from './BulkEditModal';

// Sortable wrapper for VariationItem
const SortableVariationItem = ({ variation, serviceData, onUpdate, onEdit, onDelete, isReadOnly, isSelected, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <VariationItem
        variation={variation}
        serviceData={serviceData}
        onUpdate={onUpdate}
        onEdit={onEdit}
        onDelete={onDelete}
        isReadOnly={isReadOnly}
        isDragging={isDragging}
        isSelected={isSelected}
        onSelect={onSelect}
        dragHandleProps={listeners}
      />
    </div>
  );
};

const VariationGroup = ({ 
  group, 
  serviceData, 
  onUpdate, 
  onDelete, 
  onVariationsChange,
  isReadOnly = false 
}) => {
  // State management
  const [isExpanded, setIsExpanded] = useState(true);
  const [variations, setVariations] = useState(group.variations || []);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Dialog states
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [editingVariation, setEditingVariation] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, variation: null });
  
  // Selection and bulk operations
  const [selectedVariations, setSelectedVariations] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState({ open: false, count: 0 });
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load variations when group changes (only if not already loaded)
  useEffect(() => {
    if (group.id && group.variations) {
      // Use variations from the group if available (from optimized API)
      setVariations(group.variations || []);
    } else if (group.id && (!variations || variations.length === 0)) {
      loadVariations();
    }
  }, [group.id, group.variations]);

  // Notify parent when variations change
  useEffect(() => {
    if (onVariationsChange) {
      onVariationsChange(variations);
    }
  }, [variations]); // Remove onVariationsChange from dependencies to prevent infinite loop

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const loadVariations = async () => {
    try {
      setIsLoading(true);
      const variationsData = await serviceVariationsApi.getByGroupId(group.id);
      setVariations(variationsData || []);
    } catch (error) {
      console.error('Error loading variations:', error);
      showAlert('Erro ao carregar variações', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVariation = async (variationData) => {
    try {
      const newVariation = await serviceVariationsApi.create({
        ...variationData,
        service_variation_group_id: group.id
      });
      
      if (newVariation) {
        setVariations(prev => [...prev, newVariation]);
        showAlert('Variação criada com sucesso!', 'success');
        setShowVariationForm(false);
      }
    } catch (error) {
      console.error('Error creating variation:', error);
      showAlert('Erro ao criar variação', 'error');
    }
  };

  const handleUpdateVariation = async (variationId, variationData) => {
    try {
      const updatedVariation = await serviceVariationsApi.update(variationId, variationData);
      
      if (updatedVariation) {
        setVariations(prev => 
          prev.map(variation => 
            variation.id === variationId 
              ? { ...variation, ...updatedVariation }
              : variation
          )
        );
        showAlert('Variação atualizada com sucesso!', 'success');
        setEditingVariation(null);
      }
    } catch (error) {
      console.error('Error updating variation:', error);
      showAlert('Erro ao atualizar variação', 'error');
    }
  };

  const handleUpdateVariationInline = async (updatedVariation) => {
    try {
      const result = await serviceVariationsApi.update(updatedVariation.id, updatedVariation);
      
      if (result) {
        setVariations(prev => 
          prev.map(variation => 
            variation.id === updatedVariation.id 
              ? { ...variation, ...result }
              : variation
          )
        );
        showAlert('Variação atualizada com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Error updating variation:', error);
      showAlert('Erro ao atualizar variação', 'error');
      throw error;
    }
  };

  const handleDeleteVariation = async (variationId) => {
    try {
      const success = await serviceVariationsApi.delete(variationId);
      
      if (success) {
        setVariations(prev => prev.filter(variation => variation.id !== variationId));
        showAlert('Variação excluída com sucesso!', 'success');
        setDeleteDialog({ open: false, variation: null });
      }
    } catch (error) {
      console.error('Error deleting variation:', error);
      showAlert('Erro ao excluir variação', 'error');
    }
  };

  // Drag and drop handler
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setVariations((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Persist the new order to the backend
        const reorderData = {
          variations: reorderedItems.map((item, index) => ({
            variation_id: item.id,
            display_order: index
          }))
        };
        
        // Don't await this - let it happen in the background
        serviceVariationsApi.reorder(reorderData).catch(error => {
          console.error('Failed to persist reorder:', error);
          showAlert('Erro ao salvar nova ordem', 'error');
        });

        return reorderedItems;
      });
    }
  };

  // Selection handlers
  const handleSelectVariation = (variationId, isSelected) => {
    setSelectedVariations(prev => {
      const newSelected = new Set(prev);
      if (isSelected) {
        newSelected.add(variationId);
      } else {
        newSelected.delete(variationId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedVariations(new Set(variations.map(v => v.id)));
    } else {
      setSelectedVariations(new Set());
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialog({ open: true, count: selectedVariations.size });
  };

  const confirmBulkDelete = async () => {
    try {
      const variationIds = Array.from(selectedVariations);
      const result = await serviceVariationsApi.batchDelete(variationIds);
      
      if (result.success_count > 0) {
        setVariations(prev => prev.filter(v => !selectedVariations.has(v.id)));
        setSelectedVariations(new Set());
        setBulkDeleteDialog({ open: false, count: 0 });
        showAlert(`${result.success_count} variações excluídas com sucesso!`, 'success');
      }
      
      if (result.failed_count > 0) {
        showAlert(`${result.failed_count} variações falharam ao excluir`, 'error');
      }
    } catch (error) {
      console.error('Error bulk deleting variations:', error);
      showAlert('Erro ao excluir variações', 'error');
    }
  };

  const clearSelection = () => {
    setSelectedVariations(new Set());
  };

  const handleBulkEdit = () => {
    setShowBulkEditModal(true);
  };

  const handleBulkEditSubmit = async (updates) => {
    try {
      const variationIds = Array.from(selectedVariations);
      const result = await serviceVariationsApi.batchUpdate(variationIds, updates);
      
      if (result.success_count > 0) {
        // Update local state
        setVariations(prev => 
          prev.map(variation => {
            if (selectedVariations.has(variation.id)) {
              return { ...variation, ...updates };
            }
            return variation;
          })
        );
        
        setSelectedVariations(new Set());
        setShowBulkEditModal(false);
        showAlert(`${result.success_count} variações atualizadas com sucesso!`, 'success');
      }
      
      if (result.failed_count > 0) {
        showAlert(`${result.failed_count} variações falharam ao atualizar`, 'error');
      }
    } catch (error) {
      console.error('Error bulk updating variations:', error);
      showAlert('Erro ao atualizar variações', 'error');
      throw error;
    }
  };

  // Effects
  useEffect(() => {
    setShowBulkActions(selectedVariations.size > 0);
  }, [selectedVariations]);

  const calculateGroupPriceRange = () => {
    if (!variations || variations.length === 0) return null;
    
    const basePrice = parseFloat(serviceData?.price || 0);
    let minPrice = basePrice;
    let maxPrice = basePrice;

    variations.forEach(variation => {
      const delta = parseFloat(variation.price_delta || 0);
      const price = basePrice + delta;
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
    });

    return { minPrice, maxPrice };
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
    }
    return `${remainingMinutes}min`;
  };

  const priceRange = calculateGroupPriceRange();

  return (
    <Card className="bg-bg-secondary border-bg-tertiary">
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

      <CardHeader floated={false} shadow={false} className="bg-bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="text"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-text-primary hover:bg-bg-primary"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </Button>
            
            <div>
              <Typography variant="h6" className="text-text-primary">
                {group.name}
              </Typography>
              <div className="flex items-center gap-4 mt-1">
                <Typography variant="small" className="text-text-secondary">
                  {variations.length} variações
                </Typography>
                {priceRange && (
                  <Typography variant="small" className="text-text-secondary">
                    {formatPrice(priceRange.minPrice)} - {formatPrice(priceRange.maxPrice)}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                {/* Bulk Actions */}
                {showBulkActions && (
                  <div className="flex items-center gap-2 mr-2">
                    <Badge color="blue" content={selectedVariations.size}>
                      <Typography variant="small" className="text-text-primary">
                        Selecionadas
                      </Typography>
                    </Badge>
                    <Button
                      size="sm"
                      variant="outlined"
                      onClick={handleBulkEdit}
                      className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 flex items-center gap-1"
                    >
                      <PencilIcon className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outlined"
                      onClick={handleBulkDelete}
                      className="border-status-error text-status-error hover:bg-status-error/10 flex items-center gap-1"
                    >
                      <TrashIcon className="h-3 w-3" />
                      Excluir
                    </Button>
                    <Button
                      size="sm"
                      variant="text"
                      onClick={clearSelection}
                      className="text-text-secondary hover:bg-bg-primary p-1"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => setShowVariationForm(true)}
                  className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Adicionar Variação
                </Button>

                <Menu>
                  <MenuHandler>
                    <Button
                      variant="text"
                      size="sm"
                      className="p-2 text-text-primary hover:bg-bg-primary"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </Button>
                  </MenuHandler>
                  <MenuList className="bg-bg-secondary border-bg-tertiary">
                    <MenuItem 
                      onClick={() => onUpdate && onUpdate(group)}
                      className="text-text-primary hover:bg-bg-primary flex items-center gap-2"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Editar Grupo
                    </MenuItem>
                    <MenuItem 
                      onClick={() => onDelete && onDelete()}
                      className="text-status-error hover:bg-status-error/10 flex items-center gap-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Excluir Grupo
                    </MenuItem>
                  </MenuList>
                </Menu>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <Collapse open={isExpanded}>
        <CardBody className="bg-bg-secondary pt-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
            </div>
          ) : variations.length === 0 ? (
            <div className="text-center py-8">
              <Typography variant="small" className="text-text-secondary mb-4">
                Nenhuma variação neste grupo
              </Typography>
              {!isReadOnly && (
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => setShowVariationForm(true)}
                  className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
                >
                  Criar Primeira Variação
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All Checkbox */}
              {!isReadOnly && variations.length > 0 && (
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-bg-tertiary">
                  <Checkbox
                    checked={selectedVariations.size === variations.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="text-accent-primary"
                  />
                  <Typography variant="small" className="text-text-secondary">
                    Selecionar todas as variações
                  </Typography>
                </div>
              )}
              
              {/* Draggable Variations */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext items={variations.map(v => v.id)} strategy={verticalListSortingStrategy}>
                  {variations.map((variation) => (
                    <SortableVariationItem
                      key={variation.id}
                      variation={variation}
                      serviceData={serviceData}
                      onUpdate={handleUpdateVariationInline}
                      onEdit={() => setEditingVariation(variation)}
                      onDelete={() => setDeleteDialog({ open: true, variation })}
                      isReadOnly={isReadOnly}
                      isSelected={selectedVariations.has(variation.id)}
                      onSelect={(isSelected) => handleSelectVariation(variation.id, isSelected)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </CardBody>
      </Collapse>

      {/* Create/Edit Variation Dialog */}
      <VariationForm
        open={showVariationForm || !!editingVariation}
        onClose={() => {
          setShowVariationForm(false);
          setEditingVariation(null);
        }}
        onSubmit={editingVariation ? 
          (data) => handleUpdateVariation(editingVariation.id, data) : 
          handleCreateVariation
        }
        initialData={editingVariation}
        title={editingVariation ? 'Editar Variação' : 'Criar Variação'}
        isGroup={false}
      />

      {/* Delete Variation Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        handler={() => setDeleteDialog({ open: false, variation: null })}
        className="bg-bg-secondary border-bg-tertiary"
        size="sm"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir a variação "{deleteDialog.variation?.name}"?
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, variation: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleDeleteVariation(deleteDialog.variation?.id)}
            className="bg-status-error hover:bg-status-error/90"
          >
            Excluir
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialog.open}
        handler={() => setBulkDeleteDialog({ open: false, count: 0 })}
        className="bg-bg-secondary border-bg-tertiary"
        size="sm"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão em Lote
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Tem certeza que deseja excluir {bulkDeleteDialog.count} variações selecionadas?
          Esta ação não pode ser desfeita.
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setBulkDeleteDialog({ open: false, count: 0 })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmBulkDelete}
            className="bg-status-error hover:bg-status-error/90"
          >
            Excluir {bulkDeleteDialog.count} Variações
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Edit Modal */}
      <BulkEditModal
        open={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        onSubmit={handleBulkEditSubmit}
        selectedVariations={Array.from(selectedVariations).map(id => 
          variations.find(v => v.id === id)
        ).filter(Boolean)}
        title="Editar Variações em Lote"
      />
    </Card>
  );
};

export default VariationGroup;