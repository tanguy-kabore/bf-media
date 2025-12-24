import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiPlay, FiCheck, FiAlertCircle, FiInfo } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    emailPrefix: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [emailPrefixWarning, setEmailPrefixWarning] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'emailPrefix') {
      // Détecter les caractères interdits AVANT de les supprimer
      const forbiddenChars = value.match(/[@\s,;:!?#$%^&*()+=\[\]{}|\\/<>"'`~]/g)
      
      if (forbiddenChars) {
        const uniqueChars = [...new Set(forbiddenChars)].join(' ')
        setEmailPrefixWarning(`⚠️ Caractères interdits détectés : ${uniqueChars}`)
        setShowTooltip(true)
        
        // Masquer l'info-bulle après 3 secondes
        setTimeout(() => setShowTooltip(false), 3000)
      } else {
        setEmailPrefixWarning('')
      }
      
      // Ne garder que les caractères autorisés : lettres, chiffres, points, tirets et underscores
      const sanitized = value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
      setFormData({ ...formData, [name]: sanitized })
    } else {
      setFormData({ ...formData, [name]: value })
    }
    
    // Effacer l'erreur quand l'utilisateur modifie le champ
    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Validation préfixe email (minimum 3 caractères)
    if (formData.emailPrefix.length < 3) {
      newErrors.emailPrefix = 'L\'identifiant doit contenir au moins 3 caractères'
    }
    
    // Validation nom d'utilisateur (minimum 3 caractères)
    if (formData.username.length < 3) {
      newErrors.username = 'Le pseudo doit contenir au moins 3 caractères'
    }
    
    // Validation mot de passe
    if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères'
    }
    
    // Validation confirmation mot de passe
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
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
    const fullEmail = `${formData.emailPrefix}@tipoko.bf`
    
    const result = await register({
      email: fullEmail,
      username: formData.username,
      displayName: formData.displayName || formData.username,
      password: formData.password
    })
    if (result.success) {
      toast.success('Compte créé avec succès !')
      navigate('/')
    } else {
      toast.error(result.error)
    }
  }

  const passwordStrength = formData.password.length >= 8

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <FiPlay className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent">TIPOKO</span>
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mt-6">Créer un compte</h1>
          <p className="text-dark-400 mt-2">Rejoignez la communauté TIPOKO</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-8 space-y-4">
          {/* Email TIPOKO */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2">
              Votre identifiant TIPOKO
              <span className="text-dark-400 font-normal ml-1">(votre adresse email)</span>
            </label>
            <div className="relative flex">
              <div className="relative flex-1">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  name="emailPrefix"
                  value={formData.emailPrefix}
                  onChange={handleChange}
                  onFocus={() => setShowTooltip(false)}
                  placeholder="votre.identifiant"
                  className={`input pl-10 rounded-r-none border-r-0 transition-all ${
                    errors.emailPrefix ? 'border-red-500 focus:border-red-500' : 
                    emailPrefixWarning ? 'border-yellow-500 focus:border-yellow-500' : ''
                  }`}
                  required
                  autoComplete="off"
                />
              </div>
              <span className="inline-flex items-center px-3 sm:px-4 bg-dark-700 border border-dark-600 border-l-0 rounded-r-xl text-dark-300 text-xs sm:text-sm font-medium">
                @tipoko.bf
              </span>
            </div>
            
            {/* Info-bulle moderne pour caractères interdits */}
            {showTooltip && emailPrefixWarning && (
              <div className="absolute z-50 left-0 right-0 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-yellow-500/50 rounded-xl p-3 sm:p-4 shadow-xl shadow-yellow-500/10">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <FiAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-yellow-400 mb-1">Attention !</p>
                      <p className="text-xs sm:text-sm text-yellow-200/90 mb-2">{emailPrefixWarning}</p>
                      <div className="bg-dark-900/50 rounded-lg p-2 sm:p-3 space-y-1.5">
                        <p className="text-xs text-dark-300 flex items-center gap-1.5">
                          <FiCheck className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span>Utilisez uniquement : <span className="font-mono text-green-400">a-z 0-9 . - _</span></span>
                        </p>
                        <p className="text-xs text-dark-300 flex items-center gap-1.5">
                          <FiInfo className="w-3 h-3 text-blue-400 flex-shrink-0" />
                          <span>Exemple : <span className="font-mono text-blue-400">jean.dupont</span> ou <span className="font-mono text-blue-400">user_123</span></span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {errors.emailPrefix && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.emailPrefix}
              </p>
            )}
            <div className="mt-1 space-y-1">
              <p className="text-xs text-dark-500">Cet identifiant sera votre adresse email sur TIPOKO</p>
              <p className="text-xs text-primary-400/70 flex items-center gap-1">
                <FiInfo className="w-3 h-3" />
                N'entrez que le préfixe (avant @tipoko.bf)
              </p>
            </div>
          </div>

          {/* Pseudo (username) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Pseudo
              <span className="text-dark-400 font-normal ml-1">(identifiant unique pour votre chaîne)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">@</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="monpseudo"
                className={`input pl-8 ${errors.username ? 'border-red-500 focus:border-red-500' : ''}`}
                required
                pattern="[a-zA-Z0-9_]+"
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.username}
              </p>
            )}
            <p className="mt-1 text-xs text-dark-500">Utilisé dans l'URL de votre chaîne (ex: tipoko.bf/@monpseudo)</p>
          </div>

          {/* Nom affiché */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Nom affiché
              <span className="text-dark-400 font-normal ml-1">(optionnel)</span>
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Mon Nom Complet"
                className="input pl-10"
              />
            </div>
            <p className="mt-1 text-xs text-dark-500">Le nom visible sur votre chaîne (par défaut: votre pseudo)</p>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium mb-2">Mot de passe</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
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

          {/* Confirmer mot de passe */}
          <div>
            <label className="block text-sm font-medium mb-2">Confirmer le mot de passe</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`input pl-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Password strength indicator */}
          {formData.password && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordStrength ? 'bg-green-500' : 'bg-red-500/50'}`}>
                {passwordStrength && <FiCheck className="w-3 h-3" />}
              </div>
              <span className={passwordStrength ? 'text-green-400' : 'text-red-400'}>
                {passwordStrength ? 'Mot de passe valide (8+ caractères)' : `Encore ${8 - formData.password.length} caractère(s) requis`}
              </span>
            </div>
          )}

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
                Création...
              </span>
            ) : 'Créer mon compte'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-900/50 text-dark-400">ou</span>
            </div>
          </div>

          <p className="text-center text-dark-400">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Se connecter</Link>
          </p>
        </form>

        <p className="text-center mt-6 text-dark-500 text-sm">
          En créant un compte, vous acceptez nos{' '}
          <Link to="/terms" className="text-primary-400 hover:text-primary-300 underline transition-colors">
            conditions d'utilisation
          </Link>
        </p>
      </div>
    </div>
  )
}
