import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  Mail, 
  Phone, 
  User, 
  Calendar,
  Loader2,
  Lock
} from '../components/icons'
import { clientService } from '../services/clientService'
import { useAuthStore } from '../stores/authStore'

const ClientFormPage = () => {
  const { clientId } = useParams() // If editing existing client
  const navigate = useNavigate()
  const { hasRole } = useAuthStore()
  
  const isEditing = Boolean(clientId && clientId !== 'new')
  const canManageClients = hasRole(['GESTOR', 'ATENDENTE'])

  // Redirect if no permission
  if (!canManageClients) {
    navigate('/professional/dashboard')
    return null
  }

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    date_of_birth: '',
    gender: '',
    hair_type: '',
    is_active: true
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

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
          hair_type: client.hair_type || '',
          is_active: client.is_active !== false
        })
      } else {
        setError('Cliente não encontrado')
      }
    } catch (error) {
      setError('Erro ao carregar dados do cliente')
      console.error('Failed to load client:', error)
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

  // Validate form
  const validateForm = () => {
    const errors = {}

    if (!formData.full_name.trim()) {
      errors.full_name = 'Nome é obrigatório'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
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

      // Clean phone number (remove formatting)
      const cleanedData = {
        ...formData,
        phone_number: formData.phone_number.replace(/\D/g, ''),
        date_of_birth: formData.date_of_birth || null
      }

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

      if (result) {
        navigate('/professional/clients', {
          state: { 
            message: isEditing ? 'Cliente atualizado com sucesso' : 'Cliente criado com sucesso'
          }
        })
      } else {
        setError(isEditing ? 'Erro ao atualizar cliente' : 'Erro ao criar cliente')
      }
    } catch (error) {
      setError(isEditing ? 'Erro ao atualizar cliente' : 'Erro ao criar cliente')
      console.error('Failed to save client:', error)
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/professional/clients')}
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
                  Email *
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
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

              {/* Hair Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cabelo
                </label>
                <select
                  value={formData.hair_type}
                  onChange={(e) => handleChange('hair_type', e.target.value)}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="">Selecione o tipo de cabelo</option>
                  <option value="LISO">Liso</option>
                  <option value="ONDULADO">Ondulado</option>
                  <option value="CACHEADO">Cacheado</option>
                  <option value="CRESPO">Crespo</option>
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
        </form>
      </div>
    </div>
  )
}

export default ClientFormPage