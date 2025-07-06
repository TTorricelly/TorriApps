import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigation } from '../shared/hooks/useNavigation'
import { ROUTES } from '../shared/navigation'
import { Search, Plus, Users, Phone, Mail, ChevronRight, UserX, Loader2, RefreshCw, CreditCard, MapPin } from '../components/icons'
import { clientService } from '../services/clientService'
import { useAuthStore } from '../stores/authStore'
import { useViewModeStore } from '../stores/viewModeStore'
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation'
import { formatCpf, formatAddressCompact } from '../utils/brazilianUtils'

const ClientsPage = () => {
  const { navigate } = useNavigation()
  const { hasRole } = useAuthStore()
  const { isProfessionalMode } = useViewModeStore()
  
  // State management
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [totalClients, setTotalClients] = useState(0)
  
  // Pagination
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  // Check if user can manage clients
  const canManageClients = hasRole(['GESTOR', 'ATENDENTE'])
  const canDeleteClients = hasRole(['GESTOR'])

  // Optimized search function - no debounce, 3 char minimum
  const performSearch = useMemo(() => {
    return (term) => {
      // Only search if 3+ characters (never show all)
      if (term.trim().length >= 3) {
        loadClients(true, term)
      } else if (term.trim().length === 0) {
        // Clear results when search is empty
        setClients([])
        setTotalClients(0)
        setPage(0)
        setHasMore(false)
      }
    }
  }, [])

  // Load clients function
  const loadClients = useCallback(async (reset = false, search = searchTerm) => {
    try {
      const isFirstLoad = reset || page === 0
      setIsLoading(isFirstLoad)
      setIsRefreshing(!isFirstLoad)
      setError('')

      const currentPage = reset ? 0 : page
      const response = await clientService.getClients({
        search: search.trim(),
        skip: currentPage * PAGE_SIZE,
        limit: PAGE_SIZE
      })

      if (reset) {
        setClients(response.items)
        setPage(1)
      } else {
        setClients(prev => [...prev, ...response.items])
        setPage(prev => prev + 1)
      }

      setHasMore(response.has_more)
      setTotalClients(response.total)
    } catch (error) {
      setError('Erro ao carregar clientes. Tente novamente.')
      console.error('Failed to load clients:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [page, searchTerm])

  // No initial load - start with empty state like Web-admin
  // useEffect(() => {
  //   loadClients(true)
  // }, [])

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term)
    setPage(0)
    performSearch(term)
  }

  // Handle refresh
  const handleRefresh = () => {
    setPage(0)
    // Only refresh if there's a search term (3+ chars)
    if (searchTerm.trim().length >= 3) {
      loadClients(true)
    } else {
      // Clear everything if no valid search
      setClients([])
      setTotalClients(0)
      setHasMore(false)
    }
  }

  // Load more (infinite scroll)
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadClients(false)
    }
  }

  // Format phone number for display
  const formatPhone = (phone) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  // Get client initials for avatar
  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Client card component
  const ClientCard = ({ client }) => (
    <div 
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
      onClick={() => navigate(ROUTES.PROFESSIONAL.CLIENT_DETAIL(client.id))}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
            <span className="text-pink-600 font-semibold text-sm">
              {getInitials(client.full_name)}
            </span>
          </div>
          
          {/* Client Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {client.full_name || 'Nome não informado'}
            </h3>
            
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <Mail size={14} className="mr-1 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
            
            {client.phone_number && (
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <Phone size={14} className="mr-1 flex-shrink-0" />
                <span>{formatPhone(client.phone_number)}</span>
              </div>
            )}
            
            {client.cpf && (
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <CreditCard size={14} className="mr-1 flex-shrink-0" />
                <span>{formatCpf(client.cpf)}</span>
              </div>
            )}
            
            {(client.address_street || client.address_city) && (
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <MapPin size={14} className="mr-1 flex-shrink-0" />
                <span className="truncate">{formatAddressCompact(client)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight size={20} className="text-gray-400 ml-3" />
      </div>
      
      {/* Status indicator */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${client.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />
          <span className="text-xs text-gray-600">
            {client.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        
      </div>
    </div>
  )

  // Empty state
  const EmptyState = () => {
    // If there's a search term, show "not found" message
    if (searchTerm.trim().length >= 3) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum cliente encontrado
          </h3>
          <p className="text-gray-600 text-center mb-6">
            Nenhum cliente encontrado para &quot;{searchTerm}&quot;
          </p>
          <p className="text-gray-500 text-center text-sm">
            Tente buscar por nome, email ou telefone
          </p>
        </div>
      )
    }
    
    // Default empty state - search prompt
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
          <Search size={32} className="text-pink-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Buscar Clientes
        </h3>
        <p className="text-gray-600 text-center mb-6">
          Digite pelo menos 3 caracteres no campo de busca para encontrar clientes
        </p>
        <p className="text-gray-500 text-center text-sm">
          Busque por nome, email ou telefone
        </p>
        {canManageClients && (
          <button
            onClick={() => navigate(ROUTES.PROFESSIONAL.CLIENT_CREATE)}
            className="bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold mt-4"
          >
            Adicionar Novo Cliente
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 text-sm">
              {totalClients > 0 ? `${totalClients} ${totalClients === 1 ? 'cliente' : 'clientes'}` : 'Gerencie seus clientes'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw size={20} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Add client button */}
            {canManageClients && (
              <button
                onClick={() => navigate(ROUTES.PROFESSIONAL.CLIENT_CREATE)}
                className="bg-pink-500 text-white p-2 rounded-xl"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Digite pelo menos 3 caracteres para buscar..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-pink-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {isLoading && clients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 size={32} className="text-pink-500 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="px-4 py-4">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
            
            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium disabled:opacity-50 flex items-center"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {isLoading ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Navigation - Only show in professional mode */}
      {isProfessionalMode() && <ProfessionalBottomNavigation />}
    </div>
  )
}

export default ClientsPage