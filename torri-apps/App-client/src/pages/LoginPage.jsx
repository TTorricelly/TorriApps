import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Phone, Loader2 } from '../components/icons'
import { useAuthStore } from '../stores/authStore'
import { useViewModeStore } from '../stores/viewModeStore'
import { authService } from '../services/authService'
import { companyService } from '../services/companyService'
import { runAuthTests } from '../utils/authTestUtils'

// Helper function to check if user is professional
const isProfessionalRole = (role) => {
  return ['PROFISSIONAL', 'ATENDENTE', 'GESTOR'].includes(role);
}

const LoginPage = () => {
  const navigate = useNavigate()
  const { tenantSlug } = useParams()
  const { login, isLoading, setLoading } = useAuthStore()
  const { currentMode } = useViewModeStore()
  
  const [showPassword, setShowPassword] = useState(false)
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('Nome do Salão')
  const [error, setError] = useState('')

  // Fetch company information when component mounts
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const companyInfo = await companyService.getCompanyInfo()
        if (companyInfo.name) {
          setCompanyName(companyInfo.name)
        }
      } catch (error) {
        console.log('Failed to fetch company info, using default name:', error)
      }
    }

    fetchCompanyInfo()
    
    // Run authentication tests in development
    if (import.meta.env.DEV) {
      setTimeout(() => {
        runAuthTests()
      }, 1000)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!emailOrPhone || !password) {
      setError('Por favor, preencha todos os campos.')
      return
    }

    setError('')
    setLoading(true)
    
    try {
      const tokenData = await authService.login(emailOrPhone, password)
      
      if (tokenData) {
        const user = await login(tokenData)
        
        // Smart redirect based on user role and view mode
        if (user && isProfessionalRole(user.role)) {
          // Professional users: respect their current view mode
          const redirectPath = currentMode === 'client' ? `/${tenantSlug}/dashboard` : `/${tenantSlug}/professional/dashboard`
          navigate(redirectPath)
        } else {
          // Regular clients always go to client dashboard
          navigate(`/${tenantSlug}/dashboard`)
        }
      } else {
        setError('Credenciais inválidas. Tente novamente.')
      }
    } catch (error) {
      setError(error.message || 'Ocorreu um erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider) => {
    // Placeholder for social login
    setError(`Social login com ${provider} não implementado ainda.`)
  }

  const handleCreateAccount = () => {
    // Navigate to create account page (to be implemented)
    setError('Criação de conta será implementada em breve.')
  }

  return (
    <div className="h-full flex flex-col bg-pink-500">
      {/* Header */}
      <div className="safe-area-top bg-pink-500 px-6 py-6 text-center flex-shrink-0">
        <h1 className="text-3xl font-bold text-white mb-3">
          {companyName}
        </h1>
        <div className="text-center">
          <p className="text-pink-100 text-base mb-1">
            Acabou de baixar o app?
          </p>
          <button
            onClick={handleCreateAccount}
            className="text-white text-lg font-bold underline transition-smooth hover:text-pink-100"
          >
            Criar conta
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl mt-4 px-6 py-8 overflow-y-auto overflow-x-hidden mobile-scroll min-h-0">
        {/* Header Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Entrar na sua conta
          </h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email or Phone Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail ou Telefone
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {emailOrPhone.includes('@') ? (
                  <Mail size={20} />
                ) : (
                  <Phone size={20} />
                )}
              </div>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="seu@email.com ou (11) 99999-9999"
                className="w-full pl-11 pr-4 py-4 border border-gray-300 rounded-xl text-base bg-white input-focus transition-smooth"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full pl-11 pr-12 py-4 border border-gray-300 rounded-xl text-base bg-white input-focus transition-smooth"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-smooth"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              type="button"
              className="text-pink-500 text-sm hover:text-pink-600 transition-smooth"
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-pink-500 text-white text-lg font-bold rounded-xl button-press transition-smooth hover:bg-pink-600 disabled:bg-pink-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 size={20} className="spinner" />
            ) : (
              'Entrar'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">ou continue com</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              className="w-full py-4 border border-gray-300 text-gray-700 font-medium rounded-xl button-press transition-smooth hover:bg-gray-50"
            >
              Continuar com Google
            </button>
            
            <button
              type="button"
              onClick={() => handleSocialLogin('Facebook')}
              className="w-full py-4 border border-gray-300 text-gray-700 font-medium rounded-xl button-press transition-smooth hover:bg-gray-50"
            >
              Continuar com Facebook
            </button>
          </div>

          {/* Alternative Login Help */}
          <div className="text-center mt-8 pb-8">
            <p className="text-gray-500 text-sm">
              Já tem uma conta?{' '}
              <span className="text-pink-500 font-medium">
                Use suas credenciais acima
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage