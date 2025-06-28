import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Select,
  Option,
  Input,
  Badge,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Chip,
  Checkbox,
} from '@material-tailwind/react';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  UserIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

import { commissionsApi } from '../../Services/commissionsApi';
import { professionalsApi } from '../../Services/professionals';
import CommissionKPICards from '../../Components/Commissions/CommissionKPICards';
import CommissionTable from '../../Components/Commissions/CommissionTable';
import CommissionFilters from '../../Components/Commissions/CommissionFilters';
import PaymentModal from '../../Components/Commissions/PaymentModal';
import ExportButton from '../../Components/Commissions/ExportButton';

export default function CommissionsPage() {
  const navigate = useNavigate();
  
  // State management
  const [commissions, setCommissions] = useState([]);
  const [kpis, setKpis] = useState({
    total_pending: '0.00',
    total_paid: '0.00', 
    total_this_period: '0.00',
    last_payment_date: null,
    last_payment_amount: null,
    commission_count: 0,
    pending_count: 0
  });
  const [professionals, setProfessionals] = useState([]);
  const [selectedCommissions, setSelectedCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ open: false, commissions: [] });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Filter state
  const [filters, setFilters] = useState({
    professional_id: '',
    payment_status: '',
    date_from: '',
    date_to: '',
    search: ''
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 50,
    total_count: 0
  });

  // Load data on component mount and filter changes
  useEffect(() => {
    loadCommissions();
    loadKPIs();
    loadProfessionals();
  }, [filters, pagination.page]);

  const loadCommissions = async () => {
    try {
      setIsLoading(true);
      const queryParams = {
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size
      };
      
      // Remove empty filters
      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) {
          delete queryParams[key];
        }
      });

      const { data, total_count } = await commissionsApi.getCommissions(queryParams);
      setCommissions(data);
      setPagination(prev => ({ ...prev, total_count }));
    } catch (error) {
      console.error('[CommissionsPage] Error loading commissions:', error);
      showAlert('Erro ao carregar comissões', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadKPIs = async () => {
    try {
      const queryParams = {
        professional_id: filters.professional_id,
        date_from: filters.date_from,
        date_to: filters.date_to
      };
      
      // Remove empty filters
      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) {
          delete queryParams[key];
        }
      });

      const data = await commissionsApi.getKPIs(queryParams);
      setKpis(data);
    } catch (error) {
      console.error('[CommissionsPage] Error loading KPIs:', error);
    }
  };

  const loadProfessionals = async () => {
    try {
      const data = await professionalsApi.getAll();
      setProfessionals(data);
    } catch (error) {
      console.error('[CommissionsPage] Error loading professionals:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    setSelectedCommissions([]); // Clear selections
  };

  const handleCommissionSelect = (commissionId, isSelected) => {
    if (isSelected) {
      setSelectedCommissions(prev => [...prev, commissionId]);
    } else {
      setSelectedCommissions(prev => prev.filter(id => id !== commissionId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const pendingCommissions = commissions
        .filter(c => c.payment_status === 'PENDING')
        .map(c => c.id);
      setSelectedCommissions(pendingCommissions);
    } else {
      setSelectedCommissions([]);
    }
  };

  const handleMarkAsPaid = () => {
    if (selectedCommissions.length === 0) {
      showAlert('Selecione pelo menos uma comissão para pagamento', 'error');
      return;
    }

    const selectedCommissionData = commissions.filter(c => 
      selectedCommissions.includes(c.id)
    );

    setPaymentModal({ 
      open: true, 
      commissions: selectedCommissionData 
    });
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      setIsProcessingPayment(true);
      const paymentResponse = await commissionsApi.createPayment(paymentData);
      
      // Reload data
      await loadCommissions();
      await loadKPIs();
      
      setPaymentModal({ open: false, commissions: [] });
      setSelectedCommissions([]);
      
      // Show success message with receipt download option
      showPaymentSuccessAlert(paymentResponse.id);
    } catch (error) {
      console.error('[CommissionsPage] Error processing payment:', error);
      showAlert('Erro ao processar pagamento', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const showPaymentSuccessAlert = (paymentId) => {
    setAlert({ 
      show: true, 
      message: 'Pagamento processado com sucesso!', 
      type: 'success',
      paymentId: paymentId,
      showReceiptButton: true
    });
    // Keep alert open longer for receipt download
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 10000);
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      await commissionsApi.downloadPaymentReceipt(paymentId);
      showAlert('Recibo baixado com sucesso!', 'success');
    } catch (error) {
      console.error('[CommissionsPage] Error downloading receipt:', error);
      showAlert('Erro ao baixar recibo', 'error');
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const queryParams = { ...filters };
      // Remove empty filters
      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) {
          delete queryParams[key];
        }
      });

      if (format === 'pdf') {
        await commissionsApi.exportPDF(queryParams);
        showAlert('Relatório PDF exportado com sucesso!', 'success');
      } else if (format === 'receipt') {
        await commissionsApi.exportCommissionReceipt(queryParams);
        showAlert('Recibo PDF exportado com sucesso!', 'success');
      } else {
        await commissionsApi.exportCSV(queryParams);
        showAlert('Planilha CSV exportada com sucesso!', 'success');
      }
    } catch (error) {
      console.error('[CommissionsPage] Error exporting:', error);
      showAlert('Erro ao exportar arquivo', 'error');
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  // Calculate selected commissions total
  const selectedTotal = useMemo(() => {
    return commissions
      .filter(c => selectedCommissions.includes(c.id))
      .reduce((sum, c) => sum + parseFloat(c.final_value || c.calculated_value), 0)
      .toFixed(2);
  }, [commissions, selectedCommissions]);

  return (
    <div className="p-6 bg-bg-primary min-h-screen">
      {/* Alert */}
      {alert.show && (
        <div className="fixed top-4 right-4 z-50 w-96">
          <Alert
            open={alert.show}
            onClose={() => setAlert({ ...alert, show: false })}
            color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'amber' : 'green'}
            className="mb-4"
          >
            <div className="flex flex-col gap-2">
              <Typography variant="small" className="font-medium">
                {alert.message}
              </Typography>
              {alert.showReceiptButton && alert.paymentId && (
                <Button
                  size="sm"
                  variant="outlined"
                  color="white"
                  className="self-start"
                  onClick={() => handleDownloadReceipt(alert.paymentId)}
                >
                  📄 Baixar Recibo
                </Button>
              )}
            </div>
          </Alert>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Typography variant="h4" className="text-text-primary mb-2">
          Comissões
        </Typography>
      </div>

      {/* KPI Cards */}
      <CommissionKPICards kpis={kpis} isLoading={isLoading} />

      {/* Filters and Actions */}
      <Card className="mb-6 bg-bg-secondary border border-bg-tertiary">
        <CardBody className="bg-bg-secondary">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <CommissionFilters
                filters={filters}
                professionals={professionals}
                onFilterChange={handleFilterChange}
              />
            </div>
            
            <div className="flex gap-2">
              <ExportButton onExport={handleExport} />
              
              <Button
                className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2"
                disabled={selectedCommissions.length === 0}
                onClick={handleMarkAsPaid}
              >
                <BanknotesIcon className="h-4 w-4" />
                Marcar como Pago
              </Button>
            </div>
          </div>

          {/* Selection Summary */}
          {selectedCommissions.length > 0 && (
            <div className="mt-4 p-3 bg-bg-primary rounded-lg border border-bg-tertiary">
              <Typography variant="small" className="text-text-primary">
                {selectedCommissions.length} comissões selecionadas • 
                Total: <span className="font-semibold">R$ {selectedTotal}</span>
              </Typography>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Commission Table */}
      <Card className="bg-bg-secondary border border-bg-tertiary">
        <CardBody className="px-0 bg-bg-secondary">
          <CommissionTable
            commissions={commissions}
            selectedCommissions={selectedCommissions}
            isLoading={isLoading}
            onCommissionSelect={handleCommissionSelect}
            onSelectAll={handleSelectAll}
            onCommissionUpdate={loadCommissions}
          />

          {/* Pagination */}
          {pagination.total_count > pagination.page_size && (
            <div className="flex justify-between items-center mt-6 px-6">
              <Typography variant="small" className="text-text-secondary">
                Mostrando {((pagination.page - 1) * pagination.page_size) + 1} até{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total_count)} de{' '}
                {pagination.total_count} comissões
              </Typography>
              
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
                >
                  Anterior
                </Button>
                
                <Button
                  variant="outlined"
                  size="sm"
                  disabled={pagination.page * pagination.page_size >= pagination.total_count}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.open}
        commissions={paymentModal.commissions}
        professionals={professionals}
        isProcessing={isProcessingPayment}
        onClose={() => setPaymentModal({ open: false, commissions: [] })}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
}