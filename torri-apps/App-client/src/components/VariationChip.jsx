/**
 * VariationChip Component
 * A chip component for displaying and selecting service variations
 * Based on LabelChip but optimized for variation selection behavior
 */

import { getVariationDisplayText } from '../services/serviceVariationsService';
import { Check } from 'lucide-react';

const VariationChip = ({ 
  variation, 
  isSelected = false,
  onSelect,
  size = 'medium',
  className = '',
  basePrice = null,
  baseDuration = 0
}) => {
  // Early return if variation is null/undefined
  if (!variation) {
    return null;
  }

  // Size variants for mobile-friendly touch targets (iOS HIG compliant)
  const sizeClasses = {
    small: 'px-4 py-3 text-sm min-h-[48px]',
    medium: 'px-5 py-3.5 text-sm min-h-[52px]',
    large: 'px-6 py-4 text-base min-h-[56px]'
  };

  // Enhanced color scheme for better mobile UX
  const getChipColors = () => {
    if (isSelected) {
      return {
        backgroundColor: '#ec4899', // pink-500
        textColor: '#ffffff',
        borderColor: '#ec4899',
        shadow: '0 4px 8px rgba(236, 72, 153, 0.3)'
      };
    }
    
    return {
      backgroundColor: '#f8fafc', // slate-50
      textColor: '#1e293b', // slate-800
      borderColor: '#cbd5e1', // slate-300
      shadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
    };
  };

  const { backgroundColor, textColor, borderColor, shadow } = getChipColors();
  const displayText = getVariationDisplayText(variation, basePrice);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect) {
      onSelect(variation);
    }
  };

  return (
    <label
      className={`
        flex items-start w-full p-4 rounded-lg cursor-pointer
        transition-all duration-200 ease-in-out
        hover:bg-gray-100 active:bg-gray-200
        touch-manipulation
        ${isSelected ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50 border border-gray-100'}
        ${className}
      `}
    >
      {/* Rounded Ball Checkmark */}
      <div className="flex-shrink-0 mr-4 mt-1">
        <div className={`
          w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
          ${isSelected 
            ? 'border-pink-500 bg-pink-500 shadow-lg' 
            : 'border-gray-300 bg-white hover:border-gray-400'
          }
        `}>
          {isSelected && (
            <Check size={12} className="text-white stroke-[3]" />
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          {/* Variation Name */}
          <div className="font-medium text-gray-900 leading-tight pr-2">
            {variation.name}
          </div>
          
          {/* Price */}
          {basePrice !== null && (
            <div className="font-bold text-pink-600 text-lg flex-shrink-0">
              R$ {(parseFloat(basePrice) + parseFloat(variation.price_delta || 0)).toFixed(2).replace('.', ',')}
            </div>
          )}
        </div>
        
        {/* Duration Info */}
        {baseDuration > 0 && (
          <div className="text-sm text-gray-500 mt-1">
            {(() => {
              const totalMinutes = baseDuration + (variation.duration_delta || 0);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              
              if (totalMinutes <= 0) return "0min";
              
              if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}min`;
              } else if (hours > 0) {
                return `${hours}h`;
              } else {
                return `${minutes}min`;
              }
            })()}
          </div>
        )}
      </div>
      
      {/* Hidden Radio Input */}
      <input
        type="radio"
        className="sr-only"
        checked={isSelected}
        onChange={handleClick}
        aria-label={`Select variation: ${variation.name}`}
      />
    </label>
  );
};

/**
 * VariationGroup Component
 * Groups related variations together with a label
 */
export const VariationGroup = ({ 
  group, 
  selectedVariationId,
  onVariationSelect,
  size = 'medium',
  className = '',
  showGroupName = true,
  basePrice = null,
  baseDuration = 0
}) => {
  if (!group || !Array.isArray(group.variations) || group.variations.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Group Label */}
      {showGroupName && (
        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          {group.name}
        </div>
      )}
      
      {/* Variations */}
      <div className="space-y-2">
        {group.variations.map((variation) => (
          <VariationChip
            key={variation.id}
            variation={variation}
            isSelected={selectedVariationId === variation.id}
            onSelect={onVariationSelect}
            size={size}
            basePrice={basePrice}
            baseDuration={baseDuration}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * ServiceVariations Component
 * Main component that displays all variation groups for a service
 */
export const ServiceVariations = ({ 
  variationGroups = [],
  selectedVariations = {},
  onVariationSelect,
  size = 'medium',
  className = '',
  showGroupNames = true,
  basePrice = null,
  baseDuration = 0
}) => {
  if (!Array.isArray(variationGroups) || variationGroups.length === 0) {
    return null;
  }

  const handleVariationSelect = (groupId, variation) => {
    if (onVariationSelect) {
      onVariationSelect(groupId, variation);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {variationGroups.map((group) => (
        <VariationGroup
          key={group.id}
          group={group}
          selectedVariationId={selectedVariations[group.id]?.id}
          onVariationSelect={(variation) => handleVariationSelect(group.id, variation)}
          size={size}
          showGroupName={showGroupNames}
          basePrice={basePrice}
          baseDuration={baseDuration}
        />
      ))}
    </div>
  );
};

export default VariationChip;