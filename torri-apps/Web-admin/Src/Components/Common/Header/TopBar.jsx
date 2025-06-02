import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../stores/auth';
import { useTenantStore } from '../../../stores/tenant';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { userEmail, clearAuth } = useAuthStore();
  const { tenantName } = useTenantStore();
  const navigate = useNavigate();
  
  // Default tenant name if not set
  const displayTenantName = tenantName || "Salão Exemplo";

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleProfile = () => {
    // Navigate to profile page when implemented
    console.log('Navigate to profile');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src="/src/assets/logo-torriapps.png" 
            alt="TorriApps" 
            className="h-8 w-auto"
          />
        </div>

        {/* User Info and Actions */}
        <div className="flex items-center space-x-4">
          {/* Tenant Name */}
          <div className="hidden md:block text-sm text-gray-600">
            <span className="font-medium">{displayTenantName}</span>
          </div>

          {/* User Dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-2">
              <UserCircleIcon className="h-6 w-6" />
              <span className="hidden md:block text-sm font-medium">{userEmail}</span>
              <ChevronDownIcon className="h-4 w-4" />
            </Menu.Button>

            <Transition
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleProfile}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100`}
                      >
                        <UserCircleIcon className="h-4 w-4 mr-3" />
                        Ver Perfil
                      </button>
                    )}
                  </Menu.Item>
                  
                  <div className="border-t border-gray-100"></div>
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100`}
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                        Sair
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}