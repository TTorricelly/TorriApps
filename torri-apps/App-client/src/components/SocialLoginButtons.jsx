import React from 'react'
import { Loader2 } from './icons'

// Google and Facebook SVG icons as components
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.99 10.1871C19.99 9.36767 19.9246 8.76973 19.7813 8.14966H10.1943V11.848H15.8013C15.7389 12.767 15.1569 14.1512 13.9155 15.0812L13.8951 15.2051L16.8515 17.4969L17.0624 17.5174C18.9061 15.7789 19.99 13.221 19.99 10.1871Z" fill="#4285F4"/>
    <path d="M10.1943 19.9912C12.9542 19.9912 15.2637 19.1151 17.0624 17.5174L13.9155 15.0812C13.0507 15.6677 11.9236 16.0344 10.1943 16.0344C7.50242 16.0344 5.21336 14.2959 4.39711 11.9097L4.27791 11.9186L1.20013 14.2885L1.15979 14.4009C2.95336 17.9434 6.28619 19.9912 10.1943 19.9912Z" fill="#34A853"/>
    <path d="M4.39711 11.9097C4.27589 11.295 4.20455 10.6569 4.20455 9.99561C4.20455 9.33417 4.27589 8.69605 4.38585 8.08133L4.38239 7.94853L1.26601 5.53418L1.15979 5.58984C0.496941 6.90704 0.129395 8.40886 0.129395 9.99561C0.129395 11.5824 0.496941 13.0842 1.15979 14.4009L4.39711 11.9097Z" fill="#FBBC05"/>
    <path d="M10.1943 3.95652C12.2884 3.95652 13.7322 4.83819 14.5608 5.59722L17.3576 2.89655C15.2566 0.993055 12.9542 0 10.1943 0C6.28619 0 2.95336 2.04781 1.15979 5.58984L4.38585 8.08133C5.21336 5.69516 7.50242 3.95652 10.1943 3.95652Z" fill="#EA4335"/>
  </svg>
)

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" fill="#1877F2"/>
    <path d="M13.893 12.89L14.336 10H11.607V8.125C11.607 7.334 11.994 6.563 13.237 6.563h1.26V4.103s-1.144-.195-2.238-.195c-2.285 0-3.777 1.384-3.777 3.89V10H6.942v2.89h2.54v6.987c.507.08 1.021.123 1.518.123.497 0 1.011-.043 1.518-.123V12.89h2.375z" fill="white"/>
  </svg>
)

const SocialLoginButtons = ({ onGoogleLogin, onFacebookLogin, isLoading, disabled = false }) => {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={disabled || isLoading}
        className="w-full py-4 border border-gray-300 text-gray-700 font-medium rounded-xl button-press transition-smooth hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
      >
        {isLoading === 'google' ? (
          <Loader2 size={20} className="spinner" />
        ) : (
          <GoogleIcon />
        )}
        <span>Continuar com Google</span>
      </button>
      
      <button
        type="button"
        onClick={onFacebookLogin}
        disabled={disabled || isLoading}
        className="w-full py-4 border border-gray-300 text-gray-700 font-medium rounded-xl button-press transition-smooth hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
      >
        {isLoading === 'facebook' ? (
          <Loader2 size={20} className="spinner" />
        ) : (
          <FacebookIcon />
        )}
        <span>Continuar com Facebook</span>
      </button>
    </div>
  )
}

export default SocialLoginButtons