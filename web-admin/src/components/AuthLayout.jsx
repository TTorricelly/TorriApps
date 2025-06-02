import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-200">
      <div className="p-8 bg-white shadow-md rounded-lg">
        <Outlet /> {/* Login form or other auth content */}
      </div>
    </div>
  );
}
