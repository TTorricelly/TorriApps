import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../stores/auth';
import { useTenantStore } from '../../../stores/tenant';
import { useNavigate, useParams } from 'react-router-dom';
import { getTenantInfo } from '../../../Utils/apiHelpers';

export default function TopBar() {
  const { userEmail, clearAuth, tenantData, userData, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  
  // Get tenant info to determine URL structure
  const tenantInfo = getTenantInfo();
  const useSlugInUrl = tenantInfo?.method === 'slug';
  const currentTenantSlug = tenantSlug || tenantInfo?.slug;
  
  // Helper function to build routes based on tenant type
  const buildRoute = (path) => {
    if (useSlugInUrl && currentTenantSlug) {
      return `/${currentTenantSlug}${path}`;
    }
    return path;
  };
  
  // Use tenant data from auth store (no API call needed)
  const displayTenantName = () => {
    if (tenantData?.name) return tenantData.name;
    return "Demo Salon"; // Fallback
  };
  
  const displayUserName = () => {
    if (userData?.full_name) return userData.full_name;
    return userEmail; // Fallback to email
  };

  const handleLogout = () => {
    clearAuth();
    // Clear tenant data on logout
    const { clearTenant } = useTenantStore.getState();
    clearTenant();
    navigate(buildRoute('/login'));
  };

  const handleProfile = () => {
    // Navigate to profile page when implemented
    console.log('Navigate to profile');
  };

  return (
    <header className="bg-bg-secondary shadow-card border-b border-bg-tertiary px-l py-m">
      <div className="flex items-center justify-between">
        {/* Empty space for layout balance */}
        <div className="flex items-center">
        </div>

        {/* User Info and Actions */}
        <div className="flex items-center space-x-m">
          {/* Tenant Name */}
          <div className="hidden md:block text-small text-text-secondary">
            <span className="font-medium text-text-primary">{displayTenantName()}</span>
          </div>

          {/* User Dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-2 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-secondary rounded-button px-s py-xs transition-colors duration-fast">
              <UserCircleIcon className="h-6 w-6" />
              <span className="hidden md:block text-small font-medium">{displayUserName()}</span>
              <ChevronDownIcon className="h-4 w-4" />
            </Menu.Button>

            <Transition
              enter="transition ease-out duration-fast"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-bg-secondary rounded-card shadow-card-hover ring-1 ring-bg-tertiary focus:outline-none z-50">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleProfile}
                        className={`${
                          active ? 'bg-bg-tertiary' : ''
                        } flex items-center w-full px-m py-xs text-small text-text-primary hover:bg-bg-tertiary transition-colors duration-fast`}
                      >
                        <UserCircleIcon className="h-4 w-4 mr-s text-accent-primary" />
                        Ver Perfil
                      </button>
                    )}
                  </Menu.Item>
                  
                  <div className="border-t border-bg-tertiary"></div>
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-bg-tertiary' : ''
                        } flex items-center w-full px-m py-xs text-small text-text-primary hover:bg-bg-tertiary transition-colors duration-fast`}
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-s text-status-error" />
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