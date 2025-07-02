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
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
} from '@material-tailwind/react';
import { 
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

import { categoriesApi } from '../../Services/categories';
import { servicesApi } from '../../Services/services';
import { stationTypesApi, serviceStationRequirementsApi } from '../../Services/stations';
import { getAssetUrl } from '../../Utils/config';

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
    service_sku: '',
    description: '',
    duration_minutes: '',
    commission_percentage: '',
    price: '',
    is_active: true,
    parallelable: false,
    max_parallel_pros: 1,
    category_id: categoryIdFromUrl || '',
  });
  
  // Image state
  const [generalImage, setGeneralImage] = useState(null);
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
  const [activeTab, setActiveTab] = useState('basic');
  const [showHairTypeImages, setShowHairTypeImages] = useState(false);
  
  // Station requirements state
  const [stationTypes, setStationTypes] = useState([]);
  const [stationRequirements, setStationRequirements] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  
  // Load data on component mount
  useEffect(() => {
    loadStationTypes(); // Always load station types
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
  const [initialGeneralImage, setInitialGeneralImage] = useState(null);
  const [initialImages, setInitialImages] = useState(null);
  
  // Helper function to compare states properly
  const hasStateChanged = () => {
    if (!initialFormData || !initialImages || initialGeneralImage === null) return false;
    
    // Compare form data
    const formDataChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    
    // Compare general image
    const generalImageChanged = (() => {
      const current = generalImage;
      const initial = initialGeneralImage;
      
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
    })();
    
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
    
    return formDataChanged || generalImageChanged || imagesChanged;
  };

  // Track changes by comparing with initial state
  useEffect(() => {
    if (initialFormData && initialImages && initialGeneralImage !== null) {
      setHasUnsavedChanges(hasStateChanged());
    }
  }, [formData, generalImage, images, initialFormData, initialGeneralImage, initialImages]);

  // Auto-expand hair type images if any are already uploaded
  useEffect(() => {
    const hasHairTypeImages = Object.values(images).some(image => image !== null);
    if (hasHairTypeImages && !showHairTypeImages) {
      setShowHairTypeImages(true);
    }
  }, [images]);
  
  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const loadStationTypes = async () => {
    try {
      setIsLoadingStations(true);
      const data = await stationTypesApi.getAll();
      setStationTypes(data);
    } catch (error) {
      console.error('Erro ao carregar tipos de estação:', error);
      showAlert('Erro ao carregar tipos de estação', 'error');
    } finally {
      setIsLoadingStations(false);
    }
  };

  const loadStationRequirements = async (serviceId) => {
    try {
      const data = await serviceStationRequirementsApi.getByServiceId(serviceId);
      setStationRequirements(data);
    } catch (error) {
      console.error('Erro ao carregar requisitos de estação:', error);
      showAlert('Erro ao carregar requisitos de estação', 'error');
    }
  };
  
  const loadService = async () => {
    try {
      setIsLoading(true);
      const serviceData = await servicesApi.getById(serviceId);
      
      
      const loadedFormData = {
        name: serviceData.name || '',
        service_sku: serviceData.service_sku || '',
        description: serviceData.description || '',
        duration_minutes: serviceData.duration_minutes?.toString() || '',
        commission_percentage: serviceData.commission_percentage?.toString() || '',
        price: serviceData.price?.toString() || '',
        is_active: serviceData.is_active ?? true,
        parallelable: serviceData.parallelable ?? false,
        max_parallel_pros: serviceData.max_parallel_pros ?? 1,
        category_id: serviceData.category_id || '',
      };
      
      // Use centralized asset URL helper
      const getFullImageUrl = getAssetUrl;

      const loadedGeneralImage = getFullImageUrl(serviceData.image);
      const loadedImages = {
        liso: getFullImageUrl(serviceData.image_liso),
        ondulado: getFullImageUrl(serviceData.image_ondulado),
        cacheado: getFullImageUrl(serviceData.image_cacheado),
        crespo: getFullImageUrl(serviceData.image_crespo),
      };
      
      
      setFormData(loadedFormData);
      setGeneralImage(loadedGeneralImage);
      setImages(loadedImages);
      
      // Save initial state for comparison
      setInitialFormData(loadedFormData);
      setInitialGeneralImage(loadedGeneralImage);
      setInitialImages(loadedImages);
      
      // Load category info
      if (serviceData.category) {
        setCategory(serviceData.category);
      } else if (serviceData.category_id) {
        loadCategory(serviceData.category_id);
      }

      // Load station requirements for this service
      await loadStationRequirements(serviceId);
      
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
        setInitialGeneralImage(null);
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
    
    if (formData.parallelable) {
      const maxParallelPros = parseInt(formData.max_parallel_pros);
      if (!maxParallelPros || maxParallelPros < 1 || maxParallelPros > 10) {
        newErrors.max_parallel_pros = 'Valor deve estar entre 1 e 10';
      }
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
    let updatedFormData = { ...formData, [field]: value };
    
    // Special handling for parallelable field
    if (field === 'parallelable' && !value) {
      // Reset max_parallel_pros to 1 when parallelable is turned off
      updatedFormData.max_parallel_pros = 1;
    }
    
    setFormData(updatedFormData);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const handleImageChange = (type, file) => {
    setImages(prev => ({ ...prev, [type]: file }));
  };

  const handleStationRequirementAdd = (stationTypeId) => {
    const existingRequirement = (Array.isArray(stationRequirements) ? stationRequirements : []).find(req => req.station_type_id === stationTypeId);
    if (existingRequirement) return; // Already exists

    const stationType = (Array.isArray(stationTypes) ? stationTypes : []).find(type => type.id === stationTypeId);
    if (!stationType) return;

    const newRequirement = {
      station_type_id: stationTypeId,
      qty: 1,
      station_type: stationType,
      _isNew: true // Flag to identify new requirements
    };

    setStationRequirements(prev => [...prev, newRequirement]);
  };

  const handleStationRequirementRemove = (stationTypeId) => {
    setStationRequirements(prev => prev.filter(req => req.station_type_id !== stationTypeId));
  };

  const handleStationRequirementQuantityChange = (stationTypeId, qty) => {
    setStationRequirements(prev => 
      prev.map(req => 
        req.station_type_id === stationTypeId 
          ? { ...req, qty: parseInt(qty) || 1 }
          : req
      )
    );
  };

  const saveStationRequirements = async (serviceId) => {
    // Get original requirements if editing
    let originalRequirements = [];
    if (isEdit) {
      try {
        originalRequirements = await serviceStationRequirementsApi.getByServiceId(serviceId);
      } catch (error) {
        console.warn('Could not load original requirements for comparison');
      }
    }

    // Determine what to add, update, and delete
    const currentRequirements = stationRequirements;
    const toDelete = originalRequirements.filter(
      orig => !currentRequirements.some(curr => curr.station_type_id === orig.station_type_id)
    );
    const toAdd = currentRequirements.filter(curr => curr._isNew);
    const toUpdate = currentRequirements.filter(
      curr => !curr._isNew && originalRequirements.some(
        orig => orig.station_type_id === curr.station_type_id && orig.qty !== curr.qty
      )
    );

    // Delete removed requirements
    for (const requirement of toDelete) {
      await serviceStationRequirementsApi.delete(serviceId, requirement.station_type_id);
    }

    // Add new requirements
    for (const requirement of toAdd) {
      await serviceStationRequirementsApi.create({
        service_id: serviceId,
        station_type_id: requirement.station_type_id,
        qty: requirement.qty
      });
    }

    // Update modified requirements
    for (const requirement of toUpdate) {
      await serviceStationRequirementsApi.update(
        serviceId,
        requirement.station_type_id,
        { qty: requirement.qty }
      );
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Determine which tab contains the first error and switch to it
      const firstErrorField = Object.keys(errors)[0];
      let targetTab = 'basic';
      
      if (['name', 'duration_minutes', 'price', 'commission_percentage', 'is_active'].includes(firstErrorField)) {
        targetTab = 'basic';
      } else if (['parallelable', 'max_parallel_pros'].includes(firstErrorField)) {
        targetTab = 'config';
      } else if (['generalImage', 'image_liso', 'image_ondulado', 'image_cacheado', 'image_crespo'].includes(firstErrorField)) {
        targetTab = 'images';
      } else if (['description'].includes(firstErrorField)) {
        targetTab = 'description';
      } else if (firstErrorField.startsWith('station_')) {
        targetTab = 'stations';
      }
      
      setActiveTab(targetTab);
      
      // Show alert about validation errors
      showAlert('Por favor, corrija os erros nos campos destacados', 'error');
      return;
    }
    
    try {
      setIsSaving(true);
      
      const serviceData = {
        name: formData.name.trim(),
        service_sku: formData.service_sku,
        description: formData.description,
        duration_minutes: parseInt(formData.duration_minutes),
        commission_percentage: parseFloat(formData.commission_percentage),
        price: parseFloat(formData.price),
        is_active: formData.is_active,
        parallelable: formData.parallelable,
        max_parallel_pros: parseInt(formData.max_parallel_pros),
        category_id: formData.category_id,
        professional_ids: [], // Can be extended later
      };
      
      let result;
      if (isEdit) {
        result = await servicesApi.update(serviceId, serviceData);
        if (!result) {
          throw new Error('Falha ao atualizar serviço - resposta vazia do servidor');
        }
        showAlert('Serviço atualizado com sucesso!', 'success');
      } else {
        result = await servicesApi.create(serviceData);
        if (!result) {
          throw new Error('Falha ao criar serviço - resposta vazia do servidor');
        }
        showAlert('Serviço criado com sucesso!', 'success');
      }
      
      // Ensure we have a valid service ID before proceeding
      if (!result || !result.id) {
        throw new Error('Serviço salvo mas ID não encontrado');
      }
      
      // Handle general image upload if a file was selected
      if (generalImage && typeof generalImage === 'object' && generalImage.name) {
        try {
          await servicesApi.uploadImage(result.id, generalImage);
        } catch (error) {
          console.warn('Erro ao fazer upload da imagem:', error);
          showAlert('Serviço salvo, mas houve erro no upload da imagem', 'warning');
        }
      }
      
      // Handle hair type image uploads if any files were selected
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

      // Handle station requirements
      try {
        await saveStationRequirements(result.id);
      } catch (error) {
        console.warn('Erro ao salvar requisitos de estação:', error);
        showAlert('Serviço salvo, mas houve erro ao salvar requisitos de estação', 'warning');
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
          </div>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          <form onSubmit={handleSubmit}>
            {/* Tab Navigation */}
            <Tabs value={activeTab} orientation="horizontal" className="w-full">
              <TabsHeader 
                className="bg-bg-primary"
                indicatorProps={{
                  className: "bg-accent-primary shadow-none"
                }}
              >
                <Tab
                  value="basic"
                  onClick={() => setActiveTab('basic')}
                  className={`${activeTab === 'basic' ? 'text-white' : 'text-text-secondary'} font-medium relative`}
                >
                  Informações Básicas
                  {/* Error indicator for basic tab */}
                  {Object.keys(errors).some(field => ['name', 'duration_minutes', 'price', 'commission_percentage'].includes(field)) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-error rounded-full"></span>
                  )}
                </Tab>
                <Tab
                  value="config"
                  onClick={() => setActiveTab('config')}
                  className={`${activeTab === 'config' ? 'text-white' : 'text-text-secondary'} font-medium relative`}
                >
                  Configurações
                  {/* Error indicator for config tab */}
                  {Object.keys(errors).some(field => ['max_parallel_pros'].includes(field)) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-error rounded-full"></span>
                  )}
                </Tab>
                <Tab
                  value="images"
                  onClick={() => setActiveTab('images')}
                  className={`${activeTab === 'images' ? 'text-white' : 'text-text-secondary'} font-medium relative`}
                >
                  Imagens
                  {/* Error indicator for images tab */}
                  {Object.keys(errors).some(field => ['generalImage', 'image_liso', 'image_ondulado', 'image_cacheado', 'image_crespo'].includes(field)) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-error rounded-full"></span>
                  )}
                </Tab>
                <Tab
                  value="description"
                  onClick={() => setActiveTab('description')}
                  className={`${activeTab === 'description' ? 'text-white' : 'text-text-secondary'} font-medium relative`}
                >
                  Descrição
                  {/* Error indicator for description tab */}
                  {errors.description && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-error rounded-full"></span>
                  )}
                </Tab>
                <Tab
                  value="stations"
                  onClick={() => setActiveTab('stations')}
                  className={`${activeTab === 'stations' ? 'text-white' : 'text-text-secondary'} font-medium relative`}
                >
                  Estações
                  {/* Error indicator for stations tab */}
                  {Object.keys(errors).some(field => field.startsWith('station_')) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-error rounded-full"></span>
                  )}
                </Tab>
              </TabsHeader>

              <TabsBody className="mt-6">
                {/* Tab 1: Basic Information */}
                <TabPanel value="basic" className="p-0">
                  <div className="space-y-6 mt-4">
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

                    {/* Service SKU */}
                    <div>
                      <Input
                        name="service_sku"
                        label="SKU do Serviço"
                        placeholder="Digite o SKU do serviço"
                        value={formData.service_sku}
                        onChange={(e) => handleInputChange('service_sku', e.target.value)}
                        error={!!errors.service_sku}
                        className="bg-bg-primary border-bg-tertiary text-text-primary"
                        labelProps={{ className: "text-text-secondary" }}
                        containerProps={{ className: "text-text-primary" }}
                      />
                      {errors.service_sku && (
                        <Typography className="text-status-error text-sm mt-1">
                          {errors.service_sku}
                        </Typography>
                      )}
                    </div>

                    {/* Duration and Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    {/* Commission and Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      
                      <div className="flex items-center gap-3 pt-6">
                        <Switch
                          checked={formData.is_active}
                          onChange={(e) => handleInputChange('is_active', e.target.checked)}
                          color="blue"
                        />
                        <Typography className="text-text-primary">
                          Serviço Ativo
                        </Typography>
                      </div>
                    </div>
                  </div>
                </TabPanel>

                {/* Tab 2: Configuration Settings */}
                <TabPanel value="config" className="p-0">
                  <div className="space-y-6 mt-4 px-1">
                    <Typography variant="h6" className="text-text-primary mb-4">
                      Configurações de Execução
                    </Typography>
                    
                    {/* Parallel Execution Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={formData.parallelable}
                            onChange={(e) => handleInputChange('parallelable', e.target.checked)}
                            color="blue"
                          />
                          <div>
                            <Typography className="text-text-primary font-medium">
                              Serviço Paralelizável
                            </Typography>
                            <Typography className="text-text-secondary text-sm">
                              Permite execução simultânea com outros serviços
                            </Typography>
                          </div>
                        </div>
                        
                        <div className="bg-bg-primary p-4 rounded-lg">
                          <Typography className="text-text-secondary text-sm">
                            <strong>Paralelizável:</strong> Quando ativado, este serviço pode ser executado 
                            simultaneamente com outros serviços paralelos, otimizando o tempo de atendimento 
                            e aumentando a eficiência do salão.
                          </Typography>
                        </div>
                      </div>
                      
                      <div>
                        <Input
                          name="max_parallel_pros"
                          label="Máximo de Profissionais Simultâneos"
                          type="number"
                          placeholder="Ex.: 2"
                          value={formData.max_parallel_pros}
                          onChange={(e) => handleInputChange('max_parallel_pros', e.target.value)}
                          error={!!errors.max_parallel_pros}
                          className="bg-bg-primary border-bg-tertiary text-text-primary"
                          labelProps={{ className: "text-text-secondary" }}
                          containerProps={{ className: "text-text-primary" }}
                          min="1"
                          max="10"
                          disabled={!formData.parallelable}
                        />
                        {errors.max_parallel_pros && (
                          <Typography className="text-status-error text-sm mt-1">
                            {errors.max_parallel_pros}
                          </Typography>
                        )}
                        {!formData.parallelable ? (
                          <Typography className="text-text-tertiary text-sm mt-1">
                            Disponível apenas para serviços paralelizáveis
                          </Typography>
                        ) : (
                          <Typography className="text-text-secondary text-sm mt-1">
                            Número máximo de profissionais que podem executar este serviço simultaneamente
                          </Typography>
                        )}
                      </div>
                    </div>
                  </div>
                </TabPanel>

                {/* Tab 3: Images */}
                <TabPanel value="images" className="p-0">
                  <div className="space-y-6 mt-4 px-1">
                    {/* Main Image Section - Primary Focus */}
                    <div className="bg-bg-primary p-6 rounded-lg border border-bg-tertiary">
                      <div className="flex items-center gap-2 mb-3">
                        <PhotoIcon className="h-5 w-5 text-accent-primary" />
                        <Typography variant="h6" className="text-text-primary">
                          Imagem Principal
                        </Typography>
                      </div>
                      <Typography className="text-text-secondary text-sm mb-4">
                        A imagem que representa este serviço nos listagens e detalhes.
                      </Typography>
                      
                      <div className="max-w-xs">
                        <ImageUpload
                          label="Imagem do Serviço"
                          value={generalImage}
                          onChange={setGeneralImage}
                          error={errors.generalImage}
                          showAlert={showAlert}
                        />
                      </div>
                    </div>
                    
                    {/* Hair Type Images Section - Collapsible Advanced Option */}
                    <div className="border border-bg-tertiary rounded-lg">
                      {/* Header with toggle */}
                      <button
                        type="button"
                        onClick={() => setShowHairTypeImages(!showHairTypeImages)}
                        className="w-full flex items-center justify-between p-4 hover:bg-bg-primary/50 transition-colors rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <InformationCircleIcon className="h-5 w-5 text-text-secondary" />
                          <Typography variant="h6" className="text-text-primary">
                            Imagens por Tipo de Cabelo
                          </Typography>
                          <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded-full font-medium">
                            Opcional
                          </span>
                          {Object.values(images).filter(image => image !== null).length > 0 && (
                            <span className="px-2 py-1 bg-status-success/20 text-status-success text-xs rounded-full font-medium">
                              {Object.values(images).filter(image => image !== null).length} de 4
                            </span>
                          )}
                        </div>
                        {showHairTypeImages ? (
                          <ChevronUpIcon className="h-5 w-5 text-text-secondary" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-text-secondary" />
                        )}
                      </button>
                      
                      {/* Collapsible Content */}
                      {showHairTypeImages && (
                        <div className="p-4 pt-0">
                          <div className="bg-accent-primary/10 p-3 rounded-lg mb-4">
                            <Typography className="text-text-secondary text-sm">
                              💡 <strong>Para serviços de cabelo:</strong> Faça upload de imagens específicas para cada tipo de cabelo 
                              para mostrar resultados personalizados aos clientes.
                            </Typography>
                          </div>
                          
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
                      )}
                    </div>
                    
                    {/* Quick Tips */}
                    <div className="bg-bg-primary/50 p-4 rounded-lg">
                      <Typography className="text-text-secondary text-sm">
                        <strong>Dicas:</strong> JPG/PNG • Máx. 2MB • Recomendado: 800×800px • 
                        Use imagens claras que mostrem bem o resultado do serviço
                      </Typography>
                    </div>
                  </div>
                </TabPanel>

                {/* Tab 4: Description */}
                <TabPanel value="description" className="p-0">
                  <div className="space-y-4 mt-4 px-1">
                    <Typography variant="h6" className="text-text-primary mb-4">
                      Descrição Detalhada do Serviço
                    </Typography>
                    
                    <RichTextEditor
                      value={formData.description}
                      onChange={(value) => handleInputChange('description', value)}
                      placeholder="Descreva em detalhes este serviço: processos, benefícios, recomendações de pós-tratamento, tempo de resultado, cuidados especiais, etc."
                      error={errors.description}
                    />
                  </div>
                </TabPanel>

                {/* Tab 5: Stations */}
                <TabPanel value="stations" className="p-0">
                  <div className="space-y-6 mt-4 px-1">
                    <Typography variant="h6" className="text-text-primary mb-4">
                      Requisitos de Estações
                    </Typography>
                    
                    <Typography className="text-text-secondary text-sm mb-4">
                      Defina quais tipos de estações são necessárias para executar este serviço e quantas de cada tipo.
                    </Typography>

                    {isLoadingStations ? (
                      <div className="flex justify-center py-8">
                        <Spinner className="h-6 w-6" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Add Station Requirement Section */}
                        <div className="bg-bg-primary p-4 rounded-lg border border-bg-tertiary">
                          <Typography className="text-text-primary font-medium mb-3">
                            Adicionar Tipo de Estação
                          </Typography>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {(Array.isArray(stationTypes) ? stationTypes : [])
                              .filter(type => !(Array.isArray(stationRequirements) ? stationRequirements : []).some(req => req.station_type_id === type.id))
                              .map((stationType) => (
                                <button
                                  key={stationType.id}
                                  type="button"
                                  onClick={() => handleStationRequirementAdd(stationType.id)}
                                  className="p-3 bg-bg-secondary border border-bg-tertiary rounded-lg hover:bg-accent-primary/10 hover:border-accent-primary transition-colors text-left"
                                >
                                  <Typography className="text-text-primary font-medium text-sm">
                                    {stationType.name}
                                  </Typography>
                                  <Typography className="text-text-tertiary text-xs mt-1">
                                    {stationType.code}
                                  </Typography>
                                </button>
                              ))}
                          </div>
                          
                          {(Array.isArray(stationTypes) ? stationTypes : []).filter(type => !(Array.isArray(stationRequirements) ? stationRequirements : []).some(req => req.station_type_id === type.id)).length === 0 && (
                            <Typography className="text-text-secondary text-sm">
                              Todos os tipos de estação disponíveis já foram adicionados.
                            </Typography>
                          )}
                        </div>

                        {/* Current Station Requirements */}
                        {(Array.isArray(stationRequirements) ? stationRequirements : []).length > 0 && (
                          <div className="space-y-3">
                            <Typography className="text-text-primary font-medium">
                              Estações Necessárias ({(Array.isArray(stationRequirements) ? stationRequirements : []).length})
                            </Typography>
                            
                            {(Array.isArray(stationRequirements) ? stationRequirements : []).map((requirement) => (
                              <div
                                key={requirement.station_type_id}
                                className="flex items-center justify-between p-4 bg-bg-secondary border border-bg-tertiary rounded-lg"
                              >
                                <div className="flex-1">
                                  <Typography className="text-text-primary font-medium">
                                    {requirement.station_type?.name || 'Tipo de Estação'}
                                  </Typography>
                                  <Typography className="text-text-secondary text-sm">
                                    {requirement.station_type?.code || 'N/A'}
                                  </Typography>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <Typography className="text-text-secondary text-sm">
                                      Quantidade:
                                    </Typography>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={requirement.qty}
                                      onChange={(e) => handleStationRequirementQuantityChange(requirement.station_type_id, e.target.value)}
                                      className="bg-bg-primary border-bg-tertiary text-text-primary w-20"
                                      containerProps={{ className: "text-text-primary min-w-0" }}
                                    />
                                  </div>
                                  
                                  <Button
                                    size="sm"
                                    variant="outlined"
                                    color="red"
                                    onClick={() => handleStationRequirementRemove(requirement.station_type_id)}
                                    className="border-status-error text-status-error hover:bg-status-error/10 p-2"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {(Array.isArray(stationRequirements) ? stationRequirements : []).length === 0 && (
                          <div className="text-center py-8">
                            <Typography className="text-text-secondary">
                              Nenhuma estação foi definida como necessária para este serviço.
                            </Typography>
                            <Typography className="text-text-tertiary text-sm mt-1">
                              Adicione tipos de estação acima para especificar os recursos necessários.
                            </Typography>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabPanel>
              </TabsBody>
            </Tabs>
            
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