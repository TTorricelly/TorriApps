// Version Check Utility for Auto-Updates
// This utility checks for new app versions and handles automatic updates

import { buildApiEndpoint } from './apiHelpers';

class VersionChecker {
  constructor() {
    this.currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
    this.checkInterval = 12 * 60 * 60 * 1000; // Check every 12 hours
    this.intervalId = null;
    this.isChecking = false;
  }

  // Start version checking
  startVersionCheck() {
    // Check immediately on start
    this.checkVersion();
    
    // Timer-based checking every 12 hours
    this.intervalId = setInterval(() => {
      this.checkVersion();
    }, this.checkInterval);
  }

  // Stop version checking
  stopVersionCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Check for new version
  async checkVersion() {
    if (this.isChecking) return;
    
    try {
      this.isChecking = true;
      console.log('🔍 Version check triggered at:', new Date().toLocaleTimeString(), '(12h interval)');
      
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
      // Method 2: Fallback - Check if main JS bundle changed
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
    console.log(`New version detected: ${newVersion}`);
    
    // Show user-friendly update notification
    this.showUpdateNotification(newVersion);
  }

  // Show update notification to user
  showUpdateNotification(newVersion) {
    // Create update notification
    const notification = document.createElement('div');
    notification.id = 'version-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1976d2;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 350px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 4px;">
              🚀 Nova versão disponível!
            </div>
            <div style="font-size: 14px; opacity: 0.9;">
              Atualize para ver as últimas funcionalidades
            </div>
          </div>
          <button 
            onclick="window.versionChecker.refreshApp()" 
            style="
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            "
          >
            Atualizar
          </button>
        </div>
      </div>
    `;

    // Remove existing notification
    const existing = document.getElementById('version-update-notification');
    if (existing) {
      existing.remove();
    }

    // Add new notification
    document.body.appendChild(notification);

    // Auto-refresh after 30 seconds if user doesn't click
    setTimeout(() => {
      if (document.getElementById('version-update-notification')) {
        this.refreshApp();
      }
    }, 30000);
  }

  // Refresh the application
  async refreshApp() {
    try {
      // Clear all caches asynchronously
      const cachePromises = [];
      
      // Clear service workers
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

      // Clear local storage cache keys (preserve user data)
      const cacheKeys = [
        'app_last_modified',
        'cached_services',
        'cached_categories',
        'api_cache_'
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

    // Reload with cache bypass using modern approach
    // Preserve current URL structure (tenant context) and add cache busting
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('v', Date.now().toString());
    window.location.href = currentUrl.toString();
  }
}

// Global instance
window.versionChecker = new VersionChecker();

export default VersionChecker;