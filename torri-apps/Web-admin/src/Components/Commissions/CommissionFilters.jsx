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
    <div className="space-y-3">
      {/* First Row - Main Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Professional Filter */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Profissional
          </label>
          <Select
            value={filters.professional_id}
            onChange={(value) => onFilterChange('professional_id', value || '')}
            placeholder="Todos os profissionais"
            className="bg-bg-primary border-bg-tertiary text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
            menuProps={{
              className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto"
            }}
          >
            <Option value="" className="text-text-primary hover:bg-bg-tertiary">Todos os profissionais</Option>
            {professionals.map((professional) => (
              <Option key={professional.id} value={professional.id} className="text-text-primary hover:bg-bg-tertiary">
                {professional.full_name || professional.email}
              </Option>
            ))}
          </Select>
        </div>

        {/* Payment Status Filter */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Status de Pagamento
          </label>
          <Select
            value={filters.payment_status}
            onChange={(value) => onFilterChange('payment_status', value || '')}
            placeholder="Todos os status"
            className="bg-bg-primary border-bg-tertiary text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
            menuProps={{
              className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto"
            }}
          >
            <Option value="" className="text-text-primary hover:bg-bg-tertiary">Todos os status</Option>
            <Option value="PENDING" className="text-text-primary hover:bg-bg-tertiary">Pendente</Option>
            <Option value="PAID" className="text-text-primary hover:bg-bg-tertiary">Pago</Option>
            <Option value="REVERSED" className="text-text-primary hover:bg-bg-tertiary">Estornado</Option>
          </Select>
        </div>
      </div>

      {/* Second Row - Date Filters and Clear Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        {/* Date From Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Data Inicial
          </label>
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) => onFilterChange('date_from', e.target.value)}
            className="bg-bg-primary border-bg-tertiary text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          />
        </div>

        {/* Date To Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Data Final
          </label>
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) => onFilterChange('date_to', e.target.value)}
            className="bg-bg-primary border-bg-tertiary text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          />
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <div className="flex-shrink-0">
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              className="border-bg-tertiary text-text-primary hover:bg-bg-primary flex items-center gap-2"
            >
              <XMarkIcon className="h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}