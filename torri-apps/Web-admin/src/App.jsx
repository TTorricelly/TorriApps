import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { ThemeProvider } from '@material-tailwind/react';
import { getTenantInfo } from './Utils/apiHelpers';
import VersionChecker from './Utils/versionCheck';

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
  LabelsPage,
  SettingsPage,
  SalonProfilePage,
  Login
} from './Pages';
import ClientsPage from './Pages/Clients/ClientsPage.jsx'; // Import ClientsPage (default import)
import ClientForm from './Pages/Clients/ClientForm.jsx'; // Import ClientForm
import DailySchedulePage from './Pages/Appointments/DailySchedulePage.jsx'; // Import DailySchedulePage
import KanbanPage from './Pages/Appointments/KanbanPage.jsx'; // Import KanbanPage
import CommissionsPage from './Pages/Commissions/CommissionsPage.jsx'; // Import CommissionsPage
import UsersPage from './Pages/Users/UsersPage.jsx'; // Import UsersPage
import UserForm from './Pages/Users/UserForm.jsx'; // Import UserForm
// SalonProfilePage imported from ./Pages index

// Placeholder components for new routes
const AppointmentCalendar = () => <div className="p-6">Agenda - Em desenvolvimento</div>;
const AppointmentHistory = () => <div className="p-6">Histórico de Agendamentos - Em desenvolvimento</div>;
const ProfessionalsAvailability = () => <div className="p-6">Disponibilidades - Em desenvolvimento</div>;
// const ClientsList = () => <div className="p-6">Lista de Clientes - Em desenvolvimento</div>; // Remove placeholder
// SalonProfile component moved to separate file
const Billing = () => <div className="p-6">Plano & Pagamento - Em desenvolvimento</div>;

function App() {
  // Check if we're using domain-based tenant detection
  const tenantInfo = getTenantInfo();
  const isDomainBased = tenantInfo?.method === 'domain';

  // Initialize version checker (use global singleton)
  useEffect(() => {
    // Use the global instance instead of creating a new one
    if (window.versionChecker) {
      window.versionChecker.startVersionCheck();

      // Cleanup on unmount
      return () => {
        window.versionChecker.stopVersionCheck();
      };
    }
  }, []);
  
  // Shared route definitions
  const sharedRoutes = (
    <>
      {/* Public Routes within tenant context */}
      <Route path="login" element={<AuthLayout />}>
        <Route index element={<Login />} />
      </Route>
      
      {/* Protected Routes with Tenant Context */}
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        {/* Dashboard Routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        
        {/* Appointments Routes */}
        <Route path="appointments/calendar" element={<AppointmentCalendar />} />
        <Route path="appointments/history" element={<AppointmentHistory />} />
        <Route path="appointments/daily-schedule" element={<DailySchedulePage />} />
        <Route path="appointments/kanban" element={<KanbanPage />} />
        <Route path="appointments/*" element={<AppointmentsRoutes />} />
        
        {/* Services Routes */}
        <Route path="services/*" element={<ServicesRoutes />} />
        
        {/* Labels Routes */}
        <Route path="labels" element={<LabelsPage />} />
        
        {/* Professionals Routes */}
        <Route path="professionals" element={<ProfessionalsPage />} />
        <Route path="professionals/team" element={<ProfessionalsPage />} />
        <Route path="professionals/create" element={<ProfessionalForm />} />
        <Route path="professionals/edit/:professionalId" element={<ProfessionalForm />} />
        <Route path="professionals/availability" element={<ProfessionalsAvailability />} />
        
        {/* Clients Routes */}
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/create" element={<ClientForm />} />
        <Route path="clients/edit/:clientId" element={<ClientForm />} />
        
        {/* Commissions Routes */}
        <Route path="commissions" element={<CommissionsPage />} />
        
        {/* Stations Routes */}
        <Route path="stations/types" element={<StationTypesPage />} />
        <Route path="stations" element={<StationsPage />} />
        
        {/* Settings Routes */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/salon-profile" element={<SalonProfilePage />} />
        <Route path="settings/users" element={<UsersPage />} />
        <Route path="settings/users/create" element={<UserForm />} />
        <Route path="settings/users/edit/:userId" element={<UserForm />} />
        <Route path="settings/billing" element={<Billing />} />
        
        {/* Legacy Routes */}
        <Route path="users/*" element={<UsersRoutes />} />
      </Route>
    </>
  );
  
  return (
    <ThemeProvider>
      <Routes>
        {/* Domain-based tenant routes (no slug in URL) */}
        {isDomainBased && (
          <Route path="/">
            {sharedRoutes}
          </Route>
        )}
        
        {/* Slug-based tenant routes */}
        <Route path="/:tenantSlug">
          {sharedRoutes}
        </Route>

        {/* Fallback: Redirect root to dashboard for domain-based or default tenant for slug-based */}
        {!isDomainBased && (
          <Route path="/" element={<Navigate to="/test-salon/dashboard" replace />} />
        )}

        {/* Catch-all: Redirect to login based on tenant type */}
        <Route path="*" element={
          isDomainBased ? 
            <Navigate to="/login" replace /> : 
            <Navigate to="/test-salon/login" replace />
        } />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
