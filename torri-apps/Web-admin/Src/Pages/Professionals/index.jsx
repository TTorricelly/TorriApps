import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProfessionalsPage from './ProfessionalsPage';
import ProfessionalForm from './ProfessionalForm';

export default function ProfessionalsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="team" replace />} />
      <Route path="team" element={<ProfessionalsPage />} />
      <Route path="team/create" element={<ProfessionalForm />} />
      <Route path="team/edit/:professionalId" element={<ProfessionalForm />} />
    </Routes>
  );
}
