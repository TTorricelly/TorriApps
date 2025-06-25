/**
 * RoleDebugger Component
 * Development utility to test role switching functionality
 * Only for development/testing purposes
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const RoleDebugger = () => {
  const { user, setProfile, isProfessional, isClient, getUserRole } = useAuthStore();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const switchRole = (newRole) => {
    console.log(`[RoleDebugger] Switching role from ${getUserRole()} to ${newRole}`);
    setProfile({ role: newRole });
    
    // Navigate to appropriate dashboard based on new role
    if (['professional', 'receptionist', 'manager', 'admin'].includes(newRole)) {
      navigate('/professional/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
      {/* Collapsed State - Just show role */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Role: {getUserRole()}
        </button>
      )}
      
      {/* Expanded State - Full debugger */}
      {isExpanded && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Role Debugger</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Current Role: <span className="font-medium">{getUserRole()}</span>
            </p>
            <p className="text-xs text-gray-600">
              Is Professional: <span className="font-medium">{isProfessional() ? 'Yes' : 'No'}</span>
            </p>
            <p className="text-xs text-gray-600">
              Is Client: <span className="font-medium">{isClient() ? 'Yes' : 'No'}</span>
            </p>
            <p className="text-xs text-gray-600">
              User ID: <span className="font-medium">{user?.id || 'None'}</span>
            </p>
            <p className="text-xs text-gray-600">
              Auth State: <span className="font-medium">{user ? 'Logged In' : 'Not Logged In'}</span>
            </p>
            
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Switch Role:</p>
              <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => switchRole('client')}
              className={`text-xs px-2 py-1 rounded ${
                user?.role === 'client' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Client
            </button>
            <button
              onClick={() => switchRole('professional')}
              className={`text-xs px-2 py-1 rounded ${
                user?.role === 'professional' 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Professional
            </button>
            <button
              onClick={() => switchRole('receptionist')}
              className={`text-xs px-2 py-1 rounded ${
                user?.role === 'receptionist' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Receptionist
            </button>
            <button
              onClick={() => switchRole('manager')}
              className={`text-xs px-2 py-1 rounded ${
                user?.role === 'manager' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Manager
            </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleDebugger;