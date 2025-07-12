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
  baseDuration = 0,
  isMultipleChoice = false
}) => {
  // Early return if variation is null/undefined
  if (!variation) {
    return null;
  }

  // Size variants for mobile-friendly touch targets (iOS HIG compliant)
  const sizeClasses = {
    small: 'px-4 py-2.5 text-xs min-h-[44px]',
    medium: 'px-4 py-3 text-xs min-h-[48px]',
    large: 'px-5 py-3.5 text-sm min-h-[52px]'
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
      if (!isMultipleChoice && isSelected) {
        // For single choice radio buttons, pass null to unselect
        onSelect(null);
      } else {
        onSelect(variation);
      }
    }
  };

  return (
    <label
      onClick={handleClick}
      className={`
        flex items-start w-full p-3 rounded-lg cursor-pointer
        transition-all duration-200 ease-in-out
        hover:bg-gray-100 active:bg-gray-200
        touch-manipulation
        ${isSelected ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50 border border-gray-100'}
        ${className}
      `}
    >
      {/* Rounded Ball Checkmark */}
      <div className="flex-shrink-0 mr-3 mt-0.5">
        <div className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
          ${isSelected 
            ? 'border-pink-500 bg-pink-500 shadow-lg' 
            : 'border-gray-300 bg-white hover:border-gray-400'
          }
        `}>
          {isSelected && (
            <Check size={10} className="text-white stroke-[3]" />
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          {/* Variation Name */}
          <div className="font-medium text-gray-900 leading-tight pr-2 text-sm">
            {variation.name}
          </div>
          
          {/* Price */}
          {basePrice !== null && (
            <div className="font-bold text-pink-600 text-sm flex-shrink-0">
              R$ {(parseFloat(basePrice) + parseFloat(variation.price_delta || 0)).toFixed(2).replace('.', ',')}
            </div>
          )}
        </div>
        
        {/* Duration Info */}
        {baseDuration > 0 && (
          <div className="text-xs text-gray-500 mt-1">
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
        
        {/* Price Evaluation Badge */}
        {variation.price_subject_to_evaluation && (
          <div className="flex items-center mt-1.5">
            <div className="flex items-center bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
              <div className="w-1 h-1 bg-amber-400 rounded-full mr-1"></div>
              <span className="text-xs font-medium text-amber-700">
                Sujeito a avaliação
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden Radio/Checkbox Input */}
      <input
        type={isMultipleChoice ? "checkbox" : "radio"}
        className="sr-only"
        checked={isSelected}
        onChange={handleClick}
        aria-label={`${isMultipleChoice ? 'Toggle' : 'Select'} variation: ${variation.name}`}
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
  selectedVariationIds = [],
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

  const isMultipleChoice = group.multiple_choice || false;

  const getIsSelected = (variation) => {
    if (isMultipleChoice) {
      return selectedVariationIds.includes(variation.id);
    } else {
      return selectedVariationId === variation.id;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Group Label */}
      {showGroupName && (
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {group.name}
          </div>
          {isMultipleChoice && (
            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              Múltipla escolha
            </div>
          )}
        </div>
      )}
      
      {/* Variations */}
      <div className="space-y-2">
        {group.variations.map((variation) => (
          <VariationChip
            key={variation.id}
            variation={variation}
            isSelected={getIsSelected(variation)}
            onSelect={onVariationSelect}
            size={size}
            basePrice={basePrice}
            baseDuration={baseDuration}
            isMultipleChoice={isMultipleChoice}
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
  onVariationToggle,
  size = 'medium',
  className = '',
  showGroupNames = true,
  basePrice = null,
  baseDuration = 0
}) => {
  if (!Array.isArray(variationGroups) || variationGroups.length === 0) {
    return null;
  }

  const handleVariationSelect = (groupId, variation, group) => {
    if (group.multiple_choice) {
      // Use toggle for multiple choice groups
      if (onVariationToggle) {
        onVariationToggle(groupId, variation);
      }
    } else {
      // Use select for single choice groups
      if (onVariationSelect) {
        onVariationSelect(groupId, variation);
      }
    }
  };

  const getSelectedVariationIds = (groupId, group) => {
    const selection = selectedVariations[groupId];
    if (!selection) return [];
    
    if (group.multiple_choice && Array.isArray(selection)) {
      return selection.map(v => v.id);
    }
    
    return [];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {variationGroups.map((group) => (
        <VariationGroup
          key={group.id}
          group={group}
          selectedVariationId={!group.multiple_choice ? selectedVariations[group.id]?.id : undefined}
          selectedVariationIds={group.multiple_choice ? getSelectedVariationIds(group.id, group) : []}
          onVariationSelect={(variation) => handleVariationSelect(group.id, variation, group)}
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