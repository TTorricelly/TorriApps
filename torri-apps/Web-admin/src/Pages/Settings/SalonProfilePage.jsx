import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Input,
  Button,
  Alert,
  Spinner
} from '@material-tailwind/react';
import {
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { getCompanyInfo, updateCompany, createCompany } from '../../Services/company';

const SalonProfilePage = () => {
  const [companyData, setCompanyData] = useState({
    id: '',
    name: '',
    logo_url: '',
    contact_email: '',
    contact_phone: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [isNewCompany, setIsNewCompany] = useState(false);

  // Load company data on component mount
  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      setIsLoading(true);
      const data = await getCompanyInfo();
      setCompanyData({
        id: data.id ?? '',
        name: data.name ?? '',
        logo_url: data.logo_url ?? '',
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? ''
      });
      setIsNewCompany(false);
    } catch (error) {
      console.error('Error loading company data:', error);
      // If no company exists, prepare for creating a new one
      if (error.response?.status === 404) {
        setIsNewCompany(true);
        setCompanyData({
          id: '',
          name: '',
          logo_url: '',
          contact_email: '',
          contact_phone: ''
        });
      } else {
        showAlert('Erro ao carregar informações da empresa', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!companyData.name.trim()) {
      showAlert('Nome da empresa é obrigatório', 'error');
      return;
    }

    try {
      setIsSaving(true);
      
      const submitData = {
        name: companyData.name.trim(),
        logo_url: companyData.logo_url.trim() || null,
        contact_email: companyData.contact_email.trim() || null,
        contact_phone: companyData.contact_phone.trim() || null
      };

      let result;
      if (isNewCompany) {
        result = await createCompany({ ...submitData, is_active: true });
        setIsNewCompany(false);
      } else {
        result = await updateCompany(companyData.id, submitData);
      }

      setCompanyData(prev => ({ 
        ...prev, 
        ...result,
        logo_url: result.logo_url ?? '',
        contact_email: result.contact_email ?? '',
        contact_phone: result.contact_phone ?? ''
      }));
      showAlert(isNewCompany ? 'Empresa criada com sucesso!' : 'Informações atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving company data:', error);
      let errorMessage = 'Erro ao salvar informações da empresa';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 409) {
        errorMessage = 'Uma empresa com este nome já existe';
      }
      
      showAlert(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 5000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-bg-primary min-h-screen">
        <Spinner className="h-8 w-8 text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-bg-primary min-h-screen">
      <div className="mb-6">
        <Typography variant="h4" className="mb-2 text-text-primary">
          Perfil do Salão
        </Typography>
        <Typography className="text-sm text-text-secondary">
          Gerencie as informações básicas do seu estabelecimento
        </Typography>
      </div>

      {alert.show && (
        <Alert
          color={alert.type === 'success' ? 'green' : 'red'}
          icon={alert.type === 'success' ? <CheckCircleIcon strokeWidth={2} className="h-5 w-5" /> : <ExclamationCircleIcon strokeWidth={2} className="h-5 w-5" />}
          className="mb-6"
        >
          {alert.message}
        </Alert>
      )}

      <Card className="bg-bg-secondary border-bg-tertiary">
        <CardHeader className="bg-bg-secondary border-b border-bg-tertiary p-6">
          <Typography variant="h6" className="text-text-primary">
            {isNewCompany ? 'Criar Perfil da Empresa' : 'Informações da Empresa'}
          </Typography>
        </CardHeader>
        
        <CardBody className="bg-bg-secondary">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <Typography variant="h6" className="mb-2 text-text-primary">
                Nome da Empresa *
              </Typography>
              <Input
                size="lg"
                placeholder="Digite o nome da sua empresa"
                icon={<BuildingStorefrontIcon className="h-5 w-5 text-text-secondary" />}
                value={companyData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="bg-bg-primary border-bg-tertiary text-text-primary placeholder:text-text-tertiary"
                labelProps={{
                  className: "text-text-secondary before:content-none after:content-none",
                }}
                containerProps={{
                  className: "text-text-primary"
                }}
              />
            </div>

            {/* Logo URL */}
            <div>
              <Typography variant="h6" className="mb-2 text-text-primary">
                URL do Logo
              </Typography>
              <Input
                size="lg"
                placeholder="https://exemplo.com/logo.png"
                icon={<PhotoIcon className="h-5 w-5 text-text-secondary" />}
                value={companyData.logo_url}
                onChange={(e) => handleInputChange('logo_url', e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary placeholder:text-text-tertiary"
                labelProps={{
                  className: "text-text-secondary before:content-none after:content-none",
                }}
                containerProps={{
                  className: "text-text-primary"
                }}
              />
              <Typography className="text-xs mt-1 text-text-tertiary">
                URL de uma imagem para o logo da empresa (opcional)
              </Typography>
            </div>

            {/* Contact Email */}
            <div>
              <Typography variant="h6" className="mb-2 text-text-primary">
                Email de Contato
              </Typography>
              <Input
                size="lg"
                type="email"
                placeholder="contato@seuempresa.com"
                icon={<EnvelopeIcon className="h-5 w-5 text-text-secondary" />}
                value={companyData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary placeholder:text-text-tertiary"
                labelProps={{
                  className: "text-text-secondary before:content-none after:content-none",
                }}
                containerProps={{
                  className: "text-text-primary"
                }}
              />
            </div>

            {/* Contact Phone */}
            <div>
              <Typography variant="h6" className="mb-2 text-text-primary">
                Telefone de Contato
              </Typography>
              <Input
                size="lg"
                placeholder="(11) 99999-9999"
                icon={<PhoneIcon className="h-5 w-5 text-text-secondary" />}
                value={companyData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary placeholder:text-text-tertiary"
                labelProps={{
                  className: "text-text-secondary before:content-none after:content-none",
                }}
                containerProps={{
                  className: "text-text-primary"
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={isSaving}
                className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white"
              >
                {isSaving && <Spinner className="h-4 w-4" />}
                {isNewCompany ? 'Criar Empresa' : 'Salvar Alterações'}
              </Button>
              
              <Button
                type="button"
                variant="outlined"
                size="lg"
                onClick={loadCompanyData}
                disabled={isSaving}
                className="border-accent-primary text-accent-primary hover:bg-accent-primary/10"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default SalonProfilePage;