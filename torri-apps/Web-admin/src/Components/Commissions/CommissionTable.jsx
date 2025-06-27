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
    <Dialog open={isOpen} handler={onClose} size="md">
      <DialogHeader>Ajustar Comissão</DialogHeader>
      <DialogBody divider className="space-y-4">
        <div>
          <Typography variant="small" className="font-medium mb-2">
            Profissional: {commission.professional_name}
          </Typography>
          <Typography variant="small" className="text-blue-gray-600 mb-2">
            Serviço: {commission.service_name}
          </Typography>
          <Typography variant="small" className="text-blue-gray-600">
            Valor Original: R$ {parseFloat(commission.calculated_value).toFixed(2).replace('.', ',')}
          </Typography>
        </div>

        <div>
          <Typography variant="small" className="font-medium mb-2">
            Novo Valor da Comissão *
          </Typography>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={adjustedValue}
            onChange={(e) => setAdjustedValue(e.target.value)}
            placeholder="0,00"
          />
        </div>

        <div>
          <Typography variant="small" className="font-medium mb-2">
            Motivo do Ajuste
          </Typography>
          <Textarea
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            placeholder="Descreva o motivo do ajuste (opcional)"
            rows={3}
          />
        </div>
      </DialogBody>
      <DialogFooter className="space-x-2">
        <Button variant="outlined" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button 
          color="blue" 
          onClick={handleSave} 
          disabled={isLoading || !adjustedValue}
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
        <Typography variant="h6" className="text-blue-gray-500 mb-2">
          Nenhuma comissão encontrada
        </Typography>
        <Typography variant="small" className="text-blue-gray-400">
          Ajuste os filtros para ver mais resultados
        </Typography>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b border-blue-gray-100">
              <th className="text-left p-4">
                <Checkbox
                  checked={allPendingSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  disabled={pendingCommissions.length === 0}
                />
              </th>
              <th className="text-left p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Data
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Profissional
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Serviço
                </Typography>
              </th>
              <th className="text-right p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Preço Serviço
                </Typography>
              </th>
              <th className="text-center p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  %
                </Typography>
              </th>
              <th className="text-right p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Valor Calculado
                </Typography>
              </th>
              <th className="text-right p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Valor Ajustado
                </Typography>
              </th>
              <th className="text-center p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Status
                </Typography>
              </th>
              <th className="text-center p-4">
                <Typography variant="small" className="font-medium text-blue-gray-600">
                  Ações
                </Typography>
              </th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((commission, index) => {
              const isSelected = selectedCommissions.includes(commission.id);
              const isPending = commission.payment_status === 'PENDING';
              const finalValue = commission.adjusted_value || commission.calculated_value;

              return (
                <tr 
                  key={commission.id} 
                  className={`border-b border-blue-gray-50 ${
                    index % 2 === 0 ? 'bg-blue-gray-50/50' : 'bg-white'
                  } hover:bg-blue-50`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => onCommissionSelect(commission.id, e.target.checked)}
                      disabled={!isPending}
                    />
                  </td>
                  <td className="p-4">
                    <Typography variant="small" className="text-blue-gray-800">
                      {formatDate(commission.appointment_date)}
                    </Typography>
                  </td>
                  <td className="p-4">
                    <Typography variant="small" className="text-blue-gray-800 font-medium">
                      {commission.professional_name || 'N/A'}
                    </Typography>
                  </td>
                  <td className="p-4">
                    <Typography variant="small" className="text-blue-gray-600">
                      {commission.service_name || 'N/A'}
                    </Typography>
                  </td>
                  <td className="text-right p-4">
                    <Typography variant="small" className="text-blue-gray-800">
                      {formatCurrency(commission.service_price)}
                    </Typography>
                  </td>
                  <td className="text-center p-4">
                    <Typography variant="small" className="text-blue-gray-600">
                      {formatPercentage(commission.commission_percentage)}
                    </Typography>
                  </td>
                  <td className="text-right p-4">
                    <Typography variant="small" className="text-blue-gray-800">
                      {formatCurrency(commission.calculated_value)}
                    </Typography>
                  </td>
                  <td className="text-right p-4">
                    {commission.adjusted_value ? (
                      <div>
                        <Typography variant="small" className="text-blue-600 font-medium">
                          {formatCurrency(commission.adjusted_value)}
                        </Typography>
                        {commission.adjustment_reason && (
                          <Typography variant="tiny" className="text-blue-gray-500">
                            {commission.adjustment_reason}
                          </Typography>
                        )}
                      </div>
                    ) : (
                      <Typography variant="small" className="text-blue-gray-400">
                        -
                      </Typography>
                    )}
                  </td>
                  <td className="text-center p-4">
                    <CommissionStatusTag status={commission.payment_status} />
                  </td>
                  <td className="text-center p-4">
                    <div className="flex justify-center gap-2">
                      {isPending && (
                        <Button
                          size="sm"
                          variant="outlined"
                          color="blue"
                          onClick={() => handleAdjustCommission(commission)}
                          className="p-2"
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