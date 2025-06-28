import React, { useState } from 'react';
import {
  Typography,
  Chip,
  Checkbox,
  Button,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Textarea,
} from '@material-tailwind/react';
import {
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

import CommissionStatusTag from './CommissionStatusTag';
import { commissionsApi } from '../../Services/commissionsApi';

const AdjustCommissionModal = ({ 
  isOpen, 
  commission, 
  onClose, 
  onSave, 
  isLoading 
}) => {
  const [adjustedValue, setAdjustedValue] = useState(
    commission?.adjusted_value || commission?.calculated_value || ''
  );
  const [adjustmentReason, setAdjustmentReason] = useState(
    commission?.adjustment_reason || ''
  );

  const handleSave = () => {
    onSave({
      adjusted_value: parseFloat(adjustedValue),
      adjustment_reason: adjustmentReason,
    });
  };

  if (!commission) return null;

  return (
    <Dialog open={isOpen} handler={onClose} size="md" className="bg-bg-secondary border border-bg-tertiary">
      <DialogHeader className="text-text-primary bg-bg-secondary">Ajustar Comissão</DialogHeader>
      <DialogBody divider className="space-y-4 bg-bg-secondary border-bg-tertiary">
        <div>
          <Typography variant="small" className="font-medium mb-2 text-text-primary">
            Profissional: {commission.professional_name}
          </Typography>
          <Typography variant="small" className="text-text-secondary mb-2">
            Serviço: {commission.service_name}
          </Typography>
          <Typography variant="small" className="text-text-secondary">
            Valor Original: R$ {parseFloat(commission.calculated_value).toFixed(2).replace('.', ',')}
          </Typography>
        </div>

        <div>
          <Typography variant="small" className="font-medium mb-2 text-text-primary">
            Novo Valor da Comissão *
          </Typography>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={adjustedValue}
            onChange={(e) => setAdjustedValue(e.target.value)}
            placeholder="0,00"
            className="bg-bg-primary border-bg-tertiary text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          />
        </div>

        <div>
          <Typography variant="small" className="font-medium mb-2 text-text-primary">
            Motivo do Ajuste
          </Typography>
          <Textarea
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            placeholder="Descreva o motivo do ajuste (opcional)"
            rows={3}
            className="bg-bg-primary border-bg-tertiary text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          />
        </div>
      </DialogBody>
      <DialogFooter className="space-x-2 bg-bg-secondary">
        <Button 
          variant="outlined" 
          onClick={onClose} 
          disabled={isLoading}
          className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isLoading || !adjustedValue}
          className="bg-accent-primary hover:bg-accent-primary/90"
        >
          {isLoading ? <Spinner className="h-4 w-4" /> : 'Salvar Ajuste'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default function CommissionTable({
  commissions,
  selectedCommissions,
  isLoading,
  onCommissionSelect,
  onSelectAll,
  onCommissionUpdate,
}) {
  const [adjustModal, setAdjustModal] = useState({ open: false, commission: null });
  const [isAdjusting, setIsAdjusting] = useState(false);

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return `R$ ${parseFloat(value).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatPercentage = (value) => {
    if (!value) return '0%';
    return `${parseFloat(value).toFixed(1)}%`;
  };

  const handleAdjustCommission = (commission) => {
    setAdjustModal({ open: true, commission });
  };

  const handleSaveAdjustment = async (adjustmentData) => {
    try {
      setIsAdjusting(true);
      await commissionsApi.updateCommission(adjustModal.commission.id, adjustmentData);
      setAdjustModal({ open: false, commission: null });
      onCommissionUpdate();
    } catch (error) {
      console.error('Error adjusting commission:', error);
      // Handle error (show alert, etc.)
    } finally {
      setIsAdjusting(false);
    }
  };

  const pendingCommissions = commissions.filter(c => c.payment_status === 'PENDING');
  const allPendingSelected = pendingCommissions.length > 0 && 
    pendingCommissions.every(c => selectedCommissions.includes(c.id));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-12">
        <Typography variant="h6" className="text-text-secondary mb-2">
          Nenhuma comissão encontrada
        </Typography>
        <Typography variant="small" className="text-text-tertiary">
          Ajuste os filtros para ver mais resultados
        </Typography>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[1200px]">
          <thead>
            <tr className="border-b border-bg-tertiary">
              <th className="text-left p-2" style={{ width: '48px' }}>
                <Checkbox
                  checked={allPendingSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  disabled={pendingCommissions.length === 0}
                />
              </th>
              <th className="text-left p-2" style={{ width: '100px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Data
                </Typography>
              </th>
              <th className="text-left p-2" style={{ width: '150px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Profissional
                </Typography>
              </th>
              <th className="text-left p-2" style={{ width: '200px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Serviço
                </Typography>
              </th>
              <th className="text-right p-2" style={{ width: '120px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Preço Serviço
                </Typography>
              </th>
              <th className="text-center p-2" style={{ width: '60px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  %
                </Typography>
              </th>
              <th className="text-right p-2" style={{ width: '120px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Valor Calculado
                </Typography>
              </th>
              <th className="text-right p-2" style={{ width: '140px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Valor Ajustado
                </Typography>
              </th>
              <th className="text-center p-2" style={{ width: '100px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Status
                </Typography>
              </th>
              <th className="text-center p-2" style={{ width: '80px' }}>
                <Typography variant="small" className="font-medium text-text-secondary">
                  Ações
                </Typography>
              </th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((commission, index) => {
              const isSelected = selectedCommissions.includes(commission.id);
              const isPending = commission.payment_status === 'PENDING';

              return (
                <tr 
                  key={commission.id} 
                  className={`border-b border-bg-tertiary ${
                    index % 2 === 0 ? 'bg-bg-primary/20' : 'bg-bg-secondary'
                  } hover:bg-bg-primary/50`}
                >
                  <td className="p-2 overflow-hidden">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => onCommissionSelect(commission.id, e.target.checked)}
                      disabled={!isPending}
                    />
                  </td>
                  <td className="p-2 overflow-hidden">
                    <Typography variant="small" className="text-text-primary whitespace-nowrap">
                      {formatDate(commission.appointment_date)}
                    </Typography>
                  </td>
                  <td className="p-2 overflow-hidden">
                    <Typography variant="small" className="text-text-primary font-medium truncate">
                      {commission.professional_name || 'N/A'}
                    </Typography>
                  </td>
                  <td className="p-2 overflow-hidden">
                    <Typography variant="small" className="text-text-secondary truncate">
                      {commission.service_name || 'N/A'}
                    </Typography>
                  </td>
                  <td className="text-right p-2 overflow-hidden">
                    <Typography variant="small" className="text-text-primary whitespace-nowrap">
                      {formatCurrency(commission.service_price)}
                    </Typography>
                  </td>
                  <td className="text-center p-2 overflow-hidden">
                    <Typography variant="small" className="text-text-secondary whitespace-nowrap">
                      {formatPercentage(commission.commission_percentage)}
                    </Typography>
                  </td>
                  <td className="text-right p-2 overflow-hidden">
                    <Typography variant="small" className="text-text-primary whitespace-nowrap">
                      {formatCurrency(commission.calculated_value)}
                    </Typography>
                  </td>
                  <td className="text-right p-2 overflow-hidden">
                    {commission.adjusted_value ? (
                      <div className="overflow-hidden">
                        <Typography variant="small" className="text-accent-primary font-medium whitespace-nowrap">
                          {formatCurrency(commission.adjusted_value)}
                        </Typography>
                        {commission.adjustment_reason && (
                          <Typography variant="tiny" className="text-text-tertiary truncate">
                            {commission.adjustment_reason}
                          </Typography>
                        )}
                      </div>
                    ) : (
                      <Typography variant="small" className="text-text-tertiary">
                        -
                      </Typography>
                    )}
                  </td>
                  <td className="text-center p-2 overflow-hidden">
                    <CommissionStatusTag status={commission.payment_status} />
                  </td>
                  <td className="text-center p-2 overflow-hidden">
                    <div className="flex justify-center">
                      {isPending && (
                        <Button
                          size="sm"
                          variant="outlined"
                          onClick={() => handleAdjustCommission(commission)}
                          className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 p-1 min-w-0"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adjust Commission Modal */}
      <AdjustCommissionModal
        isOpen={adjustModal.open}
        commission={adjustModal.commission}
        onClose={() => setAdjustModal({ open: false, commission: null })}
        onSave={handleSaveAdjustment}
        isLoading={isAdjusting}
      />
    </>
  );
}