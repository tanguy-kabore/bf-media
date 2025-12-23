import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiPlay, FiAlertCircle } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [emailPrefix, setEmailPrefix] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const handleEmailChange = (e) => {
    // N'autoriser que lettres, chiffres, points et tirets
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
    setEmailPrefix(sanitized)
    if (errors.emailPrefix) setErrors({ ...errors, emailPrefix: null })
  }

  const handlePasswordChange = (e) => {
    setPassword(e.target.value)
    if (errors.password) setErrors({ ...errors, password: null })
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (emailPrefix.length < 3) {
      newErrors.emailPrefix = 'L\'identifiant doit contenir au moins 3 caractères'
    }
    
    if (password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    // Construire l'email complet
    const fullEmail = `${emailPrefix}@tipoko.bf`
    
    const result = await login(fullEmail, password)
    if (result.success) {
      toast.success('Connexion réussie !')
      navigate('/')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <FiPlay className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent">TIPOKO</span>
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mt-6">Bon retour !</h1>
          <p className="text-dark-400 mt-2">Connectez-vous pour continuer sur TIPOKO</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-8 space-y-5">
          {/* Identifiant TIPOKO */}
          <div>
            <label className="block text-sm font-medium mb-2">Identifiant TIPOKO</label>
            <div className="relative flex">
              <div className="relative flex-1">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  value={emailPrefix}
                  onChange={handleEmailChange}
                  placeholder="votre.identifiant"
                  className={`input pl-10 rounded-r-none border-r-0 ${errors.emailPrefix ? 'border-red-500 focus:border-red-500' : ''}`}
                  required
                />
              </div>
              <span className="inline-flex items-center px-4 bg-dark-700 border border-dark-600 border-l-0 rounded-r-xl text-dark-300 text-sm font-medium">
                @tipoko.bf
              </span>
            </div>
            {errors.emailPrefix && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.emailPrefix}
              </p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium mb-2">Mot de passe</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className={`input pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connexion...
              </span>
            ) : 'Se connecter'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-900/50 text-dark-400">ou</span>
            </div>
          </div>

          <p className="text-center text-dark-400">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Créer un compte
            </Link>
          </p>
        </form>

        <p className="text-center mt-6 text-dark-500 text-sm">
          En vous connectant, vous acceptez nos conditions d'utilisation
        </p>
      </div>
    </div>
  )
}
