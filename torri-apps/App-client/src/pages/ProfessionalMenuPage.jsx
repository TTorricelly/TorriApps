/**
 * ProfessionalMenuPage Component
 * Admin menu for salon management features
 * 
 * Features:
 * - Service management (Categories, Catalog)
 * - Team management (Professionals)
 * - Station management (Types, Stations)
 * - Financial (Commissions)
 * - Settings (Company Profile, Users)
 * - User Profile
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useViewModeStore } from '../stores/viewModeStore';
import { 
  User,
  Scissors,
  FolderOpen,
  Palette,
  Users,
  MapPin,
  Settings,
  DollarSign,
  Building2,
  UserCog,
  ChevronRight,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  LogOut
} from 'lucide-react';

import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';

const ProfessionalMenuPage = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const { currentMode, toggleViewMode } = useViewModeStore();

  // Menu sections with their options
  const menuSections = [
    {
      id: 'services',
      title: 'Serviços',
      icon: Scissors,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      items: [
        {
          label: 'Categorias',
          path: '/coming-soon',
          icon: FolderOpen
        },
        {
          label: 'Catálogo de Serviços',
          path: '/coming-soon',
          icon: Palette
        }
      ]
    },
    {
      id: 'professionals',
      title: 'Profissionais',
      icon: Users,
      color: 'bg-green-50 border-green-200 text-green-700',
      items: [
        {
          label: 'Equipe',
          path: '/coming-soon',
          icon: Users
        }
      ]
    },
    {
      id: 'stations',
      title: 'Estações',
      icon: MapPin,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      items: [
        {
          label: 'Tipo de Estação',
          path: '/coming-soon',
          icon: Settings
        },
        {
          label: 'Estações',
          path: '/coming-soon',
          icon: MapPin
        }
      ]
    },
    {
      id: 'financial',
      title: 'Financeiro',
      icon: DollarSign,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      items: [
        {
          label: 'Comissões',
          path: '/coming-soon',
          icon: DollarSign
        }
      ]
    },
    {
      id: 'settings',
      title: 'Configurações',
      icon: Settings,
      color: 'bg-gray-50 border-gray-200 text-gray-700',
      items: [
        {
          label: 'Perfil da Empresa',
          path: '/coming-soon',
          icon: Building2
        },
        {
          label: 'Usuários',
          path: '/coming-soon',
          icon: UserCog
        }
      ]
    },
    {
      id: 'profile',
      title: 'Perfil',
      icon: User,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      items: [
        {
          label: 'Meu Perfil',
          path: '/profile',
          icon: User
        }
      ]
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleBack = () => {
    navigate('/professional/dashboard');
  };

  const handleModeToggle = () => {
    if (currentMode === 'professional') {
      toggleViewMode(); // This switches to client mode
      navigate('/dashboard'); // Go to client dashboard
    } else {
      toggleViewMode(); // This switches to professional mode  
      navigate('/professional/dashboard'); // Go to professional dashboard
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Menu Administrativo</h1>
        </div>
      </div>

      {/* Menu Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-6">
          {menuSections.map((section) => {
            const SectionIcon = section.icon;
            
            return (
              <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Section Header */}
                <div className={`flex items-center space-x-3 p-4 border-b border-gray-100 ${section.color} rounded-t-xl`}>
                  <SectionIcon size={24} />
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                </div>
                
                {/* Section Items */}
                <div className="divide-y divide-gray-100">
                  {section.items.map((item, index) => {
                    const ItemIcon = item.icon;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleNavigation(item.path)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <ItemIcon size={20} className="text-gray-500" />
                          <span className="text-gray-900 font-medium">{item.label}</span>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mode Switch and Logout Section */}
        <div className="mt-6 space-y-4">
          {/* Mode Switch */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={handleModeToggle}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {currentMode === 'professional' ? (
                  <ToggleRight size={20} className="text-pink-500" />
                ) : (
                  <ToggleLeft size={20} className="text-gray-500" />
                )}
                <div className="text-left">
                  <span className="text-gray-900 font-medium block">
                    {currentMode === 'professional' ? 'Modo Profissional' : 'Modo Cliente'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Toque para alternar para {currentMode === 'professional' ? 'modo cliente' : 'modo profissional'}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Logout */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <LogOut size={20} className="text-red-500" />
                <div className="text-left">
                  <span className="text-gray-900 font-medium block">Sair</span>
                  <span className="text-sm text-gray-500">Desconectar da conta</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
          {/* Add bottom padding for navigation */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Bottom Navigation - Fixed */}
      <div className="flex-shrink-0">
        <ProfessionalBottomNavigation />
      </div>
    </div>
  );
};

export default ProfessionalMenuPage;