import { Link } from 'react-router-dom'
import { FiHome } from 'react-icons/fi'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <h1 className="text-8xl font-bold text-dark-700">404</h1>
      <h2 className="text-2xl font-semibold mt-4">Page non trouvée</h2>
      <p className="text-dark-400 mt-2">La page que vous recherchez n'existe pas ou a été déplacée.</p>
      <Link to="/" className="btn btn-primary mt-6">
        <FiHome /> Retour à l'accueil
      </Link>
    </div>
  )
}
