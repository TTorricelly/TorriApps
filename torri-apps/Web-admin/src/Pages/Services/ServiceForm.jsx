import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useNavigation } from '../../shared/hooks/useNavigation';
import { ROUTES } from '../../shared/navigation';
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
import ServiceImageUpload from '../../Components/ServiceImageUpload';
import { ServiceVariationManager } from '../../Components/ServiceVariations';
import { handleServiceFormError, getErrorMessage } from '../../Utils/errorMessages';
import { ValidationErrorSummary } from '../../Components/ErrorDisplay';

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


export default function ServiceForm() {
  const { navigate } = useNavigation();
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
    processing_time: '',
    finishing_time: '',
    commission_percentage: '',
    price: '',
    is_active: true,
    parallelable: false,
    max_parallel_pros: 1,
    price_subject_to_evaluation: false,
    category_id: categoryIdFromUrl || '',
  });
  
  
  // UI state
  const [category, setCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [validationErrors, setValidationErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  
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
      navigate(ROUTES.SERVICES.LIST);
    }
  }, [serviceId, categoryIdFromUrl]);
  
  // Track initial state for comparison
  const [initialFormData, setInitialFormData] = useState(null);
  
  // Helper function to compare states properly
  const hasStateChanged = () => {
    if (!initialFormData) return false;
    
    // Compare form data
    const formDataChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    
    return formDataChanged;
  };

  // Track changes by comparing with initial state
  useEffect(() => {
    if (initialFormData) {
      setHasUnsavedChanges(hasStateChanged());
    }
  }, [formData, initialFormData]);

  
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
      const errorMessage = getErrorMessage(error);
      showAlert(errorMessage, 'error');
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
      const errorMessage = getErrorMessage(error);
      showAlert(errorMessage, 'error');
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
        processing_time: serviceData.processing_time?.toString() || '',
        finishing_time: serviceData.finishing_time?.toString() || '',
        commission_percentage: serviceData.commission_percentage?.toString() || '',
        price: serviceData.price?.toString() || '',
        is_active: serviceData.is_active ?? true,
        parallelable: serviceData.parallelable ?? false,
        max_parallel_pros: serviceData.max_parallel_pros ?? 1,
        price_subject_to_evaluation: serviceData.price_subject_to_evaluation ?? false,
        category_id: serviceData.category_id || '',
      };
      
      setFormData(loadedFormData);
      
      // Save initial state for comparison
      setInitialFormData(loadedFormData);
      
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
      const errorMessage = getErrorMessage(error);
      showAlert(errorMessage, 'error');
      navigate(ROUTES.SERVICES.LIST);
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
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Erro ao carregar categoria:', error);
      const errorMessage = getErrorMessage(error);
      showAlert(errorMessage, 'error');
      navigate(ROUTES.SERVICES.LIST);
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
    
    // Processing time is optional but must be valid if provided
    if (formData.processing_time) {
      const processingTime = parseInt(formData.processing_time);
      if (isNaN(processingTime) || processingTime < 0 || processingTime > 480) {
        newErrors.processing_time = 'Valor deve estar entre 0 e 480';
      }
    }
    
    // Finishing time is optional but must be valid if provided
    if (formData.finishing_time) {
      const finishingTime = parseInt(formData.finishing_time);
      if (isNaN(finishingTime) || finishingTime < 0 || finishingTime > 480) {
        newErrors.finishing_time = 'Valor deve estar entre 0 e 480';
      }
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

  // Memoized callback for variations change to prevent infinite re-renders
  const handleVariationsChange = useCallback((variations) => {
    // Handle variations change if needed
    console.log('Service variations updated:', variations);
  }, []);
  

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
      
      if (['name', 'duration_minutes', 'processing_time', 'finishing_time', 'price', 'commission_percentage', 'is_active', 'parallelable', 'max_parallel_pros'].includes(firstErrorField)) {
        targetTab = 'basic';
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
        processing_time: formData.processing_time ? parseInt(formData.processing_time) : null,
        finishing_time: formData.finishing_time ? parseInt(formData.finishing_time) : null,
        commission_percentage: parseFloat(formData.commission_percentage),
        price: parseFloat(formData.price),
        is_active: formData.is_active,
        parallelable: formData.parallelable,
        max_parallel_pros: parseInt(formData.max_parallel_pros),
        price_subject_to_evaluation: formData.price_subject_to_evaluation,
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
      
      // Update the URL with the service ID for new services
      // This allows the variations manager to work properly
      if (!isEdit) {
        const newUrl = ROUTES.SERVICES.EDIT(result.id);
        window.history.replaceState({}, '', newUrl);
        // Update the serviceId state to reflect the new service
        // This isn't directly used in this component but helps with consistency
      }
      

      // Handle station requirements
      try {
        await saveStationRequirements(result.id);
      } catch (error) {
        console.warn('Erro ao salvar requisitos de estação:', error);
        showAlert('Serviço salvo, mas houve erro ao salvar requisitos de estação', 'warning');
      }
      
      // Only navigate back to list if we're not in variations tab
      // This prevents interrupting the user's workflow when adding variations
      if (activeTab !== 'variations') {
        navigate(ROUTES.SERVICES.LIST);
      }
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      const parsedError = handleServiceFormError(error, setErrors, showAlert);
      setValidationErrors(parsedError.fieldErrors);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelDialog(true);
    } else {
      navigate(ROUTES.SERVICES.LIST);
    }
  };
  
  const confirmCancel = () => {
    setCancelDialog(false);
    navigate(ROUTES.SERVICES.LIST);
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
          {/* Validation Error Summary */}
          <ValidationErrorSummary
            errors={validationErrors}
            show={Object.keys(validationErrors).length > 0}
            onClose={() => setValidationErrors({})}
            message="Por favor, corrija os seguintes erros antes de salvar:"
          />
          
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
                  {Object.keys(errors).some(field => ['name', 'duration_minutes', 'processing_time', 'finishing_time', 'price', 'commission_percentage', 'max_parallel_pros', 'price_subject_to_evaluation'].includes(field)) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-error rounded-full"></span>
                  )}
                </Tab>
                <Tab
                  value="images"
                  onClick={() => setActiveTab('images')}
                  className={`${activeTab === 'images' ? 'text-white' : 'text-text-secondary'} font-medium relative`}
                >
                  Imagens
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
                <Tab
                  value="variations"
                  onClick={() => setActiveTab('variations')}
                  className={`${activeTab === 'variations' ? 'text-white' : 'text-text-secondary'} font-medium relative`}
                >
                  Variações
                </Tab>
              </TabsHeader>

              <TabsBody className="mt-6">
                {/* Tab 1: Basic Information */}
                <TabPanel value="basic" className="p-0">
                  <div className="space-y-8 mt-6">
                    
                    {/* SECTION 1: BASIC SERVICE DETAILS */}
                    <div className="space-y-6">
                      <div className="border-l-4 border-accent-primary pl-4">
                        <Typography variant="h6" className="text-text-primary font-semibold text-lg mb-1">
                          Informações Básicas
                        </Typography>
                      </div>
                      
                      <div className="bg-bg-secondary/30 p-6 rounded-xl border border-bg-tertiary/50 space-y-5">
                        {/* Service Name and SKU Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-3">
                            <Input
                              name="name"
                              label="Nome do Serviço"
                              placeholder="Digite o nome completo do serviço"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              error={!!errors.name}
                              className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                              labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                              containerProps={{ className: "text-text-primary" }}
                              required
                            />
                            {errors.name && (
                              <Typography className="text-status-error text-sm mt-1">
                                {errors.name}
                              </Typography>
                            )}
                          </div>
                          
                          <div>
                            <Input
                              name="service_sku"
                              label="Código (SKU)"
                              placeholder="Ex: SRV001"
                              value={formData.service_sku}
                              onChange={(e) => handleInputChange('service_sku', e.target.value)}
                              error={!!errors.service_sku}
                              className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                              labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                              containerProps={{ className: "text-text-primary" }}
                            />
                            {errors.service_sku && (
                              <Typography className="text-status-error text-sm mt-1">
                                {errors.service_sku}
                              </Typography>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: PRICING & FINANCIAL */}
                    <div className="space-y-6">
                      <div className="border-l-4 border-green-500 pl-4">
                        <Typography variant="h6" className="text-text-primary font-semibold text-lg mb-1">
                          Precificação
                        </Typography>
                      </div>
                      
                      <div className="bg-bg-secondary/30 p-6 rounded-xl border border-bg-tertiary/50 space-y-5">
                        {/* Price and Commission Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Input
                              name="price"
                              label="Preço Base (R$)"
                              type="number"
                              step="0.01"
                              placeholder="Ex.: 80.00"
                              value={formData.price}
                              onChange={(e) => handleInputChange('price', e.target.value)}
                              error={!!errors.price}
                              className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                              labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
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
                              className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                              labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
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
                        </div>

                        {/* Price Subject to Evaluation */}
                        <div className="bg-amber-50/10 border border-amber-500/20 rounded-lg p-4">
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
                                O preço final será definido após avaliação prévia do caso
                              </Typography>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: TIMING CONFIGURATION */}
                    <div className="space-y-6">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <Typography variant="h6" className="text-text-primary font-semibold text-lg mb-1">
                          Configuração de Tempo
                        </Typography>
                      </div>
                      
                      <div className="bg-bg-secondary/30 p-6 rounded-xl border border-bg-tertiary/50 space-y-5">
                        {/* All Duration Fields - Single Row */}
                        <div>
                          <Typography className="text-text-secondary text-xs mb-4">
                            Estes tempos serão somados para calcular o tempo total do agendamento
                          </Typography>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div>
                              <Input
                                name="duration_minutes"
                                label="Duração Base (min)"
                                type="number"
                                placeholder="Ex.: 45"
                                value={formData.duration_minutes}
                                onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                                error={!!errors.duration_minutes}
                                className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                                labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
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
                              <Typography className="text-text-tertiary text-xs mt-1">
                                Tempo principal (obrigatório)
                              </Typography>
                            </div>
                            
                            <div>
                              <Input
                                name="processing_time"
                                label="+ Processamento (min)"
                                type="number"
                                placeholder="Ex.: 15"
                                value={formData.processing_time}
                                onChange={(e) => handleInputChange('processing_time', e.target.value)}
                                error={!!errors.processing_time}
                                className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                                labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                                containerProps={{ className: "text-text-primary" }}
                                min="0"
                                max="480"
                              />
                              {errors.processing_time && (
                                <Typography className="text-status-error text-sm mt-1">
                                  {errors.processing_time}
                                </Typography>
                              )}
                              <Typography className="text-text-tertiary text-xs mt-1">
                                Preparação (opcional)
                              </Typography>
                            </div>
                            
                            <div>
                              <Input
                                name="finishing_time"
                                label="+ Finalização (min)"
                                type="number"
                                placeholder="Ex.: 10"
                                value={formData.finishing_time}
                                onChange={(e) => handleInputChange('finishing_time', e.target.value)}
                                error={!!errors.finishing_time}
                                className="bg-bg-primary border-bg-tertiary text-text-primary focus:!border-blue-400 focus:!border-t-transparent"
                                labelProps={{ className: "text-text-secondary peer-focus:text-white" }}
                                containerProps={{ className: "text-text-primary" }}
                                min="0"
                                max="480"
                              />
                              {errors.finishing_time && (
                                <Typography className="text-status-error text-sm mt-1">
                                  {errors.finishing_time}
                                </Typography>
                              )}
                              <Typography className="text-text-tertiary text-xs mt-1">
                                Limpeza (opcional)
                              </Typography>
                            </div>
                          </div>
                        </div>

                        {/* Duration Summary */}
                        {(() => {
                          const baseDuration = parseInt(formData.duration_minutes) || 0;
                          const processingTime = parseInt(formData.processing_time) || 0;
                          const finishingTime = parseInt(formData.finishing_time) || 0;
                          const total = baseDuration + processingTime + finishingTime;
                          
                          return (
                            <div className="bg-blue-50/10 border border-blue-500/20 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Typography className="text-text-primary text-sm font-medium">
                                    Duração Total do Agendamento
                                  </Typography>
                                  <Typography className="text-text-secondary text-xs">
                                    {baseDuration} min (base) {processingTime > 0 && `+ ${processingTime} min (proc.)`} {finishingTime > 0 && `+ ${finishingTime} min (final.)`}
                                  </Typography>
                                </div>
                                <div className="text-right">
                                  <Typography className="text-accent-primary text-xl font-bold">
                                    {total} min
                                  </Typography>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* SECTION 4: SERVICE STATUS */}
                    <div className="space-y-6">
                      <div className="border-l-4 border-purple-500 pl-4">
                        <Typography variant="h6" className="text-text-primary font-semibold text-lg mb-1">
                          Status e Disponibilidade
                        </Typography>
                      </div>
                      
                      <div className="bg-bg-secondary/30 p-6 rounded-xl border border-bg-tertiary/50">
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={formData.is_active}
                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                            color="blue"
                          />
                          <div>
                            <Typography className="text-text-primary text-sm font-medium">
                              Serviço Ativo
                            </Typography>
                            <Typography className="text-text-secondary text-xs">
                              Quando ativo, o serviço ficará disponível para agendamento pelos clientes
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </TabPanel>

                {/* Tab 2: Images */}
                <TabPanel value="images" className="p-0">
                  <div className="mt-4 px-1">
                    {serviceId ? (
                      <ServiceImageUpload 
                        serviceId={serviceId}
                        onImagesChange={(images) => {
                          // Handle images change if needed
                          console.log('Service images updated:', images);
                        }}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-bg-tertiary mb-4">
                          <PhotoIcon className="w-8 h-8 text-text-secondary" />
                        </div>
                        <Typography variant="h6" className="text-text-primary mb-2">
                          Salve o serviço primeiro
                        </Typography>
                        <Typography variant="small" className="text-text-secondary mb-4">
                          Para fazer upload de imagens, você precisa salvar o serviço primeiro preenchendo as informações básicas.
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => setActiveTab('basic')}
                          className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
                        >
                          Ir para Informações Básicas
                        </Button>
                      </div>
                    )}
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

                {/* Tab 6: Variations */}
                <TabPanel value="variations" className="p-0">
                  <div className="mt-4 px-1">
                    <ServiceVariationManager
                      serviceId={serviceId}
                      serviceData={formData}
                      onVariationsChange={handleVariationsChange}
                      isReadOnly={false}
                    />
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