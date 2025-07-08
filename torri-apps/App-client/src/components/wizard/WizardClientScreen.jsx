/**
 * WizardClientScreen Component
 * Client selection step for the scheduling wizard
 * Based on WalkInModal client selection functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  User,
  Phone,
  Mail,
  X,
  Loader2
} from 'lucide-react';
import { useWizardStore } from '../../stores/wizardStore';
import { getClients } from '../../services/clientService';

// Brazilian formatting utilities
const formatCpf = (cpf) => {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return numbers.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatCep = (cep) => {
  if (!cep) return '';
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length <= 8) {
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return numbers.slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2');
};

const lookupCep = async (cep) => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      address_street: data.logradouro || '',
      address_neighborhood: data.bairro || '',
      address_city: data.localidade || '',
      address_state: data.uf || '',
      address_complement: data.complemento || ''
    };
  } catch (error) {
    return null;
  }
};

const WizardClientScreen = () => {
  const firstInputRef = useRef(null);
  
  // Client state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(true);
  const [showMoreFields, setShowMoreFields] = useState(false);
  
  // Wizard store
  const {
    clientData,
    setClientData,
    goToNextStep,
    canProceedToStep,
    setLoading,
    setError,
    clearError
  } = useWizardStore();

  // Focus search input when component mounts
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  // Client search functionality
  const handleClientSearch = async (query) => {
    setClientSearchQuery(query);
    
    if (query.length < 3) {
      setClientSearchResults([]);
      return;
    }
    
    try {
      setSearchingClients(true);
      clearError();
      const results = await getClients({
        search: query,
        limit: 10
      });
      setClientSearchResults(results.items || []);
    } catch (error) {
      setError('Erro ao buscar clientes. Tente novamente.');
      setClientSearchResults([]);
    } finally {
      setSearchingClients(false);
    }
  };

  // Select existing client
  const selectExistingClient = (client) => {
    setClientData({
      id: client.id,
      name: client.full_name || client.name,
      nickname: client.nickname || '',
      phone: client.phone || '',
      email: client.email || '',
      cpf: client.cpf || '',
      address_cep: client.address_cep || '',
      address_street: client.address_street || '',
      address_number: client.address_number || '',
      address_complement: client.address_complement || '',
      address_neighborhood: client.address_neighborhood || '',
      address_city: client.address_city || '',
      address_state: client.address_state || '',
      isNewClient: false
    });
    setClientSearchQuery('');
    setClientSearchResults([]);
  };

  // Toggle between existing/new client mode
  const toggleClientMode = () => {
    setShowClientSearch(!showClientSearch);
    setClientData({
      id: null,
      name: '',
      nickname: '',
      phone: '',
      email: '',
      cpf: '',
      address_cep: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      isNewClient: !showClientSearch
    });
    setClientSearchQuery('');
    setClientSearchResults([]);
  };

  // Handle CEP lookup
  const handleCepLookup = async (cep) => {
    setClientData(prev => ({ ...prev, address_cep: formatCep(cep) }));
    
    if (cep.replace(/\D/g, '').length === 8) {
      const addressData = await lookupCep(cep);
      if (addressData) {
        setClientData(prev => ({
          ...prev,
          address_street: addressData.address_street || prev.address_street,
          address_neighborhood: addressData.address_neighborhood || prev.address_neighborhood,
          address_city: addressData.address_city || prev.address_city,
          address_state: addressData.address_state || prev.address_state,
          address_complement: addressData.address_complement || prev.address_complement
        }));
      }
    }
  };

  // Handle continue to next step
  const handleContinue = () => {
    if ((clientData.id || clientData.name.trim()) && canProceedToStep(2)) {
      goToNextStep();
    }
  };

  // Clear selected client
  const clearClient = () => {
    setClientData({
      id: null,
      name: '',
      nickname: '',
      phone: '',
      email: '',
      cpf: '',
      address_cep: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      isNewClient: false
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Informações do Cliente</h2>
            <p className="text-sm text-gray-500 mt-1">Selecione um cliente existente ou crie um novo</p>
          </div>
          <button
            onClick={toggleClientMode}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium"
          >
            {showClientSearch ? 'Novo Cliente' : 'Cliente Existente'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {showClientSearch ? (
          /* Existing client search mode */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Search size={16} className="inline mr-2" />
                Buscar Cliente Existente
              </label>
              <input
                ref={firstInputRef}
                type="text"
                value={clientSearchQuery}
                onChange={(e) => handleClientSearch(e.target.value)}
                className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                placeholder="Digite pelo menos 3 caracteres..."
                inputMode="search"
              />
            </div>

            {/* Search results */}
            {clientSearchQuery.length >= 3 && (
              <div className="max-h-64 overflow-y-auto">
                {searchingClients ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Buscando clientes...</p>
                  </div>
                ) : clientSearchResults.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-2">
                      {clientSearchResults.length} cliente{clientSearchResults.length !== 1 ? 's' : ''} encontrado{clientSearchResults.length !== 1 ? 's' : ''}:
                    </p>
                    {clientSearchResults.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => selectExistingClient(client)}
                        className="p-4 border border-gray-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                            <User size={18} className="text-pink-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {client.full_name || client.name}
                            </h4>
                            <div className="text-sm text-gray-500 space-y-1">
                              {client.phone && <p>{client.phone}</p>}
                              {client.email && <p>{client.email}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <User size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhum cliente encontrado</p>
                    <button
                      onClick={toggleClientMode}
                      className="text-pink-600 hover:text-pink-700 text-sm font-medium mt-2"
                    >
                      Criar novo cliente
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selected client display */}
            {clientData.id && !clientData.isNewClient && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-800">Cliente Selecionado</h4>
                    <p className="text-green-700">{clientData.name}</p>
                    {clientData.phone && <p className="text-sm text-green-600">{clientData.phone}</p>}
                    {clientData.email && <p className="text-sm text-green-600">{clientData.email}</p>}
                  </div>
                  <button
                    onClick={clearClient}
                    className="text-green-600 hover:text-green-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* New client creation mode */
          <div className="space-y-4">
            {/* Essential Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Cliente *
              </label>
              <input
                ref={firstInputRef}
                type="text"
                value={clientData.name}
                onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value, isNewClient: true }))}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                placeholder="Digite o nome do cliente"
                required
                autoComplete="name"
              />
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={clientData.phone}
                onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                placeholder="(11) 99999-9999"
                autoComplete="tel"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={clientData.email}
                onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                placeholder="cliente@email.com"
                autoComplete="email"
              />
            </div>

            {/* More fields toggle */}
            <button
              onClick={() => setShowMoreFields(!showMoreFields)}
              className="text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              {showMoreFields ? 'Menos campos' : 'Mais campos (opcional)'}
            </button>

            {/* Additional fields */}
            {showMoreFields && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={clientData.cpf}
                    onChange={(e) => setClientData(prev => ({ ...prev, cpf: formatCpf(e.target.value) }))}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                    placeholder="000.000.000-00"
                    maxLength="14"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={clientData.address_cep}
                    onChange={(e) => handleCepLookup(e.target.value)}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                    placeholder="00000-000"
                    maxLength="9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={clientData.address_street}
                    onChange={(e) => setClientData(prev => ({ ...prev, address_street: e.target.value }))}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                    placeholder="Rua, Avenida..."
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200">
        <button
          onClick={handleContinue}
          disabled={!(clientData.id || clientData.name.trim())}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
            (clientData.id || clientData.name.trim())
              ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {(clientData.id || clientData.name.trim())
            ? `Continuar com ${clientData.name || 'cliente selecionado'}`
            : 'Selecione ou crie um cliente'
          }
        </button>
      </div>
    </div>
  );
};

export default WizardClientScreen;