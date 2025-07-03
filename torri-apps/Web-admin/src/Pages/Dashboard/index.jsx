import React, { useState, useEffect } from "react";
import { CalendarDaysIcon, UsersIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import LabelDistribution from '../../Components/Dashboard/LabelDistribution';
import { dashboardApi } from '../../Services/dashboardApi';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.getDashboardStats();
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format currency for display
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Build stats array from real data
  const getStats = () => {
    if (!dashboardData) return [];
    
    return [
      {
        title: "Agendamentos Hoje",
        value: dashboardData.todayAppointmentsCount?.toString() || "0",
        icon: CalendarDaysIcon,
        color: "text-accent-primary"
      },
      {
        title: "Clientes Ativos",
        value: dashboardData.activeClientsCount?.toString() || "0",
        icon: UsersIcon,
        color: "text-status-success"
      },
      {
        title: "Próximo Agendamento",
        value: dashboardData.nextAppointmentTime || "--:--",
        icon: ClockIcon,
        color: "text-status-warning"
      },
      {
        title: "Receita do Mês",
        value: formatCurrency(dashboardData.monthlyRevenue || 0),
        icon: CurrencyDollarIcon,
        color: "text-accent-secondary"
      }
    ];
  };

  const stats = getStats();
  const todayAppointments = dashboardData?.todayAppointmentsList || [];

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-l">
        <div className="mb-xl">
          <h1 className="text-h1 font-bold text-text-primary">Visão Geral</h1>
          <p className="text-body text-text-secondary mt-xs">Carregando dados do dashboard...</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-l">
        <div className="mb-xl">
          <h1 className="text-h1 font-bold text-text-primary">Visão Geral</h1>
          <p className="text-body text-text-secondary mt-xs">Bem-vindo ao painel administrativo</p>
        </div>
        <div className="bg-bg-secondary rounded-card shadow-card border border-red-300 p-l">
          <div className="text-center">
            <p className="text-red-600 mb-m">❌ Erro ao carregar dados do dashboard</p>
            <p className="text-small text-text-secondary mb-m">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-m py-s bg-accent-primary text-white rounded-button hover:bg-accent-primary-dark transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-l">
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-h1 font-bold text-text-primary">Visão Geral</h1>
        <p className="text-body text-text-secondary mt-xs">Bem-vindo ao painel administrativo</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-l">
        {stats.map((stat, index) => (
          <div key={index} className="bg-bg-secondary rounded-card shadow-card border border-bg-tertiary p-l hover:shadow-card-hover transition-shadow duration-normal">
            <div className="flex items-center">
              <div className="p-s rounded-button bg-bg-tertiary">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-m">
                <p className="text-small font-medium text-text-secondary">{stat.title}</p>
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="bg-bg-secondary rounded-card shadow-card border border-bg-tertiary">
        <div className="p-l border-b border-bg-tertiary">
          <h2 className="text-h2 font-semibold text-text-primary">Agenda de Hoje</h2>
        </div>
        <div className="p-l">
          {todayAppointments.length > 0 ? (
            <div className="space-y-m">
              {todayAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between p-m bg-bg-tertiary rounded-button hover:bg-bg-primary transition-colors duration-fast">
                  <div className="flex items-center space-x-m">
                    <div className="text-small font-medium text-accent-primary w-16">
                      {appointment.time}
                    </div>
                    <div>
                      <p className="text-small font-medium text-text-primary">{appointment.client}</p>
                      <p className="text-small text-text-secondary">{appointment.service}</p>
                    </div>
                  </div>
                  <div className="text-small text-text-secondary">
                    {appointment.professional}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-tertiary text-center py-xl">Nenhum agendamento para hoje</p>
          )}
        </div>
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-l">
        {/* Label Distribution Chart */}
        <LabelDistribution />

        {/* Quick Actions and Stats */}
        <div className="space-y-l">
          <div className="bg-bg-secondary rounded-card shadow-card border border-bg-tertiary p-l">
            <h3 className="text-h3 font-semibold text-text-primary mb-m">Ações Rápidas</h3>
            <div className="space-y-s">
              <button className="w-full text-left px-m py-xs text-small text-accent-primary hover:bg-bg-tertiary rounded-button transition-colors duration-fast">
                Novo Agendamento
              </button>
              <button className="w-full text-left px-m py-xs text-small text-accent-primary hover:bg-bg-tertiary rounded-button transition-colors duration-fast">
                Cadastrar Cliente
              </button>
              <button className="w-full text-left px-m py-xs text-small text-accent-primary hover:bg-bg-tertiary rounded-button transition-colors duration-fast">
                Ver Relatórios
              </button>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-card shadow-card border border-bg-tertiary p-l">
            <h3 className="text-h3 font-semibold text-text-primary mb-m">Resumo Semanal</h3>
            <div className="space-y-s">
              <div className="flex justify-between">
                <span className="text-small text-text-secondary">Agendamentos</span>
                <span className="text-small font-medium text-text-primary">
                  {dashboardData?.weeklySummary?.appointments || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-small text-text-secondary">Novos Clientes</span>
                <span className="text-small font-medium text-text-primary">
                  {dashboardData?.weeklySummary?.newClients || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-small text-text-secondary">Receita</span>
                <span className="text-small font-medium text-text-primary">
                  {formatCurrency(dashboardData?.weeklySummary?.revenue || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-card shadow-card border border-bg-tertiary p-l">
            <h3 className="text-h3 font-semibold text-text-primary mb-m">Status do Sistema</h3>
            <div className="space-y-s">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-status-success rounded-full mr-s"></div>
                <span className="text-small text-text-secondary">Sistema Online</span>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-status-success rounded-full mr-s"></div>
                <span className="text-small text-text-secondary">Backup Atualizado</span>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-status-warning rounded-full mr-s"></div>
                <span className="text-small text-text-secondary">Sincronização Mobile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
