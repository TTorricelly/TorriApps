// Mobile PWA Version Check Utility
// Optimized for mobile app lifecycle - checks on app open/focus

import { buildApiEndpoint } from './apiHelpers';

class MobileVersionChecker {
  constructor() {
    this.currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
    this.isChecking = false;
    this.hasCheckedThisSession = false;
  }

  // Start version checking for mobile PWA
  startVersionCheck() {
    // Check immediately on app open
    this.checkVersion();
    
    // Check when app comes back to foreground
    this.setupMobileLifecycleChecking();
  }

  // Mobile-specific event handling
  setupMobileLifecycleChecking() {
    // Check when app regains focus (user returns from background)
    window.addEventListener('focus', () => {
      this.checkVersion();
    });
    
    // Check when page becomes visible (PWA lifecycle)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkVersion();
      }
    });
    
    // Check when app comes back online
    window.addEventListener('online', () => {
      this.checkVersion();
    });

    // PWA specific: Check on app install/update
    window.addEventListener('beforeinstallprompt', () => {
      this.checkVersion();
    });
  }

  // Stop version checking
  stopVersionCheck() {
    // Remove event listeners
    window.removeEventListener('focus', this.checkVersion);
    document.removeEventListener('visibilitychange', this.checkVersion);
    window.removeEventListener('online', this.checkVersion);
    window.removeEventListener('beforeinstallprompt', this.checkVersion);
  }

  // Check for new version
  async checkVersion() {
    if (this.isChecking) return;
    
    try {
      this.isChecking = true;
      
      // Method 1: Check via API endpoint (public route - no tenant context needed)
      const versionEndpoint = buildApiEndpoint('version', 'v1', { isPublic: true });
      const response = await fetch(versionEndpoint, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const { version } = await response.json();
        if (version !== this.currentVersion) {
          this.handleVersionUpdate(version);
        }
      }
    } catch (error) {
      console.warn('Version check failed:', error);
      // Mobile fallback: Check if main HTML changed
      await this.checkAssetVersion();
    } finally {
      this.isChecking = false;
    }
  }

  // Alternative method: Check if main asset changed
  async checkAssetVersion() {
    try {
      // Try to fetch the main HTML file with cache-busting
      const response = await fetch('/index.html', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const lastModified = response.headers.get('last-modified');
      const storedModified = localStorage.getItem('app_last_modified');
      
      if (storedModified && lastModified !== storedModified) {
        this.handleVersionUpdate('updated');
      }
      
      if (lastModified) {
        localStorage.setItem('app_last_modified', lastModified);
      }
    } catch (error) {
      console.warn('Could not check asset version:', error);
    }
  }

  // Handle version update detection
  handleVersionUpdate(newVersion) {
    // Show mobile-optimized update notification
    this.showMobileUpdateNotification(newVersion);
  }

  // Show mobile-friendly update notification
  showMobileUpdateNotification(newVersion) {
    // Create mobile-optimized notification
    const notification = document.createElement('div');
    notification.id = 'mobile-version-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">🚀</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
              Nova versão disponível!
            </div>
            <div style="font-size: 14px; opacity: 0.9;">
              Toque para atualizar e ver as novidades
            </div>
          </div>
          <button 
            onclick="window.mobileVersionChecker.refreshApp()" 
            style="
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 12px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
            "
          >
            Atualizar
          </button>
        </div>
      </div>
    `;

    // Remove existing notification
    const existing = document.getElementById('mobile-version-update-notification');
    if (existing) {
      existing.remove();
    }

    // Add new notification
    document.body.appendChild(notification);

    // Auto-refresh after 60 seconds if user doesn't tap (longer for mobile)
    setTimeout(() => {
      if (document.getElementById('mobile-version-update-notification')) {
        this.refreshApp();
      }
    }, 60000);
  }

  // Refresh the mobile app
  async refreshApp() {
    try {
      // Clear all caches asynchronously
      const cachePromises = [];
      
      // Clear service workers (important for PWAs)
      if ('serviceWorker' in navigator) {
        cachePromises.push(
          navigator.serviceWorker.getRegistrations().then(registrations => {
            return Promise.all(registrations.map(registration => registration.unregister()));
          })
        );
      }

      // Clear browser cache
      if ('caches' in window) {
        cachePromises.push(
          caches.keys().then(names => {
            return Promise.all(names.map(name => caches.delete(name)));
          })
        );
      }

      // Wait for all cache clearing operations to complete
      await Promise.all(cachePromises);

      // Clear mobile-specific cache keys
      const cacheKeys = [
        'app_last_modified',
        'cached_services',
        'cached_appointments',
        'api_cache_',
        'theme_cache_',
        'offline_data_'
      ];
      
      cacheKeys.forEach(key => {
        Object.keys(localStorage).forEach(storageKey => {
          if (storageKey.includes(key)) {
            localStorage.removeItem(storageKey);
          }
        });
      });

    } catch (error) {
      console.warn('Some caches could not be cleared:', error);
    }

    // Mobile-friendly reload with cache bypass
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('v', Date.now().toString());
    currentUrl.searchParams.set('mobile_refresh', '1');
    window.location.href = currentUrl.toString();
  }
}

// Global instance for mobile
window.mobileVersionChecker = new MobileVersionChecker();

export default MobileVersionChecker;