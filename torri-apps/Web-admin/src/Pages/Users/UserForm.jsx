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
  Select,
  Option,
} from '@material-tailwind/react';
import {
  ArrowLeftIcon,
  UserIcon
} from '@heroicons/react/24/outline';

import { usersApi } from '../../Services/users';
import { normalizePhoneNumber, formatPhoneForDisplay, isValidPhoneNumber, preparePhoneDataForSubmission } from '../../utils/phoneUtils';

const UserDataForm = ({
  formData,
  handleInputChange,
  errors,
  isEditMode
}) => {
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

  const roleOptions = [
    { label: "Cliente", value: "CLIENTE" },
    { label: "Profissional", value: "PROFISSIONAL" },
    { label: "Atendente", value: "ATENDENTE" },
    { label: "Gestor", value: "GESTOR" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Nome Completo *"
          placeholder="Digite o nome completo"
          value={formData.full_name}
          onChange={(e) => handleInputChange('full_name', e.target.value)}
          error={!!errors.full_name}
          icon={<UserIcon className="h-5 w-5" />}
        />
        
        <Input
          label="Email *"
          placeholder="email@exemplo.com"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          error={!!errors.email}
        />

        {!isEditMode && (
          <Input
            label="Senha *"
            placeholder="Digite uma senha segura"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            error={!!errors.password}
          />
        )}

        <Input
          label="Telefone"
          placeholder="(11) 99999-9999"
          value={formData.phone_number}
          onChange={(e) => handleInputChange('phone_number', e.target.value)}
          error={!!errors.phone_number}
        />

        <Select
          label="Função *"
          value={formData.role}
          onChange={(value) => handleInputChange('role', value)}
          error={!!errors.role}
        >
          {roleOptions.map((role) => (
            <Option key={role.value} value={role.value}>
              {role.label}
            </Option>
          ))}
        </Select>

        <Input
          label="Data de Nascimento"
          type="date"
          value={formData.date_of_birth || ''}
          onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
          error={!!errors.date_of_birth}
        />

        <Select
          label="Tipo de Cabelo"
          value={formData.hair_type || ''}
          onChange={(value) => handleInputChange('hair_type', value)}
        >
          <Option value="">Selecione...</Option>
          {hairTypeOptions.map((hairType) => (
            <Option key={hairType.value} value={hairType.value}>
              {hairType.label}
            </Option>
          ))}
        </Select>

        <Select
          label="Gênero"
          value={formData.gender || ''}
          onChange={(value) => handleInputChange('gender', value)}
        >
          <Option value="">Selecione...</Option>
          {genderOptions.map((gender) => (
            <Option key={gender.value} value={gender.value}>
              {gender.label}
            </Option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <Switch
          id="is_active"
          label="Usuário Ativo"
          checked={formData.is_active}
          onChange={(e) => handleInputChange('is_active', e.target.checked)}
        />
        <Typography variant="small" color="gray" className="font-normal">
          {formData.is_active ? 'Este usuário pode acessar o sistema' : 'Este usuário está bloqueado'}
        </Typography>
      </div>

      {/* Display validation errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <Typography variant="small" color="red" className="font-medium mb-2">
            Corrija os seguintes erros:
          </Typography>
          <ul className="space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>
                <Typography variant="small" color="red">
                  • {error}
                </Typography>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function UserForm() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const isEditMode = Boolean(userId);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'CLIENTE',
    date_of_birth: '',
    hair_type: '',
    gender: '',
    is_active: true,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Load user data if editing
  useEffect(() => {
    if (isEditMode) {
      loadUserData();
    }
  }, [userId]);

  // Track form changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const userData = await usersApi.getUserById(userId);
      if (userData) {
        setFormData({
          full_name: userData.full_name || '',
          email: userData.email || '',
          password: '', // Never load existing password
          phone_number: userData.phone_number || '',
          role: userData.role || 'CLIENTE',
          date_of_birth: userData.date_of_birth || '',
          hair_type: userData.hair_type || '',
          gender: userData.gender || '',
          is_active: userData.is_active !== undefined ? userData.is_active : true,
        });
        setHasUnsavedChanges(false);
      } else {
        showAlert('Usuário não encontrado', 'error');
        navigate('/settings/users');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      showAlert('Erro ao carregar dados do usuário', 'error');
      navigate('/settings/users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email deve ter um formato válido';
    }

    if (!isEditMode && !formData.password?.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (!isEditMode && formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!formData.role) {
      newErrors.role = 'Função é obrigatória';
    }

    // Phone validation
    if (formData.phone_number && !isValidPhoneNumber(formData.phone_number)) {
      newErrors.phone_number = 'Número de telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showAlert('Por favor, corrija os erros no formulário', 'error');
      return;
    }

    setIsSaving(true);
    try {
      let dataToSubmit = {
        ...formData,
        date_of_birth: formData.date_of_birth || null,
        hair_type: formData.hair_type || null,
        gender: formData.gender || null,
      };

      // Normalize phone number if provided
      if (formData.phone_number) {
        dataToSubmit = preparePhoneDataForSubmission(dataToSubmit);
      }

      // Remove password from edit requests if empty
      if (isEditMode && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }

      let result;
      if (isEditMode) {
        result = await usersApi.updateUser(userId, dataToSubmit);
      } else {
        result = await usersApi.createUser(dataToSubmit);
      }

      if (result) {
        setHasUnsavedChanges(false);
        showAlert(
          isEditMode ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!',
          'success'
        );
        
        // Navigate back after a short delay
        setTimeout(() => {
          navigate('/settings/users');
        }, 1500);
      } else {
        showAlert('Erro ao salvar usuário', 'error');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showAlert('Erro ao salvar usuário', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelDialog(true);
    } else {
      navigate('/settings/users');
    }
  };

  const confirmCancel = () => {
    setCancelDialog(false);
    navigate('/settings/users');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {alert.show && (
        <Alert
          color={alert.type === 'error' ? 'red' : 'green'}
          className="mb-6 fixed top-4 right-4 z-50 max-w-md"
          onClose={() => setAlert({ show: false, message: '', type: 'success' })}
          dismissible
        >
          {alert.message}
        </Alert>
      )}

      <div className="mb-6">
        <Button
          variant="text"
          size="sm"
          className="flex items-center gap-2 text-accent-primary hover:bg-accent-primary/10 mb-4"
          onClick={handleCancel}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar para Usuários
        </Button>

        <Typography variant="h4" color="blue-gray" className="text-text-primary">
          {isEditMode ? 'Editar Usuário' : 'Novo Usuário'}
        </Typography>
        <Typography color="gray" className="mt-1 font-normal text-text-secondary">
          {isEditMode 
            ? 'Atualize as informações do usuário'
            : 'Preencha as informações para criar um novo usuário'
          }
        </Typography>
      </div>

      <Card className="bg-bg-secondary">
        <CardHeader
          variant="gradient"
          color="gray"
          className="mb-4 grid h-20 place-items-center bg-bg-primary"
        >
          <Typography variant="h5" color="white" className="text-text-primary">
            Informações do Usuário
          </Typography>
        </CardHeader>

        <CardBody className="bg-bg-secondary">
          <UserDataForm
            formData={formData}
            handleInputChange={handleInputChange}
            errors={errors}
            isEditMode={isEditMode}
          />

          <div className="flex gap-4 justify-end mt-8 pt-6 border-t border-blue-gray-100">
            <Button
              variant="text"
              size="lg"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="gradient"
              size="lg"
              onClick={handleSave}
              loading={isSaving}
              className="bg-accent-primary hover:bg-accent-primary/90"
            >
              {isEditMode ? 'Atualizar Usuário' : 'Criar Usuário'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialog} handler={setCancelDialog}>
        <DialogHeader>Descartar Alterações?</DialogHeader>
        <DialogBody>
          Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setCancelDialog(false)}
            className="mr-2"
          >
            Continuar Editando
          </Button>
          <Button
            variant="gradient"
            color="red"
            onClick={confirmCancel}
          >
            Descartar Alterações
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default UserForm;