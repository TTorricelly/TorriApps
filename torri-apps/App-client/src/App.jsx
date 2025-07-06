import { useEffect } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ServicesPage from './pages/ServicesPage'
import AppointmentsPage from './pages/AppointmentsPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import SchedulingWizardPage from './pages/SchedulingWizardPage'
import ProfessionalDashboardPage from './pages/ProfessionalDashboardPage'
import ProfessionalAgendaPage from './pages/ProfessionalAgendaPage'
import ProfessionalMenuPage from './pages/ProfessionalMenuPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ClientFormPage from './pages/ClientFormPage'
import KanbanBoardPage from './pages/KanbanBoardPage'
import ComingSoonPage from './pages/ComingSoonPage'
import { useAuthStore } from './stores/authStore'
import { useViewModeStore } from './stores/viewModeStore'

// Helper function to check if user is professional
const isProfessionalRole = (role) => {
  return ['PROFISSIONAL', 'ATENDENTE', 'GESTOR'].includes(role);
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  const { tenantSlug } = useParams()
  const loginPath = tenantSlug ? `/${tenantSlug}/login` : '/login'
  return isAuthenticated ? children : <Navigate to={loginPath} replace />
}

// Role-based Route Component with View Mode Support
const RoleBasedRoute = ({ children, allowedRoles, professionalOnly = false }) => {
  const { isAuthenticated, user } = useAuthStore()
  const { currentMode } = useViewModeStore()
  const { tenantSlug } = useParams()
  
  if (!isAuthenticated) {
    const loginPath = tenantSlug ? `/${tenantSlug}/login` : '/login'
    return <Navigate to={loginPath} replace />
  }
  
  // For professional-only routes, check if user is professional and in professional mode
  if (professionalOnly) {
    const isProf = isProfessionalRole(user?.role)
    const inProfMode = currentMode === 'professional'
    
    if (!isProf || !inProfMode) {
      console.log('[RoleBasedRoute] Professional-only route access denied:', {
        userRole: user?.role,
        isProfessional: isProf,
        currentMode,
        route: 'professional-only'
      })
      const dashboardPath = tenantSlug ? `/${tenantSlug}/dashboard` : '/dashboard'
      return <Navigate to={dashboardPath} replace />
    }
    
    return children
  }
  
  // For role-based routes, check actual user roles
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Debug logging for role mismatch
    console.log('[RoleBasedRoute] Access denied:', {
      userRole: user?.role,
      allowedRoles,
      user: user
    })
    // If user role is not allowed, redirect to appropriate dashboard
    const redirectPath = isProfessionalRole(user?.role) ? 
      (tenantSlug ? `/${tenantSlug}/professional/dashboard` : "/professional/dashboard") : 
      (tenantSlug ? `/${tenantSlug}/dashboard` : "/dashboard")
    return <Navigate to={redirectPath} replace />
  }
  
  return children
}

function App() {
  const { isAuthenticated, validateStoredToken, user } = useAuthStore()
  const { currentMode } = useViewModeStore()

  // Validate token on app startup
  useEffect(() => {
    validateStoredToken()
  }, [])

  // Smart redirect based on user role and view mode
  const getDefaultRedirectPath = (tenantSlug = null) => {
    if (!isAuthenticated || !user) {
      return tenantSlug ? `/${tenantSlug}/login` : '/login'
    }
    
    // If user is a professional, check their current view mode
    if (isProfessionalRole(user.role)) {
      const basePath = currentMode === 'client' ? '/dashboard' : '/professional/dashboard'
      return tenantSlug ? `/${tenantSlug}${basePath}` : basePath
    }
    
    // Regular clients always go to client dashboard
    return tenantSlug ? `/${tenantSlug}/dashboard` : '/dashboard'
  }

  return (
    <div className="h-full w-full">
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to={getDefaultRedirectPath()} replace /> : <LoginPage />} 
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/:tenantSlug/login" element={<LoginPage />} />
        
        {/* Client Routes - Accessible by clients OR professionals in client mode */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/services" element={
          <ProtectedRoute>
            <ServicesPage />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/services" element={
          <ProtectedRoute>
            <ServicesPage />
          </ProtectedRoute>
        } />
        <Route path="/appointments" element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/appointments" element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/scheduling-wizard" element={
          <ProtectedRoute>
            <SchedulingWizardPage />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/scheduling-wizard" element={
          <ProtectedRoute>
            <SchedulingWizardPage />
          </ProtectedRoute>
        } />
        <Route path="/kanban" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <KanbanBoardPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/kanban" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <KanbanBoardPage />
          </RoleBasedRoute>
        } />
        
        {/* Professional Routes - Only accessible by salon staff in professional mode */}
        <Route path="/professional/dashboard" element={
          <RoleBasedRoute professionalOnly={true}>
            <ProfessionalDashboardPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/dashboard" element={
          <RoleBasedRoute professionalOnly={true}>
            <ProfessionalDashboardPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/agenda" element={
          <RoleBasedRoute professionalOnly={true}>
            <ProfessionalAgendaPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/agenda" element={
          <RoleBasedRoute professionalOnly={true}>
            <ProfessionalAgendaPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/menu" element={
          <RoleBasedRoute professionalOnly={true}>
            <ProfessionalMenuPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/menu" element={
          <RoleBasedRoute professionalOnly={true}>
            <ProfessionalMenuPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/kanban" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <KanbanBoardPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/kanban" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <KanbanBoardPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/clients" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientsPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/clients/new" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientFormPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/clients/:clientId" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientDetailPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/clients/:clientId/edit" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientFormPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/clients" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientsPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/clients/new" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientFormPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/clients/:clientId" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientDetailPage />
          </RoleBasedRoute>
        } />
        <Route path="/:tenantSlug/professional/clients/:clientId/edit" element={
          <RoleBasedRoute allowedRoles={['ATENDENTE', 'GESTOR']} professionalOnly={true}>
            <ClientFormPage />
          </RoleBasedRoute>
        } />
        
        {/* Shared Routes - Accessible by all authenticated users */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/profile/edit" element={
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/profile/edit" element={
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        } />
        
        {/* Coming Soon Page for unimplemented features */}
        <Route path="/coming-soon" element={
          <ProtectedRoute>
            <ComingSoonPage />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/coming-soon" element={
          <ProtectedRoute>
            <ComingSoonPage />
          </ProtectedRoute>
        } />
        
        {/* Catch-all redirect */}
        <Route path="*" element={
          <Navigate to={getDefaultRedirectPath()} replace />
        } />
      </Routes>
    </div>
  )
}

export default App