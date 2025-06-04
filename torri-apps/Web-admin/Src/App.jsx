import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { ThemeProvider } from '@material-tailwind/react';

import { MainLayout, AuthLayout, RequireAuth } from './Components'; 
import { Dashboard, ServicesRoutes, AppointmentsRoutes, UsersRoutes, ProfessionalsRoutes, Login } from './Pages';

// Placeholder components for new routes
const AppointmentCalendar = () => <div className="p-6">Agenda - Em desenvolvimento</div>;
const AppointmentHistory = () => <div className="p-6">Histórico de Agendamentos - Em desenvolvimento</div>;
// Placeholder for availability section
const ProfessionalsAvailability = () => <div className="p-6">Disponibilidades - Em desenvolvimento</div>;
const ClientsList = () => <div className="p-6">Lista de Clientes - Em desenvolvimento</div>;
const SalonProfile = () => <div className="p-6">Perfil do Salão - Em desenvolvimento</div>;
const SettingsUsers = () => <div className="p-6">Usuários - Em desenvolvimento</div>;
const Billing = () => <div className="p-6">Plano & Pagamento - Em desenvolvimento</div>;

function App() {
  return (
    <ThemeProvider>
      <Routes>
        {/* Protected Routes */}
        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Appointments Routes */}
          <Route path="/appointments/calendar" element={<AppointmentCalendar />} />
          <Route path="/appointments/history" element={<AppointmentHistory />} />
          <Route path="appointments/*" element={<AppointmentsRoutes />} />
          
          {/* Services Routes */}
          <Route path="services/*" element={<ServicesRoutes />} />
          
          {/* Professionals Routes */}
          <Route path="professionals/*" element={<ProfessionalsRoutes />} />
          <Route path="/professionals/availability" element={<ProfessionalsAvailability />} />
          
          {/* Clients Routes */}
          <Route path="/clients/list" element={<ClientsList />} />
          
          {/* Settings Routes */}
          <Route path="/settings/salon-profile" element={<SalonProfile />} />
          <Route path="/settings/users" element={<SettingsUsers />} />
          <Route path="/settings/billing" element={<Billing />} />
          
          {/* Legacy Routes */}
          <Route path="users/*" element={<UsersRoutes />} />
        </Route>

        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Catch-all: Redirect to /login for unknown paths */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
