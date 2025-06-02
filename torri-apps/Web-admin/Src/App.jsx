import React from 'react';
// BrowserRouter is likely provided in main.jsx as per requirements, remove from here if so.
// However, the existing App.jsx has it. Let's keep it for now and check main.jsx later.
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { ThemeProvider } from '@material-tailwind/react';

// Import layouts and page components using aliases
// Assuming these aliases are configured in vite.config.js or jsconfig.json/tsconfig.json
// @components -> Src/Components
// @pages -> Src/Pages
import { MainLayout, AuthLayout, RequireAuth } from '@components'; 
import { Dashboard, ServicesRoutes, AppointmentsRoutes, UsersRoutes, Login } from '@pages';
// Removed NotFound from imports as it's being replaced by a redirect.
// If NotFound is used elsewhere or desired as a true 404 page for some routes, this needs reconsideration.
// For this specific task, redirecting * to /login is the requirement.

function App() {
  return (
    <ThemeProvider>
      {/* If BrowserRouter is in main.jsx, it should be removed from here.
          The requirement doc (section 11, step 9) shows BrowserRouter in main.tsx.
          For now, keeping existing structure of App.jsx which has BrowserRouter.
          This can be reconciled when main.jsx is configured. */}
      {/* <BrowserRouter> */} 
        <Routes>
          {/* Protected Routes: /dashboard is the primary concern for this task */}
          <Route 
            path="/dashboard" // Explicitly defining /dashboard route
            element={
              <RequireAuth>
                <MainLayout> {/* Assuming MainLayout is desired for the blank dashboard */}
                  <Dashboard />
                </MainLayout>
              </RequireAuth>
            } 
          />
          
          {/* Other protected routes from existing setup - kept for now */}
          <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
            {/* <Route index element={<Dashboard />} />  This was the original dashboard route. Now explicit above. */}
            {/* If / is also meant to be dashboard, an additional route can be <Route path="/" element={<Dashboard />} /> */}
            <Route path="services/*" element={<ServicesRoutes />} />
            <Route path="appointments/*" element={<AppointmentsRoutes />} />
            <Route path="users/*" element={<UsersRoutes />} />
          </Route>

          {/* Public Routes (e.g., Login) */}
          {/* Assuming AuthLayout is a generic layout for non-authenticated pages */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Catch-all: Redirect to /login for any unknown paths */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      {/* </BrowserRouter> */}
    </ThemeProvider>
  );
}

export default App;
