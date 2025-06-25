/**
 * WizardHeader Component (Web Version)
 * Maintains identical design from Mobile-client-core WizardHeader.tsx
 * Features: Progress indicator, step navigation, title display
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';

const WizardHeader = ({ 
  title, 
  currentStep, 
  totalSteps = 4, 
  onBack 
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="safe-area-top px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Back Button */}
          <div className="flex-shrink-0">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-smooth"
            >
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
          </div>
          
          {/* Center Section - Title */}
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {title}
            </h1>
          </div>
          
          {/* Right Section - Step Indicator */}
          <div className="flex-shrink-0">
            <span className="text-sm text-gray-500">
              Passo {currentStep} de {totalSteps}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-pink-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default WizardHeader;