// Version Check Utility for Auto-Updates
// This utility checks for new app versions and handles automatic updates

import { buildApiEndpoint } from './apiHelpers';

class VersionChecker {
  constructor() {
    this.currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
    this.checkInterval = 12 * 60 * 60 * 1000; // Check every 12 hours
    this.intervalId = null;
    this.isChecking = false;
    this.hasShownNotification = false;
    this.acknowledgedVersion = localStorage.getItem('acknowledged_version');
  }

  // Start version checking
  startVersionCheck() {
    // Check if we just finished an update
    const isUpdating = localStorage.getItem('app_updating');
    const updateTimestamp = localStorage.getItem('update_timestamp');
    const updatingToVersion = localStorage.getItem('updating_to_version');
    
    if (isUpdating) {
      const timeSinceUpdate = Date.now() - parseInt(updateTimestamp || '0');
      
      // If update was recent (less than 30 seconds ago), mark as completed
      if (timeSinceUpdate < 30000) {
        console.log('Update completed successfully');
        
        // Mark the version we updated to as acknowledged
        if (updatingToVersion) {
          this.acknowledgeVersion(updatingToVersion);
        }
        
        // Clear update flags
        localStorage.removeItem('app_updating');
        localStorage.removeItem('update_timestamp');
        localStorage.removeItem('updating_to_version');
        
        // Skip initial version check to prevent immediate re-notification
        this.hasShownNotification = true;
        
        // Start checking again after a delay
        setTimeout(() => {
          this.hasShownNotification = false;
          this.checkVersion();
        }, 60000); // Wait 1 minute before checking again
      } else {
        // Update was too long ago, clear flags and proceed normally
        localStorage.removeItem('app_updating');
        localStorage.removeItem('update_timestamp');
        localStorage.removeItem('updating_to_version');
      }
    }
    
    // Clear old acknowledged versions that don't match current version
    this.clearOldAcknowledgedVersions();
    
    // Only check immediately if we're not coming from an update
    if (!isUpdating) {
      this.checkVersion();
    }
    
    // Timer-based checking every 12 hours
    this.intervalId = setInterval(() => {
      this.checkVersion();
    }, this.checkInterval);
  }

  // Clear acknowledged versions that are older than current version
  clearOldAcknowledgedVersions() {
    const acknowledgedVersion = localStorage.getItem('acknowledged_version');
    
    // If acknowledged version is the same as current version, keep it
    // This prevents showing update notifications for the same version
    if (acknowledgedVersion === this.currentVersion) {
      this.acknowledgedVersion = acknowledgedVersion;
      console.log('User has already acknowledged current version:', this.currentVersion);
      return;
    }
    
    // If acknowledged version is different or empty, clear it
    if (acknowledgedVersion && acknowledgedVersion !== this.currentVersion) {
      localStorage.removeItem('acknowledged_version');
      this.acknowledgedVersion = null;
      console.log('Cleared old acknowledged version:', acknowledgedVersion);
    }
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
        console.log('Version check result:', {
          serverVersion: version,
          currentVersion: this.currentVersion,
          acknowledgedVersion: this.acknowledgedVersion,
          hasShownNotification: this.hasShownNotification
        });
        
        if (version !== this.currentVersion && !this.hasUserAcknowledgedUpdate(version)) {
          console.log('New version detected, showing update notification');
          this.handleVersionUpdate(version);
        } else {
          console.log('No update needed or already acknowledged');
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
      
      if (storedModified && lastModified !== storedModified && !this.hasUserAcknowledgedUpdate('updated')) {
        this.handleVersionUpdate('updated');
      }
      
      if (lastModified) {
        localStorage.setItem('app_last_modified', lastModified);
      }
    } catch (error) {
      console.warn('Could not check asset version:', error);
    }
  }

  // Check if user has already acknowledged this version update
  hasUserAcknowledgedUpdate(version) {
    // If user has already seen notification for this version, don't show again
    if (this.hasShownNotification) {
      return true;
    }
    
    // Check if user has acknowledged this specific version
    const acknowledgedVersion = localStorage.getItem('acknowledged_version');
    return acknowledgedVersion === version;
  }

  // Mark version as acknowledged by user
  acknowledgeVersion(version) {
    localStorage.setItem('acknowledged_version', version);
    this.acknowledgedVersion = version;
    this.hasShownNotification = true;
  }

  // Handle version update detection
  handleVersionUpdate(newVersion) {
    console.log(`New version detected: ${newVersion}`);
    
    // Prevent multiple notifications in the same session
    if (this.hasShownNotification) {
      return;
    }
    
    // Show user-friendly update notification
    this.showUpdateNotification(newVersion);
  }

  // Show update notification to user
  showUpdateNotification(newVersion) {
    // Mark this version as seen
    this.hasShownNotification = true;
    
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
          <div style="display: flex; gap: 8px;">
            <button 
              onclick="window.versionChecker.dismissUpdate('${newVersion}')" 
              style="
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.8);
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 400;
              "
              title="Dispensar esta atualização"
            >
              Depois
            </button>
            <button 
              onclick="window.versionChecker.refreshApp('${newVersion}')" 
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
        this.refreshApp(newVersion);
      }
    }, 30000);
  }

  // Dismiss update notification (user chooses not to update now)
  dismissUpdate(version) {
    // Remove notification
    const notification = document.getElementById('version-update-notification');
    if (notification) {
      notification.remove();
    }
    
    // Mark version as acknowledged so we don't show it again this session
    this.acknowledgeVersion(version);
    
    console.log(`Update dismissed for version: ${version}`);
  }

  // Refresh the application
  async refreshApp(version = null) {
    // Mark that we're performing an update to prevent immediate re-checking
    localStorage.setItem('app_updating', 'true');
    localStorage.setItem('update_timestamp', Date.now().toString());
    
    // Store the version we're updating to
    if (version) {
      localStorage.setItem('updating_to_version', version);
    }
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

      // Clear local storage cache keys (preserve user data and update tracking)
      const cacheKeys = [
        'app_last_modified',
        'cached_services',
        'cached_categories',
        'api_cache_',
        'acknowledged_version' // Clear version acknowledgment on update
      ];
      
      // Keys to preserve during update
      const preserveKeys = [
        'app_updating',
        'update_timestamp', 
        'updating_to_version',
        'services_selected_category_id',
        'sidebar-collapsed'
      ];
      
      cacheKeys.forEach(key => {
        Object.keys(localStorage).forEach(storageKey => {
          // Only remove if it's a cache key and not a preserve key
          if (storageKey.includes(key) && !preserveKeys.some(preserve => storageKey.includes(preserve))) {
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