/**
 * Theme Customizer Component
 * Provides UI for salon owners to customize their app's theme
 */

import { useState, useEffect } from 'react';
import { useTenantTheme } from '../hooks/useTenantTheme';

const ThemeCustomizer = ({ isOpen, onClose }) => {
  const { currentTheme, isLoading, presets, updatePrimaryColor, applyPreset, resetTheme } = useTenantTheme();
  const [selectedColor, setSelectedColor] = useState(currentTheme?.primary || '#ec4899');

  // Update selectedColor when currentTheme changes
  useEffect(() => {
    if (currentTheme?.primary) {
      setSelectedColor(currentTheme.primary);
    }
  }, [currentTheme]);

  const handleColorChange = async (color) => {
    setSelectedColor(color);
    try {
      await updatePrimaryColor(color);
    } catch (error) {
    }
  };

  const handlePresetSelect = async (presetKey) => {
    try {
      await applyPreset(presetKey);
    } catch (error) {
    }
  };

  const handleReset = () => {
    resetTheme();
    setSelectedColor('#ec4899');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Personalizar Tema</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor Principal
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-12 rounded border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="#ec4899"
                  />
                </div>
              </div>

              {/* Theme Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Temas Predefinidos
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(presets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(key)}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-200"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Visualização
                </label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="space-y-3">
                    <div 
                      className="h-12 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: currentTheme?.primary }}
                    >
                      Cabeçalho
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className="px-4 py-2 rounded-lg text-white font-medium"
                        style={{ backgroundColor: currentTheme?.primary }}
                      >
                        Botão Principal
                      </button>
                      <button 
                        className="px-4 py-2 rounded-lg border-2 font-medium"
                        style={{ 
                          borderColor: currentTheme?.primary,
                          color: currentTheme?.primary 
                        }}
                      >
                        Botão Secundário
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: currentTheme?.primary }}
                      />
                      <span className="text-sm text-gray-600">Elementos de destaque</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Restaurar Padrão
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: currentTheme?.primary }}
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;