import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Select,
  Option,
  Spinner,
  Alert,
  Progress,
} from '@material-tailwind/react';
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

export default function NFSeReportsPage() {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Report form state
  const [reportForm, setReportForm] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    format: 'csv'
  });
  
  // Current month summary
  const [currentSummary, setCurrentSummary] = useState(null);
  
  // Generated reports history
  const [reportsHistory, setReportsHistory] = useState([]);

  useEffect(() => {
    loadCurrentSummary();
    loadReportsHistory();
  }, []);

  const loadCurrentSummary = async () => {
    try {
      setIsLoading(true);
      
      // Mock API call for current month summary
      setTimeout(() => {
        setCurrentSummary({
          period_start: '2025-06-01T00:00:00',
          period_end: '2025-06-30T23:59:59',
          total_invoices: 45,
          total_service_value: 6750.00,
          total_iss_value: 135.00,
          total_retained_iss: 0.00,
          average_aliquota: 2.0
        });
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error loading summary:', error);
      setAlert({
        show: true,
        message: 'Erro ao carregar resumo do mês',
        type: 'error'
      });
      setIsLoading(false);
    }
  };

  const loadReportsHistory = async () => {
    try {
      // Mock API call for reports history
      setTimeout(() => {
        setReportsHistory([
          {
            id: '1',
            period_start: '2025-05-01T00:00:00',
            period_end: '2025-05-31T23:59:59',
            format: 'csv',
            generated_at: '2025-06-01T09:00:00',
            download_url: 'https://example.com/reports/iss-may-2025.csv',
            total_invoices: 38,
            total_service_value: 5670.00,
            total_iss_value: 113.40
          },
          {
            id: '2',
            period_start: '2025-04-01T00:00:00',
            period_end: '2025-04-30T23:59:59',
            format: 'pdf',
            generated_at: '2025-05-01T10:30:00',
            download_url: 'https://example.com/reports/iss-april-2025.pdf',
            total_invoices: 42,
            total_service_value: 6230.00,
            total_iss_value: 124.60
          }
        ]);
      }, 500);
      
    } catch (error) {
      console.error('Error loading reports history:', error);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    try {
      setIsGenerating(true);
      
      // Mock API call to generate report
      setTimeout(() => {
        const newReport = {
          id: Date.now().toString(),
          period_start: reportForm.startDate + 'T00:00:00',
          period_end: reportForm.endDate + 'T23:59:59',
          format: reportForm.format,
          generated_at: new Date().toISOString(),
          download_url: `https://example.com/reports/iss-custom-${Date.now()}.${reportForm.format}`,
          total_invoices: 25,
          total_service_value: 3750.00,
          total_iss_value: 75.00
        };
        
        setReportsHistory(prev => [newReport, ...prev]);
        setIsGenerating(false);
        
        setAlert({
          show: true,
          message: 'Relatório gerado com sucesso!',
          type: 'success'
        });
      }, 3000);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setAlert({
        show: true,
        message: 'Erro ao gerar relatório',
        type: 'error'
      });
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = (report) => {
    window.open(report.download_url, '_blank');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPeriod = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    
    return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
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

      <div className="mb-6">
        <Typography variant="h3" color="blue-gray">
          Relatórios ISS
        </Typography>
        <Typography color="gray" className="mt-1">
          Gere relatórios fiscais para contabilidade e controle de ISS
        </Typography>
      </div>

      {/* Current Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody className="text-center">
            <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <Typography variant="h4" color="blue-gray">
              {isLoading ? <Spinner className="h-6 w-6 mx-auto" /> : currentSummary?.total_invoices || 0}
            </Typography>
            <Typography color="gray" className="text-sm">
              NFS-e Emitidas
            </Typography>
            <Typography color="gray" className="text-xs mt-1">
              Mês Atual
            </Typography>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <Typography variant="h4" color="blue-gray">
              {isLoading ? <Spinner className="h-6 w-6 mx-auto" /> : formatCurrency(currentSummary?.total_service_value || 0)}
            </Typography>
            <Typography color="gray" className="text-sm">
              Faturamento Total
            </Typography>
            <Typography color="gray" className="text-xs mt-1">
              Mês Atual
            </Typography>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <DocumentChartBarIcon className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <Typography variant="h4" color="blue-gray">
              {isLoading ? <Spinner className="h-6 w-6 mx-auto" /> : formatCurrency(currentSummary?.total_iss_value || 0)}
            </Typography>
            <Typography color="gray" className="text-sm">
              ISS Devido
            </Typography>
            <Typography color="gray" className="text-xs mt-1">
              Mês Atual
            </Typography>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <ClipboardDocumentCheckIcon className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <Typography variant="h4" color="blue-gray">
              {isLoading ? <Spinner className="h-6 w-6 mx-auto" /> : `${currentSummary?.average_aliquota || 0}%`}
            </Typography>
            <Typography color="gray" className="text-sm">
              Alíquota Média
            </Typography>
            <Typography color="gray" className="text-xs mt-1">
              Mês Atual
            </Typography>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generate New Report */}
        <Card>
          <CardHeader>
            <Typography variant="h5" color="blue-gray">
              Gerar Novo Relatório
            </Typography>
            <Typography color="gray" className="mt-1">
              Selecione o período e formato para gerar relatório ISS
            </Typography>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleGenerateReport} className="space-y-6">
              <div>
                <Typography variant="h6" color="blue-gray" className="mb-3">
                  Período
                </Typography>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Data Inicial"
                    type="date"
                    value={reportForm.startDate}
                    onChange={(e) => setReportForm({ ...reportForm, startDate: e.target.value })}
                    required
                  />
                  <Input
                    label="Data Final"
                    type="date"
                    value={reportForm.endDate}
                    onChange={(e) => setReportForm({ ...reportForm, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Typography variant="h6" color="blue-gray" className="mb-3">
                  Formato
                </Typography>
                <Select
                  value={reportForm.format}
                  onChange={(value) => setReportForm({ ...reportForm, format: value })}
                  label="Selecione o formato"
                >
                  <Option value="csv">CSV (Planilha)</Option>
                  <Option value="pdf">PDF</Option>
                </Select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <Typography variant="small" color="blue-gray" className="font-medium mb-2">
                  O relatório incluirá:
                </Typography>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Lista detalhada de todas as NFS-e emitidas</li>
                  <li>• Valores de serviços e ISS por nota</li>
                  <li>• Totalizadores por alíquota</li>
                  <li>• Resumo consolidado do período</li>
                  <li>• Códigos de verificação para auditoria</li>
                </ul>
              </div>

              <Button
                type="submit"
                loading={isGenerating}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? 'Gerando Relatório...' : 'Gerar Relatório'}
              </Button>

              {isGenerating && (
                <div className="mt-4">
                  <Typography color="gray" className="text-sm mb-2">
                    Gerando relatório...
                  </Typography>
                  <Progress value={75} color="blue" />
                </div>
              )}
            </form>
          </CardBody>
        </Card>

        {/* Reports History */}
        <Card>
          <CardHeader>
            <Typography variant="h5" color="blue-gray">
              Relatórios Anteriores
            </Typography>
            <Typography color="gray" className="mt-1">
              Histórico de relatórios gerados
            </Typography>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {reportsHistory.length === 0 ? (
                <div className="text-center py-8 px-6">
                  <DocumentChartBarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <Typography color="gray">
                    Nenhum relatório gerado ainda
                  </Typography>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {reportsHistory.map((report) => (
                    <div key={report.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Typography variant="h6" color="blue-gray" className="mb-1">
                            Relatório ISS - {formatPeriod(report.period_start, report.period_end)}
                          </Typography>
                          <Typography color="gray" className="text-sm mb-2">
                            Gerado em {formatDate(report.generated_at)}
                          </Typography>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <Typography color="gray" className="text-xs">
                                NFS-e
                              </Typography>
                              <Typography color="blue-gray" className="font-medium">
                                {report.total_invoices}
                              </Typography>
                            </div>
                            <div>
                              <Typography color="gray" className="text-xs">
                                Faturamento
                              </Typography>
                              <Typography color="blue-gray" className="font-medium">
                                {formatCurrency(report.total_service_value)}
                              </Typography>
                            </div>
                            <div>
                              <Typography color="gray" className="text-xs">
                                ISS
                              </Typography>
                              <Typography color="blue-gray" className="font-medium">
                                {formatCurrency(report.total_iss_value)}
                              </Typography>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Typography
                              color="gray"
                              className="text-xs uppercase tracking-wide"
                            >
                              {report.format.toUpperCase()}
                            </Typography>
                          </div>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="flex items-center gap-1"
                            onClick={() => handleDownloadReport(report)}
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <Typography variant="h5" color="blue-gray">
            Ações Rápidas
          </Typography>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outlined"
              className="flex items-center justify-center gap-2 py-4"
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                
                setReportForm({
                  startDate: firstDay.toISOString().split('T')[0],
                  endDate: lastDay.toISOString().split('T')[0],
                  format: 'csv'
                });
              }}
            >
              <CalendarDaysIcon className="w-5 h-5" />
              Relatório do Mês Atual
            </Button>
            
            <Button
              variant="outlined"
              className="flex items-center justify-center gap-2 py-4"
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                
                setReportForm({
                  startDate: firstDay.toISOString().split('T')[0],
                  endDate: lastDay.toISOString().split('T')[0],
                  format: 'csv'
                });
              }}
            >
              <CalendarDaysIcon className="w-5 h-5" />
              Relatório do Mês Anterior
            </Button>
            
            <Button
              variant="outlined"
              className="flex items-center justify-center gap-2 py-4"
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), 0, 1);
                const lastDay = new Date(today.getFullYear(), 11, 31);
                
                setReportForm({
                  startDate: firstDay.toISOString().split('T')[0],
                  endDate: lastDay.toISOString().split('T')[0],
                  format: 'pdf'
                });
              }}
            >
              <DocumentChartBarIcon className="w-5 h-5" />
              Relatório Anual
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}