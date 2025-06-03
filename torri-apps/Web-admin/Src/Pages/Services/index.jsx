import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ServicesCatalog from './ServicesCatalog';

// Services routes with nested routing
export default function ServicesRoutes() {
  return (
    <Routes>
      {/* Default redirect to catalog */}
      <Route path="/" element={<Navigate to="catalog" replace />} />
      
      {/* Service Categories Catalog */}
      <Route path="catalog" element={<ServicesCatalog />} />
      
      {/* Future routes can be added here */}
      {/* <Route path="list" element={<ServicesList />} /> */}
      {/* <Route path="create" element={<CreateService />} /> */}
    </Routes>
  );
}
