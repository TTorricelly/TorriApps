import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, X, Check } from 'lucide-react';
import labelService from '../../services/labelService';
import { getContrastTextColor } from '../../utils/labelUtils';

const LabelSelector = ({ 
  isOpen, 
  onClose, 
  onSelectionChange, 
  selectedLabels = [], 
  title = "Selecionar Labels",
  allowMultiple = true,
  searchable = true
}) => {
  const [availableLabels, setAvailableLabels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load available labels when component mounts (with cleanup)
  useEffect(() => {
    let mounted = true;
    
    if (isOpen) {
      loadLabels(mounted);
    }
    
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const loadLabels = useCallback(async (mounted = true) => {
    try {
      setIsLoading(true);
      setError('');
      const labels = await labelService.getActiveLabels();
      if (mounted) {
        setAvailableLabels(labels);
      }
    } catch (error) {
      if (mounted) {
        setError('Erro ao carregar preferências. Tente novamente.');
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Filter labels based on search term (memoized for performance)
  const filteredLabels = useMemo(() => {
    if (!searchTerm.trim()) return availableLabels;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return availableLabels.filter(label => {
      if (!label || !label.name) return false;
      
      const nameMatch = label.name.toLowerCase().includes(searchLower);
      const descriptionMatch = label.description && 
        label.description.toLowerCase().includes(searchLower);
      
      return nameMatch || descriptionMatch;
    });
  }, [availableLabels, searchTerm]);

  // Check if label is selected (memoized for performance)
  const isLabelSelected = useCallback((labelId) => {
    return selectedLabels.some(label => label && label.id === labelId);
  }, [selectedLabels]);

  // Handle label selection
  const handleLabelToggle = (label) => {
    if (!label || !label.id) {
      return;
    }
    
    if (typeof onSelectionChange !== 'function') {
      return;
    }
    
    if (allowMultiple) {
      const isSelected = isLabelSelected(label.id);
      let newSelection;
      
      if (isSelected) {
        // Remove label
        newSelection = selectedLabels.filter(l => l.id !== label.id);
      } else {
        // Add label
        newSelection = [...selectedLabels, label];
      }
      
      onSelectionChange(newSelection);
    } else {
      // Single selection mode
      const isSelected = isLabelSelected(label.id);
      onSelectionChange(isSelected ? [] : [label]);
    }
  };


  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 touch-manipulation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-t-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS-style drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search bar */}
        {searchable && (
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar preferências..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-pink-500 focus:bg-white transition-colors"
              />
            </div>
          </div>
        )}

        {/* Labels list */}
        <div className="flex-1 overflow-y-auto p-4 overscroll-behavior-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={loadLabels}
                className="bg-pink-500 text-white px-4 py-2 rounded-lg font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? 'Nenhuma preferência encontrada' : 'Nenhuma preferência disponível'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLabels.map((label) => {
                const isSelected = isLabelSelected(label.id);
                
                return (
                  <button
                    key={label.id}
                    onClick={() => handleLabelToggle(label)}
                    className={`
                      w-full flex items-center justify-between p-4 rounded-xl
                      min-h-[60px] touch-manipulation
                      transition-all duration-200 ease-in-out
                      ${isSelected 
                        ? 'ring-2 ring-pink-500 ring-offset-2 bg-pink-50' 
                        : 'hover:bg-gray-50 active:bg-gray-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* Label preview */}
                      <div
                        className="px-3 py-1.5 rounded-full text-sm font-medium min-w-[60px]"
                        style={{ 
                          backgroundColor: label.color,
                          color: getContrastTextColor(label.color)
                        }}
                      >
                        {label.name}
                      </div>
                    </div>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-full">
                        <Check size={16} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="w-full bg-pink-500 text-white py-4 rounded-xl font-semibold hover:bg-pink-600 active:bg-pink-700 transition-colors touch-manipulation min-h-[48px]"
          >
            Confirmar ({selectedLabels.length} selecionado{selectedLabels.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelSelector;