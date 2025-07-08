/**
 * Theme Settings Page - Professional theme customization
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Palette, Check, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { saveTenantTheme, fetchTenantTheme } from '../api/themeApi';
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';

const ThemeSettingsPage = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [currentTheme, setCurrentTheme] = useState('#ec4899');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Theme options
  const themes = [
    { name: 'Pink', color: '#ec4899', description: 'Elegant and feminine' },
    { name: 'Blue', color: '#3b82f6', description: 'Professional and trustworthy' },
    { name: 'Purple', color: '#8b5cf6', description: 'Creative and luxurious' },
    { name: 'Green', color: '#10b981', description: 'Fresh and natural' },
    { name: 'Orange', color: '#f59e0b', description: 'Energetic and warm' },
    { name: 'Red', color: '#ef4444', description: 'Bold and passionate' },
    { name: 'Teal', color: '#14b8a6', description: 'Modern and calming' },
    { name: 'Indigo', color: '#6366f1', description: 'Deep and sophisticated' },
    { name: 'Rose', color: '#f43f5e', description: 'Romantic and vibrant' },
    { name: 'Emerald', color: '#059669', description: 'Classy and refined' },
    { name: 'Amber', color: '#d97706', description: 'Warm and inviting' },
    { name: 'Gray', color: '#1f2937', description: 'Minimal and sleek' }
  ];

  // Load current theme on mount
  useEffect(() => {
    const loadCurrentTheme = async () => {
      setLoading(true);
      try {
        const themeData = await fetchTenantTheme();
        if (themeData?.primaryColor) {
          setCurrentTheme(themeData.primaryColor);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadCurrentTheme();
  }, []);

  // Apply theme helper functions
  const lightenColor = (color, factor) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.round(r + (255 - r) * factor));
    const newG = Math.min(255, Math.round(g + (255 - g) * factor));
    const newB = Math.min(255, Math.round(b + (255 - b) * factor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const darkenColor = (color, factor) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.max(0, Math.round(r * (1 - factor)));
    const newG = Math.max(0, Math.round(g * (1 - factor)));
    const newB = Math.max(0, Math.round(b * (1 - factor)));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Change theme function
  const handleThemeChange = async (color) => {
    setSaving(true);
    setCurrentTheme(color);
    
    try {
      const themeConfig = {
        primaryColor: color,
        secondaryColor: darkenColor(color, 0.1),
        accentColor: lightenColor(color, 0.2)
      };
      
      await saveTenantTheme(themeConfig);
      
      // Apply theme immediately to preview
      applyThemePreview(color);
      
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  // Apply theme preview
  const applyThemePreview = (color) => {
    // Remove any existing theme styles
    const existingStyle = document.getElementById('theme-preview');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create preview CSS
    const style = document.createElement('style');
    style.id = 'theme-preview';
    
    const lighter = lightenColor(color, 0.3);
    const darker = darkenColor(color, 0.2);
    
    style.textContent = `
      .bg-primary-500 { background-color: ${color} !important; }
      .bg-primary-600 { background-color: ${darker} !important; }
      .bg-primary-400 { background-color: ${lightenColor(color, 0.2)} !important; }
      .text-primary-500 { color: ${color} !important; }
      .border-primary-500 { border-color: ${color} !important; }
      .bg-gradient-to-r.from-primary-500.to-primary-600 {
        background: linear-gradient(to right, ${color}, ${darker}) !important;
      }
    `;
    
    document.head.appendChild(style);
  };

  const handleGoBack = () => {
    if (tenantSlug) {
      navigate(`/${tenantSlug}/professional/menu`);
    } else {
      navigate('/professional/menu');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleGoBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <Palette size={24} className="text-primary-500" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Tema do Salão</h1>
                <p className="text-sm text-gray-500">Personalize as cores do seu salão</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando tema atual...</p>
          </div>
        ) : (
          <>
            {/* Current Theme Preview */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles size={20} className="mr-2 text-primary-500" />
                Tema Atual
              </h2>
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div 
                  className="w-16 h-16 rounded-full shadow-md border-4 border-white"
                  style={{ backgroundColor: currentTheme }}
                ></div>
                <div>
                  <p className="font-medium text-gray-900">
                    {themes.find(t => t.color === currentTheme)?.name || 'Personalizado'}
                  </p>
                  <p className="text-sm text-gray-500">{currentTheme}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {themes.find(t => t.color === currentTheme)?.description || 'Cor personalizada'}
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Options */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Escolher Novo Tema</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {themes.map((theme) => (
                  <button
                    key={theme.color}
                    onClick={() => handleThemeChange(theme.color)}
                    disabled={saving}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105
                      ${currentTheme === theme.color 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Color Circle */}
                    <div className="flex flex-col items-center space-y-3">
                      <div 
                        className="w-12 h-12 rounded-full shadow-md border-2 border-white relative"
                        style={{ backgroundColor: theme.color }}
                      >
                        {currentTheme === theme.color && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Theme Info */}
                      <div className="text-center">
                        <p className="font-medium text-gray-900 text-sm">{theme.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
                      </div>
                    </div>
                    
                    {saving && currentTheme === theme.color && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-xl">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> O tema escolhido será aplicado em todo o sistema do seu salão. 
                Todos os usuários verão as mesmas cores personalizadas.
              </p>
            </div>
          </>
        )}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <ProfessionalBottomNavigation />
    </div>
  );
};

export default ThemeSettingsPage;