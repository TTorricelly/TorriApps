import React from "react";
import { CalendarDaysIcon, UsersIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  // Mock data - in real app this would come from API
  const stats = [
    {
      title: "Agendamentos Hoje",
      value: "12",
      icon: CalendarDaysIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Clientes Ativos",
      value: "248",
      icon: UsersIcon,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Próximo Agendamento",
      value: "14:30",
      icon: ClockIcon,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Receita do Mês",
      value: "R$ 12.450",
      icon: CurrencyDollarIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  const todayAppointments = [
    { time: "09:00", client: "Maria Silva", service: "Corte + Escova", professional: "Ana" },
    { time: "10:30", client: "João Santos", service: "Corte Masculino", professional: "Carlos" },
    { time: "14:30", client: "Fernanda Costa", service: "Coloração", professional: "Beatriz" },
    { time: "16:00", client: "Pedro Oliveira", service: "Barba", professional: "Carlos" }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-gray-600 mt-2">Bem-vindo ao painel administrativo</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Agenda de Hoje</h2>
        </div>
        <div className="p-6">
          {todayAppointments.length > 0 ? (
            <div className="space-y-4">
              {todayAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-gray-900 w-16">
                      {appointment.time}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appointment.client}</p>
                      <p className="text-sm text-gray-600">{appointment.service}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {appointment.professional}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum agendamento para hoje</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              Novo Agendamento
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              Cadastrar Cliente
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              Ver Relatórios
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Semanal</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Agendamentos</span>
              <span className="text-sm font-medium">67</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Novos Clientes</span>
              <span className="text-sm font-medium">8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Receita</span>
              <span className="text-sm font-medium">R$ 3.240</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Sistema</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Sistema Online</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Backup Atualizado</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-yellow-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Sincronização Mobile</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
