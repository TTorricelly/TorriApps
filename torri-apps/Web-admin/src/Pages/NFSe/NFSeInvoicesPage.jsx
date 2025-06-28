import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Textarea,
  Select,
  Option,
  Badge,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
} from '@material-tailwind/react';
import {
  PlusIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  EllipsisVerticalIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  'ISSUED': 'green',
  'TEST': 'blue',
  'ERROR': 'red',
  'CANCELLED': 'gray'
};

const STATUS_LABELS = {
  'ISSUED': 'Emitida',
  'TEST': 'Teste',
  'ERROR': 'Erro',
  'CANCELLED': 'Cancelada'
};

export default function NFSeInvoicesPage() {
  // State management
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Create invoice dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // View invoice dialog
  const [viewDialog, setViewDialog] = useState({ open: false, invoice: null });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minValue: '',
    maxValue: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  
  // Form state for new invoice
  const [invoiceForm, setInvoiceForm] = useState({
    client_name: '',
    client_cnpj_cpf: '',
    client_email: '',
    service_description: '',
    service_code: '',
    service_value: '',
    iss_aliquota: '',
    deductions_value: '',
    competence_date: new Date().toISOString().split('T')[0]
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadInvoices();
  }, [filters, pagination.page]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page,
        page_size: pagination.pageSize,
        ...Object.fromEntries(Object.entries(filters).filter(([key, value]) => value !== ''))
      });
      
      // Mock API call
      setTimeout(() => {
        const mockInvoices = [
          {
            id: '1',
            nf_number: '123456',
            rps_number: '000001',
            client_name: 'Maria Silva',
            client_cnpj_cpf: '12345678901',
            service_description: 'Corte de cabelo feminino',
            service_value: 80.00,
            iss_value: 1.60,
            status: 'ISSUED',
            issue_date: '2025-06-28T10:30:00',
            verification_code: 'ABC123DEF',
            pdf_url: 'https://example.com/nfse-123456.pdf'
          },
          {
            id: '2',
            nf_number: '370',
            rps_number: '000002',
            client_name: 'João Santos',
            client_cnpj_cpf: '98765432100',
            service_description: 'Corte masculino + barba',
            service_value: 45.00,
            iss_value: 0.90,
            status: 'TEST',
            issue_date: '2025-06-28T14:15:00',
            verification_code: 'TEST123',
            pdf_url: null
          },
          {
            id: '3',
            nf_number: null,
            rps_number: '000003',
            client_name: 'Ana Costa',
            client_cnpj_cpf: '55566677788',
            service_description: 'Escova progressiva',
            service_value: 120.00,
            iss_value: 2.40,
            status: 'ERROR',
            issue_date: null,
            error_message: 'Erro na conexão com web service',
            pdf_url: null
          }
        ];
        
        setInvoices(mockInvoices);
        setPagination(prev => ({ ...prev, total: 3, totalPages: 1 }));
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error loading invoices:', error);
      setAlert({
        show: true,
        message: 'Erro ao carregar notas fiscais',
        type: 'error'
      });
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = {};
    if (!invoiceForm.client_name) errors.client_name = 'Nome do cliente é obrigatório';
    if (!invoiceForm.service_description) errors.service_description = 'Descrição do serviço é obrigatória';
    if (!invoiceForm.service_value || parseFloat(invoiceForm.service_value) <= 0) {
      errors.service_value = 'Valor do serviço deve ser maior que zero';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setIsCreating(true);
      
      // Mock API call
      setTimeout(() => {
        const newInvoice = {
          id: Date.now().toString(),
          nf_number: '123457',
          rps_number: '000004',
          ...invoiceForm,
          service_value: parseFloat(invoiceForm.service_value),
          iss_value: parseFloat(invoiceForm.service_value) * 0.02,
          status: 'ISSUED',
          issue_date: new Date().toISOString(),
          verification_code: 'NEW123ABC'
        };
        
        setInvoices(prev => [newInvoice, ...prev]);
        setCreateDialog(false);
        setInvoiceForm({
          client_name: '',
          client_cnpj_cpf: '',
          client_email: '',
          service_description: '',
          service_code: '',
          service_value: '',
          iss_aliquota: '',
          deductions_value: '',
          competence_date: new Date().toISOString().split('T')[0]
        });
        setFormErrors({});
        setIsCreating(false);
        
        setAlert({
          show: true,
          message: 'NFS-e criada com sucesso!',
          type: 'success'
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      setAlert({
        show: true,
        message: 'Erro ao criar NFS-e',
        type: 'error'
      });
      setIsCreating(false);
    }
  };

  const handleDownloadPDF = (invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    }
  };

  const handleEmailInvoice = async (invoice) => {
    try {
      // Mock API call
      setAlert({
        show: true,
        message: 'E-mail enviado com sucesso!',
        type: 'success'
      });
    } catch (error) {
      setAlert({
        show: true,
        message: 'Erro ao enviar e-mail',
        type: 'error'
      });
    }
  };

  const handleViewInvoice = (invoice) => {
    setViewDialog({ open: true, invoice });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      {alert.show && (
        <Alert
          color={alert.type === 'success' ? 'green' : 'red'}
          className="mb-6"
          onClose={() => setAlert({ ...alert, show: false })}
        >
          {alert.message}
        </Alert>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <Typography variant="h3" color="blue-gray">
            NFS-e
          </Typography>
          <Typography color="gray" className="mt-1">
            Gerencie suas notas fiscais de serviços
          </Typography>
        </div>
        <Button
          onClick={() => setCreateDialog(true)}
          className="flex items-center gap-2"
          size="lg"
        >
          <PlusIcon className="w-4 h-4" />
          Emitir NFS-e
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Input
                label="Buscar por cliente ou número..."
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <Button
              variant={showFilters ? "filled" : "outlined"}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <FunnelIcon className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <Select
                label="Status"
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
              >
                <Option value="">Todos</Option>
                <Option value="ISSUED">Emitida</Option>
                <Option value="TEST">Teste</Option>
                <Option value="ERROR">Erro</Option>
              </Select>
              
              <Input
                label="Data Inicial"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
              
              <Input
                label="Data Final"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
              
              <Input
                label="Valor Mínimo"
                type="number"
                step="0.01"
                value={filters.minValue}
                onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
              />
              
              <Input
                label="Valor Máximo"
                type="number"
                step="0.01"
                value={filters.maxValue}
                onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardBody className="px-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max table-auto text-left">
                  <thead>
                    <tr>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          Nº NF-e
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          RPS
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          Cliente
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          Serviço
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          Valor
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          ISS
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          Status
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          Data
                        </Typography>
                      </th>
                      <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray" className="font-medium">
                          Ações
                        </Typography>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" color="blue-gray" className="font-medium">
                            {invoice.nf_number || '-'}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" color="blue-gray">
                            {invoice.rps_number}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <div>
                            <Typography variant="small" color="blue-gray" className="font-medium">
                              {invoice.client_name}
                            </Typography>
                            {invoice.client_cnpj_cpf && (
                              <Typography variant="small" color="gray" className="text-xs">
                                {invoice.client_cnpj_cpf}
                              </Typography>
                            )}
                          </div>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" color="blue-gray" className="max-w-xs truncate">
                            {invoice.service_description}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" color="blue-gray" className="font-medium">
                            {formatCurrency(invoice.service_value)}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" color="blue-gray">
                            {formatCurrency(invoice.iss_value)}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Chip
                            size="sm"
                            value={STATUS_LABELS[invoice.status]}
                            color={STATUS_COLORS[invoice.status]}
                          />
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" color="blue-gray">
                            {formatDate(invoice.issue_date)}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <div className="flex items-center gap-2">
                            <IconButton
                              size="sm"
                              variant="text"
                              onClick={() => handleViewInvoice(invoice)}
                            >
                              <EyeIcon className="w-4 h-4" />
                            </IconButton>
                            
                            {invoice.pdf_url && (
                              <IconButton
                                size="sm"
                                variant="text"
                                onClick={() => handleDownloadPDF(invoice)}
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </IconButton>
                            )}
                            
                            {invoice.status === 'ISSUED' && invoice.client_email && (
                              <IconButton
                                size="sm"
                                variant="text"
                                onClick={() => handleEmailInvoice(invoice)}
                              >
                                <EnvelopeIcon className="w-4 h-4" />
                              </IconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {invoices.length === 0 && (
                <div className="text-center py-8">
                  <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <Typography color="gray">
                    Nenhuma NFS-e encontrada
                  </Typography>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialog} handler={setCreateDialog} size="lg">
        <DialogHeader>
          <Typography variant="h4" color="blue-gray">
            Emitir Nova NFS-e
          </Typography>
        </DialogHeader>
        <DialogBody divider className="h-96 overflow-y-auto">
          <form onSubmit={handleCreateInvoice} className="space-y-6">
            <Typography variant="h6" color="blue-gray">
              Dados do Cliente
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Cliente *"
                value={invoiceForm.client_name}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, client_name: e.target.value })}
                error={!!formErrors.client_name}
              />
              {formErrors.client_name && (
                <Typography color="red" className="text-sm">
                  {formErrors.client_name}
                </Typography>
              )}
              
              <Input
                label="CPF/CNPJ"
                value={invoiceForm.client_cnpj_cpf}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, client_cnpj_cpf: e.target.value })}
              />
              
              <Input
                label="E-mail"
                type="email"
                value={invoiceForm.client_email}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, client_email: e.target.value })}
              />
              
              <Input
                label="Data do Serviço *"
                type="date"
                value={invoiceForm.competence_date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, competence_date: e.target.value })}
              />
            </div>

            <Typography variant="h6" color="blue-gray" className="mt-6">
              Dados do Serviço
            </Typography>
            
            <div className="space-y-4">
              <Textarea
                label="Descrição do Serviço *"
                value={invoiceForm.service_description}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, service_description: e.target.value })}
                error={!!formErrors.service_description}
              />
              {formErrors.service_description && (
                <Typography color="red" className="text-sm">
                  {formErrors.service_description}
                </Typography>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Código do Serviço"
                  value={invoiceForm.service_code}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, service_code: e.target.value })}
                  placeholder="Ex: 1401"
                />
                
                <Input
                  label="Valor do Serviço *"
                  type="number"
                  step="0.01"
                  value={invoiceForm.service_value}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, service_value: e.target.value })}
                  error={!!formErrors.service_value}
                />
                
                <Input
                  label="Alíquota ISS (%)"
                  type="number"
                  step="0.01"
                  value={invoiceForm.iss_aliquota}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, iss_aliquota: e.target.value })}
                  placeholder="Padrão: 2.0%"
                />
              </div>
              
              {formErrors.service_value && (
                <Typography color="red" className="text-sm">
                  {formErrors.service_value}
                </Typography>
              )}
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setCreateDialog(false)}
            className="mr-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateInvoice}
            loading={isCreating}
            disabled={isCreating}
          >
            Emitir NFS-e
          </Button>
        </DialogFooter>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog 
        open={viewDialog.open} 
        handler={() => setViewDialog({ open: false, invoice: null })}
        size="lg"
      >
        <DialogHeader>
          <Typography variant="h4" color="blue-gray">
            Detalhes da NFS-e
          </Typography>
        </DialogHeader>
        <DialogBody divider className="h-96 overflow-y-auto">
          {viewDialog.invoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Typography variant="small" color="gray" className="font-medium">
                    Número NFS-e
                  </Typography>
                  <Typography color="blue-gray">
                    {viewDialog.invoice.nf_number || '-'}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray" className="font-medium">
                    RPS
                  </Typography>
                  <Typography color="blue-gray">
                    {viewDialog.invoice.rps_number}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray" className="font-medium">
                    Status
                  </Typography>
                  <Chip
                    size="sm"
                    value={STATUS_LABELS[viewDialog.invoice.status]}
                    color={STATUS_COLORS[viewDialog.invoice.status]}
                  />
                </div>
                <div>
                  <Typography variant="small" color="gray" className="font-medium">
                    Data de Emissão
                  </Typography>
                  <Typography color="blue-gray">
                    {formatDate(viewDialog.invoice.issue_date)}
                  </Typography>
                </div>
              </div>

              <div className="border-t pt-4">
                <Typography variant="h6" color="blue-gray" className="mb-4">
                  Cliente
                </Typography>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Typography variant="small" color="gray" className="font-medium">
                      Nome
                    </Typography>
                    <Typography color="blue-gray">
                      {viewDialog.invoice.client_name}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="small" color="gray" className="font-medium">
                      CPF/CNPJ
                    </Typography>
                    <Typography color="blue-gray">
                      {viewDialog.invoice.client_cnpj_cpf || '-'}
                    </Typography>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Typography variant="h6" color="blue-gray" className="mb-4">
                  Serviço
                </Typography>
                <div>
                  <Typography variant="small" color="gray" className="font-medium">
                    Descrição
                  </Typography>
                  <Typography color="blue-gray" className="mb-4">
                    {viewDialog.invoice.service_description}
                  </Typography>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Typography variant="small" color="gray" className="font-medium">
                      Valor do Serviço
                    </Typography>
                    <Typography color="blue-gray">
                      {formatCurrency(viewDialog.invoice.service_value)}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="small" color="gray" className="font-medium">
                      ISS
                    </Typography>
                    <Typography color="blue-gray">
                      {formatCurrency(viewDialog.invoice.iss_value)}
                    </Typography>
                  </div>
                </div>
              </div>

              {viewDialog.invoice.verification_code && (
                <div className="border-t pt-4">
                  <Typography variant="small" color="gray" className="font-medium">
                    Código de Verificação
                  </Typography>
                  <Typography color="blue-gray" className="font-mono">
                    {viewDialog.invoice.verification_code}
                  </Typography>
                </div>
              )}

              {viewDialog.invoice.error_message && (
                <div className="border-t pt-4">
                  <Alert color="red">
                    <Typography variant="small">
                      <strong>Erro:</strong> {viewDialog.invoice.error_message}
                    </Typography>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            onClick={() => setViewDialog({ open: false, invoice: null })}
          >
            Fechar
          </Button>
          {viewDialog.invoice?.pdf_url && (
            <Button
              onClick={() => handleDownloadPDF(viewDialog.invoice)}
              className="ml-2"
            >
              Baixar PDF
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}