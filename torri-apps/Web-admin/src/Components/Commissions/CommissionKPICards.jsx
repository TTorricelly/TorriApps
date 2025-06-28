import React from 'react';
import {
  Card,
  CardBody,
  Typography,
  Spinner,
} from '@material-tailwind/react';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const KPICard = ({ title, value, subtitle, icon: Icon, color, isLoading }) => (
  <Card className="bg-bg-secondary border border-bg-tertiary shadow-card hover:shadow-card-hover transition-shadow duration-normal">
    <CardBody className="p-4 bg-bg-secondary">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Typography variant="small" className="text-text-secondary font-medium mb-1">
            {title}
          </Typography>
          {isLoading ? (
            <div className="flex items-center">
              <Spinner className="h-4 w-4" />
            </div>
          ) : (
            <>
              <Typography variant="h4" className={`font-bold ${color}`}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="small" className="text-text-tertiary mt-1">
                  {subtitle}
                </Typography>
              )}
            </>
          )}
        </div>
        <div className="p-3 rounded-full bg-bg-tertiary">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </CardBody>
  </Card>
);

export default function CommissionKPICards({ kpis, isLoading }) {
  // Format currency values
  const formatCurrency = (value) => {
    if (!value || value === '0.00') return 'R$ 0,00';
    return `R$ ${parseFloat(value).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Pending */}
      <KPICard
        title="Total a Pagar"
        value={formatCurrency(kpis.total_pending)}
        subtitle={`${kpis.pending_count} comissões pendentes`}
        icon={ClockIcon}
        color="text-status-warning"
        isLoading={isLoading}
      />

      {/* Total Paid */}
      <KPICard
        title="Total Pago"
        value={formatCurrency(kpis.total_paid)}
        subtitle="Este período"
        icon={CheckCircleIcon}
        color="text-status-success"
        isLoading={isLoading}
      />

      {/* Total This Period */}
      <KPICard
        title="Comissões do Período"
        value={formatCurrency(kpis.total_this_period)}
        subtitle={`${kpis.commission_count} comissões`}
        icon={CurrencyDollarIcon}
        color="text-accent-primary"
        isLoading={isLoading}
      />

      {/* Last Payment */}
      <KPICard
        title="Último Pagamento"
        value={formatCurrency(kpis.last_payment_amount)}
        subtitle={formatDate(kpis.last_payment_date)}
        icon={BanknotesIcon}
        color="text-accent-secondary"
        isLoading={isLoading}
      />
    </div>
  );
}