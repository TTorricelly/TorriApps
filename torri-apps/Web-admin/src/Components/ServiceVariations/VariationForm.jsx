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
} from '@material-tailwind/react';
import { 
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const VariationForm = ({ 
  open, 
  onClose, 
  onSubmit, 
  initialData = null, 
  title = 'Formulário',
  isGroup = false,
  serviceData = null
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price_delta: '',
    duration_delta: '',
    price_subject_to_evaluation: false,
  });
  const [finalPrice, setFinalPrice] = useState('');
  const [finalDuration, setFinalDuration] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Helper functions for price and duration calculations
  const getBasePrice = () => parseFloat(serviceData?.price || 0);
  const getBaseDuration = () => parseInt(serviceData?.duration_minutes || 0);
  
  const calculateFinalPrice = (delta) => {
    const basePrice = getBasePrice();
    const deltaValue = parseFloat(delta || 0);
    return basePrice + deltaValue;
  };
  
  const calculatePriceDelta = (finalPrice) => {
    const basePrice = getBasePrice();
    const finalPriceValue = parseFloat(finalPrice || 0);
    return finalPriceValue - basePrice;
  };
  
  const calculateFinalDuration = (delta) => {
    const baseDuration = getBaseDuration();
    const deltaValue = parseInt(delta || 0);
    return baseDuration + deltaValue;
  };
  
  const calculateDurationDelta = (finalDuration) => {
    const baseDuration = getBaseDuration();
    const finalDurationValue = parseInt(finalDuration || 0);
    return finalDurationValue - baseDuration;
  };

  // Initialize form data when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        const priceDelta = initialData.price_delta?.toString() || '';
        const durationDelta = initialData.duration_delta?.toString() || '';
        
        setFormData({
          name: initialData.name || '',
          price_delta: priceDelta,
          duration_delta: durationDelta,
          price_subject_to_evaluation: initialData.price_subject_to_evaluation ?? false,
        });
        
        // Calculate final values based on deltas
        if (priceDelta && serviceData) {
          setFinalPrice(calculateFinalPrice(priceDelta).toString());
        } else {
          setFinalPrice('');
        }
        
        if (durationDelta && serviceData) {
          setFinalDuration(calculateFinalDuration(durationDelta).toString());
        } else {
          setFinalDuration('');
        }
      } else {
        setFormData({
          name: '',
          price_delta: '',
          duration_delta: '',
          price_subject_to_evaluation: false,
        });
        setFinalPrice('');
        setFinalDuration('');
      }
      setErrors({});
      setAlert({ show: false, message: '', type: 'success' });
    }
  }, [open, initialData, serviceData]);

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!isGroup) {
      // Price delta validation
      if (formData.price_delta === '') {
        newErrors.price_delta = 'Alteração de preço é obrigatória';
      } else {
        const priceDelta = parseFloat(formData.price_delta);
        if (isNaN(priceDelta)) {
          newErrors.price_delta = 'Valor inválido';
        } else if (priceDelta < -9999 || priceDelta > 9999) {
          newErrors.price_delta = 'Valor deve estar entre -9999 e 9999';
        }
      }
      
      // Duration delta validation
      if (formData.duration_delta === '') {
        newErrors.duration_delta = 'Alteração de duração é obrigatória';
      } else {
        const durationDelta = parseInt(formData.duration_delta);
        if (isNaN(durationDelta)) {
          newErrors.duration_delta = 'Valor inválido';
        } else if (durationDelta < -480 || durationDelta > 480) {
          newErrors.duration_delta = 'Valor deve estar entre -480 e 480 minutos';
        }
      }
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

  // Handle input changes for final price (calculates delta)
  const handleFinalPriceChange = (value) => {
    setFinalPrice(value);
    
    if (value && serviceData) {
      const delta = calculatePriceDelta(value);
      setFormData(prev => ({ ...prev, price_delta: delta.toString() }));
    } else {
      setFormData(prev => ({ ...prev, price_delta: '' }));
    }
    
    // Clear error when user starts typing
    if (errors.price_delta) {
      setErrors(prev => ({ ...prev, price_delta: null }));
    }
  };

  // Handle input changes for price delta (calculates final price)
  const handlePriceDeltaChange = (value) => {
    setFormData(prev => ({ ...prev, price_delta: value }));
    
    if (value && serviceData) {
      const finalPriceValue = calculateFinalPrice(value);
      setFinalPrice(finalPriceValue.toString());
    } else {
      setFinalPrice('');
    }
    
    // Clear error when user starts typing
    if (errors.price_delta) {
      setErrors(prev => ({ ...prev, price_delta: null }));
    }
  };

  // Handle input changes for final duration (calculates delta)
  const handleFinalDurationChange = (value) => {
    setFinalDuration(value);
    
    if (value && serviceData) {
      const delta = calculateDurationDelta(value);
      setFormData(prev => ({ ...prev, duration_delta: delta.toString() }));
    } else {
      setFormData(prev => ({ ...prev, duration_delta: '' }));
    }
    
    // Clear error when user starts typing
    if (errors.duration_delta) {
      setErrors(prev => ({ ...prev, duration_delta: null }));
    }
  };

  // Handle input changes for duration delta (calculates final duration)
  const handleDurationDeltaChange = (value) => {
    setFormData(prev => ({ ...prev, duration_delta: value }));
    
    if (value && serviceData) {
      const finalDurationValue = calculateFinalDuration(value);
      setFinalDuration(finalDurationValue.toString());
    } else {
      setFinalDuration('');
    }
    
    // Clear error when user starts typing
    if (errors.duration_delta) {
      setErrors(prev => ({ ...prev, duration_delta: null }));
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
      
      const submitData = {
        name: formData.name.trim(),
      };
      
      if (!isGroup) {
        submitData.price_delta = parseFloat(formData.price_delta);
        submitData.duration_delta = parseInt(formData.duration_delta);
        submitData.price_subject_to_evaluation = formData.price_subject_to_evaluation;
      }
      
      await onSubmit(submitData);
      
      // Reset form on success
      setFormData({
        name: '',
        price_delta: '',
        duration_delta: '',
        price_subject_to_evaluation: false,
      });
      setFinalPrice('');
      setFinalDuration('');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      showAlert('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      price_delta: '',
      duration_delta: '',
      price_subject_to_evaluation: false,
    });
    setFinalPrice('');
    setFinalDuration('');
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
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <DialogHeader className="text-text-primary">
          {title}
        </DialogHeader>
        
        <DialogBody className="space-y-4">
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

          {/* Name Field */}
          <div>
            <Input
              name="name"
              label={isGroup ? "Nome do Grupo" : "Nome da Variação"}
              placeholder={isGroup ? "Ex: Comprimento do Cabelo" : "Ex: Cabelo Longo"}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!errors.name}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
              required
            />
            {errors.name && (
              <Typography className="text-status-error text-sm mt-1">
                {errors.name}
              </Typography>
            )}
          </div>

          {/* Variation-specific fields */}
          {!isGroup && serviceData && (
            <>
              {/* Price Fields */}
              <div className="space-y-4">
                <Typography variant="h6" className="text-text-primary">
                  Preço da Variação
                </Typography>
                <div className="bg-bg-primary p-3 rounded-lg">
                  <Typography className="text-text-secondary text-sm mb-2">
                    Preço base do serviço: {formatPrice(getBasePrice())}
                  </Typography>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Final Price Field */}
                  <div>
                    <Input
                      name="final_price"
                      label="Preço Final (R$)"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 90.00"
                      value={finalPrice}
                      onChange={(e) => handleFinalPriceChange(e.target.value)}
                      error={!!errors.price_delta}
                      className="bg-bg-primary border-bg-tertiary text-text-primary"
                      labelProps={{ className: "text-text-secondary" }}
                      containerProps={{ className: "text-text-primary" }}
                    />
                    {finalPrice && !errors.price_delta && (
                      <Typography className="text-text-secondary text-sm mt-1">
                        Preço final: {formatPrice(finalPrice)}
                      </Typography>
                    )}
                  </div>
                  
                  {/* Price Delta Field */}
                  <div>
                    <Input
                      name="price_delta"
                      label="Alteração de Preço (R$)"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 10.00 ou -5.00"
                      value={formData.price_delta}
                      onChange={(e) => handlePriceDeltaChange(e.target.value)}
                      error={!!errors.price_delta}
                      className="bg-bg-primary border-bg-tertiary text-text-primary"
                      labelProps={{ className: "text-text-secondary" }}
                      containerProps={{ className: "text-text-primary" }}
                      required
                    />
                    {formData.price_delta && !errors.price_delta && (
                      <Typography className="text-text-secondary text-sm mt-1">
                        Alteração: {formatPrice(formData.price_delta)}
                      </Typography>
                    )}
                  </div>
                </div>
                {errors.price_delta && (
                  <Typography className="text-status-error text-sm mt-1">
                    {errors.price_delta}
                  </Typography>
                )}
              </div>

              {/* Duration Fields */}
              <div className="space-y-4">
                <Typography variant="h6" className="text-text-primary">
                  Duração da Variação
                </Typography>
                <div className="bg-bg-primary p-3 rounded-lg">
                  <Typography className="text-text-secondary text-sm mb-2">
                    Duração base do serviço: {formatDuration(getBaseDuration())}
                  </Typography>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Final Duration Field */}
                  <div>
                    <Input
                      name="final_duration"
                      label="Duração Final (min)"
                      type="number"
                      placeholder="Ex: 60"
                      value={finalDuration}
                      onChange={(e) => handleFinalDurationChange(e.target.value)}
                      error={!!errors.duration_delta}
                      className="bg-bg-primary border-bg-tertiary text-text-primary"
                      labelProps={{ className: "text-text-secondary" }}
                      containerProps={{ className: "text-text-primary" }}
                    />
                    {finalDuration && !errors.duration_delta && (
                      <Typography className="text-text-secondary text-sm mt-1">
                        Duração final: {formatDuration(finalDuration)}
                      </Typography>
                    )}
                  </div>
                  
                  {/* Duration Delta Field */}
                  <div>
                    <Input
                      name="duration_delta"
                      label="Alteração de Duração (min)"
                      type="number"
                      placeholder="Ex: 15 ou -10"
                      value={formData.duration_delta}
                      onChange={(e) => handleDurationDeltaChange(e.target.value)}
                      error={!!errors.duration_delta}
                      className="bg-bg-primary border-bg-tertiary text-text-primary"
                      labelProps={{ className: "text-text-secondary" }}
                      containerProps={{ className: "text-text-primary" }}
                      required
                    />
                    {formData.duration_delta && !errors.duration_delta && (
                      <Typography className="text-text-secondary text-sm mt-1">
                        Alteração: {formatDuration(formData.duration_delta)}
                      </Typography>
                    )}
                  </div>
                </div>
                {errors.duration_delta && (
                  <Typography className="text-status-error text-sm mt-1">
                    {errors.duration_delta}
                  </Typography>
                )}
              </div>

              {/* Price Subject to Evaluation Toggle */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.price_subject_to_evaluation || false}
                    onChange={(e) => handleInputChange('price_subject_to_evaluation', e.target.checked)}
                    color="blue"
                  />
                  <div>
                    <Typography className="text-text-primary text-sm font-medium">
                      Preço sujeito a avaliação
                    </Typography>
                    <Typography className="text-text-secondary text-xs">
                      Marque se o preço desta variação depende de avaliação
                    </Typography>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Fallback for when no serviceData is available */}
          {!isGroup && !serviceData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price Delta Field */}
                <div>
                  <Input
                    name="price_delta"
                    label="Alteração de Preço (R$)"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10.00 ou -5.00"
                    value={formData.price_delta}
                    onChange={(e) => handleInputChange('price_delta', e.target.value)}
                    error={!!errors.price_delta}
                    className="bg-bg-primary border-bg-tertiary text-text-primary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    required
                  />
                  {errors.price_delta && (
                    <Typography className="text-status-error text-sm mt-1">
                      {errors.price_delta}
                    </Typography>
                  )}
                  {formData.price_delta && !errors.price_delta && (
                    <Typography className="text-text-secondary text-sm mt-1">
                      Alteração: {formatPrice(formData.price_delta)}
                    </Typography>
                  )}
                </div>

                {/* Duration Delta Field */}
                <div>
                  <Input
                    name="duration_delta"
                    label="Alteração de Duração (min)"
                    type="number"
                    placeholder="Ex: 15 ou -10"
                    value={formData.duration_delta}
                    onChange={(e) => handleInputChange('duration_delta', e.target.value)}
                    error={!!errors.duration_delta}
                    className="bg-bg-primary border-bg-tertiary text-text-primary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    required
                  />
                  {errors.duration_delta && (
                    <Typography className="text-status-error text-sm mt-1">
                      {errors.duration_delta}
                    </Typography>
                  )}
                  {formData.duration_delta && !errors.duration_delta && (
                    <Typography className="text-text-secondary text-sm mt-1">
                      Alteração: {formatDuration(formData.duration_delta)}
                    </Typography>
                  )}
                </div>
              </div>
            </>
          )}
          
          {!isGroup && serviceData && (
            <>
              {/* Help text */}
              <div className="bg-bg-primary p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-accent-primary mt-0.5" />
                  <div>
                    <Typography className="text-text-primary text-sm font-medium mb-1">
                      Como usar:
                    </Typography>
                    <Typography className="text-text-secondary text-sm">
                      • <strong>Preço Final:</strong> Digite o preço total que o cliente pagará por esta variação
                    </Typography>
                    <Typography className="text-text-secondary text-sm">
                      • <strong>Alteração:</strong> Ou digite quanto aumentar/diminuir do preço base (+ ou -)
                    </Typography>
                    <Typography className="text-text-secondary text-sm">
                      • <strong>Sincronização:</strong> Os campos são sincronizados automaticamente
                    </Typography>
                  </div>
                </div>
              </div>
            </>
          )}
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
            {isSubmitting ? 'Salvando...' : (initialData ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default VariationForm;