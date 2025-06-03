import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Common/Sidebar/Sidebar';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-bg-primary font-sans">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <main className="h-full overflow-x-hidden overflow-y-auto bg-bg-primary p-l">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
