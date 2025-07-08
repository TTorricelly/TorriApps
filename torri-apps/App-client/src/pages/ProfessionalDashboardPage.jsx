/**
 * ProfessionalDashboardPage Component
 * Dashboard for salon staff (professionals, receptionists, managers)
 * Features: Today's appointments, quick actions, professional tools
 */

import React, { useState, useEffect } from 'react';
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';
import { useAuthStore } from '../stores/authStore';
import dashboardService from '../services/dashboardService';
import { 
  Calendar, 
  Clock, 
  Users, 
  Bell,
  CheckSquare,
  DollarSign,
  User
} from 'lucide-react';

const ProfessionalDashboardPage = () => {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardService.getTodayStats();
        setDashboardData(data);
      } catch (err) {
        setError(err.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);



  // Render welcome header
  const renderWelcomeHeader = () => (
    <div className="safe-area-top bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary-400 rounded-full flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Olá, {user?.fullName?.split(' ')[0] || 'Colaborador'}!
            </h1>
          </div>
        </div>
        <button className="p-2 bg-primary-400 rounded-full hover:bg-primary-300 transition-smooth">
          <Bell size={20} className="text-white" />
        </button>
      </div>
    </div>
  );

  // Render quick stats
  const renderQuickStats = () => {
    
    return (
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
              <p className="text-xl font-bold text-gray-900">
                {loading ? '...' : dashboardData?.appointments || 0}
              </p>
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
              <p className="text-xl font-bold text-gray-900">
                {loading ? '...' : dashboardData?.completed || 0}
              </p>
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
              <p className="text-xl font-bold text-gray-900">
                {loading ? '...' : dashboardData?.clients || 0}
              </p>
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
              <p className="text-xl font-bold text-gray-900">
                {loading ? '...' : dashboardData?.revenue || 'R$ 0,00'}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  };

  // Render next appointments
  const renderNextAppointments = () => (
    <div className="px-6 pb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Próximos Agendamentos</h2>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-500 text-center">Carregando agendamentos...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-red-500 text-center">Erro ao carregar agendamentos</p>
          </div>
        ) : dashboardData?.nextAppointments && dashboardData.nextAppointments.length > 0 ? (
          dashboardData.nextAppointments.map((appointment, index) => (
            <div key={appointment.id || index} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{appointment.service}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  appointment.status === 'Confirmado' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'Em Andamento' ? 'bg-amber-100 text-amber-800' :
                  appointment.status === 'Agendado' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'Encaixe' ? 'bg-purple-100 text-purple-800' :
                  appointment.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' :
                  appointment.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {appointment.status}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{appointment.time}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User size={14} />
                  <span>{appointment.client}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-500 text-center">Nenhum agendamento próximo</p>
          </div>
        )}
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
            {error && (
              <div className="px-6 py-4">
                <div className="bg-red-100 border border-red-300 rounded-xl p-4 mb-4">
                  <p className="text-red-700 text-sm">
                    ⚠️ {error}
                  </p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-2 text-red-600 text-sm font-medium hover:text-red-700"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}
            {renderQuickStats()}
            {renderNextAppointments()}
          </div>
        </div>
      </div>
      <ProfessionalBottomNavigation />
    </div>
  );
};

export default ProfessionalDashboardPage;