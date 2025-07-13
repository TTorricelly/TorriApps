import React from 'react';
import { Typography } from '@material-tailwind/react';

const ServicePill = ({ 
  service, 
  isOffered = false, 
  size = 'sm',
  onClick = null 
}) => {
  const baseClasses = "inline-block px-2 py-1 text-xs rounded-md border transition-colors cursor-default";
  
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-xs",
    sm: "px-2 py-1 text-xs", 
    md: "px-3 py-1.5 text-sm"
  };
  
  const variantClasses = isOffered 
    ? "bg-accent-primary/10 text-accent-primary border-accent-primary/20 hover:bg-accent-primary/20"
    : "bg-bg-tertiary/50 text-text-tertiary border-bg-tertiary hover:bg-bg-tertiary/70";
    
  const clickableClasses = onClick ? "cursor-pointer" : "cursor-default";
  
  const finalClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses} ${clickableClasses}`;

  return (
    <span 
      className={finalClasses}
      onClick={onClick}
      title={service.name}
    >
      {service.name}
    </span>
  );
};

export default ServicePill;