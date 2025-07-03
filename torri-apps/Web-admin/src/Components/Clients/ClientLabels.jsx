import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardBody,
  Chip,
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Typography,
  Spinner,
  Alert,
  IconButton,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
} from '@material-tailwind/react';
import { PlusIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';
import { labelsApi } from '../../Services/labels';
import { usersApi } from '../../Services/users';

const ClientLabels = ({ client, onUpdate, editable = true }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allLabels, setAllLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inline mode states
  const [showInlineInput, setShowInlineInput] = useState(false);
  const [inlineSearchTerm, setInlineSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (open || showInlineInput) {
      loadLabels();
    }
  }, [open, showInlineInput]);

  useEffect(() => {
    if (client?.labels) {
      setSelectedLabels(client.labels);
    }
  }, [client]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setShowInlineInput(false);
        setInlineSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when inline mode is activated
  useEffect(() => {
    if (showInlineInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInlineInput]);

  const loadLabels = async () => {
    try {
      setLoading(true);
      const response = await labelsApi.getAll({ limit: 100, is_active: true });
      setAllLabels(response.items || []);
    } catch (err) {
      setError('Erro ao carregar labels');
      console.error('Error loading labels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if this is a new client (no ID yet)
      if (!client.id) {
        // For new clients, just update the local state
        const updatedClient = { ...client, labels: selectedLabels };
        onUpdate(updatedClient);
        setOpen(false);
        return;
      }
      
      const labelIds = selectedLabels.map(label => label.id);
      await usersApi.updateUserLabels(client.id, labelIds);
      
      // Update client object with new labels
      const updatedClient = { ...client, labels: selectedLabels };
      onUpdate(updatedClient);
      setOpen(false);
    } catch (err) {
      setError('Erro ao atualizar labels');
      console.error('Error updating labels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLabel = async (labelToRemove) => {
    if (editable) {
      try {
        // If this is a new client (no ID yet), just update local state
        if (!client.id) {
          const updatedLabels = (client.labels || []).filter(label => label.id !== labelToRemove.id);
          const updatedClient = { ...client, labels: updatedLabels };
          onUpdate(updatedClient);
          return;
        }
        
        await usersApi.removeLabelFromUser(client.id, labelToRemove.id);
        const updatedLabels = (client.labels || []).filter(label => label.id !== labelToRemove.id);
        const updatedClient = { ...client, labels: updatedLabels };
        onUpdate(updatedClient);
      } catch (err) {
        setError('Erro ao remover label');
        console.error('Error removing label:', err);
      }
    }
  };

  const handleLabelToggle = (label) => {
    const isSelected = selectedLabels.some(selected => selected.id === label.id);
    if (isSelected) {
      setSelectedLabels(prev => prev.filter(selected => selected.id !== label.id));
    } else {
      setSelectedLabels(prev => [...prev, label]);
    }
  };

  const filteredLabels = allLabels.filter(label =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (label.description && label.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  // Inline label addition
  const handleInlineAddLabel = async (label) => {
    try {
      const currentLabels = client?.labels || [];
      const isAlreadyAdded = currentLabels.some(existing => existing.id === label.id);
      
      if (isAlreadyAdded) {
        setError('Label já foi adicionada');
        setTimeout(() => setError(''), 3000);
        return;
      }

      const updatedLabels = [...currentLabels, label];
      
      // If this is a new client (no ID yet), just update local state
      if (!client.id) {
        const updatedClient = { ...client, labels: updatedLabels };
        onUpdate(updatedClient);
      } else {
        // For existing clients, update via API
        await usersApi.addLabelToUser(client.id, label.id);
        const updatedClient = { ...client, labels: updatedLabels };
        onUpdate(updatedClient);
      }
      
      // Reset inline input and close dropdown
      setInlineSearchTerm('');
      setShowSuggestions(false);
      setShowInlineInput(false);
    } catch (err) {
      setError('Erro ao adicionar label');
      console.error('Error adding label:', err);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle inline input changes
  const handleInlineInputChange = (e) => {
    const value = e.target.value;
    setInlineSearchTerm(value);
    setShowSuggestions(value.length > 0);
  };

  // Handle keyboard navigation
  const handleInlineKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowInlineInput(false);
      setInlineSearchTerm('');
      setShowSuggestions(false);
    } else if (e.key === 'Enter' && inlineSearchTerm.trim()) {
      e.preventDefault();
      // If there's an exact match, add it
      const exactMatch = getFilteredInlineSuggestions().find(
        label => label.name.toLowerCase() === inlineSearchTerm.toLowerCase()
      );
      if (exactMatch) {
        handleInlineAddLabel(exactMatch);
      }
    }
  };

  // Get all available labels (not already assigned)
  const getAvailableLabels = () => {
    const currentLabels = client?.labels || [];
    const currentLabelIds = currentLabels.map(label => label.id);
    
    let availableLabels = allLabels.filter(label => !currentLabelIds.includes(label.id));
    
    // If there's a search term, filter by it
    if (inlineSearchTerm.trim()) {
      availableLabels = availableLabels.filter(label =>
        label.name.toLowerCase().includes(inlineSearchTerm.toLowerCase()) ||
        (label.description && label.description.toLowerCase().includes(inlineSearchTerm.toLowerCase()))
      );
    }
    
    return availableLabels;
  };

  // Get filtered suggestions for inline mode (kept for backward compatibility)
  const getFilteredInlineSuggestions = () => {
    return getAvailableLabels().slice(0, 5); // Limit to 5 suggestions
  };

  const inlineSuggestions = getFilteredInlineSuggestions();

  return (
    <>
      {/* Error Alert */}
      {error && (
        <Alert color="red" className="mb-2 text-xs">
          {error}
        </Alert>
      )}
      
      <div className="relative flex items-center flex-wrap gap-2">
        {/* Existing Labels */}
        {client?.labels?.map((label) => (
          <Chip
            key={label.id}
            value={label.name}
            size="sm"
            className="text-xs"
            style={{
              backgroundColor: label.color || '#00BFFF',
              color: getContrastColor(label.color || '#00BFFF'),
            }}
            onClose={editable ? () => handleRemoveLabel(label) : undefined}
            dismissible={editable}
          />
        ))}
        
        {/* Dropdown Add Button */}
        {editable && (
          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!showInlineInput) {
                  // Calculate dropdown position
                  const rect = buttonRef.current.getBoundingClientRect();
                  setDropdownPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX
                  });
                  
                  // Load labels when opening dropdown
                  if (allLabels.length === 0) {
                    loadLabels();
                  }
                }
                
                setShowInlineInput(!showInlineInput);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-3 w-3" />
              Adicionar
            </button>
            
            {/* Dropdown with all available labels - render in portal */}
            {showInlineInput && (
              <div
                ref={suggestionsRef}
                className="fixed bg-bg-secondary border border-bg-tertiary rounded-lg shadow-xl w-64 max-h-60 overflow-hidden"
                style={{ 
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  zIndex: 99999,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {/* Search input at top of dropdown */}
                <div className="p-3 border-b border-bg-tertiary">
                  <Input
                    ref={inputRef}
                    size="sm"
                    placeholder="Buscar preferências..."
                    value={inlineSearchTerm}
                    onChange={handleInlineInputChange}
                    onKeyDown={handleInlineKeyDown}
                    className="bg-bg-primary border-bg-tertiary text-text-primary text-xs"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "min-w-0" }}
                  />
                </div>
                
                {/* Available labels */}
                <div className="max-h-40 overflow-y-auto">
                  {getAvailableLabels().length > 0 ? (
                    getAvailableLabels().map((label) => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleInlineAddLabel(label);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-bg-primary focus:bg-bg-primary flex items-center gap-2 text-sm border-b border-bg-tertiary last:border-b-0 focus:outline-none transition-colors"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: label.color || '#00BFFF' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text-primary truncate">{label.name}</div>
                          {label.description && (
                            <div className="text-xs text-text-secondary truncate">{label.description}</div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-text-secondary">
                      {inlineSearchTerm ? 'Nenhuma preferência encontrada' : 'Todas as preferências já foram adicionadas'}
                    </div>
                  )}
                </div>
                
                {/* Small modal trigger at bottom for bulk operations */}
                <div className="p-2 border-t border-bg-tertiary bg-bg-primary">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpen(true);
                      setShowInlineInput(false);
                      setInlineSearchTerm('');
                    }}
                    className="w-full text-xs text-accent-primary hover:text-accent-primary/80 py-1 text-center transition-colors"
                  >
                    Gerenciar em lote...
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {(!client?.labels || client.labels.length === 0) && !editable && (
          <Typography variant="small" className="text-text-secondary">
            Nenhuma preferência cadastrada
          </Typography>
        )}
      </div>

      <Dialog
        open={open}
        handler={() => setOpen(false)}
        size="md"
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="flex items-center justify-between text-text-primary">
          <Typography variant="h5">
            Gerenciar Preferências do Cliente
          </Typography>
          <IconButton
            variant="text"
            onClick={() => setOpen(false)}
            className="text-text-secondary hover:text-text-primary"
          >
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </DialogHeader>
        
        <DialogBody divider className="bg-bg-secondary">
          {error && (
            <Alert color="red" className="mb-4">
              {error}
            </Alert>
          )}
          
          {!client.id && (
            <Alert color="blue" className="mb-4">
              As preferências serão salvas quando o cliente for criado.
            </Alert>
          )}
          
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Buscar preferências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
            />
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {filteredLabels.map((label) => {
                  const isSelected = selectedLabels.some(selected => selected.id === label.id);
                  return (
                    <Card
                      key={label.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-bg-primary'
                      }`}
                      onClick={() => handleLabelToggle(label)}
                    >
                      <CardBody className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: label.color || '#00BFFF' }}
                          />
                          <div className="flex-1">
                            <Typography variant="small" className="text-text-primary font-medium">
                              {label.name}
                            </Typography>
                            {label.description && (
                              <Typography variant="small" className="text-text-secondary">
                                {label.description}
                              </Typography>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-bg-tertiary">
            <Typography variant="small" className="text-text-secondary">
              {selectedLabels.length} preferência(s) selecionada(s)
            </Typography>
          </div>
        </DialogBody>
        
        <DialogFooter className="bg-bg-secondary">
          <Button
            variant="outlined"
            onClick={() => setOpen(false)}
            className="mr-2 border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-accent-primary hover:bg-accent-primary/90"
          >
            {loading ? <Spinner className="h-4 w-4" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};

export default ClientLabels;