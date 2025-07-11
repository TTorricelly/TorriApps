/**
 * Debug component to test service variations API
 */

import { useState } from 'react';
import { getServiceVariations } from '../services/serviceVariationsService';

const VariationDebugger = ({ serviceId }) => {
  const [variations, setVariations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testApiCall = async () => {
    if (!serviceId) {
      setError('No service ID provided');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing API call for service:', serviceId);
      const result = await getServiceVariations(serviceId);
      console.log('API result:', result);
      setVariations(result);
    } catch (err) {
      console.error('API error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg mb-4 bg-yellow-50">
      <h3 className="font-bold text-lg mb-2">Variation Debugger</h3>
      <p className="mb-2">Service ID: {serviceId || 'None'}</p>
      
      <button 
        onClick={testApiCall}
        disabled={loading || !serviceId}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Loading...' : 'Test API Call'}
      </button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 rounded text-red-700">
          Error: {error}
        </div>
      )}
      
      {variations && (
        <div className="mt-2 p-2 bg-green-100 border border-green-400 rounded">
          <h4 className="font-semibold">API Response:</h4>
          <pre className="text-xs overflow-auto mt-1">
            {JSON.stringify(variations, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default VariationDebugger;