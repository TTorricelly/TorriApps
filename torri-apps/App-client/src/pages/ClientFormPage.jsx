import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../shared/hooks/useNavigation'
import { ROUTES } from '../shared/navigation'
import { 
  ArrowLeft, 
  Save, 
  Mail, 
  Phone, 
  User, 
  Calendar,
  Loader2,
  Lock,
  Tag,
  Plus,
  CreditCard,
  MapPin
} from '../components/icons'
import { clientService } from '../services/clientService'
import { useAuthStore } from '../stores/authStore'
import LabelChip from '../components/labels/LabelChip'
import LabelSelector from '../components/labels/LabelSelector'
import labelService from '../services/labelService'
import { extractLabelIds } from '../utils/labelUtils'
import { 
  handleCpfInput, 
  validateCpfChecksum, 
  handleCepInput, 
  lookupCep, 
  validateBrazilianFields, 
  cleanFormData, 
  BRAZILIAN_STATES 
} from '../utils/brazilianUtils'

const ClientFormPage = () => {
  const { clientId } = useParams() // If editing existing client
  const { navigate } = useNavigation()
  const { hasRole } = useAuthStore()
  
  const isEditing = Boolean(clientId && clientId !== 'new')
  const canManageClients = hasRole(['GESTOR', 'ATENDENTE'])

  // Form state - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    date_of_birth: '',
    gender: '',
    cpf: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_cep: '',
    is_active: true
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [isLabelSelectorOpen, setIsLabelSelectorOpen] = useState(false)
  const [selectedLabels, setSelectedLabels] = useState([])
  const [isLookingUpCep, setIsLookingUpCep] = useState(false)

  // Handle permission check in useEffect instead of early return
  useEffect(() => {
    if (!canManageClients) {
      navigate(ROUTES.PROFESSIONAL.DASHBOARD)
    }
  }, [canManageClients, navigate])

  // Load client data if editing
  useEffect(() => {
    if (isEditing && clientId && clientId !== 'new') {
      loadClientData()
    }
  }, [clientId, isEditing])

  const loadClientData = async () => {
    try {
      setIsLoading(true)
      const client = await clientService.getClientById(clientId)
      
      if (client) {
        setFormData({
          full_name: client.full_name || '',
          email: client.email || '',
          phone_number: client.phone_number || '',
          password: '', // Don't populate password when editing
          date_of_birth: client.date_of_birth || '',
          gender: client.gender || '',
          cpf: client.cpf || '',
          address_street: client.address_street || '',
          address_number: client.address_number || '',
          address_complement: client.address_complement || '',
          address_neighborhood: client.address_neighborhood || '',
          address_city: client.address_city || '',
          address_state: client.address_state || '',
          address_cep: client.address_cep || '',
          is_active: client.is_active !== false
        })
        setSelectedLabels(client.labels || [])
      } else {
        setError('Cliente não encontrado')
      }
    } catch (error) {
      setError('Erro ao carregar dados do cliente')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // Handle CPF input with formatting
  const handleCpfChange = (value) => {
    const formatted = handleCpfInput(value)
    handleChange('cpf', formatted)
  }

  // Handle CEP input with formatting and lookup
  const handleCepChange = async (value) => {
    const formatted = handleCepInput(value)
    handleChange('address_cep', formatted)
    
    // Auto-lookup address if CEP is complete
    if (formatted.length === 9) { // Format: 12345-678
      setIsLookingUpCep(true)
      try {
        const addressData = await lookupCep(formatted)
        if (addressData) {
          setFormData(prev => ({
            ...prev,
            address_cep: formatted,
            address_street: addressData.address_street || prev.address_street,
            address_neighborhood: addressData.address_neighborhood || prev.address_neighborhood,
            address_city: addressData.address_city || prev.address_city,
            address_state: addressData.address_state || prev.address_state
          }))
        }
      } catch (error) {
        // Ignore CEP lookup errors - user can enter address manually
      } finally {
        setIsLookingUpCep(false)
      }
    }
  }

  // Handle label management
  const handleLabelRemove = (labelToRemove) => {
    setSelectedLabels(prev => prev.filter(label => label.id !== labelToRemove.id))
  }

  const handleLabelSelectionChange = (newLabels) => {
    setSelectedLabels(newLabels)
  }

  // Validate form
  const validateForm = () => {
    const errors = {}

    if (!formData.full_name.trim()) {
      errors.full_name = 'Nome é obrigatório'
    }

    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido'
    }

    if (!isEditing && !formData.password.trim()) {
      errors.password = 'Senha é obrigatória'
    } else if (!isEditing && formData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres'
    }

    if (formData.phone_number && !/^\d+$/.test(formData.phone_number.replace(/\D/g, ''))) {
      errors.phone_number = 'Telefone inválido'
    }

    // Validate Brazilian fields (CPF, CEP, address)
    const brazilianErrors = validateBrazilianFields(formData)
    Object.assign(errors, brazilianErrors)

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setIsSaving(true)
      setError('')

      // Clean and format data for submission
      const cleanedData = cleanFormData({
        ...formData,
        phone_number: formData.phone_number.replace(/\D/g, ''),
        email: formData.email.trim() || null
      })

      // For editing, remove password if empty (don't change password)
      if (isEditing && !cleanedData.password.trim()) {
        delete cleanedData.password
      }

      let result
      if (isEditing) {
        result = await clientService.updateClient(clientId, cleanedData)
      } else {
        result = await clientService.createClient(cleanedData)
      }

      if (result && result.id) {
        // Update labels for both create and edit operations
        try {
          const labelIds = extractLabelIds(selectedLabels);
          
          // Always update labels (even if empty array) to ensure consistency
          await labelService.updateUserLabels(result.id, labelIds);
        } catch (error) {
          // Continue even if labels fail - client was created/updated successfully
        }
        
        navigate(ROUTES.PROFESSIONAL.CLIENTS, {
          state: { 
            message: isEditing ? 'Cliente atualizado com sucesso' : 'Cliente criado com sucesso'
          }
        })
      } else {
        setError(isEditing ? 'Erro ao atualizar cliente' : 'Erro ao criar cliente')
      }
    } catch (error) {
      setError(isEditing ? 'Erro ao atualizar cliente' : 'Erro ao criar cliente')
    } finally {
      setIsSaving(false)
    }
  }

  // Format phone for display
  const formatPhoneInput = (value) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 11) {
      if (cleaned.length <= 2) return cleaned
      if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return value
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="text-pink-500 animate-spin" />
      </div>
    )
  }

  // Permission check - render nothing if no permission
  if (!canManageClients) {
    return null
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(ROUTES.PROFESSIONAL.CLIENTS)}
              className="mr-3 p-2 rounded-xl hover:bg-gray-100"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
              </h1>
              <p className="text-gray-600 text-sm">
                {isEditing ? 'Atualize as informações do cliente' : 'Preencha os dados do novo cliente'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-pink-500 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="p-4 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Nome completo do cliente"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      validationErrors.full_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {validationErrors.full_name && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@exemplo.com (opcional)"
                    autoComplete="off"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      validationErrors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>

              {/* Password - Only show when creating new client */}
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                        validationErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {validationErrors.password && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.password}</p>
                  )}
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formatPhoneInput(formData.phone_number)}
                    onChange={(e) => handleChange('phone_number', e.target.value)}
                    placeholder="(11) 99999-9999"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      validationErrors.phone_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {validationErrors.phone_number && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.phone_number}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Nascimento
                </label>
                <div className="relative">
                  <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <div className="relative">
                  <CreditCard size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      validationErrors.cpf ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {validationErrors.cpf && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.cpf}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
            
            <div className="space-y-4">
              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gênero
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="">Selecione o gênero</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>


              {/* Active Status */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Cliente ativo</span>
                </label>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-pink-500" />
              Endereço
            </h2>
            
            <div className="space-y-4">
              {/* CEP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEP
                </label>
                <div className="relative">
                  <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.address_cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="12345-678"
                    maxLength={9}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      validationErrors.address_cep ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {isLookingUpCep && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-pink-500" />
                    </div>
                  )}
                </div>
                {validationErrors.address_cep && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.address_cep}</p>
                )}
              </div>

              {/* Street */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logradouro
                </label>
                <input
                  type="text"
                  value={formData.address_street}
                  onChange={(e) => handleChange('address_street', e.target.value)}
                  placeholder="Rua, Avenida, etc."
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              {/* Number and Complement */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.address_number}
                    onChange={(e) => handleChange('address_number', e.target.value)}
                    placeholder="123"
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.address_complement}
                    onChange={(e) => handleChange('address_complement', e.target.value)}
                    placeholder="Apto, Bloco, etc."
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Neighborhood */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.address_neighborhood}
                  onChange={(e) => handleChange('address_neighborhood', e.target.value)}
                  placeholder="Nome do bairro"
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              {/* City and State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.address_city}
                    onChange={(e) => handleChange('address_city', e.target.value)}
                    placeholder="Nome da cidade"
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.address_state}
                    onChange={(e) => handleChange('address_state', e.target.value)}
                    className={`w-full py-3 px-4 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      validationErrors.address_state ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione</option>
                    {BRAZILIAN_STATES.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.code} - {state.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.address_state && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.address_state}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Labels Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tag size={20} className="text-pink-500" />
              Preferências
            </h2>
            
            <div className="space-y-4">
              {/* Current Labels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preferências do Cliente
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                >
                  <Plus size={16} />
                  Adicionar Preferências
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Label Selector Modal */}
      <LabelSelector
        isOpen={isLabelSelectorOpen}
        onClose={() => setIsLabelSelectorOpen(false)}
        onSelectionChange={handleLabelSelectionChange}
        selectedLabels={selectedLabels}
        title="Selecionar Preferências do Cliente"
        allowMultiple={true}
      />
    </div>
  )
}

export default ClientFormPage