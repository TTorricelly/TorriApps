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
    small: 'px-2 py-1 text-xs min-h-[32px]',
    medium: 'px-3 py-1.5 text-sm min-h-[36px]',
    large: 'px-4 py-2 text-base min-h-[44px]'
  };

  // Color scheme for selected/unselected states
  const getChipColors = () => {
    if (isSelected) {
      return {
        backgroundColor: '#ec4899', // pink-500
        textColor: '#ffffff',
        borderColor: '#ec4899'
      };
    }
    
    return {
      backgroundColor: '#ffffff',
      textColor: '#374151', // gray-700
      borderColor: '#d1d5db' // gray-300
    };
  };

  const { backgroundColor, textColor, borderColor } = getChipColors();
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
        inline-flex items-center justify-center gap-1 rounded-full font-medium border
        transition-all duration-200 ease-in-out
        hover:shadow-sm active:scale-95
        touch-manipulation cursor-pointer
        ${displayText.length > 40 ? 'max-w-[200px]' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ 
        backgroundColor,
        color: textColor,
        borderColor
      }}
      aria-label={`Select variation: ${displayText}`}
      role="radio"
      aria-checked={isSelected}
    >
      <span 
        className={`${displayText.length > 40 ? 'whitespace-normal break-words text-center leading-tight' : 'whitespace-nowrap'}`} 
        title={displayText}
      >
        {displayText}
      </span>
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
      <div className="flex flex-wrap gap-2">
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