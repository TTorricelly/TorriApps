import React from 'react';
import { Outlet } from 'react-router-dom';
// import Sidebar from './Sidebar'; // Example component
// import Header from './Header'; // Example component

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* <Sidebar /> */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* <Header /> */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-6">
          <Outlet /> {/* Nested routes will render here */}
        </main>
      </div>
    </div>
  );
}
