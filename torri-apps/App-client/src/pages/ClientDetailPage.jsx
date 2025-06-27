import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  Mail, 
  Calendar, 
  User, 
  Scissors, 
  Clock, 
  MapPin,
  Trash2,
  Loader2,
  AlertTriangle
} from '../components/icons'
import { clientService } from '../services/clientService'
import { useAuthStore } from '../stores/authStore'

const ClientDetailPage = () => {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuthStore()
  
  // State
  const [client, setClient] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAllAppointments, setShowAllAppointments] = useState(false)

  // Permissions
  const canEditClient = hasRole(['GESTOR', 'ATENDENTE'])
  const canDeleteClient = hasRole(['GESTOR'])

  // Load client data
  useEffect(() => {
    const loadClientData = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const clientData = await clientService.getClientById(clientId)
        if (!clientData) {
          setError('Cliente não encontrado')
          return
        }
        
        setClient(clientData)
        
        // Load appointments
        setIsLoadingAppointments(true)
        const appointmentsData = await clientService.getClientAppointments(clientId)
        setAppointments(appointmentsData)
        
      } catch (error) {
        setError('Erro ao carregar dados do cliente')
        console.error('Failed to load client:', error)
      } finally {
        setIsLoading(false)
        setIsLoadingAppointments(false)
      }
    }

    if (clientId) {
      loadClientData()
    }
  }, [clientId])

  // Handle delete client
  const handleDeleteClient = async () => {
    try {
      setIsDeleting(true)
      const success = await clientService.deleteClient(clientId)
      
      if (success) {
        navigate('/professional/clients', { 
          state: { message: 'Cliente excluído com sucesso' }
        })
      } else {
        setError('Erro ao excluir cliente')
      }
    } catch (error) {
      setError('Erro ao excluir cliente')
      console.error('Failed to delete client:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Format utilities
  const formatPhone = (phone) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não informada'
    
    try {
      // Handle different date formats
      const date = new Date(dateString)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Data inválida'
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error, dateString)
      return 'Data inválida'
    }
  }

  const formatAppointmentDateTime = (appointment) => {
    if (!appointment.appointment_date) return 'Data não informada'
    
    try {
      // Combine date and time from the appointment object
      const dateStr = appointment.appointment_date // "2025-07-02"
      const timeStr = appointment.start_time || '00:00:00' // "09:30:00"
      
      // Create a proper datetime string
      const dateTimeStr = `${dateStr}T${timeStr}`
      const date = new Date(dateTimeStr)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return `${dateStr} ${timeStr.slice(0, 5)}`
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting appointment date:', error, appointment)
      return 'Data inválida'
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getGenderLabel = (gender) => {
    const labels = {
      'MASCULINO': 'Masculino',
      'FEMININO': 'Feminino',
      'OUTROS': 'Outros'
    }
    return labels[gender] || gender
  }

  const getHairTypeLabel = (hairType) => {
    const labels = {
      'LISO': 'Liso',
      'ONDULADO': 'Ondulado',
      'CACHEADO': 'Cacheado',
      'CRESPO': 'Crespo'
    }
    return labels[hairType] || hairType
  }

  const getAppointmentStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase()
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no_show': 'bg-yellow-100 text-yellow-800'
    }
    return colors[normalizedStatus] || 'bg-gray-100 text-gray-800'
  }

  const getAppointmentStatusLabel = (status) => {
    const normalizedStatus = status?.toLowerCase()
    const labels = {
      'scheduled': 'Agendado',
      'confirmed': 'Confirmado',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
      'no_show': 'Não compareceu'
    }
    return labels[normalizedStatus] || status
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="text-pink-500 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error && !client) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
        <p className="text-gray-600 text-center mb-6">{error}</p>
        <button
          onClick={() => navigate('/professional/clients')}
          className="bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold"
        >
          Voltar para Clientes
        </button>
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
              <h1 className="text-xl font-bold text-gray-900">Detalhes do Cliente</h1>
              <p className="text-gray-600 text-sm">Informações e histórico</p>
            </div>
          </div>
          
          {canEditClient && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/professional/clients/${clientId}/edit`)}
                className="p-2 rounded-xl bg-gray-100"
              >
                <Edit size={18} className="text-gray-600" />
              </button>
              
              {canDeleteClient && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 rounded-xl bg-red-100"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Client Profile Card */}
        <div className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-pink-600 font-bold text-lg">
                {getInitials(client?.full_name)}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {client?.full_name || 'Nome não informado'}
              </h2>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${client?.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600">
                  {client?.is_active ? 'Cliente ativo' : 'Cliente inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Mail size={20} className="text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{client?.email}</p>
              </div>
            </div>

            {client?.phone_number && (
              <div className="flex items-center">
                <Phone size={20} className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Telefone</p>
                  <p className="font-medium text-gray-900">{formatPhone(client.phone_number)}</p>
                </div>
              </div>
            )}

            {client?.date_of_birth && (
              <div className="flex items-center">
                <Calendar size={20} className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Data de Nascimento</p>
                  <p className="font-medium text-gray-900">{formatDate(client.date_of_birth)}</p>
                </div>
              </div>
            )}

            {client?.gender && (
              <div className="flex items-center">
                <User size={20} className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Gênero</p>
                  <p className="font-medium text-gray-900">{getGenderLabel(client.gender)}</p>
                </div>
              </div>
            )}

            {client?.hair_type && (
              <div className="flex items-center">
                <Scissors size={20} className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Tipo de Cabelo</p>
                  <p className="font-medium text-gray-900">{getHairTypeLabel(client.hair_type)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appointments History */}
        <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Histórico de Agendamentos</h3>
            <p className="text-gray-600 text-sm">
              {appointments.length > 0 ? `${appointments.length} agendamentos` : 'Nenhum agendamento'}
            </p>
          </div>

          {isLoadingAppointments ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 size={24} className="text-pink-500 animate-spin" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-600">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(showAllAppointments ? appointments : appointments.slice(0, 5)).map((appointment) => (
                <div key={appointment.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Clock size={16} className="text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatAppointmentDateTime(appointment)}
                        </span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getAppointmentStatusColor(appointment.status)}`}>
                          {getAppointmentStatusLabel(appointment.status)}
                        </span>
                      </div>
                      
                      {appointment.service && appointment.service.name ? (
                        <div className="text-sm text-gray-600 mb-1">
                          <p><strong>Serviço:</strong> {appointment.service.name}</p>
                        </div>
                      ) : appointment.services && appointment.services.length > 0 ? (
                        <div className="text-sm text-gray-600 mb-1">
                          <p><strong>Serviços:</strong> {appointment.services.map(s => s.name).join(', ')}</p>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 mb-1">
                          <p><em>Serviço não especificado</em></p>
                        </div>
                      )}
                      
                      {(appointment.professional?.full_name || appointment.professional_name) && (
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <User size={14} className="mr-1" />
                          <span>{appointment.professional?.full_name || appointment.professional_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {appointments.length > 5 && (
                <div className="p-4 text-center">
                  <button 
                    onClick={() => setShowAllAppointments(!showAllAppointments)}
                    className="text-pink-500 text-sm font-medium hover:text-pink-600 transition-colors"
                  >
                    {showAllAppointments 
                      ? 'Mostrar menos' 
                      : `Ver todos os agendamentos (${appointments.length})`
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Excluir Cliente</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteClient}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Excluir'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDetailPage