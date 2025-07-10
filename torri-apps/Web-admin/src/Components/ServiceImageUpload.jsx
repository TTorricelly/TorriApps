/**
 * Service Image Upload Component
 * 
 * A modern image upload component with drag-and-drop functionality,
 * label assignment, and image management for services.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button,
  Typography,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Switch,
  Chip,
  Alert,
  Spinner,
  IconButton,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem
} from '@material-tailwind/react';
import {
  CloudArrowUpIcon,
  PhotoIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  StarIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
// Note: For now using simple reordering without drag-and-drop library
// Can be enhanced later with react-beautiful-dnd or similar

import { serviceImagesApi } from '../Services/serviceImages';
import { labelsApi } from '../Services/labels';

export default function ServiceImageUpload({ serviceId, onImagesChange }) {
  // State management
  const [images, setImages] = useState([]);
  const [labels, setLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  
  // Operation states
  const [operationStates, setOperationStates] = useState({});
  
  // Bulk operations state
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  
  // Dialog states
  const [editDialog, setEditDialog] = useState({ open: false, image: null });
  const [labelDialog, setLabelDialog] = useState({ open: false, image: null });
  const [previewDialog, setPreviewDialog] = useState({ open: false, image: null });
  
  // Alert state
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Form states
  const [editForm, setEditForm] = useState({
    alt_text: '',
    is_primary: false
  });
  
  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  // Load data on mount
  useEffect(() => {
    if (serviceId) {
      loadImages();
      loadLabels();
    }
  }, [serviceId]);
  
  /**
   * Load service images
   */
  const loadImages = async () => {
    try {
      setIsLoading(true);
      const imageData = await serviceImagesApi.getServiceImages(serviceId);
      setImages(imageData);
      onImagesChange?.(imageData);
    } catch (error) {
      console.error('Error loading images:', error);
      showAlert('Erro ao carregar imagens', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Load available labels
   */
  const loadLabels = async () => {
    try {
      const labelData = await labelsApi.getAll({ limit: 1000 });
      setLabels(labelData.items || []);
    } catch (error) {
      console.error('Error loading labels:', error);
      showAlert('Erro ao carregar rótulos', 'error');
    }
  };
  
  /**
   * Show alert message
   */
  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };
  
  /**
   * Set operation state for specific image/operation
   */
  const setOperationState = (imageId, operation, isLoading) => {
    setOperationStates(prev => ({
      ...prev,
      [`${imageId}-${operation}`]: isLoading
    }));
  };
  
  /**
   * Get operation state
   */
  const getOperationState = (imageId, operation) => {
    return operationStates[`${imageId}-${operation}`] || false;
  };
  
  /**
   * Generate a system-managed filename
   */
  const generateFilename = (originalFile) => {
    // Get file extension
    const extension = originalFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Generate unique filename: service_[serviceId]_[timestamp]_[random].[ext]
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return `service_${serviceId}_${timestamp}_${random}.${extension}`;
  };

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(async (file) => {
    // Enhanced file validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Tipo de arquivo não permitido. Use JPG, PNG ou WebP', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showAlert('Arquivo deve ter menos de 5MB', 'error');
      return;
    }
    
    // Generate system-managed filename
    const systemFilename = generateFilename(file);
    
    // Create new file with system-generated name
    const managedFile = new File([file], systemFilename, { type: file.type });
    
    const fileId = `${systemFilename}-${Date.now()}`;
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
    
    try {
      // Simulate progress (real implementation would use upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: Math.min((prev[fileId] || 0) + 10, 90)
        }));
      }, 200);
      
      const result = await serviceImagesApi.uploadImage(serviceId, managedFile, {
        isPrimary: images.length === 0 // First image is primary by default
      });
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      if (result) {
        showAlert('Imagem enviada com sucesso!', 'success');
        loadImages(); // Reload images
      }
      
      // Clean up progress after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      showAlert('Erro ao enviar imagem', 'error');
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    }
  }, [serviceId, images.length, showAlert]);
  
  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((files) => {
    const fileArray = Array.from(files);
    fileArray.forEach(file => uploadFile(file));
  }, [uploadFile]);
  
  /**
   * Handle drag events
   */
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);
  
  /**
   * Move image up in order
   */
  const moveImageUp = async (currentIndex) => {
    if (currentIndex === 0) return;
    
    const newImages = [...images];
    [newImages[currentIndex], newImages[currentIndex - 1]] = [newImages[currentIndex - 1], newImages[currentIndex]];
    
    setImages(newImages);
    await updateImageOrder(newImages);
  };
  
  /**
   * Move image down in order
   */
  const moveImageDown = async (currentIndex) => {
    if (currentIndex === images.length - 1) return;
    
    const newImages = [...images];
    [newImages[currentIndex], newImages[currentIndex + 1]] = [newImages[currentIndex + 1], newImages[currentIndex]];
    
    setImages(newImages);
    await updateImageOrder(newImages);
  };
  
  /**
   * Update image display order
   */
  const updateImageOrder = async (reorderedImages) => {
    const imageOrders = reorderedImages.map((img, index) => ({
      image_id: img.id,
      display_order: index
    }));
    
    try {
      await serviceImagesApi.reorderImages(serviceId, imageOrders);
      onImagesChange?.(reorderedImages);
    } catch (error) {
      console.error('Error reordering:', error);
      showAlert('Erro ao reordenar imagens', 'error');
      loadImages(); // Reload on error
    }
  };
  
  /**
   * Handle image deletion
   */
  const handleDelete = async (imageId) => {
    try {
      setOperationState(imageId, 'delete', true);
      await serviceImagesApi.deleteImage(serviceId, imageId);
      showAlert('Imagem removida com sucesso!', 'success');
      loadImages();
    } catch (error) {
      console.error('Delete error:', error);
      showAlert('Erro ao remover imagem', 'error');
    } finally {
      setOperationState(imageId, 'delete', false);
    }
  };
  
  /**
   * Handle setting primary image
   */
  const handleSetPrimary = async (imageId) => {
    try {
      setOperationState(imageId, 'setPrimary', true);
      await serviceImagesApi.updateImage(serviceId, imageId, { is_primary: true });
      showAlert('Imagem principal definida!', 'success');
      loadImages();
    } catch (error) {
      console.error('Update error:', error);
      showAlert('Erro ao definir imagem principal', 'error');
    } finally {
      setOperationState(imageId, 'setPrimary', false);
    }
  };
  
  /**
   * Handle edit form submission
   */
  const handleEditSubmit = async () => {
    try {
      await serviceImagesApi.updateImage(serviceId, editDialog.image.id, editForm);
      showAlert('Imagem atualizada com sucesso!', 'success');
      setEditDialog({ open: false, image: null });
      loadImages();
    } catch (error) {
      console.error('Update error:', error);
      showAlert('Erro ao atualizar imagem', 'error');
    }
  };
  
  /**
   * Open edit dialog
   */
  const openEditDialog = (image) => {
    setEditForm({
      alt_text: image.alt_text || '',
      is_primary: image.is_primary || false
    });
    setEditDialog({ open: true, image });
  };
  
  /**
   * Handle label assignment
   */
  const handleAssignLabel = async (imageId, labelId) => {
    try {
      await serviceImagesApi.assignLabel(serviceId, imageId, labelId);
      showAlert('Rótulo atribuído com sucesso!', 'success');
      loadImages();
    } catch (error) {
      console.error('Error assigning label:', error);
      showAlert('Erro ao atribuir rótulo', 'error');
    }
  };
  
  /**
   * Handle label removal
   */
  const handleRemoveLabel = async (imageId, labelId) => {
    try {
      await serviceImagesApi.removeLabel(serviceId, imageId, labelId);
      showAlert('Rótulo removido com sucesso!', 'success');
      loadImages();
    } catch (error) {
      console.error('Error removing label:', error);
      showAlert('Erro ao remover rótulo', 'error');
    }
  };
  
  /**
   * Toggle image selection for bulk operations
   */
  const toggleImageSelection = (imageId) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };
  
  /**
   * Select all images
   */
  const selectAllImages = () => {
    setSelectedImages(new Set(images.map(img => img.id)));
  };
  
  /**
   * Clear selection
   */
  const clearSelection = () => {
    setSelectedImages(new Set());
    setBulkMode(false);
  };
  
  /**
   * Bulk delete selected images
   */
  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    
    try {
      setIsLoading(true);
      const deletePromises = Array.from(selectedImages).map(imageId =>
        serviceImagesApi.deleteImage(serviceId, imageId)
      );
      
      await Promise.all(deletePromises);
      showAlert(`${selectedImages.size} imagens removidas com sucesso!`, 'success');
      clearSelection();
      loadImages();
    } catch (error) {
      console.error('Error in bulk delete:', error);
      showAlert('Erro ao remover imagens em lote', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Bulk assign label to selected images
   */
  const handleBulkAssignLabel = async (labelId) => {
    if (selectedImages.size === 0) return;
    
    try {
      setIsLoading(true);
      const assignPromises = Array.from(selectedImages).map(imageId =>
        serviceImagesApi.assignLabel(serviceId, imageId, labelId).catch(() => null) // Continue on individual failures
      );
      
      await Promise.all(assignPromises);
      showAlert(`Rótulo atribuído a ${selectedImages.size} imagens!`, 'success');
      clearSelection();
      loadImages();
    } catch (error) {
      console.error('Error in bulk label assignment:', error);
      showAlert('Erro ao atribuir rótulo em lote', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert.show && (
        <Alert
          open={alert.show}
          onClose={() => setAlert({ ...alert, show: false })}
          color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'amber' : 'green'}
        >
          {alert.message}
        </Alert>
      )}
      
      {/* Upload Zone */}
      <div
        ref={dropZoneRef}
        className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
          dragActive
            ? 'border-accent-primary bg-accent-primary/10'
            : 'border-bg-tertiary hover:border-accent-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-primary/10">
            <CloudArrowUpIcon className="w-5 h-5 text-accent-primary" />
          </div>
          
          <div className="text-left">
            <Typography variant="small" className="text-text-primary font-medium">
              Arraste imagens aqui ou clique para selecionar
            </Typography>
            <Typography variant="small" className="text-text-secondary text-xs">
              JPG, PNG ou WebP até 5MB cada
            </Typography>
          </div>
          
          <Button
            size="sm"
            variant="outlined"
            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
          >
            Selecionar
          </Button>
        </div>
        
        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="absolute inset-0 bg-bg-secondary/90 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Spinner className="h-8 w-8 mx-auto mb-4" />
              <Typography variant="small" className="text-text-primary">
                Enviando imagens...
              </Typography>
            </div>
          </div>
        )}
      </div>
      
      {/* Loading State */}
      {isLoading && images.length === 0 && (
        <div className="text-center py-12">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <Typography variant="h6" className="text-text-primary mb-2">
            Carregando imagens...
          </Typography>
        </div>
      )}
      
      {/* Images Grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Typography variant="h6" className="text-text-primary">
                Imagens ({images.length})
              </Typography>
              {!bulkMode ? (
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => setBulkMode(true)}
                  className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
                >
                  Selecionar
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Typography variant="small" className="text-text-secondary">
                    {selectedImages.size} selecionadas
                  </Typography>
                  <Button
                    size="sm"
                    variant="outlined"
                    onClick={selectAllImages}
                    className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined"
                    onClick={clearSelection}
                    className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            
            {!bulkMode ? (
              <div></div>
            ) : selectedImages.size > 0 && (
              <div className="flex items-center gap-2">
                <Menu>
                  <MenuHandler>
                    <Button
                      size="sm"
                      variant="outlined"
                      className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
                    >
                      <TagIcon className="w-4 h-4 mr-2" />
                      Atribuir Rótulo
                    </Button>
                  </MenuHandler>
                  <MenuList className="bg-bg-secondary border-bg-tertiary max-h-48 overflow-y-auto">
                    {labels.filter(label => label.is_active).map((label) => (
                      <MenuItem
                        key={label.id}
                        onClick={() => handleBulkAssignLabel(label.id)}
                        className="text-text-primary hover:bg-bg-tertiary"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </div>
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
                
                <Button
                  size="sm"
                  color="red"
                  onClick={handleBulkDelete}
                  className="bg-status-error hover:bg-status-error/90"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Excluir ({selectedImages.size})
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={image.id} className="relative group">
                          <div className={`relative aspect-square rounded-xl overflow-hidden border ${
                            bulkMode && selectedImages.has(image.id) 
                              ? 'border-accent-primary border-2 bg-accent-primary/10' 
                              : 'border-bg-tertiary bg-bg-tertiary'
                          }`}>
                            {/* Selection Checkbox */}
                            {bulkMode && (
                              <div className="absolute top-2 right-2 z-20">
                                <input
                                  type="checkbox"
                                  checked={selectedImages.has(image.id)}
                                  onChange={() => toggleImageSelection(image.id)}
                                  className="w-4 h-4 text-accent-primary bg-white border-gray-300 rounded focus:ring-accent-primary"
                                />
                              </div>
                            )}
                            
                            {/* Primary Badge */}
                            {image.is_primary && (
                              <div className={`absolute top-2 ${bulkMode ? 'left-2' : 'left-2'} z-10`}>
                                <Chip
                                  value="Principal"
                                  size="sm"
                                  className="bg-accent-primary text-white"
                                  icon={<StarIcon className="w-3 h-3" />}
                                />
                              </div>
                            )}
                            
                            {/* Image */}
                            <img
                              src={image.file_path}
                              alt={image.alt_text || image.filename}
                              className={`w-full h-full object-cover ${bulkMode ? 'cursor-pointer' : ''}`}
                              loading="lazy"
                              onClick={bulkMode ? () => toggleImageSelection(image.id) : undefined}
                            />
                            
                            {/* Overlay - hidden in bulk mode */}
                            {!bulkMode && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200">
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-2">
                                  <IconButton
                                    size="sm"
                                    variant="filled"
                                    className="bg-white/20 backdrop-blur-sm"
                                    onClick={() => setPreviewDialog({ open: true, image })}
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                  </IconButton>
                                  
                                  <IconButton
                                    size="sm"
                                    variant="filled"
                                    className="bg-white/20 backdrop-blur-sm"
                                    onClick={() => openEditDialog(image)}
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </IconButton>
                                  
                                  <Menu>
                                    <MenuHandler>
                                      <IconButton
                                        size="sm"
                                        variant="filled"
                                        className="bg-white/20 backdrop-blur-sm"
                                      >
                                        <EllipsisVerticalIcon className="w-4 h-4" />
                                      </IconButton>
                                    </MenuHandler>
                                    <MenuList className="bg-bg-secondary border-bg-tertiary">
                                      {!image.is_primary && (
                                        <MenuItem
                                          onClick={() => handleSetPrimary(image.id)}
                                          className="text-text-primary hover:bg-bg-tertiary"
                                          disabled={getOperationState(image.id, 'setPrimary')}
                                        >
                                          {getOperationState(image.id, 'setPrimary') ? (
                                            <Spinner className="w-4 h-4 mr-2" />
                                          ) : (
                                            <StarIcon className="w-4 h-4 mr-2" />
                                          )}
                                          Definir como Principal
                                        </MenuItem>
                                      )}
                                      {index > 0 && (
                                        <MenuItem
                                          onClick={() => moveImageUp(index)}
                                          className="text-text-primary hover:bg-bg-tertiary"
                                        >
                                          ↑ Mover para Frente
                                        </MenuItem>
                                      )}
                                      {index < images.length - 1 && (
                                        <MenuItem
                                          onClick={() => moveImageDown(index)}
                                          className="text-text-primary hover:bg-bg-tertiary"
                                        >
                                          ↓ Mover para Trás
                                        </MenuItem>
                                      )}
                                      <MenuItem
                                        onClick={() => setLabelDialog({ open: true, image })}
                                        className="text-text-primary hover:bg-bg-tertiary"
                                      >
                                        <TagIcon className="w-4 h-4 mr-2" />
                                        Gerenciar Rótulos
                                      </MenuItem>
                                      <MenuItem
                                        onClick={() => handleDelete(image.id)}
                                        className="text-status-error hover:bg-status-error/10"
                                        disabled={getOperationState(image.id, 'delete')}
                                      >
                                        {getOperationState(image.id, 'delete') ? (
                                          <Spinner className="w-4 h-4 mr-2" />
                                        ) : (
                                          <TrashIcon className="w-4 h-4 mr-2" />
                                        )}
                                        Excluir
                                      </MenuItem>
                                    </MenuList>
                                  </Menu>
                                </div>
                              </div>
                              </div>
                            )}
                            
                            {/* Labels */}
                            {image.labels && image.labels.length > 0 && (
                              <div className="absolute bottom-2 left-2 right-2">
                                <div className="flex flex-wrap gap-1">
                                  {image.labels.slice(0, 2).map((labelAssignment) => {
                                    const label = labels.find(l => l.id === labelAssignment.label_id);
                                    return label ? (
                                      <Chip
                                        key={labelAssignment.id}
                                        value={label.name}
                                        size="sm"
                                        style={{ backgroundColor: label.color }}
                                        className="text-white text-xs"
                                      />
                                    ) : null;
                                  })}
                                  {image.labels.length > 2 && (
                                    <Chip
                                      value={`+${image.labels.length - 2}`}
                                      size="sm"
                                      className="bg-black/50 text-white text-xs"
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Image Info */}
                          <div className="mt-2 px-1">
                            <Typography variant="small" className="text-text-primary truncate">
                              {image.filename}
                            </Typography>
                            <Typography variant="small" className="text-text-secondary">
                              {(image.file_size / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                          </div>
                </div>
              ))}
            </div>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && images.length === 0 && (
        <div className="text-center py-12">
          <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <Typography variant="h6" className="text-text-primary mb-2">
            Nenhuma imagem adicionada
          </Typography>
          <Typography variant="small" className="text-text-secondary mb-4">
            Faça upload de imagens para mostrar este serviço aos clientes
          </Typography>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
          >
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            Adicionar Primeira Imagem
          </Button>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        handler={() => setEditDialog({ open: false, image: null })}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Editar Imagem
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Input
            label="Texto Alternativo"
            value={editForm.alt_text}
            onChange={(e) => setEditForm(prev => ({ ...prev, alt_text: e.target.value }))}
            className="bg-bg-primary border-bg-tertiary text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
            containerProps={{ className: "text-text-primary" }}
          />
          
          <div className="flex items-center gap-3">
            <Switch
              checked={editForm.is_primary}
              onChange={(e) => setEditForm(prev => ({ ...prev, is_primary: e.target.checked }))}
              color="blue"
            />
            <Typography className="text-text-primary">
              Definir como imagem principal
            </Typography>
          </div>
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setEditDialog({ open: false, image: null })}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEditSubmit}
            className="bg-accent-primary hover:bg-accent-primary/90"
          >
            Salvar
          </Button>
        </DialogFooter>
      </Dialog>
      
      {/* Enhanced Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        handler={() => setPreviewDialog({ open: false, image: null })}
        size="lg"
        className="bg-bg-secondary border-bg-tertiary max-h-[90vh] overflow-hidden"
      >
        <DialogHeader className="text-text-primary flex items-center justify-between pb-2">
          <span>Visualizar Imagem</span>
          {previewDialog.image?.is_primary && (
            <Chip
              value="Principal"
              size="sm"
              className="bg-accent-primary text-white"
              icon={<StarIcon className="w-3 h-3" />}
            />
          )}
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          {previewDialog.image && (
            <>
              {/* Main Image Display - More compact */}
              <div className="text-center">
                <img
                  src={previewDialog.image.file_path}
                  alt={previewDialog.image.alt_text || previewDialog.image.filename}
                  className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                />
              </div>
              
              {/* Compact Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info - More compact */}
                <div className="space-y-2">
                  <Typography variant="h6" className="text-text-primary text-sm font-semibold mb-2">
                    Informações do Arquivo
                  </Typography>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Nome:</span>
                      <span className="text-text-primary truncate ml-2 max-w-[150px]" title={previewDialog.image.filename}>
                        {previewDialog.image.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Tamanho:</span>
                      <span className="text-text-primary">
                        {(previewDialog.image.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Tipo:</span>
                      <span className="text-text-primary">{previewDialog.image.content_type?.split('/')[1]?.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Ordem:</span>
                      <span className="text-text-primary">#{previewDialog.image.display_order + 1}</span>
                    </div>
                    {previewDialog.image.created_at && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Upload:</span>
                        <span className="text-text-primary">
                          {new Date(previewDialog.image.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Labels and Alt Text - More compact */}
                <div className="space-y-2">
                  <Typography variant="h6" className="text-text-primary text-sm font-semibold mb-2">
                    Rótulos e Metadados
                  </Typography>
                  <div className="space-y-2">
                    {/* Alt Text - Compact */}
                    <div>
                      <span className="text-text-secondary text-xs">Texto Alternativo:</span>
                      <div className="text-text-primary bg-bg-primary p-2 rounded text-xs mt-1">
                        {previewDialog.image.alt_text || 'Não definido'}
                      </div>
                    </div>
                    
                    {/* Labels - Compact */}
                    <div>
                      <span className="text-text-secondary text-xs">Rótulos:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewDialog.image.labels && previewDialog.image.labels.length > 0 ? (
                          previewDialog.image.labels.map((labelAssignment) => {
                            const label = labels.find(l => l.id === labelAssignment.label_id);
                            return label ? (
                              <Chip
                                key={labelAssignment.id}
                                value={label.name}
                                size="sm"
                                style={{ backgroundColor: label.color }}
                                className="text-white text-xs"
                              />
                            ) : null;
                          })
                        ) : (
                          <span className="text-text-secondary italic text-xs">
                            Nenhum rótulo atribuído
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogBody>
        
        {/* Quick Actions - Always visible at bottom */}
        <div className="flex justify-center gap-2 p-4 border-t border-bg-tertiary bg-bg-secondary">
          <Button
            size="sm"
            variant="outlined"
            onClick={() => {
              setPreviewDialog({ open: false, image: null });
              openEditDialog(previewDialog.image);
            }}
            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outlined"
            onClick={() => {
              setPreviewDialog({ open: false, image: null });
              setLabelDialog({ open: true, image: previewDialog.image });
            }}
            className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
          >
            <TagIcon className="w-4 h-4 mr-2" />
            Rótulos
          </Button>
          {previewDialog.image && !previewDialog.image.is_primary && (
            <Button
              size="sm"
              variant="outlined"
              onClick={() => {
                handleSetPrimary(previewDialog.image.id);
                setPreviewDialog({ open: false, image: null });
              }}
              className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
            >
              <StarIcon className="w-4 h-4 mr-2" />
              Definir Principal
            </Button>
          )}
        </div>
      </Dialog>
      
      {/* Label Management Dialog */}
      <Dialog
        open={labelDialog.open}
        handler={() => setLabelDialog({ open: false, image: null })}
        size="md"
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Gerenciar Rótulos da Imagem
        </DialogHeader>
        <DialogBody className="space-y-4">
          {labelDialog.image && (() => {
            // Get the current image data from the images state (updated data)
            const currentImage = images.find(img => img.id === labelDialog.image.id) || labelDialog.image;
            
            return (
              <>
                {/* Image Preview */}
                <div className="text-center mb-4">
                  <img
                    src={currentImage.file_path}
                    alt={currentImage.alt_text || currentImage.filename}
                    className="w-32 h-32 object-cover mx-auto rounded-lg"
                  />
                  <Typography variant="small" className="text-text-secondary mt-2">
                    {currentImage.filename}
                  </Typography>
                </div>
                
                {/* Current Labels */}
                <div>
                  <Typography variant="h6" className="text-text-primary mb-2">
                    Rótulos Atribuídos
                  </Typography>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentImage.labels && currentImage.labels.length > 0 ? (
                      currentImage.labels.map((labelAssignment) => {
                        const label = labels.find(l => l.id === labelAssignment.label_id);
                        return label ? (
                          <Chip
                            key={labelAssignment.id}
                            value={label.name}
                            onClose={() => handleRemoveLabel(currentImage.id, label.id)}
                            style={{ backgroundColor: label.color }}
                            className="text-white"
                          />
                        ) : null;
                      })
                    ) : (
                      <Typography variant="small" className="text-text-secondary italic">
                        Nenhum rótulo atribuído
                      </Typography>
                    )}
                  </div>
                </div>
                
                {/* Available Labels */}
                <div>
                  <Typography variant="h6" className="text-text-primary mb-2">
                    Rótulos Disponíveis
                  </Typography>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {labels
                      .filter(label => 
                        label.is_active && 
                        !currentImage.labels?.some(la => la.label_id === label.id)
                      )
                      .map((label) => (
                        <Chip
                          key={label.id}
                          value={label.name}
                          onClick={() => handleAssignLabel(currentImage.id, label.id)}
                          style={{ backgroundColor: label.color }}
                          className="text-white cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    {labels.filter(label => 
                      label.is_active && 
                      !currentImage.labels?.some(la => la.label_id === label.id)
                    ).length === 0 && (
                      <Typography variant="small" className="text-text-secondary italic">
                        Todos os rótulos já foram atribuídos
                      </Typography>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogBody>
        <DialogFooter>
          <Button
            onClick={() => setLabelDialog({ open: false, image: null })}
            className="bg-accent-primary hover:bg-accent-primary/90"
          >
            Fechar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}