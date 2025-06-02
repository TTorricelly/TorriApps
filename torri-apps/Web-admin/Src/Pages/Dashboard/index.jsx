import React from "react";

export default function DashboardPage() { // Renaming to DashboardPage for consistency with plan, though file is index.jsx
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      {/* Optional: <h1 className="text-3xl font-semibold text-gray-700">Dashboard</h1> */}
      <h1 className="text-2xl text-gray-700">Página Principal</h1> {/* Added optional text as per doc */}
    </div>
  );
}
