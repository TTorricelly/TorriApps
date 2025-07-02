/**
 * Labels Management Page
 * 
 * This page provides a complete CRUD interface for managing labels in the system.
 * Labels are used for categorizing and organizing various entities.
 * 
 * Features:
 * - View all labels with pagination
 * - Search and filter labels
 * - Create new labels with color selection
 * - Edit existing labels
 * - Delete labels with confirmation
 * - Toggle active/inactive status
 * - Dark theme styling
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Badge,
  Select,
  Option,
  Spinner
} from '@material-tailwind/react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  EyeSlashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

import { labelsApi } from '../../Services/labels';

/**
 * Default color palette for labels
 */
const DEFAULT_COLORS = [
  '#00BFFF', // Deep Sky Blue (default)
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEAA7', // Peach
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471'  // Light Orange
];

export default function LabelsPage() {
  // State management
  const [labels, setLabels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [editDialog, setEditDialog] = useState({ open: false, label: null, isCreate: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, label: null });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#00BFFF'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Load labels on component mount
  useEffect(() => {
    loadLabels();
  }, []);
  
  /**
   * Load labels from API
   */
  const loadLabels = async () => {
    try {
      setIsLoading(true);
      const response = await labelsApi.getAll({ limit: 1000 }); // Get all labels
      setLabels(response.items || []);
    } catch (error) {
      console.error('Error loading labels:', error);
      showAlert('Erro ao carregar rótulos', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Filter labels based on search query and status
   */
  const filteredLabels = useMemo(() => {
    let filtered = labels;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(label =>
        label.name.toLowerCase().includes(query) ||
        (label.description && label.description.toLowerCase().includes(query))
      );
    }
    
    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(label => label.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(label => !label.is_active);
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [labels, searchQuery, statusFilter]);
  
  /**
   * Show alert message
   */
  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };
  
  /**
   * Open create dialog
   */
  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      color: '#00BFFF'
    });
    setFormErrors({});
    setEditDialog({ open: true, label: null, isCreate: true });
  };
  
  /**
   * Open edit dialog
   */
  const handleEdit = (label) => {
    setFormData({
      name: label.name,
      description: label.description || '',
      color: label.color
    });
    setFormErrors({});
    setEditDialog({ open: true, label, isCreate: false });
  };
  
  /**
   * Handle form input changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  /**
   * Validate form data
   */
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!formData.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      errors.color = 'Cor deve ser um código hexadecimal válido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      
      if (editDialog.isCreate) {
        await labelsApi.create(formData);
        showAlert('Rótulo criado com sucesso!', 'success');
      } else {
        await labelsApi.update(editDialog.label.id, formData);
        showAlert('Rótulo atualizado com sucesso!', 'success');
      }
      
      loadLabels();
      setEditDialog({ open: false, label: null, isCreate: false });
    } catch (error) {
      console.error('Error saving label:', error);
      const message = error.response?.data?.detail || 'Erro ao salvar rótulo';
      showAlert(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  /**
   * Handle label deletion
   */
  const handleDelete = (label) => {
    setDeleteDialog({ open: true, label });
  };
  
  /**
   * Confirm label deletion
   */
  const confirmDelete = async () => {
    if (!deleteDialog.label) return;
    
    try {
      setIsDeleting(true);
      await labelsApi.delete(deleteDialog.label.id);
      showAlert('Rótulo excluído com sucesso!', 'success');
      loadLabels();
      setDeleteDialog({ open: false, label: null });
    } catch (error) {
      console.error('Error deleting label:', error);
      const message = error.response?.data?.detail || 'Erro ao excluir rótulo';
      showAlert(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };
  
  /**
   * Toggle label status
   */
  const handleToggleStatus = async (label) => {
    try {
      await labelsApi.toggleStatus(label.id);
      showAlert(
        `Rótulo ${label.is_active ? 'desativado' : 'ativado'} com sucesso!`,
        'success'
      );
      loadLabels();
    } catch (error) {
      console.error('Error toggling label status:', error);
      showAlert('Erro ao alterar status do rótulo', 'error');
    }
  };
  
  return (
    <div className="p-6 bg-bg-primary min-h-screen">
      {/* Alert */}
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
                Gerenciar Rótulos
              </Typography>
              <Typography variant="small" className="text-text-secondary">
                Organize e categorize entidades com rótulos coloridos
              </Typography>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
                onClick={handleCreate}
              >
                <PlusIcon className="h-4 w-4" />
                Novo Rótulo
              </Button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                icon={<MagnifyingGlassIcon className="h-5 w-5 text-text-tertiary" />}
              />
            </div>
            <div className="w-full md:w-48">
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
          </div>
        </CardHeader>
        
        <CardBody className="bg-bg-secondary">
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <TagIcon className="h-16 w-16 mx-auto mb-4 text-text-tertiary" />
              <Typography variant="h6" className="text-text-primary mb-2">
                {searchQuery || statusFilter ? 'Nenhum rótulo encontrado' : 'Nenhum rótulo cadastrado'}
              </Typography>
              <Typography variant="small" className="text-text-secondary">
                {searchQuery || statusFilter 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Clique em "Novo Rótulo" para começar'
                }
              </Typography>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-left p-4 text-text-primary font-semibold">Rótulo</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Descrição</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Cor</th>
                    <th className="text-left p-4 text-text-primary font-semibold">Status</th>
                    <th className="text-center p-4 text-text-primary font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabels.map((label, index) => (
                    <tr
                      key={label.id}
                      className={`border-b border-bg-tertiary hover:bg-bg-primary/50 cursor-pointer ${
                        index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
                      }`}
                      onClick={() => handleEdit(label)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: label.color }}
                          />
                          <Typography className="text-text-primary font-medium">
                            {label.name}
                          </Typography>
                        </div>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-secondary text-sm">
                          {label.description || '—'}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Typography className="text-text-secondary text-sm font-mono">
                          {label.color}
                        </Typography>
                      </td>
                      <td className="p-4">
                        <Badge
                          color={label.is_active ? "green" : "orange"}
                          className="text-xs"
                        >
                          {label.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-2"
                            onClick={() => handleEdit(label)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            className={`p-2 ${
                              label.is_active
                                ? 'border-orange-500 text-orange-500 hover:bg-orange-500/10'
                                : 'border-green-500 text-green-500 hover:bg-green-500/10'
                            }`}
                            onClick={() => handleToggleStatus(label)}
                          >
                            {label.is_active ? (
                              <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="border-status-error text-status-error hover:bg-status-error/10 p-2"
                            onClick={() => handleDelete(label)}
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
      
      {/* Create/Edit Dialog */}
      <Dialog
        open={editDialog.open}
        handler={() => setEditDialog({ open: false, label: null, isCreate: false })}
        className="bg-bg-secondary border-bg-tertiary"
        size="md"
      >
        <DialogHeader className="text-text-primary">
          {editDialog.isCreate ? 'Criar Novo Rótulo' : 'Editar Rótulo'}
        </DialogHeader>
        <DialogBody className="text-text-primary space-y-4">
          {/* Name Field */}
          <div>
            <Input
              name="name"
              label="Nome do Rótulo"
              placeholder="Digite o nome do rótulo"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!formErrors.name}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
              required
            />
            {formErrors.name && (
              <Typography className="text-status-error text-sm mt-1">
                {formErrors.name}
              </Typography>
            )}
          </div>
          
          {/* Description Field */}
          <div>
            <Input
              name="description"
              label="Descrição (opcional)"
              placeholder="Digite uma descrição para o rótulo"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
            />
          </div>
          
          {/* Color Selection */}
          <div>
            <Typography className="text-text-secondary text-sm mb-3">
              Cor do Rótulo
            </Typography>
            <div className="space-y-3">
              {/* Custom Color Input */}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-12 h-12 rounded-lg border-2 border-bg-tertiary cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#00BFFF"
                  className="bg-bg-primary border-bg-tertiary text-text-primary font-mono"
                  labelProps={{ className: "text-text-secondary" }}
                  containerProps={{ className: "text-text-primary flex-1" }}
                />
              </div>
              
              {/* Preset Colors */}
              <div>
                <Typography className="text-text-secondary text-xs mb-2">
                  Cores predefinidas:
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-all ${
                        formData.color === color
                          ? 'border-white shadow-lg scale-110'
                          : 'border-bg-tertiary hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleInputChange('color', color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              
              {formErrors.color && (
                <Typography className="text-status-error text-sm">
                  {formErrors.color}
                </Typography>
              )}
            </div>
          </div>
          
          {/* Preview */}
          <div className="bg-bg-primary p-4 rounded-lg border border-bg-tertiary">
            <Typography className="text-text-secondary text-sm mb-2">
              Visualização:
            </Typography>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: formData.color }}
              />
              <div>
                <Typography className="text-text-primary font-medium">
                  {formData.name || 'Nome do Rótulo'}
                </Typography>
                {formData.description && (
                  <Typography className="text-text-secondary text-sm">
                    {formData.description}
                  </Typography>
                )}
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setEditDialog({ open: false, label: null, isCreate: false })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitForm}
            disabled={isSubmitting}
            className="bg-accent-primary hover:bg-accent-primary/90"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Salvando...
              </div>
            ) : (
              editDialog.isCreate ? 'Criar Rótulo' : 'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        handler={() => setDeleteDialog({ open: false, label: null })}
        className="bg-bg-secondary border-bg-tertiary"
        size="sm"
      >
        <DialogHeader className="text-text-primary">
          Confirmar Exclusão
        </DialogHeader>
        <DialogBody className="text-text-primary">
          <div className="text-center">
            <TrashIcon className="h-16 w-16 mx-auto mb-4 text-status-error" />
            <Typography variant="h6" className="text-text-primary mb-2">
              Excluir Rótulo
            </Typography>
            <Typography className="text-text-secondary">
              Tem certeza que deseja excluir o rótulo <strong>"{deleteDialog.label?.name}"</strong>?
            </Typography>
            <Typography className="text-text-secondary text-sm mt-2">
              Esta ação não pode ser desfeita.
            </Typography>
          </div>
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setDeleteDialog({ open: false, label: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={isDeleting}
            className="bg-status-error hover:bg-status-error/90"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Excluindo...
              </div>
            ) : (
              'Confirmar Exclusão'
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}