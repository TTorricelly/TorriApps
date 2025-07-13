import React, { useState } from 'react';
import { Typography, Avatar, Badge } from '@material-tailwind/react';

const ProfessionalHeader = ({ 
  professional, 
  orderNumber,
  getInitials
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex items-center gap-3 p-4 border-b border-bg-tertiary">
      {/* Order Number */}
      <div className="flex flex-col items-center">
        <Typography className="text-text-primary font-semibold text-sm">
          {orderNumber}
        </Typography>
      </div>

      {/* Professional Photo */}
      <div className="w-12 h-12 flex-shrink-0">
        {professional.photo_url && !imageError ? (
          <Avatar
            src={professional.photo_url}
            alt={professional.full_name}
            className="w-12 h-12"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-12 h-12 bg-bg-tertiary rounded-full flex items-center justify-center">
            <Typography className="text-text-secondary text-sm font-medium">
              {getInitials(professional.full_name)}
            </Typography>
          </div>
        )}
      </div>

      {/* Professional Info */}
      <div className="flex-1 min-w-0">
        <Typography className="text-text-primary font-semibold text-base truncate">
          {professional.full_name || 'Nome não informado'}
        </Typography>
        <Typography className="text-text-secondary text-sm truncate">
          {professional.email}
        </Typography>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        <Badge 
          color={professional.is_active ? "green" : "orange"}
          className="text-xs"
        >
          {professional.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </div>
    </div>
  );
};

export default ProfessionalHeader;