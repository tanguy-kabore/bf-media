import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMenu, FiSearch, FiBell, FiVideo, FiUser, FiLogOut, FiSettings, FiChevronDown, FiPlus, FiLayers } from 'react-icons/fi'
import useAuthStore from '../store/authStore'

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, channel, channels, isAuthenticated, logout, fetchChannels, switchChannel } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showChannelSwitcher, setShowChannelSwitcher] = useState(false)
  const dropdownRef = useRef(null)
  const channelSwitcherRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
      if (channelSwitcherRef.current && !channelSwitcherRef.current.contains(event.target)) {
        setShowChannelSwitcher(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchChannels()
    }
  }, [isAuthenticated])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setShowDropdown(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-dark-950 border-b border-dark-800 z-50 px-4">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="p-2 hover:bg-dark-800 rounded-full">
            <FiMenu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center font-bold">
              BF
            </div>
            <span className="text-xl font-semibold hidden sm:block">Media</span>
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-l-full focus:outline-none focus:border-primary-500"
            />
            <button
              type="submit"
              className="px-6 bg-dark-800 border border-l-0 border-dark-700 rounded-r-full hover:bg-dark-700"
            >
              <FiSearch className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/upload" className="p-2 hover:bg-dark-800 rounded-full" title="Uploader">
                <FiVideo className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-dark-800 rounded-full relative"
              >
                <FiBell className="w-5 h-5" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-8 h-8 rounded-full overflow-hidden bg-dark-700"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-full h-full p-1.5" />
                  )}
                </button>
                {showDropdown && (
                  <div className="dropdown">
                    <div className="p-4 border-b border-dark-700">
                      <p className="font-medium">{user?.displayName}</p>
                      <p className="text-sm text-dark-400">@{user?.username}</p>
                    </div>
                    
                    {/* Channel Switcher */}
                    <div className="p-2 border-b border-dark-700">
                      <p className="text-xs text-dark-400 px-2 mb-1">Chaîne active</p>
                      <div className="relative" ref={channelSwitcherRef}>
                        <button 
                          onClick={() => setShowChannelSwitcher(!showChannelSwitcher)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                            {(channel?.avatar_url || user?.avatarUrl) ? (
                              <img src={channel?.avatar_url || user?.avatarUrl} alt={channel.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-medium">
                                {channel?.name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium truncate">{channel?.name}</p>
                            <p className="text-xs text-dark-400">@{channel?.handle}</p>
                          </div>
                          <FiChevronDown className={`w-4 h-4 transition-transform ${showChannelSwitcher ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showChannelSwitcher && (
                          <div className="absolute left-0 right-0 mt-1 bg-dark-800 rounded-lg border border-dark-700 overflow-hidden z-10">
                            {channels.map((ch) => (
                              <button
                                key={ch.id}
                                onClick={() => {
                                  switchChannel(ch.id)
                                  setShowChannelSwitcher(false)
                                }}
                                className={`w-full flex items-center gap-2 p-2 hover:bg-dark-700 ${ch.id === channel?.id ? 'bg-dark-700' : ''}`}
                              >
                                <div className="w-6 h-6 rounded-full bg-dark-600 overflow-hidden">
                                  {(ch.avatar_url || user?.avatarUrl) ? (
                                    <img src={ch.avatar_url || user?.avatarUrl} alt={ch.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs">{ch.name?.charAt(0)}</div>
                                  )}
                                </div>
                                <span className="text-sm truncate">{ch.name}</span>
                              </button>
                            ))}
                            <Link 
                              to="/channels/manage" 
                              onClick={() => { setShowDropdown(false); setShowChannelSwitcher(false); }}
                              className="flex items-center gap-2 p-2 text-primary-400 hover:bg-dark-700 border-t border-dark-700"
                            >
                              <FiPlus className="w-4 h-4" />
                              <span className="text-sm">Créer une chaîne</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link to={`/channel/${channel?.handle}`} className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <FiUser className="w-5 h-5" />
                      <span>Ma chaîne</span>
                    </Link>
                    <Link to="/channels/manage" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <FiLayers className="w-5 h-5" />
                      <span>Gérer mes chaînes</span>
                    </Link>
                    <Link to="/studio" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <FiVideo className="w-5 h-5" />
                      <span>Studio</span>
                    </Link>
                    <Link to="/settings" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <FiSettings className="w-5 h-5" />
                      <span>Paramètres</span>
                    </Link>
                    <button onClick={handleLogout} className="dropdown-item w-full text-red-400">
                      <FiLogOut className="w-5 h-5" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">
              <FiUser className="w-4 h-4" />
              <span>Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
