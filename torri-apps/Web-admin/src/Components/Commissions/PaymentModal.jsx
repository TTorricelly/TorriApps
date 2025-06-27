import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Typography,
  Input,
  Select,
  Option,
  Textarea,
  Alert,
  Spinner,
} from '@material-tailwind/react';
import { 
  BanknotesIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

const paymentMethods = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BANK_TRANSFER', label: 'Transferência Bancária' },
  { value: 'CARD', label: 'Cartão' },
  { value: 'OTHER', label: 'Outro' },
];

export default function PaymentModal({
  isOpen,
  commissions,
  professionals,
  isProcessing,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({
    payment_method: 'PIX',
    payment_date: new Date().toISOString().split('T')[0],
    period_start: '',
    period_end: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  // Calculate totals and professional info
  const totalAmount = commissions.reduce((sum, commission) => {
    return sum + parseFloat(commission.adjusted_value || commission.calculated_value);
  }, 0);

  const professionalId = commissions.length > 0 ? commissions[0].professional_id : null;
  const professionalName = commissions.length > 0 ? commissions[0].professional_name : '';

  // Auto-calculate period based on commission dates
  useEffect(() => {
    if (commissions.length > 0) {
      const dates = commissions
        .map(c => new Date(c.appointment_date))
        .sort((a, b) => a - b);
      
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      setFormData(prev => ({
        ...prev,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
      }));
    }
  }, [commissions]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.payment_method) {
      newErrors.payment_method = 'Forma de pagamento é obrigatória';
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Data de pagamento é obrigatória';
    }

    if (!formData.period_start) {
      newErrors.period_start = 'Data inicial do período é obrigatória';
    }

    if (!formData.period_end) {
      newErrors.period_end = 'Data final do período é obrigatória';
    }

    if (formData.period_start && formData.period_end && 
        new Date(formData.period_start) > new Date(formData.period_end)) {
      newErrors.period_end = 'Data final deve ser posterior à data inicial';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const paymentData = {
      professional_id: professionalId,
      commission_ids: commissions.map(c => c.id),
      total_amount: totalAmount.toFixed(2),
      ...formData,
    };

    onSubmit(paymentData);
  };

  const handleClose = () => {
    setFormData({
      payment_method: 'PIX',
      payment_date: new Date().toISOString().split('T')[0],
      period_start: '',
      period_end: '',
      notes: '',
    });
    setErrors({});
    onClose();
  };

  const formatCurrency = (value) => {
    return `R$ ${value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} handler={handleClose} size="lg">
      <DialogHeader className="flex items-center gap-2">
        <BanknotesIcon className="h-6 w-6 text-green-600" />
        Registrar Pagamento de Comissão
      </DialogHeader>
      
      <DialogBody divider className="space-y-6 max-h-96 overflow-y-auto">
        {/* Payment Summary */}
        <div className="bg-blue-50 rounded-lg p-4">
          <Typography variant="h6" className="text-blue-800 mb-2">
            Resumo do Pagamento
          </Typography>
          <div className="space-y-1">
            <Typography variant="small" className="text-blue-700">
              <span className="font-medium">Profissional:</span> {professionalName}
            </Typography>
            <Typography variant="small" className="text-blue-700">
              <span className="font-medium">Comissões:</span> {commissions.length} item(s)
            </Typography>
            <Typography variant="h6" className="text-blue-800 font-bold">
              <span className="font-medium">Total:</span> {formatCurrency(totalAmount)}
            </Typography>
          </div>
        </div>

        {/* Commission Details */}
        <div>
          <Typography variant="small" className="font-medium text-blue-gray-700 mb-2">
            Comissões Incluídas
          </Typography>
          <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
            {commissions.map((commission, index) => (
              <div key={commission.id} className="flex justify-between items-center py-1">
                <Typography variant="tiny" className="text-blue-gray-600">
                  {commission.service_name} - {new Date(commission.appointment_date).toLocaleDateString('pt-BR')}
                </Typography>
                <Typography variant="tiny" className="font-medium">
                  {formatCurrency(parseFloat(commission.adjusted_value || commission.calculated_value))}
                </Typography>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Method */}
          <div>
            <Typography variant="small" className="font-medium text-blue-gray-700 mb-2">
              Forma de Pagamento *
            </Typography>
            <Select
              value={formData.payment_method}
              onChange={(value) => handleInputChange('payment_method', value)}
              error={!!errors.payment_method}
            >
              {paymentMethods.map((method) => (
                <Option key={method.value} value={method.value}>
                  {method.label}
                </Option>
              ))}
            </Select>
            {errors.payment_method && (
              <Typography variant="tiny" className="text-red-500 mt-1">
                {errors.payment_method}
              </Typography>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <Typography variant="small" className="font-medium text-blue-gray-700 mb-2">
              Data do Pagamento *
            </Typography>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => handleInputChange('payment_date', e.target.value)}
              error={!!errors.payment_date}
            />
            {errors.payment_date && (
              <Typography variant="tiny" className="text-red-500 mt-1">
                {errors.payment_date}
              </Typography>
            )}
          </div>

          {/* Period Start */}
          <div>
            <Typography variant="small" className="font-medium text-blue-gray-700 mb-2">
              Período Inicial *
            </Typography>
            <Input
              type="date"
              value={formData.period_start}
              onChange={(e) => handleInputChange('period_start', e.target.value)}
              error={!!errors.period_start}
            />
            {errors.period_start && (
              <Typography variant="tiny" className="text-red-500 mt-1">
                {errors.period_start}
              </Typography>
            )}
          </div>

          {/* Period End */}
          <div>
            <Typography variant="small" className="font-medium text-blue-gray-700 mb-2">
              Período Final *
            </Typography>
            <Input
              type="date"
              value={formData.period_end}
              onChange={(e) => handleInputChange('period_end', e.target.value)}
              error={!!errors.period_end}
            />
            {errors.period_end && (
              <Typography variant="tiny" className="text-red-500 mt-1">
                {errors.period_end}
              </Typography>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <Typography variant="small" className="font-medium text-blue-gray-700 mb-2">
            Observações
          </Typography>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Observações sobre o pagamento (opcional)"
            rows={3}
          />
        </div>

        {/* Warning */}
        <Alert 
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          color="orange"
          className="text-sm"
        >
          Este pagamento marcará as comissões selecionadas como "Pagas" e não poderá ser desfeito facilmente.
        </Alert>
      </DialogBody>

      <DialogFooter className="space-x-2">
        <Button variant="outlined" onClick={handleClose} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button 
          color="green" 
          onClick={handleSubmit} 
          disabled={isProcessing || commissions.length === 0}
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Spinner className="h-4 w-4" />
              Processando...
            </>
          ) : (
            <>
              <BanknotesIcon className="h-4 w-4" />
              Confirmar Pagamento
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}