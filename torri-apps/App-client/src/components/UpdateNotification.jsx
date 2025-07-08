import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Register service worker update listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker has taken control
        window.location.reload();
      });

      // Check for updates periodically
      const checkForUpdates = () => {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            registration.update();
          }
        });
      };

      // Check for updates every 30 seconds
      const updateInterval = setInterval(checkForUpdates, 30000);

      // Listen for waiting service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          setShowUpdate(true);
        }
      });

      return () => clearInterval(updateInterval);
    }
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          // Force reload if no waiting service worker
          window.location.reload();
        }
      });
    } else {
      // Fallback for browsers without service worker
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-5 h-5" />
        <div>
          <p className="font-medium">Nova versão disponível!</p>
          <p className="text-sm opacity-90">Atualize para acessar as novas funcionalidades</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            'Atualizar'
          )}
        </button>
        
        <button
          onClick={handleDismiss}
          className="text-white hover:text-gray-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}