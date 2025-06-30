import React, { useState } from 'react';
import { 
  Dialog, 
  DialogHeader, 
  DialogBody, 
  DialogFooter, 
  Typography, 
  Button, 
  Card,
  CardBody,
  Select,
  Option,
  Input
} from "@material-tailwind/react";
import {
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

const CheckoutModal = ({ open, onClose, appointmentGroup, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('MONEY');
  const [amountPaid, setAmountPaid] = useState(appointmentGroup?.total_price || 0);
  const [loading, setLoading] = useState(false);

  if (!appointmentGroup) return null;

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Calculate change
  const change = amountPaid - appointmentGroup.total_price;

  // Handle payment completion
  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const paymentData = {
        appointment_group_id: appointmentGroup.id,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        total_price: appointmentGroup.total_price,
        change: change
      };

      await onPaymentComplete(paymentData);
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      handler={onClose}
      size="lg"
      className="bg-bg-secondary border border-bg-tertiary"
    >
      <DialogHeader className="text-text-primary border-b border-bg-tertiary">
        <div className="flex items-center gap-s">
          <CurrencyDollarIcon className="h-6 w-6 text-accent-primary" />
          <Typography variant="h4" className="text-text-primary">
            Checkout - {appointmentGroup.client_name}
          </Typography>
        </div>
      </DialogHeader>
      
      <DialogBody className="p-l">
        <div className="space-y-l">
          {/* Service Summary */}
          <Card className="bg-bg-tertiary border border-bg-tertiary">
            <CardBody className="p-m">
              <Typography variant="h6" className="text-text-primary mb-s">
                Resumo dos Serviços
              </Typography>
              
              <div className="space-y-s">
                {appointmentGroup.service_names && appointmentGroup.service_names.split(', ').map((service, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-text-secondary">{service}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-bg-tertiary mt-s pt-s">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-xs text-text-secondary">
                    <ClockIcon className="h-4 w-4" />
                    <span>{appointmentGroup.total_duration_minutes}min</span>
                  </div>
                  <Typography variant="h6" className="text-accent-secondary font-semibold">
                    {formatPrice(appointmentGroup.total_price)}
                  </Typography>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Payment Method */}
          <div className="space-y-s">
            <Typography variant="h6" className="text-text-primary">
              Método de Pagamento
            </Typography>
            
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              className="text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
            >
              <Option value="MONEY">
                <div className="flex items-center gap-s">
                  <BanknotesIcon className="h-4 w-4" />
                  <span>Dinheiro</span>
                </div>
              </Option>
              <Option value="CARD">
                <div className="flex items-center gap-s">
                  <CreditCardIcon className="h-4 w-4" />
                  <span>Cartão</span>
                </div>
              </Option>
              <Option value="PIX">
                <div className="flex items-center gap-s">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  <span>PIX</span>
                </div>
              </Option>
            </Select>
          </div>

          {/* Payment Amount */}
          {paymentMethod === 'MONEY' && (
            <div className="space-y-s">
              <Typography variant="h6" className="text-text-primary">
                Valor Recebido
              </Typography>
              
              <Input
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                icon={<CurrencyDollarIcon className="h-5 w-5" />}
              />
              
              {change > 0 && (
                <div className="bg-status-warning/20 border border-status-warning rounded-card p-s">
                  <Typography className="text-status-warning font-medium">
                    Troco: {formatPrice(change)}
                  </Typography>
                </div>
              )}
              
              {change < 0 && (
                <div className="bg-status-error/20 border border-status-error rounded-card p-s">
                  <Typography className="text-status-error font-medium">
                    Faltam: {formatPrice(Math.abs(change))}
                  </Typography>
                </div>
              )}
            </div>
          )}

          {/* Payment Summary */}
          <Card className="bg-accent-primary/10 border border-accent-primary">
            <CardBody className="p-m">
              <div className="flex justify-between items-center">
                <Typography variant="h6" className="text-text-primary">
                  Total a Pagar:
                </Typography>
                <Typography variant="h5" className="text-accent-primary font-bold">
                  {formatPrice(appointmentGroup.total_price)}
                </Typography>
              </div>
            </CardBody>
          </Card>
        </div>
      </DialogBody>
      
      <DialogFooter className="border-t border-bg-tertiary">
        <Button
          variant="outlined"
          onClick={onClose}
          className="border-bg-tertiary text-text-secondary hover:bg-bg-tertiary mr-s"
        >
          Cancelar
        </Button>
        
        <Button
          onClick={handlePayment}
          disabled={loading || (paymentMethod === 'MONEY' && change < 0)}
          className="bg-status-success hover:bg-status-success/90 text-white flex items-center gap-s"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processando...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              Finalizar Pagamento
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default CheckoutModal;