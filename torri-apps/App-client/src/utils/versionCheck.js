// Mobile PWA Version Check Utility
// Optimized for mobile app lifecycle - checks on app open/focus

import { buildApiEndpoint } from './apiHelpers';

class MobileVersionChecker {
  constructor() {
    this.currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
    this.isChecking = false;
    this.hasCheckedThisSession = false;
    this.hasShownNotification = false;
    this.acknowledgedVersion = localStorage.getItem('acknowledged_version');
  }

  // Start version checking for mobile PWA
  startVersionCheck() {
    // Mobile apps should NOT show version update notifications
    // Updates are handled silently by the PWA service worker
    console.log('Mobile version checker: Disabled - using PWA service worker for silent updates');
    
    // Clean up any existing update tracking
    localStorage.removeItem('mobile_app_updating');
    localStorage.removeItem('mobile_update_timestamp');
    localStorage.removeItem('mobile_updating_to_version');
    localStorage.removeItem('acknowledged_version');
    
    // Do not start any version checking for mobile
    return;
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

  // Clear acknowledged versions that are older than current version
  clearOldAcknowledgedVersions() {
    const acknowledgedVersion = localStorage.getItem('acknowledged_version');
    
    // If acknowledged version is the same as current version, keep it
    // This prevents showing update notifications for the same version
    if (acknowledgedVersion === this.currentVersion) {
      this.acknowledgedVersion = acknowledgedVersion;
      console.log('Mobile: User has already acknowledged current version:', this.currentVersion);
      return;
    }
    
    // If acknowledged version is different or empty, clear it
    if (acknowledgedVersion && acknowledgedVersion !== this.currentVersion) {
      localStorage.removeItem('acknowledged_version');
      this.acknowledgedVersion = null;
      console.log('Mobile: Cleared old acknowledged version:', acknowledgedVersion);
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
    // Mobile apps should not perform manual version checks
    // All updates are handled silently by PWA service worker
    console.log('Mobile version check: Skipped - using PWA service worker for silent updates');
    return;
  }

  // Alternative method: Check if main asset changed
  async checkAssetVersion() {
    // Mobile apps should not perform asset version checks
    // All updates are handled silently by PWA service worker
    console.log('Mobile asset version check: Skipped - using PWA service worker for silent updates');
    return;
  }

  // Handle version update detection
  handleVersionUpdate(newVersion) {
    // Mobile apps should never show update notifications
    // All updates are handled silently by PWA service worker
    console.log(`Mobile: Version ${newVersion} detected but notifications disabled - using silent PWA updates`);
    return;
  }

  // Show mobile-friendly update notification
  showMobileUpdateNotification(newVersion) {
    // Mobile apps should never show update notifications
    // All updates are handled silently by PWA service worker
    console.log(`Mobile: Update notification for version ${newVersion} suppressed - using silent PWA updates`);
    return;
  }

  // Dismiss update notification (user chooses not to update now)
  dismissUpdate(version) {
    // Mobile apps don't show notifications, so nothing to dismiss
    console.log(`Mobile: Dismiss update called for version ${version} but notifications are disabled`);
    return;
  }

  // Refresh the mobile app
  async refreshApp(version = null) {
    // Mobile apps don't use manual refresh - PWA service worker handles updates
    console.log(`Mobile: Refresh app called for version ${version} but using PWA service worker for silent updates`);
    return;
  }
}

// Global instance for mobile
window.mobileVersionChecker = new MobileVersionChecker();

export default MobileVersionChecker;