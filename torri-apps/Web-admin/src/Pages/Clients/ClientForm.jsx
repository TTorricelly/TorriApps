import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Switch,
  Spinner,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Alert,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Select,
  Option,
} from '@material-tailwind/react';
import {
  ArrowLeftIcon,
  UserIcon
} from '@heroicons/react/24/outline';

import { clientsApi } from '../../Services/clients'; // Changed from professionalsApi
// import { servicesApi } from '../../Services/services'; // Removed servicesApi

// Removed ServiceTagSelector component as it's not needed for clients

// Renamed from BasicDataTab to ClientDataTab - simplified for client form
const ClientDataForm = ({
  formData,
  handleInputChange,
  errors,
  isEditMode // Renamed from isEdit for clarity
  // Removed photo props: handlePhotoChange, photoPreview, handlePhotoRemove
  // Removed service props: allServices, selectedServices, setSelectedServices, showAlert (if only for services)
}) => {
  // const fileInputRef = React.useRef(null); // Removed photo related ref

  // Removed handleFileChange function

  // Removed getInitials function (if not used elsewhere, or keep if a simple avatar placeholder is desired without photo upload)
  // For now, assuming no avatar display in this simplified form. If needed, it can be added back.

  const hairTypeOptions = [
    { label: "Liso", value: "LISO" },
    { label: "Ondulado", value: "ONDULADO" },
    { label: "Cacheado", value: "CACHEADO" },
    { label: "Crespo", value: "CRESPO" },
  ];

  const genderOptions = [
    { label: "Masculino", value: "MASCULINO" },
    { label: "Feminino", value: "FEMININO" },
    { label: "Outros", value: "OUTROS" },
  ];

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <Typography variant="h6" className="text-text-primary mb-4">
          Informações do Cliente
        </Typography>

        <div className="grid gap-4">
          {/* Full Name */}
          <div>
            <Input
              name="full_name"
              label="Nome Completo"
              placeholder="Digite o nome completo do cliente"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              error={!!errors.full_name}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
              required
            />
            {errors.full_name && (
              <Typography className="text-status-error text-sm mt-1">
                {errors.full_name}
              </Typography>
            )}
          </div>

          {/* Email and Phone Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                name="email"
                label="E-mail"
                type="email"
                autoComplete="off"
                placeholder="cliente@exemplo.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                required
              />
              {errors.email && (
                <Typography className="text-status-error text-sm mt-1">
                  {errors.email}
                </Typography>
              )}
            </div>
            <div>
              <Input
                name="phone_number"
                label="Telefone"
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                value={formData.phone_number || ''}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                error={!!errors.phone_number}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
              />
              {errors.phone_number && (
                <Typography className="text-status-error text-sm mt-1">
                  {errors.phone_number}
                </Typography>
              )}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <Input
              name="date_of_birth"
              label="Data de Nascimento"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              error={!!errors.date_of_birth}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
            />
            {errors.date_of_birth && (
              <Typography className="text-status-error text-sm mt-1">
                {errors.date_of_birth}
              </Typography>
            )}
          </div>

          {/* Hair Type */}
          <div>
            <Select
              name="hair_type"
              label="Tipo de Cabelo"
              value={formData.hair_type}
              onChange={(value) => handleInputChange('hair_type', value)}
              error={!!errors.hair_type}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              // containerProps is not a direct prop for Select, styling might need to be applied differently if needed
            >
              {hairTypeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            {errors.hair_type && (
              <Typography className="text-status-error text-sm mt-1">
                {errors.hair_type}
              </Typography>
            )}
          </div>

          {/* Gender */}
          <div>
            <Select
              name="gender"
              label="Gênero"
              value={formData.gender}
              onChange={(value) => handleInputChange('gender', value)}
              error={!!errors.gender}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
            >
              {genderOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            {errors.gender && (
              <Typography className="text-status-error text-sm mt-1">
                {errors.gender}
              </Typography>
            )}
          </div>

          {/* Password (only for create mode) */}
          {!isEditMode && (
            <div>
              <Input
                name="password"
                label="Senha"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!errors.password}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                required
              />
              {errors.password && (
                <Typography className="text-status-error text-sm mt-1">
                  {errors.password}
                </Typography>
              )}
            </div>
          )}

          {/* Role and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Typography className="text-text-secondary text-sm mb-2">
                Função/Role
              </Typography>
              <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-3">
                <Typography className="text-text-primary">
                  CLIENTE
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                color="blue" // Material Tailwind uses 'blue' as default accent
                labelProps={{
                  className: "text-text-primary",
                }}
              />
              <Typography className="text-text-primary">
                {formData.is_active ? "Ativo" : "Inativo"}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Removed Profile Photo Section */}
      {/* Removed Services Association Section */}
    </div>
  );
};

// Removed AvailabilityTab, BlockedPeriodsTab, RecurringBreaksTab components

export default function ClientForm() { // Renamed component
  const navigate = useNavigate();
  const { clientId } = useParams(); // Changed from professionalId to clientId
  const isEditMode = Boolean(clientId); // Renamed from isEdit for clarity

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '', // Added phone_number
    date_of_birth: '', // Added date_of_birth
    hair_type: '', // Added hair_type
    gender: '', // Added gender
    password: '', // Kept for creation
    is_active: true,
    // Removed services_ids, bio, etc.
  });

  // UI state
  // const [activeTab, setActiveTab] = useState('basic'); // Removed tabs
  // const [allServices, setAllServices] = useState([]); // Removed services state
  // const [selectedServices, setSelectedServices] = useState([]); // Removed services state
  // const [photoPreview, setPhotoPreview] = useState(null); // Removed photo state
  // const [photoFile, setPhotoFile] = useState(null); // Removed photo state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Load data on component mount
  useEffect(() => {
    // loadAllServices(); // Removed
    if (isEditMode) {
      loadClient(); // Renamed from loadProfessional
    }
  }, [clientId]); // Changed dependency to clientId

  // Track initial state for comparison
  const [initialFormData, setInitialFormData] = useState(null);

  // Track changes
  useEffect(() => {
    if (initialFormData) {
      // const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData) || photoFile !== null; // Removed photoFile from comparison
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
      setHasUnsavedChanges(hasChanged);
    }
  }, [formData, initialFormData]); // Removed photoFile from dependency

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  // const loadAllServices = async () => { // Removed function
  //   try {
  //     const data = await servicesApi.getAllServices();
  //     setAllServices(data);
  //   } catch (error) {
  //     console.error('Erro ao carregar serviços:', error);
  //   }
  // };

  const loadClient = async () => { // Renamed from loadProfessional
    try {
      setIsLoading(true);
      const data = await clientsApi.getClientById(clientId); // Use clientsApi and clientId

      const loadedFormData = {
        full_name: data.full_name || '',
        email: data.email || '',
        phone_number: data.phone_number || '', // Added phone_number
        // Format date_of_birth to YYYY-MM-DD for the date input
        date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : '',
        hair_type: data.hair_type || '',
        gender: data.gender || '',
        password: '', // Never load password
        is_active: data.is_active ?? true,
      };

      setFormData(loadedFormData);
      setInitialFormData(loadedFormData); // Set initial state for comparison

      // Removed photo loading logic
      // Removed services_offered loading logic

      setHasUnsavedChanges(false); // Reset flag after loading
    } catch (error) {
      console.error('Erro ao carregar cliente:', error); // Updated error message
      showAlert('Erro ao carregar dados do cliente', 'error'); // Updated alert message
      navigate('/clients'); // Navigate to clients list on error
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail deve ter um formato válido';
    }

    // Password validation only for create mode
    if (!isEditMode && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    // Date of Birth validation (optional)
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare dates only

      if (isNaN(dob.getTime())) {
        newErrors.date_of_birth = 'Data de nascimento inválida.';
      } else if (dob > today) {
        newErrors.date_of_birth = 'Data de nascimento não pode ser no futuro.';
      }
    }

    // Hair Type validation (optional)
    if (formData.hair_type && !["LISO", "ONDULADO", "CACHEADO", "CRESPO"].includes(formData.hair_type)) {
      newErrors.hair_type = 'Tipo de cabelo inválido.';
    }

    // Gender validation (optional)
    if (formData.gender && !["MASCULINO", "FEMININO", "OUTROS"].includes(formData.gender)) {
      newErrors.gender = 'Gênero inválido.';
    }

    // Optional: Phone number validation (basic example)
    // if (formData.phone_number && !/^\(\d{2}\) \d{4,5}-\d{4}$/.test(formData.phone_number)) {
    //   newErrors.phone_number = 'Formato de telefone inválido. Use (XX) XXXXX-XXXX';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Removed handlePhotoChange and handlePhotoRemove

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const dataToSave = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number?.trim() || null, // Send null if empty
        date_of_birth: formData.date_of_birth || null, // Send null if empty
        hair_type: formData.hair_type || null, // Send null if empty
        gender: formData.gender || null, // Send null if empty
        is_active: formData.is_active,
      };

      if (!isEditMode) {
        dataToSave.password = formData.password;
        // Role is set in clientsApi.createClient
      }
      // For edit mode, password is not included here. If password change is needed, it requires separate fields.

      let result;
      if (isEditMode) {
        result = await clientsApi.updateClient(clientId, dataToSave); // Use clientsApi
        showAlert('Cliente atualizado com sucesso!', 'success'); // Updated message
      } else {
        result = await clientsApi.createClient(dataToSave); // Use clientsApi
        showAlert('Cliente criado com sucesso!', 'success'); // Updated message
      }

      // Removed photo upload logic
      // Removed services association logic

      setInitialFormData(formData); // Update initial state to reflect saved data
      setHasUnsavedChanges(false); // Reset flag

      // Navigate to clients list page after save/create
      navigate('/clients');

    } catch (error) {
      console.error('Erro ao salvar cliente:', error); // Updated error message
      if (error.response?.data?.detail) {
        showAlert(`Erro ao salvar cliente: ${error.response.data.detail}`, 'error');
      } else {
        showAlert('Falha ao salvar cliente', 'error'); // Updated message
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelDialog(true);
    } else {
      navigate('/clients'); // Navigate to clients list
    }
  };

  const confirmCancel = () => {
    setCancelDialog(false);
    navigate('/clients'); // Navigate to clients list
  };

  // Removed handleTabChange as tabs are removed

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-bg-primary min-h-screen">
      {/* Alert Component */}
      {alert.show && (
        <div className="fixed top-4 right-4 z-50 w-96">
          <Alert
            open={alert.show}
            onClose={() => setAlert({ ...alert, show: false })}
            color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'amber' : 'green'}
            className="mb-4"
          >
            {alert.message}
          </Alert>
        </div>
      )}

      <Card className="bg-bg-secondary border-bg-tertiary max-w-5xl mx-auto"> {/* max-w-5xl might be too large for a simple form, consider max-w-2xl or max-w-3xl */}
        <CardHeader floated={false} shadow={false} className="bg-bg-secondary">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="text"
              className="flex items-center gap-2 text-accent-primary hover:bg-accent-primary/10"
              onClick={handleCancel}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Voltar para Clientes {/* Updated text */}
            </Button>
          </div>

          <div className="mb-6">
            <Typography variant="h4" className="text-text-primary">
              {isEditMode ? 'Editar Cliente' : 'Criar Novo Cliente'} {/* Updated text */}
            </Typography>
            {isEditMode && formData.full_name && (
              <Typography className="text-text-secondary mt-1">
                Editando: {formData.full_name}
              </Typography>
            )}
          </div>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          {/* Removed Tabs */}
          {/* The form content is now directly rendered */}
          <form onSubmit={handleSubmit}>
            {/* Renamed from BasicDataTab */}
            <ClientDataForm
              formData={formData}
              handleInputChange={handleInputChange}
              errors={errors}
              isEditMode={isEditMode} // Pass isEditMode
              // Removed photo and service props
              // showAlert={showAlert} // showAlert is available in the main component scope
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t border-bg-tertiary mt-8">
              <Button
                type="button"
                variant="outlined"
                onClick={handleCancel}
                disabled={isSaving}
                className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-accent-primary hover:bg-accent-primary/90 flex items-center justify-center gap-2"
              >
                {isSaving && <Spinner className="h-4 w-4" />}
                {isSaving ? 'Salvando...' : (isEditMode ? 'Salvar Cliente' : 'Criar Cliente')} {/* Updated button text */}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialog}
        handler={() => setCancelDialog(false)}
        className="bg-bg-secondary border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary">
          Alterações Não Salvas
        </DialogHeader>
        <DialogBody className="text-text-primary">
          Há alterações não salvas. Deseja descartar e voltar?
        </DialogBody>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => setCancelDialog(false)}
            className="border-bg-tertiary text-text-primary hover:bg-bg-primary"
          >
            Manter Edição
          </Button>
          <Button
            onClick={confirmCancel}
            className="bg-status-error hover:bg-status-error/90"
          >
            Descartar e Voltar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
