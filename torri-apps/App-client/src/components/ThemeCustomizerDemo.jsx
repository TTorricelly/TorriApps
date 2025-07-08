/**
 * Demo component to showcase theme customization
 * Can be integrated into admin/settings pages
 */

import { useState } from 'react';
import ThemeCustomizer from './ThemeCustomizer';

const ThemeCustomizerDemo = () => {
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Personalização do Tema
        </h2>
        
        <p className="text-gray-600 mb-6">
          Personalize as cores do seu aplicativo para refletir a identidade visual do seu salão.
        </p>

        {/* Demo Elements */}
        <div className="mb-6 space-y-4">
          <div className="bg-primary-500 text-white p-4 rounded-lg">
            <h3 className="font-medium">Cabeçalho com Cor Principal</h3>
            <p className="text-primary-100 text-sm">Este é um exemplo de como o cabeçalho aparecerá</p>
          </div>
          
          <div className="flex space-x-3">
            <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors">
              Botão Principal
            </button>
            <button className="border-2 border-primary-500 text-primary-500 hover:bg-primary-50 px-4 py-2 rounded-lg transition-colors">
              Botão Secundário
            </button>
          </div>

          <div className="bg-primary-50 border border-primary-200 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
              <span className="text-primary-700 font-medium">Elementos de destaque</span>
            </div>
            <p className="text-primary-600 text-sm mt-1">
              Fundos e destaques usarão as variações da cor principal
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCustomizerOpen(true)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Personalizar Tema
        </button>
      </div>

      <ThemeCustomizer 
        isOpen={isCustomizerOpen} 
        onClose={() => setIsCustomizerOpen(false)} 
      />
    </div>
  );
};

export default ThemeCustomizerDemo;