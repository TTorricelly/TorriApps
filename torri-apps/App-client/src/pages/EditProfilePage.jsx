import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';
import { updateUserProfile } from '../services/userService';
import { ArrowLeft, User, Mail, Phone, Save, Calendar, CreditCard, MapPin, Tag, Plus } from 'lucide-react';
import { 
  handleCpfInput, 
  handleCepInput, 
  validateCpfChecksum, 
  validateCepFormat, 
  validateBrazilianState,
  lookupCep,
  BRAZILIAN_STATES,
  cleanFormData,
  validateBrazilianFields
} from '../utils/brazilianUtils';
import LabelChip from '../components/labels/LabelChip';
import LabelSelector from '../components/labels/LabelSelector';
import labelService from '../services/labelService';
import { areLabelsEqual, extractLabelIds } from '../utils/labelUtils';

const EditProfilePage = () => {
  const { navigate, navigateBack } = useNavigation();
  const { user, setProfile } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLabelSelectorOpen, setIsLabelSelectorOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState(user?.labels || []);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    gender: user?.gender || '',
    date_of_birth: user?.date_of_birth || '',
    // CPF and Address fields
    cpf: user?.cpf || '',
    address_street: user?.address_street || '',
    address_number: user?.address_number || '',
    address_complement: user?.address_complement || '',
    address_neighborhood: user?.address_neighborhood || '',
    address_city: user?.address_city || '',
    address_state: user?.address_state || '',
    address_cep: user?.address_cep || '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLabelRemove = async (labelToRemove) => {
    try {
      setSelectedLabels(prev => prev.filter(label => label.id !== labelToRemove.id));
      await labelService.removeLabelFromUser(user.id, labelToRemove.id);
    } catch (error) {
      console.error('Error removing label:', error);
      // Revert on error
      setSelectedLabels(prev => [...prev, labelToRemove]);
      alert('Erro ao remover label. Tente novamente.');
    }
  };

  const handleLabelSelectionChange = (newLabels) => {
    setSelectedLabels(newLabels);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validate Brazilian fields
    const brazilianErrors = validateBrazilianFields(formData);
    if (Object.keys(brazilianErrors).length > 0) {
      alert(`Erro de validação: ${Object.values(brazilianErrors).join(', ')}`);
      return;
    }
    
    setIsSaving(true);
    
    // Clean and format Brazilian data before submission
    const cleanedData = cleanFormData(formData);
    
    const updatedProfile = await updateUserProfile(cleanedData);
    
    // Update labels if they changed
    if (updatedProfile) {
      try {
        // Check if labels actually changed using utility function
        const labelsChanged = !areLabelsEqual(user?.labels, selectedLabels);
        
        if (labelsChanged) {
          const labelIds = extractLabelIds(selectedLabels);
          await labelService.updateUserLabels(user.id, labelIds);
          updatedProfile.labels = selectedLabels;
        }
      } catch (error) {
        console.error('Error updating labels:', error);
        alert('Perfil atualizado, mas houve erro ao salvar labels. Tente novamente.');
      }
    }
    
    setIsSaving(false);

    if (updatedProfile) {
      setProfile(updatedProfile);
      navigate(ROUTES.PROFILE);
    } else {
      // Handle error case, e.g., show a notification
      alert('Failed to update profile. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center p-4 bg-white border-b border-gray-200">
        <button onClick={() => navigateBack(ROUTES.PROFILE)} className="p-2">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 ml-4">Editar Perfil</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>


          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Gênero
            </label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">Selecione...</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTROS">Outro</option>
              </select>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
              Data de Nascimento
            </label>
            <div className="relative">
              <Calendar size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          </div>

          {/* CPF */}
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
              CPF
            </label>
            <div className="relative">
              <CreditCard size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={(e) => {
                  const formatted = handleCpfInput(e.target.value);
                  setFormData(prev => ({ ...prev, cpf: formatted }));
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-pink-500" />
              Endereço
            </h3>

            {/* CEP */}
            <div className="mb-4">
              <label htmlFor="address_cep" className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              <input
                type="text"
                id="address_cep"
                name="address_cep"
                value={formData.address_cep}
                onChange={(e) => {
                  const formatted = handleCepInput(e.target.value);
                  setFormData(prev => ({ ...prev, address_cep: formatted }));
                }}
                onBlur={async (e) => {
                  const cep = e.target.value;
                  if (cep && validateCepFormat(cep)) {
                    const addressData = await lookupCep(cep);
                    if (addressData) {
                      setFormData(prev => ({
                        ...prev,
                        address_street: addressData.address_street || prev.address_street,
                        address_complement: addressData.address_complement || prev.address_complement,
                        address_neighborhood: addressData.address_neighborhood || prev.address_neighborhood,
                        address_city: addressData.address_city || prev.address_city,
                        address_state: addressData.address_state || prev.address_state,
                      }));
                    }
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="00000-000"
                maxLength={9}
              />
            </div>

            {/* Street and Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label htmlFor="address_street" className="block text-sm font-medium text-gray-700 mb-1">
                  Rua/Logradouro
                </label>
                <input
                  type="text"
                  id="address_street"
                  name="address_street"
                  value={formData.address_street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Nome da rua"
                />
              </div>
              <div>
                <label htmlFor="address_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  id="address_number"
                  name="address_number"
                  value={formData.address_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="123"
                />
              </div>
            </div>

            {/* Complement and Neighborhood */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="address_complement" className="block text-sm font-medium text-gray-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  id="address_complement"
                  name="address_complement"
                  value={formData.address_complement}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Apto, Bloco, etc."
                />
              </div>
              <div>
                <label htmlFor="address_neighborhood" className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  id="address_neighborhood"
                  name="address_neighborhood"
                  value={formData.address_neighborhood}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Nome do bairro"
                />
              </div>
            </div>

            {/* City and State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="address_city" className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  id="address_city"
                  name="address_city"
                  value={formData.address_city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Nome da cidade"
                />
              </div>
              <div>
                <label htmlFor="address_state" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  id="address_state"
                  name="address_state"
                  value={formData.address_state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="">Selecione...</option>
                  {BRAZILIAN_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.code} - {state.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Labels Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Tag size={20} className="text-pink-500" />
              Preferências
            </h3>

            {/* Current Labels */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferências Atuais
              </label>
              {selectedLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedLabels.map((label) => (
                    <LabelChip
                      key={label.id}
                      label={label}
                      size="medium"
                      showRemove={true}
                      onRemove={handleLabelRemove}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mb-3">Nenhuma preferência selecionada</p>
              )}
              
              {/* Add Label Button */}
              <button
                type="button"
                onClick={() => setIsLabelSelectorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Adicionar Preferências
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-600 transition-colors disabled:bg-pink-300"
            >
              {isSaving ? (
                <>
                  <span className="spinner-border animate-spin ..."></span>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Label Selector Modal */}
      <LabelSelector
        isOpen={isLabelSelectorOpen}
        onClose={() => setIsLabelSelectorOpen(false)}
        onSelectionChange={handleLabelSelectionChange}
        selectedLabels={selectedLabels}
        title="Selecionar Preferências"
        allowMultiple={true}
      />
    </div>
  );
};

export default EditProfilePage;
