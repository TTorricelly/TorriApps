import React from 'react';
import { Chip } from '@material-tailwind/react';

const statusConfig = {
  PENDING: {
    label: 'Pendente',
    color: 'orange',
    className: 'bg-orange-50 text-orange-800 border-orange-200'
  },
  PAID: {
    label: 'Pago',
    color: 'green', 
    className: 'bg-green-50 text-green-800 border-green-200'
  },
  REVERSED: {
    label: 'Estornado',
    color: 'red',
    className: 'bg-red-50 text-red-800 border-red-200'
  }
};

export default function CommissionStatusTag({ status }) {
  const config = statusConfig[status] || statusConfig.PENDING;
  
  return (
    <Chip
      size="sm"
      value={config.label}
      className={`${config.className} border font-medium text-xs px-2 py-1`}
    />
  );
}