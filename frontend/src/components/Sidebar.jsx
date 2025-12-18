import { NavLink, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FiHome, FiCompass, FiPlayCircle, FiClock, FiBookmark, FiThumbsUp, FiFilm, FiMusic, FiMonitor, FiTrendingUp } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import api from '../services/api'
import AdBanner from './AdBanner'

const mainLinks = [
  { to: '/', icon: FiHome, label: 'Accueil' },
  { to: '/explore', icon: FiCompass, label: 'Explorer' },
  { to: '/subscriptions', icon: FiPlayCircle, label: 'Abonnements', auth: true },
]

const libraryLinks = [
  { to: '/history', icon: FiClock, label: 'Historique', auth: true },
  { to: '/saved', icon: FiBookmark, label: 'À regarder plus tard', auth: true },
  { to: '/liked', icon: FiThumbsUp, label: 'Vidéos aimées', auth: true },
]

const categoryLinks = [
  { to: '/category/trending', icon: FiTrendingUp, label: 'Tendances' },
  { to: '/category/music', icon: FiMusic, label: 'Musique' },
  { to: '/category/gaming', icon: FiMonitor, label: 'Jeux vidéo' },
  { to: '/category/films', icon: FiFilm, label: 'Films' },
]

export default function Sidebar({ collapsed, isOpen, isMobile, onClose }) {
  const { isAuthenticated } = useAuthStore()
  const [subscriptions, setSubscriptions] = useState([])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubscriptions()
    }
  }, [isAuthenticated])

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/subscriptions')
      setSubscriptions(response.data.subscriptions || [])
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    }
  }

  const renderLinks = (links) => {
    return links.map((link) => {
      if (link.auth && !isAuthenticated) return null
      
      return (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={() => isMobile && onClose?.()}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'justify-center px-0' : ''}`
          }
        >
          <link.icon className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>{link.label}</span>}
        </NavLink>
      )
    })
  }

  // Hide sidebar on mobile unless open
  if (isMobile && !isOpen) {
    return null
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={onClose}
        />
      )}
      <aside 
        className={`fixed left-0 top-14 bottom-0 bg-dark-950 border-r border-dark-800 overflow-y-auto transition-all duration-300 z-50 ${
          isMobile ? 'w-64' : (collapsed ? 'w-20' : 'w-60')
        }`}
      >
      <div className="py-3 px-3">
        <div className="space-y-1">
          {renderLinks(mainLinks)}
        </div>

        {!collapsed && (
          <>
            <div className="my-3 border-t border-dark-800" />
            <div className="space-y-1">
              <p className="px-4 py-2 text-sm font-medium text-dark-400">Bibliothèque</p>
              {renderLinks(libraryLinks)}
            </div>

            {subscriptions.length > 0 && (
              <>
                <div className="my-3 border-t border-dark-800" />
                <div className="space-y-1">
                  <p className="px-4 py-2 text-sm font-medium text-dark-400">Abonnements</p>
                  {subscriptions.slice(0, 7).map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/channel/${sub.handle}`}
                      onClick={() => isMobile && onClose?.()}
                      className="sidebar-link"
                    >
                      <div className="w-6 h-6 rounded-full bg-dark-700 overflow-hidden flex-shrink-0">
                        {sub.avatar_url ? (
                          <img src={sub.avatar_url} alt={sub.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">{sub.name?.charAt(0)}</div>
                        )}
                      </div>
                      <span className="truncate">{sub.name}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="my-3 border-t border-dark-800" />
            <div className="space-y-1">
              <p className="px-4 py-2 text-sm font-medium text-dark-400">Catégories</p>
              {renderLinks(categoryLinks)}
            </div>

            <div className="my-3 border-t border-dark-800" />
            <div className="px-2">
              <AdBanner position="sidebar" />
            </div>

            <div className="my-3 border-t border-dark-800" />
            <div className="px-4 py-4 text-xs text-dark-500">
              <p>© {new Date().getFullYear()} TIPOKO</p>
              <p className="mt-1">Tous droits réservés</p>
            </div>
          </>
        )}
      </div>
    </aside>
    </>
  )
}
