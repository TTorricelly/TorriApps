import React from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'
import { useAuthStore } from '../stores/authStore'
import { User, Mail, Phone, LogOut, Settings, HelpCircle } from 'lucide-react'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
          <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-6 py-8 min-h-0">
            {/* User Info */}
            <div className="text-center mb-8">
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
                  <User size={20} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Função</p>
                    <p className="text-gray-800 capitalize">{user?.role || 'Cliente'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="space-y-3 mb-8">
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
        </div>
      </div>
      <BottomNavigation />
    </div>
  )
}

export default ProfilePage