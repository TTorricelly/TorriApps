import { X } from 'lucide-react';
import { getContrastTextColor } from '../../utils/labelUtils';

const LabelChip = ({ 
  label, 
  onRemove, 
  showRemove = false, 
  size = 'medium',
  className = '' 
}) => {
  // Early return if label is null/undefined
  if (!label) {
    return null;
  }

  const { name, color = '#00BFFF' } = label;

  // Size variants for mobile-friendly touch targets (iOS HIG compliant)
  const sizeClasses = {
    small: 'px-2 py-1 text-xs min-h-[32px]',
    medium: 'px-3 py-1.5 text-sm min-h-[36px]',
    large: 'px-4 py-2 text-base min-h-[44px]'
  };

  const iconSizes = {
    small: 14,
    medium: 16,
    large: 18
  };

  // Remove button touch targets (iOS HIG: 44x44px minimum)
  const removeButtonSizes = {
    small: 'w-8 h-8 min-w-[32px] min-h-[32px]',
    medium: 'w-9 h-9 min-w-[36px] min-h-[36px]', 
    large: 'w-11 h-11 min-w-[44px] min-h-[44px]'
  };

  const textColor = getContrastTextColor(color);

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(label);
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        transition-all duration-200 ease-in-out
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ 
        backgroundColor: color,
        color: textColor
      }}
    >
      <span className="truncate max-w-[120px]" title={name}>
        {name}
      </span>
      
      {showRemove && (
        <button
          onClick={handleRemove}
          className={`
            flex items-center justify-center rounded-full
            transition-all duration-200 ease-in-out
            hover:bg-black hover:bg-opacity-20
            active:bg-black active:bg-opacity-30
            touch-manipulation
            ${removeButtonSizes[size]}
          `}
          style={{ color: textColor }}
          aria-label={`Remove ${name} label`}
        >
          <X size={iconSizes[size]} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export default LabelChip;