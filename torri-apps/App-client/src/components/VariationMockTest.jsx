/**
 * Mock Test Component for Service Variations
 * This component tests the variation UI with mock data
 */

import { useState } from 'react';
import { ServiceVariations } from './VariationChip';

// Mock variation data for testing
const mockVariationGroups = [
  {
    id: 'group-1',
    name: 'Comprimento do Cabelo',
    service_id: 'service-1',
    variations: [
      {
        id: 'var-1',
        name: 'Cabelo Curto',
        price_delta: 0,
        duration_delta: 0,
        display_order: 0
      },
      {
        id: 'var-2', 
        name: 'Cabelo Médio',
        price_delta: 5.00,
        duration_delta: 10,
        display_order: 1
      },
      {
        id: 'var-3',
        name: 'Cabelo Longo',
        price_delta: 10.00,
        duration_delta: 20,
        display_order: 2
      }
    ]
  },
  {
    id: 'group-2',
    name: 'Adicionais',
    service_id: 'service-1', 
    variations: [
      {
        id: 'var-4',
        name: 'Escova',
        price_delta: 15.00,
        duration_delta: 30,
        display_order: 0
      },
      {
        id: 'var-5',
        name: 'Tratamento',
        price_delta: 25.00,
        duration_delta: 45,
        display_order: 1
      }
    ]
  }
];

const VariationMockTest = () => {
  const [selectedVariations, setSelectedVariations] = useState({});
  
  const handleVariationSelect = (groupId, variation) => {
    console.log('Variation selected:', { groupId, variation });
    setSelectedVariations(prev => ({
      ...prev,
      [groupId]: variation
    }));
  };

  const calculateTotalDelta = () => {
    const priceDelta = Object.values(selectedVariations)
      .reduce((sum, variation) => sum + (variation?.price_delta || 0), 0);
    const durationDelta = Object.values(selectedVariations)
      .reduce((sum, variation) => sum + (variation?.duration_delta || 0), 0);
    
    return { priceDelta, durationDelta };
  };

  const { priceDelta, durationDelta } = calculateTotalDelta();

  return (
    <div className="p-4 border border-blue-300 rounded-lg mb-4 bg-blue-50">
      <h3 className="font-bold text-lg mb-4">🧪 Variation UI Test (Mock Data)</h3>
      
      {/* Mock Service Info */}
      <div className="mb-4 p-3 bg-white rounded border">
        <h4 className="font-semibold">Corte Feminino</h4>
        <div className="text-sm text-gray-600">
          Base: R$ 30,00 • 45min
        </div>
        {(priceDelta !== 0 || durationDelta !== 0) && (
          <div className="text-sm font-medium text-pink-600 mt-1">
            Final: R$ {(30 + priceDelta).toFixed(2).replace('.', ',')} • {45 + durationDelta}min
          </div>
        )}
      </div>

      {/* Variation Groups */}
      <ServiceVariations
        variationGroups={mockVariationGroups}
        selectedVariations={selectedVariations}
        onVariationSelect={handleVariationSelect}
        size="small"
      />

      {/* Selected Variations Debug */}
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
        <strong>Selected Variations:</strong>
        <pre>{JSON.stringify(selectedVariations, null, 2)}</pre>
        <div className="mt-2">
          <strong>Price Delta:</strong> +R$ {priceDelta.toFixed(2).replace('.', ',')} | 
          <strong> Duration Delta:</strong> +{durationDelta}min
        </div>
      </div>
    </div>
  );
};

export default VariationMockTest;