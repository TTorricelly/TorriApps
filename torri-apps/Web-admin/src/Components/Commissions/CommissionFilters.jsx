import React from 'react';
import {
  Select,
  Option,
  Input,
  Button,
} from '@material-tailwind/react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function CommissionFilters({ 
  filters, 
  professionals, 
  onFilterChange 
}) {
  const handleClearFilters = () => {
    onFilterChange('professional_id', '');
    onFilterChange('payment_status', '');
    onFilterChange('date_from', '');
    onFilterChange('date_to', '');
    onFilterChange('search', '');
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
      {/* Professional Filter */}
      <div>
        <label className="block text-sm font-medium text-blue-gray-700 mb-1">
          Profissional
        </label>
        <Select
          value={filters.professional_id}
          onChange={(value) => onFilterChange('professional_id', value || '')}
          placeholder="Todos os profissionais"
          className="w-full"
        >
          <Option value="">Todos os profissionais</Option>
          {professionals.map((professional) => (
            <Option key={professional.id} value={professional.id}>
              {professional.full_name || professional.email}
            </Option>
          ))}
        </Select>
      </div>

      {/* Payment Status Filter */}
      <div>
        <label className="block text-sm font-medium text-blue-gray-700 mb-1">
          Status de Pagamento
        </label>
        <Select
          value={filters.payment_status}
          onChange={(value) => onFilterChange('payment_status', value || '')}
          placeholder="Todos os status"
          className="w-full"
        >
          <Option value="">Todos os status</Option>
          <Option value="PENDING">Pendente</Option>
          <Option value="PAID">Pago</Option>
          <Option value="REVERSED">Estornado</Option>
        </Select>
      </div>

      {/* Date From Filter */}
      <div>
        <label className="block text-sm font-medium text-blue-gray-700 mb-1">
          Data Inicial
        </label>
        <Input
          type="date"
          value={filters.date_from}
          onChange={(e) => onFilterChange('date_from', e.target.value)}
          className="w-full"
        />
      </div>

      {/* Date To Filter */}
      <div>
        <label className="block text-sm font-medium text-blue-gray-700 mb-1">
          Data Final
        </label>
        <Input
          type="date"
          value={filters.date_to}
          onChange={(e) => onFilterChange('date_to', e.target.value)}
          className="w-full"
        />
      </div>

      {/* Clear Filters Button */}
      <div>
        {hasActiveFilters && (
          <Button
            variant="outlined"
            color="gray"
            onClick={handleClearFilters}
            className="flex items-center gap-2 w-full"
          >
            <XMarkIcon className="h-4 w-4" />
            Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  );
}