import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Switch,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
} from '@material-tailwind/react';
import { 
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { categoriesApi } from '../../Services/categories';
import { servicesApi } from '../../Services/services';

// Rich Text Editor (simple implementation)
const RichTextEditor = ({ value, onChange, placeholder, error }) => {
  const [focused, setFocused] = useState(false);
  const editorRef = React.useRef(null);
  const [isComposing, setIsComposing] = useState(false);
  
  // Save and restore cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  };

  const restoreCursorPosition = (range) => {
    if (range) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      try {
        selection.addRange(range);
      } catch (e) {
        // If range is invalid, place cursor at end
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        selection.addRange(newRange);
      }
    }
  };

  // Initialize content on mount and when value changes from outside
  React.useEffect(() => {
    if (editorRef.current && !isComposing && !focused) {
      const currentContent = editorRef.current.innerHTML;
      const newContent = value || '';
      if (currentContent !== newContent) {
        // Ensure proper HTML structure when loading content
        editorRef.current.innerHTML = newContent;
      }
    }
  }, [value, isComposing, focused]);

  const handleInput = (e) => {
    // Don't interfere with composition (IME) input
    if (!isComposing) {
      onChange(e.target.innerHTML);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    onChange(e.target.innerHTML);
  };

  const handleKeyDown = (e) => {
    // Handle special key combinations
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'u':
          e.preventDefault();
          formatText('underline');
          break;
      }
    }
    
  };

  const formatText = (command, value = null) => {
    const savedRange = saveCursorPosition();
    
    // Handle special commands that need custom implementation
    if (command === 'formatBlock') {
      handleFormatBlock(value);
    } else {
      // Use execCommand for simple formatting (bold, italic, underline)
      document.execCommand(command, false, value);
    }
    
    // Update content and restore cursor
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      // Restore cursor position after a small delay to allow DOM updates
      setTimeout(() => {
        if (editorRef.current && savedRange) {
          restoreCursorPosition(savedRange);
        }
      }, 10);
    }
  };

  const handleFormatBlock = (tag) => {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    // Find the current block element
    let blockElement = range.commonAncestorContainer;
    if (blockElement.nodeType === Node.TEXT_NODE) {
      blockElement = blockElement.parentElement;
    }
    
    // Find the closest block-level element
    while (blockElement && blockElement !== editorRef.current && 
           !['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockElement.tagName)) {
      blockElement = blockElement.parentElement;
    }
    
    if (blockElement && blockElement !== editorRef.current) {
      // Create new element with the desired tag
      const newElement = document.createElement(tag);
      newElement.innerHTML = blockElement.innerHTML;
      
      // Replace the old element
      blockElement.parentNode.replaceChild(newElement, blockElement);
      
      // Restore selection to the new element
      const newRange = document.createRange();
      newRange.selectNodeContents(newElement);
      if (selectedText) {
        // Try to restore the original selection
        newRange.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  };


  const handleFocus = () => {
    setFocused(true);
    // If content is empty and we have a placeholder, clear it
    if (editorRef.current && editorRef.current.innerHTML === placeholder) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleBlur = () => {
    setFocused(false);
    // If content is empty, don't show placeholder in the editor
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = '';
    }
  };

  return (
    <div className="rich-text-display border border-bg-tertiary rounded-lg bg-bg-primary">
      {/* Toolbar */}
      <div className="border-b border-bg-tertiary p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => formatText('bold')}
          className="px-2 py-1 text-text-primary hover:bg-bg-tertiary rounded text-sm font-bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => formatText('italic')}
          className="px-2 py-1 text-text-primary hover:bg-bg-tertiary rounded text-sm italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => formatText('underline')}
          className="px-2 py-1 text-text-primary hover:bg-bg-tertiary rounded text-sm underline"
        >
          U
        </button>
        <div className="w-px bg-bg-tertiary mx-1"></div>
        <button
          type="button"
          onClick={() => formatText('formatBlock', 'h2')}
          className="px-2 py-1 text-text-primary hover:bg-bg-tertiary rounded text-sm"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => formatText('formatBlock', 'h3')}
          className="px-2 py-1 text-text-primary hover:bg-bg-tertiary rounded text-sm"
        >
          H3
        </button>
      </div>
      
      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`p-4 min-h-[300px] max-h-[600px] overflow-y-auto text-text-primary focus:outline-none ${
          !value && !focused ? 'text-text-tertiary' : ''
        }`}
        style={{ 
          wordBreak: 'break-word',
          direction: 'ltr',
          textAlign: 'left'
        }}
        placeholder={!focused && !value ? placeholder : ''}
        suppressContentEditableWarning={true}
      />
      
      {/* Character count */}
      <div className="border-t border-bg-tertiary p-2 flex justify-between items-center text-sm">
        <div className="text-text-tertiary">
          {value ? value.replace(/<[^>]*>/g, '').length : 0} / 5000 caracteres
        </div>
        {error && (
          <div className="text-status-error">{error}</div>
        )}
      </div>
    </div>
  );
};

// Simplified Image Upload Component (following working category pattern)
const ImageUpload = ({ label, value, onChange, error, showAlert }) => {
  const fileInputRef = React.useRef(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      showAlert('Arquivo muito grande. Máximo 2MB permitido.', 'error');
      e.target.value = ''; // Reset input
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      showAlert('Apenas arquivos JPEG, JPG e PNG são permitidos.', 'error');
      e.target.value = ''; // Reset input
      return;
    }
    
    // Call onChange with the file
    onChange(file);
  };
  
  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Check if value is a URL string (existing image) or File object (new upload)
  const hasImage = value && (typeof value === 'string' || value instanceof File);
  const imageUrl = typeof value === 'string' ? value : (value instanceof File ? URL.createObjectURL(value) : null);
  
  return (
    <div className="flex flex-col">
      <Typography className="text-text-primary font-medium mb-2">
        {label}
      </Typography>
      
      {/* Show current image if exists */}
      {hasImage && imageUrl && (
        <div className="mb-2">
          <Typography className="text-text-secondary text-sm mb-2">
            {typeof value === 'string' ? 'Imagem atual:' : 'Nova imagem:'}
          </Typography>
          <div className="relative inline-block">
            <img
              src={imageUrl}
              alt={label}
              className="w-20 h-20 object-cover rounded-lg border border-bg-tertiary"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-status-error text-white rounded-full p-1 hover:bg-status-error/80"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      
      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileChange}
        className="w-full px-3 py-2 rounded-lg border border-bg-tertiary bg-bg-primary text-text-primary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-accent-primary/10 file:text-accent-primary hover:file:bg-accent-primary/20 transition-colors"
      />
      
      <Typography className="text-text-tertiary text-sm mt-1">
        {hasImage ? 'Selecione um novo arquivo para substituir a imagem atual.' : 'JPG, PNG (máx. 2MB)'}
      </Typography>
      
      {error && (
        <Typography className="text-status-error text-sm mt-1">
          {error}
        </Typography>
      )}
    </div>
  );
};

export default function ServiceForm() {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const location = useLocation();
  const isEdit = Boolean(serviceId);
  
  // Get category ID from URL params
  const urlParams = new URLSearchParams(location.search);
  const categoryIdFromUrl = urlParams.get('categoryId');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: '',
    commission_percentage: '',
    price: '',
    is_active: true,
    category_id: categoryIdFromUrl || '',
  });
  
  // Image state
  const [images, setImages] = useState({
    liso: null,
    ondulado: null,
    cacheado: null,
    crespo: null,
  });
  
  // UI state
  const [category, setCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Load data on component mount
  useEffect(() => {
    if (isEdit) {
      loadService();
    } else if (categoryIdFromUrl) {
      loadCategory();
    } else {
      navigate('/services');
    }
  }, [serviceId, categoryIdFromUrl]);
  
  // Track initial state for comparison
  const [initialFormData, setInitialFormData] = useState(null);
  const [initialImages, setInitialImages] = useState(null);
  
  // Helper function to compare states properly
  const hasStateChanged = () => {
    if (!initialFormData || !initialImages) return false;
    
    // Compare form data
    const formDataChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    
    // Compare images more carefully (File objects vs URLs)
    const imageKeys = ['liso', 'ondulado', 'cacheado', 'crespo'];
    const imagesChanged = imageKeys.some(key => {
      const current = images[key];
      const initial = initialImages[key];
      
      // If both are null/undefined, no change
      if (!current && !initial) return false;
      
      // If one is null and other isn't, it's a change
      if (!current || !initial) return true;
      
      // If current is a File object (new upload), it's a change
      if (current instanceof File) return true;
      
      // If both are strings (URLs), compare them
      if (typeof current === 'string' && typeof initial === 'string') {
        return current !== initial;
      }
      
      // Any other case, consider it a change
      return true;
    });
    
    return formDataChanged || imagesChanged;
  };

  // Track changes by comparing with initial state
  useEffect(() => {
    if (initialFormData && initialImages) {
      setHasUnsavedChanges(hasStateChanged());
    }
  }, [formData, images, initialFormData, initialImages]);
  
  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };
  
  const loadService = async () => {
    try {
      setIsLoading(true);
      const serviceData = await servicesApi.getById(serviceId);
      
      
      const loadedFormData = {
        name: serviceData.name || '',
        description: serviceData.description || '',
        duration_minutes: serviceData.duration_minutes?.toString() || '',
        commission_percentage: serviceData.commission_percentage?.toString() || '',
        price: serviceData.price?.toString() || '',
        is_active: serviceData.is_active ?? true,
        category_id: serviceData.category_id || '',
      };
      
      // Helper function to convert relative paths to full URLs
      const getFullImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath; // Already full URL
        return `http://localhost:8000${imagePath}`; // Add base URL
      };

      const loadedImages = {
        liso: getFullImageUrl(serviceData.image_liso),
        ondulado: getFullImageUrl(serviceData.image_ondulado),
        cacheado: getFullImageUrl(serviceData.image_cacheado),
        crespo: getFullImageUrl(serviceData.image_crespo),
      };
      
      
      setFormData(loadedFormData);
      setImages(loadedImages);
      
      // Save initial state for comparison
      setInitialFormData(loadedFormData);
      setInitialImages(loadedImages);
      
      // Load category info
      if (serviceData.category) {
        setCategory(serviceData.category);
      } else if (serviceData.category_id) {
        loadCategory(serviceData.category_id);
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Erro ao carregar serviço:', error);
      showAlert('Erro ao carregar dados do serviço', 'error');
      navigate('/services');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadCategory = async (categoryId = categoryIdFromUrl) => {
    try {
      const categoryData = await categoriesApi.getById(categoryId);
      setCategory(categoryData);
      
      // For new services, save the initial empty state for comparison
      if (!isEdit) {
        setInitialFormData(formData);
        setInitialImages(images);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Erro ao carregar categoria:', error);
      showAlert('Erro ao carregar categoria', 'error');
      navigate('/services');
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campo obrigatório';
    }
    
    const duration = parseInt(formData.duration_minutes);
    if (!duration || duration < 5 || duration > 480) {
      newErrors.duration_minutes = 'Valor deve estar entre 5 e 480';
    }
    
    const commission = parseFloat(formData.commission_percentage);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      newErrors.commission_percentage = 'Informe uma porcentagem entre 0 e 100';
    }
    
    const price = parseFloat(formData.price);
    if (!price || price <= 0) {
      newErrors.price = 'Informe um valor monetário válido';
    }
    
    if (!formData.description || formData.description.replace(/<[^>]*>/g, '').trim().length < 10) {
      newErrors.description = 'Descrição obrigatória (mínimo 10 caracteres)';
    }
    
    if (formData.description && formData.description.length > 5000) {
      newErrors.description = 'Descrição muito longa (máximo 5000 caracteres)';
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
  
  const handleImageChange = (type, file) => {
    setImages(prev => ({ ...prev, [type]: file }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    try {
      setIsSaving(true);
      
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description,
        duration_minutes: parseInt(formData.duration_minutes),
        commission_percentage: parseFloat(formData.commission_percentage),
        price: parseFloat(formData.price),
        is_active: formData.is_active,
        category_id: formData.category_id,
        professional_ids: [], // Can be extended later
      };
      
      let result;
      if (isEdit) {
        result = await servicesApi.update(serviceId, serviceData);
        showAlert('Serviço atualizado com sucesso!', 'success');
      } else {
        result = await servicesApi.create(serviceData);
        showAlert('Serviço criado com sucesso!', 'success');
      }
      
      // Handle image uploads if any files were selected
      const imageFiles = {};
      Object.keys(images).forEach(type => {
        if (images[type] && typeof images[type] === 'object' && images[type].name) {
          imageFiles[type] = images[type];
        }
      });
      
      if (Object.keys(imageFiles).length > 0) {
        try {
          await servicesApi.uploadImages(result.id, imageFiles);
        } catch (error) {
          console.warn('Erro ao fazer upload das imagens:', error);
          showAlert('Serviço salvo, mas houve erro no upload das imagens', 'warning');
        }
      }
      
      navigate('/services');
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      if (error.response?.data?.detail) {
        showAlert(`Erro ao salvar serviço: ${error.response.data.detail}`, 'error');
      } else {
        showAlert('Falha ao salvar serviço', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelDialog(true);
    } else {
      navigate('/services');
    }
  };
  
  const confirmCancel = () => {
    setCancelDialog(false);
    navigate('/services');
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
      
      <Card className="bg-bg-secondary border-bg-tertiary max-w-4xl mx-auto">
        <CardHeader floated={false} shadow={false} className="bg-bg-secondary">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="text"
              className="flex items-center gap-2 text-accent-primary hover:bg-accent-primary/10"
              onClick={handleCancel}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Voltar para Serviços
            </Button>
          </div>
          
          <div className="mb-4">
            <Typography variant="h4" className="text-text-primary">
              {isEdit ? 'Editar Serviço' : 'Criar Novo Serviço'}
            </Typography>
            {isEdit && formData.name && (
              <Typography className="text-text-secondary mt-1">
                Editando: {formData.name}
              </Typography>
            )}
          </div>
          
          {/* Category info */}
          {category && (
            <div className="bg-bg-primary p-3 rounded-lg">
              <Typography className="text-text-secondary text-sm">
                Categoria:
              </Typography>
              <Typography className="text-text-primary font-medium">
                {category.name}
              </Typography>
            </div>
          )}
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div>
              <Typography variant="h6" className="text-text-primary mb-4">
                Informações Básicas
              </Typography>
              
              <div className="grid gap-4">
                {/* Service Name */}
                <div>
                  <Input
                    name="name"
                    label="Nome do Serviço"
                    placeholder="Digite o nome do serviço"
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
                
                {/* Duration, Commission, Price, Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Input
                      name="duration_minutes"
                      label="Duração (minutos)"
                      type="number"
                      placeholder="Ex.: 45"
                      value={formData.duration_minutes}
                      onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                      error={!!errors.duration_minutes}
                      className="bg-bg-primary border-bg-tertiary text-text-primary"
                      labelProps={{ className: "text-text-secondary" }}
                      containerProps={{ className: "text-text-primary" }}
                      min="5"
                      max="480"
                      required
                    />
                    {errors.duration_minutes && (
                      <Typography className="text-status-error text-sm mt-1">
                        {errors.duration_minutes}
                      </Typography>
                    )}
                  </div>
                  
                  <div>
                    <Input
                      name="commission_percentage"
                      label="Comissão (%)"
                      type="number"
                      step="0.01"
                      placeholder="Ex.: 15.00"
                      value={formData.commission_percentage}
                      onChange={(e) => handleInputChange('commission_percentage', e.target.value)}
                      error={!!errors.commission_percentage}
                      className="bg-bg-primary border-bg-tertiary text-text-primary"
                      labelProps={{ className: "text-text-secondary" }}
                      containerProps={{ className: "text-text-primary" }}
                      min="0"
                      max="100"
                      required
                    />
                    {errors.commission_percentage && (
                      <Typography className="text-status-error text-sm mt-1">
                        {errors.commission_percentage}
                      </Typography>
                    )}
                  </div>
                  
                  <div>
                    <Input
                      name="price"
                      label="Preço (R$)"
                      type="number"
                      step="0.01"
                      placeholder="Ex.: 80.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      error={!!errors.price}
                      className="bg-bg-primary border-bg-tertiary text-text-primary"
                      labelProps={{ className: "text-text-secondary" }}
                      containerProps={{ className: "text-text-primary" }}
                      min="0"
                      required
                    />
                    {errors.price && (
                      <Typography className="text-status-error text-sm mt-1">
                        {errors.price}
                      </Typography>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      color="blue"
                    />
                    <Typography className="text-text-primary">
                      Ativo
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Images Section */}
            <div>
              <Typography variant="h6" className="text-text-primary mb-2">
                Imagens (por Tipo de Cabelo)
              </Typography>
              <Typography className="text-text-secondary text-sm mb-4">
                Faça upload de até 4 imagens (JPG/PNG máximo 2 MB), uma para cada tipo de cabelo. Tamanho recomendado: 800×800px.
              </Typography>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ImageUpload
                  label="Liso"
                  value={images.liso}
                  onChange={(file) => handleImageChange('liso', file)}
                  error={errors.image_liso}
                  showAlert={showAlert}
                />
                <ImageUpload
                  label="Ondulado"
                  value={images.ondulado}
                  onChange={(file) => handleImageChange('ondulado', file)}
                  error={errors.image_ondulado}
                  showAlert={showAlert}
                />
                <ImageUpload
                  label="Cacheado"
                  value={images.cacheado}
                  onChange={(file) => handleImageChange('cacheado', file)}
                  error={errors.image_cacheado}
                  showAlert={showAlert}
                />
                <ImageUpload
                  label="Crespo"
                  value={images.crespo}
                  onChange={(file) => handleImageChange('crespo', file)}
                  error={errors.image_crespo}
                  showAlert={showAlert}
                />
              </div>
            </div>
            
            {/* Description Section */}
            <div>
              <Typography variant="h6" className="text-text-primary mb-4">
                Descrição Detalhada
              </Typography>
              
              <RichTextEditor
                value={formData.description}
                onChange={(value) => handleInputChange('description', value)}
                placeholder="Descreva em detalhes este serviço: processos, benefícios, recomendações de pós-tratamento, etc."
                error={errors.description}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t border-bg-tertiary">
              <Button
                type="button"
                variant="outlined"
                onClick={handleCancel}
                disabled={isSaving}
                className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-accent-primary hover:bg-accent-primary/90 flex items-center justify-center gap-2"
              >
                {isSaving && <Spinner className="h-4 w-4" />}
                {isSaving ? 'Salvando...' : 'Salvar Serviço'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      
      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialog}
        handler={() => setCancelDialog(false)}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Alterações Não Salvas
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Há alterações não salvas. Deseja descartar e voltar?
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setCancelDialog(false)}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Manter Edição
          </Button>
          <Button
            onClick={confirmCancel}
            className="bg-status-error hover:bg-status-error/90"
          >
            Descartar e Voltar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}