import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@material-tailwind/react';

// Import layouts and page components using aliases
import { MainLayout, AuthLayout, RequireAuth } from '@components';
import { Dashboard, ServicesRoutes, AppointmentsRoutes, UsersRoutes, Login, NotFound } from '@pages';
// import { useAuth } from '@hooks/useAuth'; // Will be used for RequireAuth logic if needed directly or via store

function App() {
  // const { fetchUser } = useAuth(); // Example: if initial user fetch is triggered here

  // React.useEffect(() => {
  //   fetchUser(); // Fetch user on initial app load - actual call might be in useAuth or a global init
  // }, [fetchUser]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Protected Routes */}
          <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="services/*" element={<ServicesRoutes />} />
            <Route path="appointments/*" element={<AppointmentsRoutes />} />
            <Route path="users/*" element={<UsersRoutes />} />
          </Route>

          {/* Public Routes (e.g., Login) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Catch-all for Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
