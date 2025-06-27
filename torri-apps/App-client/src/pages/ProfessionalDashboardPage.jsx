/**
 * ProfessionalDashboardPage Component
 * Dashboard for salon staff (professionals, receptionists, managers)
 * Features: Today's appointments, quick actions, professional tools
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';
import { useAuthStore } from '../stores/authStore';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp,
  Bell,
  Settings,
  CheckSquare,
  DollarSign,
  User
} from 'lucide-react';

const ProfessionalDashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Format current time
  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format current date
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Get user role display name
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'professional':
        return 'Profissional';
      case 'receptionist':
        return 'Recepcionista';
      case 'manager':
        return 'Gerente';
      case 'admin':
        return 'Administrador';
      default:
        return 'Colaborador';
    }
  };

  // Render welcome header
  const renderWelcomeHeader = () => (
    <div className="safe-area-top bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Olá, {user?.fullName?.split(' ')[0] || 'Colaborador'}!
            </h1>
            <p className="text-pink-100 text-sm">
              {getRoleDisplayName(user?.role)}
            </p>
          </div>
        </div>
        <button className="p-2 bg-pink-400 rounded-full hover:bg-pink-300 transition-smooth">
          <Bell size={20} className="text-white" />
        </button>
      </div>
      
      {/* Date and time */}
      <div className="bg-pink-400 rounded-xl p-4">
        <p className="text-white font-medium capitalize">
          {formatDate(currentTime)}
        </p>
        <p className="text-pink-100 text-sm">
          {formatTime(currentTime)}
        </p>
      </div>
    </div>
  );

  // Render quick stats
  const renderQuickStats = () => (
    <div className="px-6 py-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Hoje</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Agendamentos</p>
              <p className="text-xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckSquare size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Concluídos</p>
              <p className="text-xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Clientes</p>
              <p className="text-xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Faturamento</p>
              <p className="text-xl font-bold text-gray-900">R$ 420</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render next appointments
  const renderNextAppointments = () => (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Próximos Agendamentos</h2>
        <button className="text-pink-600 text-sm font-medium">Ver todos</button>
      </div>
      
      <div className="space-y-3">
        {/* Sample appointment card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Corte de Cabelo</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Confirmado
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>14:30</span>
            </div>
            <div className="flex items-center space-x-1">
              <User size={14} />
              <span>Maria Silva</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Escova Progressiva</h3>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
              Em andamento
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>15:00</span>
            </div>
            <div className="flex items-center space-x-1">
              <User size={14} />
              <span>Ana Costa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render quick actions
  const renderQuickActions = () => (
    <div className="px-6 pb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/professional/agenda')}
          className="bg-pink-500 text-white p-4 rounded-xl text-center hover:bg-pink-600 transition-smooth"
        >
          <Calendar size={24} className="mx-auto mb-2" />
          <span className="text-sm font-medium">Ver Agenda</span>
        </button>
        
        <button 
          onClick={() => navigate('/professional/clients')}
          className="bg-blue-500 text-white p-4 rounded-xl text-center hover:bg-blue-600 transition-smooth"
        >
          <Users size={24} className="mx-auto mb-2" />
          <span className="text-sm font-medium">Clientes</span>
        </button>
        
        <button className="bg-green-500 text-white p-4 rounded-xl text-center hover:bg-green-600 transition-smooth">
          <TrendingUp size={24} className="mx-auto mb-2" />
          <span className="text-sm font-medium">Relatórios</span>
        </button>
        
        <button className="bg-gray-500 text-white p-4 rounded-xl text-center hover:bg-gray-600 transition-smooth">
          <Settings size={24} className="mx-auto mb-2" />
          <span className="text-sm font-medium">Configurações</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto mobile-scroll">
          {renderWelcomeHeader()}
          
          {/* Main Content */}
          <div className="flex-1 bg-gray-50 rounded-t-3xl -mt-4 min-h-0">
            {renderQuickStats()}
            {renderNextAppointments()}
            {renderQuickActions()}
          </div>
        </div>
      </div>
      <ProfessionalBottomNavigation />
    </div>
  );
};

export default ProfessionalDashboardPage;