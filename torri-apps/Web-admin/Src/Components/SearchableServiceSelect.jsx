import React, { useState, useRef, useEffect } from 'react';
import {
  Input,
  Typography,
  Spinner,
  Chip
} from "@material-tailwind/react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

const SearchableServiceSelect = ({ 
  services = [], 
  selectedServices = [], 
  onServicesChange, 
  loading = false, 
  error = null,
  placeholder = "Buscar serviços...",
  className = "",
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  // Group services by category and filter based on search term
  const filteredGroupedServices = React.useMemo(() => {
    const filtered = services.filter(service => 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.category_name && service.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    return filtered.reduce((groups, service) => {
      const categoryName = service.category_name || 'Sem Categoria';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(service);
      return groups;
    }, {});
  }, [services, searchTerm]);
  
  // Flatten filtered services for keyboard navigation
  const flatFilteredServices = React.useMemo(() => {
    return Object.values(filteredGroupedServices).flat();
  }, [filteredGroupedServices]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle service selection
  const handleServiceSelect = (service) => {
    const isSelected = selectedServices.includes(service.name);
    let newSelectedServices;
    
    if (isSelected) {
      newSelectedServices = selectedServices.filter(name => name !== service.name);
    } else {
      newSelectedServices = [...selectedServices, service.name];
    }
    
    onServicesChange(newSelectedServices);
  };
  
  // Handle service removal from tags
  const handleServiceRemove = (serviceName) => {
    const newSelectedServices = selectedServices.filter(name => name !== serviceName);
    onServicesChange(newSelectedServices);
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (!isDropdownOpen) {
      if (event.key === 'Enter' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsDropdownOpen(true);
        setFocusedIndex(0);
      }
      return;
    }
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < flatFilteredServices.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flatFilteredServices.length) {
          handleServiceSelect(flatFilteredServices[focusedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };
  
  // Handle input change
  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);
    setIsDropdownOpen(true);
    setFocusedIndex(-1);
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          label={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="bg-bg-primary border-bg-tertiary text-text-primary pr-10"
          labelProps={{ className: "text-text-secondary" }}
          containerProps={{ className: "text-text-primary" }}
          error={!!error}
          disabled={disabled || loading}
          icon={
            loading ? (
              <Spinner className="h-4 w-4 text-text-secondary" />
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4 text-text-secondary" />
            )
          }
        />
      </div>
      
      {/* Dropdown */}
      {isDropdownOpen && !loading && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {Object.keys(filteredGroupedServices).length === 0 ? (
            <div className="p-3 text-center">
              <Typography variant="small" className="text-text-secondary">
                {searchTerm ? `Nenhum serviço encontrado para "${searchTerm}"` : 'Nenhum serviço disponível'}
              </Typography>
            </div>
          ) : (
            Object.entries(filteredGroupedServices).map(([categoryName, categoryServices]) => (
              <div key={categoryName}>
                {/* Category Header */}
                <div className="sticky top-0 bg-bg-tertiary px-3 py-2 border-b border-bg-tertiary">
                  <Typography variant="small" className="text-text-secondary font-medium">
                    {categoryName}
                  </Typography>
                </div>
                
                {/* Services in Category */}
                {categoryServices.map((service) => {
                  const flatIndex = flatFilteredServices.findIndex(s => s.id === service.id);
                  const isSelected = selectedServices.includes(service.name);
                  const isFocused = flatIndex === focusedIndex;
                  
                  return (
                    <div
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      className={`
                        p-3 cursor-pointer transition-colors border-b border-bg-tertiary last:border-b-0
                        ${isFocused ? 'bg-accent-primary/10' : 'hover:bg-bg-tertiary'}
                        ${isSelected ? 'bg-accent-primary/5 border-l-4 border-l-accent-primary' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Typography variant="small" className={`font-medium ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>
                            {service.name}
                          </Typography>
                          {service.duration && (
                            <Typography variant="small" className="text-text-secondary text-xs">
                              {service.duration} min
                            </Typography>
                          )}
                        </div>
                        
                        {isSelected && (
                          <div className="ml-2">
                            <div className="w-4 h-4 bg-accent-primary rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Selected Services Tags */}
      {selectedServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedServices.map((serviceName, index) => {
            return (
              <Chip
                key={index}
                value={serviceName}
                variant="filled"
                className="bg-accent-primary text-white"
                icon={
                  <XMarkIcon 
                    className="h-3 w-3 cursor-pointer hover:bg-white/20 rounded-full p-0.5" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleServiceRemove(serviceName);
                    }}
                  />
                }
                onClose={() => handleServiceRemove(serviceName)}
              />
            );
          })}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <Typography variant="small" className="text-status-error mt-2">
          {error}
        </Typography>
      )}
      
      {/* Helper Text */}
      {selectedServices.length === 0 && !error && (
        <Typography variant="small" className="text-text-tertiary mt-2 text-xs">
          Digite para buscar e selecionar serviços
        </Typography>
      )}
    </div>
  );
};

export default SearchableServiceSelect;
