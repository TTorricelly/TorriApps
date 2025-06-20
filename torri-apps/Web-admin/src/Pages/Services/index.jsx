import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ServicesCatalog from './ServicesCatalog';
import ServicesPage from './ServicesPage';
import ServiceForm from './ServiceForm';

// Services routes with nested routing
export default function ServicesRoutes() {
  return (
    <Routes>
      {/* Default redirect to services list */}
      <Route path="/" element={<Navigate to="list" replace />} />
      
      {/* Service Categories Catalog */}
      <Route path="catalog" element={<ServicesCatalog />} />
      
      {/* Services management */}
      <Route path="list" element={<ServicesPage />} />
      <Route path="create" element={<ServiceForm />} />
      <Route path="edit/:serviceId" element={<ServiceForm />} />
    </Routes>
  );
}
