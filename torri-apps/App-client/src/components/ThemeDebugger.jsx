/**
 * Theme Debugger Component - For testing theme functionality
 * Remove this component in production
 */

import React from 'react';
import { useTenantTheme } from '../hooks/useTenantTheme';
import { applySimpleTheme } from '../utils/simplifiedTheme';

const ThemeDebugger = () => {
  const { currentTheme, isLoading, presets, updatePrimaryColor, applyPreset, resetTheme } = useTenantTheme();

  const testPreset = async (presetKey) => {
    try {
      await applyPreset(presetKey);
    } catch (error) {
    }
  };

  const testColor = async (color) => {
    try {
      await updatePrimaryColor(color);
    } catch (error) {
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="text-sm font-bold text-gray-800 mb-2">🧪 Theme Debugger</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Current Theme:</strong>
          <pre className="bg-gray-100 p-1 rounded text-xs overflow-x-auto">
            {JSON.stringify(currentTheme, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
        </div>
        
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => testColor('#ff0000')}
            className="px-2 py-1 bg-red-500 text-white text-xs rounded"
          >
            Test Red
          </button>
          <button
            onClick={() => testColor('#00ff00')}
            className="px-2 py-1 bg-green-500 text-white text-xs rounded"
          >
            Test Green
          </button>
          <button
            onClick={() => testColor('#0000ff')}
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
          >
            Test Blue
          </button>
        </div>

        <div className="border-t pt-2">
          <strong className="text-xs">Simple Tests (Direct CSS):</strong>
          <div className="flex flex-wrap gap-1 mt-1">
            <button
              onClick={() => applySimpleTheme('#ff0000')}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded"
            >
              Simple Red
            </button>
            <button
              onClick={() => applySimpleTheme('#00ff00')}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded"
            >
              Simple Green
            </button>
            <button
              onClick={() => applySimpleTheme('#0000ff')}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
            >
              Simple Blue
            </button>
            <button
              onClick={() => applySimpleTheme('#ec4899')}
              className="px-2 py-1 bg-pink-600 text-white text-xs rounded"
            >
              Pink
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {Object.keys(presets).slice(0, 4).map(key => (
            <button
              key={key}
              onClick={() => testPreset(key)}
              className="px-2 py-1 bg-gray-500 text-white text-xs rounded"
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={resetTheme}
          className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded"
        >
          Reset Theme
        </button>
      </div>
    </div>
  );
};

export default ThemeDebugger;