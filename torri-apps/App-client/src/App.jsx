import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ServicesPage from './pages/ServicesPage'
import AppointmentsPage from './pages/AppointmentsPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import SchedulingWizardPage from './pages/SchedulingWizardPage'
import ProfessionalDashboardPage from './pages/ProfessionalDashboardPage'
import ProfessionalAgendaPage from './pages/ProfessionalAgendaPage'
import RoleDebugger from './components/RoleDebugger'
import { useAuthStore } from './stores/authStore'

// Helper function to check if user is professional
const isProfessionalRole = (role) => {
  return ['professional', 'receptionist', 'manager', 'admin'].includes(role);
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Role-based Route Component
const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // If user role is not allowed, redirect to appropriate dashboard
    return <Navigate to={isProfessionalRole(user?.role) ? "/professional/dashboard" : "/dashboard"} replace />
  }
  
  return children
}

function App() {
  const { isAuthenticated, validateStoredToken, user } = useAuthStore()

  // Validate token on app startup
  useEffect(() => {
    validateStoredToken()
  }, [])

  // Smart redirect based on user role
  const getDefaultRedirectPath = () => {
    if (!isAuthenticated || !user) return '/login'
    return isProfessionalRole(user.role) ? '/professional/dashboard' : '/dashboard'
  }

  return (
    <div className="h-full w-full">
      {/* Role Debugger for development testing */}
      <RoleDebugger />
      
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to={getDefaultRedirectPath()} replace /> : <LoginPage />} 
        />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Client Routes - Only accessible by clients */}
        <Route path="/dashboard" element={
          <RoleBasedRoute allowedRoles={['client']}>
            <DashboardPage />
          </RoleBasedRoute>
        } />
        <Route path="/services" element={
          <RoleBasedRoute allowedRoles={['client']}>
            <ServicesPage />
          </RoleBasedRoute>
        } />
        <Route path="/appointments" element={
          <RoleBasedRoute allowedRoles={['client']}>
            <AppointmentsPage />
          </RoleBasedRoute>
        } />
        <Route path="/scheduling-wizard" element={
          <RoleBasedRoute allowedRoles={['client']}>
            <SchedulingWizardPage />
          </RoleBasedRoute>
        } />
        
        {/* Professional Routes - Only accessible by salon staff */}
        <Route path="/professional/dashboard" element={
          <RoleBasedRoute allowedRoles={['professional', 'receptionist', 'manager', 'admin']}>
            <ProfessionalDashboardPage />
          </RoleBasedRoute>
        } />
        <Route path="/professional/agenda" element={
          <RoleBasedRoute allowedRoles={['professional', 'receptionist', 'manager', 'admin']}>
            <ProfessionalAgendaPage />
          </RoleBasedRoute>
        } />
        
        {/* Shared Routes - Accessible by all authenticated users */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/profile/edit" element={
          <ProtectedRoute>
            <EditProfilePage />
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