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
  Switch,
  Progress,
  Tabs,
  TabsHeader,
  Tab,
  TabsBody,
  TabPanel,
} from '@material-tailwind/react';
import {
  CogIcon,
  DocumentArrowUpIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const WIZARD_STEPS = {
  UPLOAD: 'upload',
  TEST: 'test',
  PRODUCTION: 'production',
  COMPLETE: 'complete'
};

export default function NFSeSettingsPage() {
  // State management
  const [activeTab, setActiveTab] = useState('wizard');
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(WIZARD_STEPS.UPLOAD);
  const [certificate, setCertificate] = useState(null);
  const [settings, setSettings] = useState(null);
  
  // Certificate upload state
  const [uploadForm, setUploadForm] = useState({
    file: null,
    password: '',
    fileName: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  
  // Test state
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  
  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    company_name: '',
    company_cnpj: '',
    inscricao_municipal: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: 'Goiânia',
    address_state: 'GO',
    address_zipcode: '',
    default_iss_aliquota: 2.0,
    iss_retained: false,
    accountant_email: '',
    monthly_report_enabled: false
  });
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load existing settings and certificate status
      // This would call the actual API endpoints
      // const [settingsResponse, certificatesResponse] = await Promise.all([
      //   nfseApi.getSettings(),
      //   nfseApi.getCertificates()
      // ]);
      
      // Mock data for now
      setTimeout(() => {
        setSettings(null); // No settings configured yet
        setCertificate(null); // No certificate uploaded yet
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error loading NFSe data:', error);
      setAlert({
        show: true,
        message: 'Erro ao carregar dados do NFS-e',
        type: 'error'
      });
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.pfx')) {
        setAlert({
          show: true,
          message: 'Por favor, selecione um arquivo .pfx válido',
          type: 'error'
        });
        return;
      }
      
      setUploadForm({
        ...uploadForm,
        file: file,
        fileName: file.name
      });
    }
  };

  const handleCertificateUpload = async () => {
    if (!uploadForm.file || !uploadForm.password) {
      setAlert({
        show: true,
        message: 'Por favor, selecione um arquivo e digite a senha',
        type: 'error'
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('certificate_file', uploadForm.file);
      formData.append('password', uploadForm.password);
      
      // Mock API call
      setTimeout(() => {
        setCertificate({
          id: 'cert-123',
          cnpj: '12345678000190',
          status: 'PENDING',
          valid_until: '2026-06-28T23:59:59',
          production_enabled: false
        });
        
        setWizardStep(WIZARD_STEPS.TEST);
        setIsUploading(false);
        
        setAlert({
          show: true,
          message: 'Certificado carregado com sucesso!',
          type: 'success'
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading certificate:', error);
      setAlert({
        show: true,
        message: 'Erro ao carregar certificado',
        type: 'error'
      });
      setIsUploading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      
      // Mock API call to test SOAP connection
      setTimeout(() => {
        setTestResult({
          success: true,
          test_nf_number: '370',
          response_time_ms: 1500
        });
        
        setCertificate({
          ...certificate,
          status: 'TEST_MODE',
          test_nf_number: '370'
        });
        
        setWizardStep(WIZARD_STEPS.PRODUCTION);
        setIsTesting(false);
        
        setAlert({
          show: true,
          message: 'Teste realizado com sucesso! NF-e de teste #370 gerada.',
          type: 'success'
        });
      }, 3000);
      
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({
        success: false,
        error_message: 'Erro na conexão com o web service'
      });
      setIsTesting(false);
    }
  };

  const handleEnableProduction = async () => {
    try {
      // Mock API call to enable production
      setTimeout(() => {
        setCertificate({
          ...certificate,
          production_enabled: true,
          status: 'PRODUCTION'
        });
        
        setWizardStep(WIZARD_STEPS.COMPLETE);
        
        setAlert({
          show: true,
          message: 'Modo produção ativado! O NFS-e está pronto para uso.',
          type: 'success'
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error enabling production:', error);
      setAlert({
        show: true,
        message: 'Erro ao ativar modo produção',
        type: 'error'
      });
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmittingSettings(true);
      
      // Mock API call
      setTimeout(() => {
        setSettings(settingsForm);
        setIsSubmittingSettings(false);
        
        setAlert({
          show: true,
          message: 'Configurações salvas com sucesso!',
          type: 'success'
        });
      }, 1500);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setAlert({
        show: true,
        message: 'Erro ao salvar configurações',
        type: 'error'
      });
      setIsSubmittingSettings(false);
    }
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case WIZARD_STEPS.UPLOAD:
        return (
          <Card className="w-full">
            <CardHeader className="text-center">
              <DocumentArrowUpIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <Typography variant="h4" color="blue-gray">
                Upload do Certificado Digital
              </Typography>
              <Typography color="gray" className="mt-2">
                Faça upload do seu certificado A-1 (.pfx) para começar
              </Typography>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div>
                  <Typography variant="h6" color="blue-gray" className="mb-2">
                    Arquivo do Certificado (.pfx)
                  </Typography>
                  <input
                    type="file"
                    accept=".pfx"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadForm.fileName && (
                    <Typography color="green" className="mt-2 text-sm">
                      ✓ {uploadForm.fileName}
                    </Typography>
                  )}
                </div>
                
                <div>
                  <Typography variant="h6" color="blue-gray" className="mb-2">
                    Senha do Certificado
                  </Typography>
                  <Input
                    type="password"
                    value={uploadForm.password}
                    onChange={(e) => setUploadForm({...uploadForm, password: e.target.value})}
                    placeholder="Digite a senha do certificado"
                    size="lg"
                  />
                </div>
                
                <Button
                  onClick={handleCertificateUpload}
                  disabled={!uploadForm.file || !uploadForm.password || isUploading}
                  loading={isUploading}
                  className="w-full"
                  size="lg"
                >
                  {isUploading ? 'Carregando...' : 'Carregar Certificado'}
                </Button>
              </div>
            </CardBody>
          </Card>
        );

      case WIZARD_STEPS.TEST:
        return (
          <Card className="w-full">
            <CardHeader className="text-center">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 text-orange-500" />
              <Typography variant="h4" color="blue-gray">
                Teste de Conexão
              </Typography>
              <Typography color="gray" className="mt-2">
                Teste a conexão com o web service de Goiânia
              </Typography>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Typography variant="h6" color="blue-gray" className="mb-2">
                    Certificado Carregado
                  </Typography>
                  <Typography color="gray" className="text-sm">
                    CNPJ: {certificate?.cnpj}
                  </Typography>
                  <Typography color="gray" className="text-sm">
                    Válido até: {new Date(certificate?.valid_until).toLocaleDateString('pt-BR')}
                  </Typography>
                </div>
                
                <div className="text-center">
                  <Typography color="gray" className="mb-4">
                    O teste irá gerar uma NF-e de exemplo (número 370) para validar a configuração.
                  </Typography>
                  
                  <Button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    loading={isTesting}
                    className="w-full"
                    size="lg"
                    color="orange"
                  >
                    {isTesting ? 'Testando Conexão...' : 'Executar Teste'}
                  </Button>
                </div>
                
                {testResult && (
                  <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <Typography variant="h6" color={testResult.success ? 'green' : 'red'}>
                      {testResult.success ? '✓ Teste Realizado com Sucesso!' : '✗ Falha no Teste'}
                    </Typography>
                    <Typography color="gray" className="text-sm mt-1">
                      {testResult.success 
                        ? `NF-e de teste #${testResult.test_nf_number} gerada em ${testResult.response_time_ms}ms`
                        : testResult.error_message
                      }
                    </Typography>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        );

      case WIZARD_STEPS.PRODUCTION:
        return (
          <Card className="w-full">
            <CardHeader className="text-center">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <Typography variant="h4" color="blue-gray">
                Ativar Modo Produção
              </Typography>
              <Typography color="gray" className="mt-2">
                Confirme a ativação do modo produção
              </Typography>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <Typography variant="h6" color="amber" className="mb-2">
                    ⚠️ Atenção
                  </Typography>
                  <Typography color="gray" className="text-sm">
                    Antes de ativar o modo produção, certifique-se de que:
                  </Typography>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                    <li>O certificado foi testado com sucesso</li>
                    <li>Você enviou o e-mail para a Prefeitura de Goiânia</li>
                    <li>A Prefeitura confirmou a liberação do CNPJ</li>
                    <li>As configurações da empresa estão corretas</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Typography variant="h6" color="blue-gray" className="mb-2">
                    E-mail para a Prefeitura
                  </Typography>
                  <Typography color="gray" className="text-sm mb-2">
                    Envie este e-mail para: suporte.nfse@goiania.go.gov.br
                  </Typography>
                  <div className="bg-white p-3 rounded border text-sm">
                    <p>Assunto: Solicitação de Habilitação NFS-e - CNPJ {certificate?.cnpj}</p>
                    <br />
                    <p>Prezados,</p>
                    <p>Solicito a habilitação do CNPJ {certificate?.cnpj} para emissão de NFS-e.</p>
                    <p>O certificado digital foi configurado e testado com sucesso.</p>
                    <br />
                    <p>Atenciosamente,</p>
                    <p>[Seu Nome]</p>
                  </div>
                </div>
                
                <Button
                  onClick={handleEnableProduction}
                  className="w-full"
                  size="lg"
                  color="green"
                >
                  Ativar Modo Produção
                </Button>
              </div>
            </CardBody>
          </Card>
        );

      case WIZARD_STEPS.COMPLETE:
        return (
          <Card className="w-full">
            <CardHeader className="text-center">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <Typography variant="h4" color="green">
                Configuração Concluída!
              </Typography>
              <Typography color="gray" className="mt-2">
                O NFS-e está pronto para uso
              </Typography>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <Typography variant="h6" color="green" className="mb-2">
                    ✓ Sistema Configurado
                  </Typography>
                  <Typography color="gray" className="text-sm">
                    Você pode começar a emitir NFS-e imediatamente
                  </Typography>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => setActiveTab('settings')}
                    variant="outlined"
                    className="w-full"
                  >
                    Configurar Empresa
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/nfse/invoices'}
                    className="w-full"
                  >
                    Emitir NFS-e
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

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
          Configuração NFS-e
        </Typography>
        <Typography color="gray" className="mt-1">
          Configure certificados e dados da empresa para emissão de NFS-e
        </Typography>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsHeader>
          <Tab value="wizard">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" />
              Assistente
            </div>
          </Tab>
          <Tab value="settings">
            <div className="flex items-center gap-2">
              <CogIcon className="w-4 h-4" />
              Configurações
            </div>
          </Tab>
        </TabsHeader>

        <TabsBody>
          <TabPanel value="wizard" className="mt-6">
            <div className="max-w-2xl mx-auto">
              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Upload</span>
                  <span>Teste</span>
                  <span>Produção</span>
                  <span>Concluído</span>
                </div>
                <Progress 
                  value={
                    wizardStep === WIZARD_STEPS.UPLOAD ? 25 :
                    wizardStep === WIZARD_STEPS.TEST ? 50 :
                    wizardStep === WIZARD_STEPS.PRODUCTION ? 75 : 100
                  }
                  color="blue"
                  className="mb-4"
                />
              </div>

              {renderWizardStep()}
            </div>
          </TabPanel>

          <TabPanel value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <Typography variant="h5" color="blue-gray">
                  Dados da Empresa
                </Typography>
                <Typography color="gray" className="mt-1">
                  Configure os dados que aparecerão nas NFS-e emitidas
                </Typography>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSettingsSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Input
                        label="Razão Social *"
                        value={settingsForm.company_name}
                        onChange={(e) => setSettingsForm({...settingsForm, company_name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <Input
                      label="CNPJ *"
                      value={settingsForm.company_cnpj}
                      onChange={(e) => setSettingsForm({...settingsForm, company_cnpj: e.target.value})}
                      required
                    />
                    
                    <Input
                      label="Inscrição Municipal *"
                      value={settingsForm.inscricao_municipal}
                      onChange={(e) => setSettingsForm({...settingsForm, inscricao_municipal: e.target.value})}
                      required
                    />
                  </div>

                  <Typography variant="h6" color="blue-gray" className="mt-8 mb-4">
                    Endereço
                  </Typography>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <Input
                        label="Logradouro *"
                        value={settingsForm.address_street}
                        onChange={(e) => setSettingsForm({...settingsForm, address_street: e.target.value})}
                        required
                      />
                    </div>
                    
                    <Input
                      label="Número *"
                      value={settingsForm.address_number}
                      onChange={(e) => setSettingsForm({...settingsForm, address_number: e.target.value})}
                      required
                    />
                    
                    <Input
                      label="Complemento"
                      value={settingsForm.address_complement}
                      onChange={(e) => setSettingsForm({...settingsForm, address_complement: e.target.value})}
                    />
                    
                    <Input
                      label="Bairro *"
                      value={settingsForm.address_district}
                      onChange={(e) => setSettingsForm({...settingsForm, address_district: e.target.value})}
                      required
                    />
                    
                    <Input
                      label="CEP *"
                      value={settingsForm.address_zipcode}
                      onChange={(e) => setSettingsForm({...settingsForm, address_zipcode: e.target.value})}
                      required
                    />
                  </div>

                  <Typography variant="h6" color="blue-gray" className="mt-8 mb-4">
                    Configurações Fiscais
                  </Typography>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Alíquota ISS Padrão (%)"
                      type="number"
                      step="0.01"
                      value={settingsForm.default_iss_aliquota}
                      onChange={(e) => setSettingsForm({...settingsForm, default_iss_aliquota: parseFloat(e.target.value)})}
                    />
                    
                    <div className="flex items-center">
                      <Switch
                        checked={settingsForm.iss_retained}
                        onChange={(e) => setSettingsForm({...settingsForm, iss_retained: e.target.checked})}
                        label="ISS Retido na Fonte"
                      />
                    </div>
                  </div>

                  <Typography variant="h6" color="blue-gray" className="mt-8 mb-4">
                    Relatórios
                  </Typography>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="E-mail do Contador"
                      type="email"
                      value={settingsForm.accountant_email}
                      onChange={(e) => setSettingsForm({...settingsForm, accountant_email: e.target.value})}
                    />
                    
                    <div className="flex items-center">
                      <Switch
                        checked={settingsForm.monthly_report_enabled}
                        onChange={(e) => setSettingsForm({...settingsForm, monthly_report_enabled: e.target.checked})}
                        label="Envio Automático de Relatório Mensal"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <Button
                      type="submit"
                      loading={isSubmittingSettings}
                      disabled={isSubmittingSettings}
                      size="lg"
                    >
                      Salvar Configurações
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </TabPanel>
        </TabsBody>
      </Tabs>
    </div>
  );
}