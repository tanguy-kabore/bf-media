import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    const result = await register({
      email: formData.email,
      username: formData.username,
      displayName: formData.displayName,
      password: formData.password
    })
    if (result.success) {
      toast.success('Compte créé avec succès !')
      navigate('/')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center font-bold text-xl">
              BF
            </div>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Créer un compte</h1>
          <p className="text-dark-400 mt-2">Rejoignez BF Media dès maintenant</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nom d'utilisateur</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="monusername"
                className="input pl-10"
                required
                pattern="[a-zA-Z0-9_]+"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nom affiché</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Mon Nom"
                className="input pl-10"
              />
            </div>
          </div>

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
                className="input pl-10 pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

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
                className="input pl-10"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary w-full py-3">
            {isLoading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center mt-6 text-dark-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary-400 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
