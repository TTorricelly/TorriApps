import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { ThemeProvider } from '@material-tailwind/react';

import { MainLayout, AuthLayout, RequireAuth } from './Components'; 
import {
  Dashboard,
  ServicesRoutes,
  AppointmentsRoutes,
  UsersRoutes,
  ProfessionalsPage,
  ProfessionalForm,
  StationTypesPage,
  StationsPage,
  SettingsPage,
  SalonProfilePage,
  Login
} from './Pages';
import ClientsPage from './Pages/Clients/ClientsPage.jsx'; // Import ClientsPage (default import)
import ClientForm from './Pages/Clients/ClientForm.jsx'; // Import ClientForm
import DailySchedulePage from './Pages/Appointments/DailySchedulePage.jsx'; // Import DailySchedulePage
import CommissionsPage from './Pages/Commissions/CommissionsPage.jsx'; // Import CommissionsPage
// SalonProfilePage imported from ./Pages index

// Placeholder components for new routes
const AppointmentCalendar = () => <div className="p-6">Agenda - Em desenvolvimento</div>;
const AppointmentHistory = () => <div className="p-6">Histórico de Agendamentos - Em desenvolvimento</div>;
const ProfessionalsAvailability = () => <div className="p-6">Disponibilidades - Em desenvolvimento</div>;
// const ClientsList = () => <div className="p-6">Lista de Clientes - Em desenvolvimento</div>; // Remove placeholder
// SalonProfile component moved to separate file
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
          <Route path="/appointments/daily-schedule" element={<DailySchedulePage />} />
          <Route path="appointments/*" element={<AppointmentsRoutes />} />
          
          {/* Services Routes */}
          <Route path="services/*" element={<ServicesRoutes />} />
          
          {/* Professionals Routes */}
          <Route path="/professionals" element={<ProfessionalsPage />} />
          <Route path="/professionals/team" element={<ProfessionalsPage />} />
          <Route path="/professionals/create" element={<ProfessionalForm />} />
          <Route path="/professionals/edit/:professionalId" element={<ProfessionalForm />} />
          <Route path="/professionals/availability" element={<ProfessionalsAvailability />} />
          
          {/* Clients Routes */}
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/create" element={<ClientForm />} />
          <Route path="/clients/edit/:clientId" element={<ClientForm />} />
          
          {/* Commissions Routes */}
          <Route path="/commissions" element={<CommissionsPage />} />
          
          {/* Stations Routes */}
          <Route path="/stations/types" element={<StationTypesPage />} />
          <Route path="/stations" element={<StationsPage />} />
          
          {/* Settings Routes */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/salon-profile" element={<SalonProfilePage />} />
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
