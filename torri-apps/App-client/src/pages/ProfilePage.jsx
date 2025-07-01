import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';
import { useAuthStore } from '../stores/authStore';
import { useViewModeStore } from '../stores/viewModeStore';
import { getUserProfile } from '../services/userService';
import { User, Mail, Phone, LogOut, Settings, HelpCircle, Edit, Calendar, MapPin, CreditCard } from 'lucide-react';
import { formatCpf, formatAddressForDisplay } from '../utils/brazilianUtils';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, setProfile, isProfessional } = useAuthStore();
  const { isProfessionalMode } = useViewModeStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const profileData = await getUserProfile();
      if (profileData) {
        setProfile(profileData);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []); // Empty dependency array - only run once on mount

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto mobile-scroll">
          {/* Header */}
          <div className="safe-area-top bg-pink-500 px-6 py-6">
            <h1 className="text-2xl font-bold text-white">Perfil</h1>
            <p className="text-pink-100">Suas informações e configurações</p>
          </div>

          {/* Main Content */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p>Loading...</p>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-6 py-8 min-h-0 pb-24">
              {/* User Info */}
              <div className="relative text-center mb-8">
                <button
                  onClick={() => navigate('/profile/edit')}
                  className="absolute top-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                >
                  <Edit size={20} className="text-pink-500" />
                </button>
                <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-pink-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {user?.fullName || user?.name || 'Usuário'}
                </h2>
                <p className="text-gray-500">{user?.email}</p>
              </div>

              {/* User Details */}
              <div className="space-y-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <Mail size={20} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-800">{user?.email || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <Phone size={20} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Telefone</p>
                      <p className="text-gray-800">{user?.phone_number || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                

                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">💇</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Tipo de Cabelo</p>
                      <p className="text-gray-800 capitalize">{user?.hair_type || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <User size={20} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Gênero</p>
                      <p className="text-gray-800 capitalize">{user?.gender || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar size={20} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Data de Nascimento</p>
                      <p className="text-gray-800">{user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                {/* CPF Section */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <CreditCard size={20} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">CPF</p>
                      <p className="text-gray-800">{user?.cpf ? formatCpf(user.cpf) : 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <MapPin size={20} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Endereço</p>
                      {user?.address_street || user?.address_city || user?.address_cep ? (
                        <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                          {formatAddressForDisplay(user)}
                        </div>
                      ) : (
                        <p className="text-gray-800">Não informado</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              {/* Menu Options */}
              <div className="space-y-3 mb-8 mt-6">
                <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-smooth">
                  <div className="flex items-center space-x-3">
                    <Settings size={20} className="text-gray-400" />
                    <span className="text-gray-800">Configurações</span>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-smooth">
                  <div className="flex items-center space-x-3">
                    <HelpCircle size={20} className="text-gray-400" />
                    <span className="text-gray-800">Ajuda e Suporte</span>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 hover:bg-red-100 transition-smooth"
              >
                <LogOut size={20} />
                <span className="font-medium">Sair da Conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Show appropriate navigation based on user type and current mode */}
      {isProfessional() && isProfessionalMode() ? (
        <ProfessionalBottomNavigation />
      ) : (
        <BottomNavigation />
      )}
    </div>
  )
}

export default ProfilePage