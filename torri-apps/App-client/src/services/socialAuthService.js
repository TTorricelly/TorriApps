/**
 * Social Authentication Service
 * Handles Google and Facebook authentication for the frontend
 */

import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers'
import apiClient from '../config/api'
import { SOCIAL_AUTH_CONFIG, getSocialConfig, getSocialEndpoint } from '../config/socialAuth'

// Google Authentication
export const authenticateWithGoogle = async () => {
  return new Promise((resolve, reject) => {
    // Load Google Sign-In library if not already loaded
    if (!window.google) {
      reject(new Error('Google Sign-In library not loaded'))
      return
    }

    const config = getSocialConfig('google')
    
    window.google.accounts.id.initialize({
      client_id: config.clientId,
      callback: async (response) => {
        try {
          // Send ID token to backend for verification
          const result = await verifyGoogleToken(response.credential, response.access_token)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
    })

    // Trigger the sign-in flow
    window.google.accounts.id.prompt()
  })
}

// Facebook Authentication
export const authenticateWithFacebook = async () => {
  return new Promise((resolve, reject) => {
    // Check if Facebook SDK is loaded
    if (!window.FB) {
      reject(new Error('Facebook SDK not loaded'))
      return
    }

    const config = getSocialConfig('facebook')

    window.FB.login((response) => {
      if (response.authResponse) {
        // Get user information
        window.FB.api('/me', { fields: config.fields }, async (userInfo) => {
          try {
            const result = await verifyFacebookToken(
              response.authResponse.accessToken,
              userInfo.id
            )
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })
      } else {
        reject(new Error('Facebook login cancelled'))
      }
    }, { scope: config.scopes.join(',') })
  })
}

// Verify Google token with backend
const verifyGoogleToken = async (idToken, accessToken) => {
  const endpoint = buildApiEndpoint('auth/google/verify')
  
  console.log('[SocialAuth] Verifying Google token', { endpoint })
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, {
      id_token: idToken,
      access_token: accessToken || ''
    }),
    {
      defaultValue: null,
      transformData: (data) => {
        console.log('[SocialAuth] Google authentication successful')
        return data
      },
      logErrors: true
    }
  )
}

// Verify Facebook token with backend
const verifyFacebookToken = async (accessToken, userId) => {
  const endpoint = buildApiEndpoint('auth/facebook/verify')
  
  console.log('[SocialAuth] Verifying Facebook token', { endpoint, userId })
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, {
      access_token: accessToken,
      user_id: userId
    }),
    {
      defaultValue: null,
      transformData: (data) => {
        console.log('[SocialAuth] Facebook authentication successful')
        return data
      },
      logErrors: true
    }
  )
}

// Load Google Sign-In library
export const loadGoogleSignIn = () => {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Sign-In library'))
    document.head.appendChild(script)
  })
}

// Load Facebook SDK
export const loadFacebookSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve()
      return
    }

    window.fbAsyncInit = function() {
      const config = getSocialConfig('facebook')
      window.FB.init({
        appId: config.appId,
        cookie: true,
        xfbml: true,
        version: config.version
      })
      resolve()
    }

    // Load the SDK asynchronously
    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.onerror = () => reject(new Error('Failed to load Facebook SDK'))
    document.head.appendChild(script)
  })
}

// Initialize social login SDKs
export const initializeSocialAuth = async () => {
  try {
    // Load both SDKs concurrently
    const [googleResult, facebookResult] = await Promise.allSettled([
      loadGoogleSignIn(),
      loadFacebookSDK()
    ])

    const results = {
      google: googleResult.status === 'fulfilled',
      facebook: facebookResult.status === 'fulfilled'
    }

    if (googleResult.status === 'rejected') {
      console.warn('Failed to load Google Sign-In:', googleResult.reason)
    }

    if (facebookResult.status === 'rejected') {
      console.warn('Failed to load Facebook SDK:', facebookResult.reason)
    }

    return results
  } catch (error) {
    console.error('Failed to initialize social auth:', error)
    return { google: false, facebook: false }
  }
}

// Export service object
export const socialAuthService = {
  authenticateWithGoogle,
  authenticateWithFacebook,
  verifyGoogleToken,
  verifyFacebookToken,
  loadGoogleSignIn,
  loadFacebookSDK,
  initializeSocialAuth
}