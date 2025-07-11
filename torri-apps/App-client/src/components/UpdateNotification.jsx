import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(false);

  useEffect(() => {
    // Register service worker update listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker has taken control - reload silently
        window.location.reload();
      });

      // Check for updates on app lifecycle events (mobile-friendly)
      const checkForUpdates = () => {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            registration.update();
          }
        });
      };

      // Mobile-optimized update checking
      const handleVisibilityChange = () => {
        if (!document.hidden && !pendingUpdate) {
          // App became visible, check for updates silently
          checkForUpdates();
        }
      };

      const handleFocus = () => {
        if (!pendingUpdate) {
          checkForUpdates();
        }
      };

      // Listen for app lifecycle events instead of polling
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      // Listen for waiting service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          setPendingUpdate(true);
          // Auto-update silently after a short delay (mobile behavior)
          setTimeout(() => {
            handleUpdateSilently();
          }, 2000);
        }
      });

      // Initial check on mount
      checkForUpdates();

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [pendingUpdate]);

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

  const handleUpdateSilently = () => {
    // Silent update for mobile - no UI feedback
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

  // For mobile apps, updates should be completely silent
  // Check multiple ways to detect if this is a mobile app environment
  const isDev = import.meta.env.DEV;
  const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isInAppBrowser = window.navigator.standalone === true; // iOS home screen app
  
  // Hide notifications for mobile/PWA users completely (even in dev mode for mobile)
  if (isPWA || isMobile || isInAppBrowser) {
    console.log('UpdateNotification: Disabled for mobile/PWA environment');
    return null;
  }

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