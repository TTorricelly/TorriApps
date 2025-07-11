/**
 * VariationChip Component
 * A chip component for displaying and selecting service variations
 * Based on LabelChip but optimized for variation selection behavior
 */

import { getVariationDisplayText } from '../services/serviceVariationsService';

const VariationChip = ({ 
  variation, 
  isSelected = false,
  onSelect,
  size = 'medium',
  className = '',
  basePrice = null
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
    <button
      onClick={handleClick}
      className={`
        w-full flex items-center justify-between rounded-xl font-medium border-2
        transition-all duration-300 ease-out
        hover:scale-[1.02] active:scale-[0.98]
        touch-manipulation cursor-pointer
        ${displayText.length > 40 ? 'max-w-[280px]' : 'max-w-[240px]'}
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ 
        backgroundColor,
        color: textColor,
        borderColor,
        boxShadow: shadow
      }}
      aria-label={`Select variation: ${displayText}`}
      role="radio"
      aria-checked={isSelected}
    >
      <div className="flex-1 text-left">
        <span 
          className={`${displayText.length > 40 ? 'whitespace-normal break-words leading-tight' : 'whitespace-nowrap'} font-medium`} 
          title={displayText}
        >
          {variation.name}
        </span>
        <div className="text-xs font-bold mt-1 opacity-90">
          {basePrice !== null ? `R$ ${(parseFloat(basePrice) + parseFloat(variation.price_delta || 0)).toFixed(2).replace('.', ',')}` : ''}
        </div>
      </div>
      
      {isSelected && (
        <div className="ml-2 flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
          </div>
        </div>
      )}
    </button>
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
  basePrice = null
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
  basePrice = null
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
        />
      ))}
    </div>
  );
};

export default VariationChip;