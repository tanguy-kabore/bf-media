import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      toast.success('Connexion réussie !')
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
          <h1 className="text-2xl font-bold mt-4">Connexion</h1>
          <p className="text-dark-400 mt-2">Connectez-vous à votre compte BF Media</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mot de passe</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-10 pr-10"
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full py-3"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center mt-6 text-dark-400">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary-400 hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
