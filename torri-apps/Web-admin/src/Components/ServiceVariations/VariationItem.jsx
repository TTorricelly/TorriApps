import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardBody,
  Typography,
  Button,
  Badge,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Chip,
  Input,
  Checkbox,
} from '@material-tailwind/react';
import { 
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MinusIcon,
  Bars3Icon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const VariationItem = ({ 
  variation, 
  serviceData, 
  onEdit, 
  onDelete, 
  onUpdate,
  isReadOnly = false,
  isDragging = false,
  isSelected = false,
  onSelect,
  dragHandleProps = {},
  ...props
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: variation.name || '',
    price_delta: variation.price_delta?.toString() || '0',
    duration_delta: variation.duration_delta?.toString() || '0',
  });
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);

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

  const formatDelta = (delta, type = 'price') => {
    const value = parseFloat(delta || 0);
    const isPositive = value > 0;
    const isNegative = value < 0;
    
    if (type === 'price') {
      if (value === 0) return 'Sem alteração';
      const sign = isPositive ? '+' : '';
      return `${sign}${formatPrice(value)}`;
    } else if (type === 'duration') {
      if (value === 0) return 'Sem alteração';
      const sign = isPositive ? '+' : '';
      return `${sign}${value}min`;
    }
    
    return value.toString();
  };

  const getDeltaColor = (delta) => {
    const value = parseFloat(delta || 0);
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-text-secondary';
  };

  const getDeltaIcon = (delta) => {
    const value = parseFloat(delta || 0);
    if (value > 0) return <PlusIcon className="h-3 w-3" />;
    if (value < 0) return <MinusIcon className="h-3 w-3" />;
    return null;
  };

  const calculateFinalPrice = () => {
    const basePrice = parseFloat(serviceData?.price || 0);
    const delta = parseFloat(variation.price_delta || 0);
    return basePrice + delta;
  };

  const calculateFinalDuration = () => {
    const baseDuration = parseInt(serviceData?.duration_minutes || 0);
    const delta = parseInt(variation.duration_delta || 0);
    return baseDuration + delta;
  };

  // Inline editing functions
  const startEditing = () => {
    setIsEditing(true);
    setEditData({
      name: variation.name || '',
      price_delta: variation.price_delta?.toString() || '0',
      duration_delta: variation.duration_delta?.toString() || '0',
    });
    setErrors({});
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({
      name: variation.name || '',
      price_delta: variation.price_delta?.toString() || '0',
      duration_delta: variation.duration_delta?.toString() || '0',
    });
    setErrors({});
  };

  const validateEditData = () => {
    const newErrors = {};
    
    if (!editData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    const priceDelta = parseFloat(editData.price_delta);
    if (isNaN(priceDelta) || priceDelta < -9999 || priceDelta > 9999) {
      newErrors.price_delta = 'Valor inválido';
    }
    
    const durationDelta = parseInt(editData.duration_delta);
    if (isNaN(durationDelta) || durationDelta < -480 || durationDelta > 480) {
      newErrors.duration_delta = 'Valor inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveEditing = async () => {
    if (!validateEditData()) return;
    
    try {
      const updatedData = {
        ...variation,
        name: editData.name.trim(),
        price_delta: parseFloat(editData.price_delta),
        duration_delta: parseInt(editData.duration_delta),
      };
      
      await onUpdate(updatedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating variation:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Focus name input when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <Card 
      className={`bg-bg-primary border border-bg-tertiary transition-all duration-200 ${
        isDragging ? 'shadow-lg border-accent-primary scale-105 opacity-75' : ''
      }`}
    >
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Selection checkbox */}
            {!isReadOnly && onSelect && (
              <Checkbox
                checked={isSelected}
                onChange={(e) => onSelect(e.target.checked)}
                className="text-accent-primary"
              />
            )}
            
            {/* Drag handle */}
            {!isReadOnly && (
              <div 
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing p-1 text-text-secondary hover:text-text-primary transition-colors"
                title="Arrastar para reordenar"
              >
                <Bars3Icon className="h-4 w-4" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Typography variant="h6" className="text-text-primary">
                  {variation.name}
                </Typography>
                {/* Price subject to evaluation indicator */}
                {variation.price_subject_to_evaluation && (
                  <Chip
                    variant="ghost"
                    color="amber"
                    size="sm"
                    value="Avaliação"
                    className="ml-1"
                  />
                )}
              
                {/* Status badges */}
                <div className="flex items-center gap-2">
                  {parseFloat(variation.price_delta || 0) !== 0 && (
                    <Chip
                      value={formatDelta(variation.price_delta, 'price')}
                      size="sm"
                      className={`${getDeltaColor(variation.price_delta)} bg-transparent border`}
                      icon={getDeltaIcon(variation.price_delta)}
                    />
                  )}
                  {parseInt(variation.duration_delta || 0) !== 0 && (
                    <Chip
                      value={formatDelta(variation.duration_delta, 'duration')}
                      size="sm"
                      className={`${getDeltaColor(variation.duration_delta)} bg-transparent border`}
                      icon={getDeltaIcon(variation.duration_delta)}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-text-secondary" />
                  <div>
                    <Typography variant="small" className="text-text-secondary">
                      Preço Final
                    </Typography>
                    <Typography variant="small" className="text-text-primary font-semibold">
                      {formatPrice(calculateFinalPrice())}
                    </Typography>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-text-secondary" />
                  <div>
                    <Typography variant="small" className="text-text-secondary">
                      Duração Final
                    </Typography>
                    <Typography variant="small" className="text-text-primary font-semibold">
                      {formatDuration(calculateFinalDuration())}
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Menu>
                <MenuHandler>
                  <Button
                    variant="text"
                    size="sm"
                    className="p-2 text-text-primary hover:bg-bg-secondary"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </Button>
                </MenuHandler>
                <MenuList className="bg-bg-secondary border-bg-tertiary">
                  <MenuItem 
                    onClick={() => onEdit && onEdit()}
                    className="text-text-primary hover:bg-bg-primary flex items-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Editar
                  </MenuItem>
                  <MenuItem 
                    onClick={() => onDelete && onDelete()}
                    className="text-status-error hover:bg-status-error/10 flex items-center gap-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Excluir
                  </MenuItem>
                </MenuList>
              </Menu>
            </div>
          )}
        </div>

        
        {/* Error messages for editing */}
        {isEditing && Object.keys(errors).length > 0 && (
          <div className="mt-4 pt-4 border-t border-status-error/20">
            <div className="text-sm">
              {Object.values(errors).map((error, index) => (
                <Typography key={index} className="text-status-error">
                  {error}
                </Typography>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default VariationItem;