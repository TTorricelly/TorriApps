import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Typography,
  Button,
  Input,
  Spinner,
  Alert,
  Switch,
  Badge,
} from '@material-tailwind/react';
import { 
  InformationCircleIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const BulkEditModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  selectedVariations = [], 
  title = 'Edição em Lote' 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price_delta: '',
    duration_delta: '',
    applyToName: false,
    applyToPrice: false,
    applyToDuration: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        price_delta: '',
        duration_delta: '',
        applyToName: false,
        applyToPrice: false,
        applyToDuration: false,
      });
      setErrors({});
      setAlert({ show: false, message: '', type: 'success' });
    }
  }, [open]);

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.applyToName && !formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (formData.applyToPrice) {
      if (formData.price_delta === '') {
        newErrors.price_delta = 'Alteração de preço é obrigatória';
      } else {
        const priceDelta = parseFloat(formData.price_delta);
        if (isNaN(priceDelta) || priceDelta < -9999 || priceDelta > 9999) {
          newErrors.price_delta = 'Valor deve estar entre -9999 e 9999';
        }
      }
    }
    
    if (formData.applyToDuration) {
      if (formData.duration_delta === '') {
        newErrors.duration_delta = 'Alteração de duração é obrigatória';
      } else {
        const durationDelta = parseInt(formData.duration_delta);
        if (isNaN(durationDelta) || durationDelta < -480 || durationDelta > 480) {
          newErrors.duration_delta = 'Valor deve estar entre -480 e 480 minutos';
        }
      }
    }
    
    // Check if at least one field is selected for application
    if (!formData.applyToName && !formData.applyToPrice && !formData.applyToDuration) {
      newErrors.general = 'Selecione pelo menos um campo para aplicar';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleToggleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear related errors when toggle is disabled
    if (!value) {
      const fieldName = field.replace('applyTo', '').toLowerCase();
      const relatedField = fieldName === 'price' ? 'price_delta' : 
                          fieldName === 'duration' ? 'duration_delta' : 'name';
      
      if (errors[relatedField]) {
        setErrors(prev => ({ ...prev, [relatedField]: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showAlert('Por favor, corrija os erros nos campos destacados', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const updates = {};
      
      if (formData.applyToName) {
        updates.name = formData.name.trim();
      }
      
      if (formData.applyToPrice) {
        updates.price_delta = parseFloat(formData.price_delta);
      }
      
      if (formData.applyToDuration) {
        updates.duration_delta = parseInt(formData.duration_delta);
      }
      
      await onSubmit(updates);
      
      // Reset form on success
      setFormData({
        name: '',
        price_delta: '',
        duration_delta: '',
        applyToName: false,
        applyToPrice: false,
        applyToDuration: false,
      });
      
    } catch (error) {
      console.error('Error submitting bulk edit:', error);
      showAlert('Erro ao salvar alterações. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      price_delta: '',
      duration_delta: '',
      applyToName: false,
      applyToPrice: false,
      applyToDuration: false,
    });
    setErrors({});
    setAlert({ show: false, message: '', type: 'success' });
    onClose();
  };

  const formatPrice = (value) => {
    const num = parseFloat(value || 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const formatDuration = (value) => {
    const num = parseInt(value || 0);
    return `${num}min`;
  };

  return (
    <Dialog 
      open={open} 
      handler={onClose}
      className="bg-bg-secondary border-bg-tertiary"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <DialogHeader className="text-text-primary flex items-center gap-2">
          <PencilIcon className="h-5 w-5" />
          {title}
          <Badge color="blue" content={selectedVariations.length}>
            <Typography variant="small">
              variações selecionadas
            </Typography>
          </Badge>
        </DialogHeader>
        
        <DialogBody className="space-y-4 max-h-96 overflow-y-auto">
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

          {/* General Error */}
          {errors.general && (
            <Alert color="red" className="mb-4">
              {errors.general}
            </Alert>
          )}

          {/* Info */}
          <div className="bg-bg-primary p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-5 w-5 text-accent-primary mt-0.5" />
              <div>
                <Typography className="text-text-primary text-sm font-medium mb-1">
                  Edição em Lote
                </Typography>
                <Typography className="text-text-secondary text-sm">
                  Selecione os campos que deseja alterar e as alterações serão aplicadas a todas as {selectedVariations.length} variações selecionadas.
                </Typography>
              </div>
            </div>
          </div>

          {/* Name Field */}
          <div className="flex items-center gap-4 p-4 bg-bg-primary rounded-lg">
            <Switch
              checked={formData.applyToName}
              onChange={(e) => handleToggleChange('applyToName', e.target.checked)}
              className="text-accent-primary"
            />
            <div className="flex-1">
              <Input
                name="name"
                label="Novo Nome (será aplicado a todas)"
                placeholder="Ex: Novo Nome"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                disabled={!formData.applyToName}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
              {errors.name && (
                <Typography className="text-status-error text-sm mt-1">
                  {errors.name}
                </Typography>
              )}
            </div>
          </div>

          {/* Price Delta Field */}
          <div className="flex items-center gap-4 p-4 bg-bg-primary rounded-lg">
            <Switch
              checked={formData.applyToPrice}
              onChange={(e) => handleToggleChange('applyToPrice', e.target.checked)}
              className="text-accent-primary"
            />
            <div className="flex-1">
              <Input
                name="price_delta"
                label="Alteração de Preço (R$)"
                type="number"
                step="0.01"
                placeholder="Ex: 10.00 ou -5.00"
                value={formData.price_delta}
                onChange={(e) => handleInputChange('price_delta', e.target.value)}
                error={!!errors.price_delta}
                disabled={!formData.applyToPrice}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
              {errors.price_delta && (
                <Typography className="text-status-error text-sm mt-1">
                  {errors.price_delta}
                </Typography>
              )}
              {formData.applyToPrice && formData.price_delta && !errors.price_delta && (
                <Typography className="text-text-secondary text-sm mt-1">
                  Alteração: {formatPrice(formData.price_delta)}
                </Typography>
              )}
            </div>
          </div>

          {/* Duration Delta Field */}
          <div className="flex items-center gap-4 p-4 bg-bg-primary rounded-lg">
            <Switch
              checked={formData.applyToDuration}
              onChange={(e) => handleToggleChange('applyToDuration', e.target.checked)}
              className="text-accent-primary"
            />
            <div className="flex-1">
              <Input
                name="duration_delta"
                label="Alteração de Duração (min)"
                type="number"
                placeholder="Ex: 15 ou -10"
                value={formData.duration_delta}
                onChange={(e) => handleInputChange('duration_delta', e.target.value)}
                error={!!errors.duration_delta}
                disabled={!formData.applyToDuration}
                className="bg-bg-secondary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
              {errors.duration_delta && (
                <Typography className="text-status-error text-sm mt-1">
                  {errors.duration_delta}
                </Typography>
              )}
              {formData.applyToDuration && formData.duration_delta && !errors.duration_delta && (
                <Typography className="text-text-secondary text-sm mt-1">
                  Alteração: {formatDuration(formData.duration_delta)}
                </Typography>
              )}
            </div>
          </div>

          {/* Help text */}
          <div className="bg-bg-primary p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-5 w-5 text-accent-primary mt-0.5" />
              <div>
                <Typography className="text-text-primary text-sm font-medium mb-1">
                  Como funciona:
                </Typography>
                <Typography className="text-text-secondary text-sm">
                  • <strong>Nome:</strong> Substitui o nome atual de todas as variações selecionadas
                </Typography>
                <Typography className="text-text-secondary text-sm">
                  • <strong>Preço:</strong> Define a mesma alteração de preço para todas as variações
                </Typography>
                <Typography className="text-text-secondary text-sm">
                  • <strong>Duração:</strong> Define a mesma alteração de duração para todas as variações
                </Typography>
              </div>
            </div>
          </div>
        </DialogBody>
        
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
          >
            {isSubmitting && <Spinner className="h-4 w-4" />}
            {isSubmitting ? 'Aplicando...' : `Aplicar a ${selectedVariations.length} Variações`}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default BulkEditModal;