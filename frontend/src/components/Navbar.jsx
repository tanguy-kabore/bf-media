import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMenu, FiSearch, FiBell, FiVideo, FiUser, FiLogOut, FiSettings, FiChevronDown, FiPlus, FiLayers, FiArrowLeft, FiX, FiShield, FiFileText, FiPlay } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import usePlatformStore from '../store/platformStore'

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, channel, channels, isAuthenticated, logout, fetchChannels, switchChannel } = useAuthStore()
  const platformName = usePlatformStore(state => state.getPlatformName())
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showChannelSwitcher, setShowChannelSwitcher] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const dropdownRef = useRef(null)
  const channelSwitcherRef = useRef(null)
  const searchInputRef = useRef(null)

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

  // Focus search input when opened on mobile
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      setIsSearchOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setShowDropdown(false)
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <>
      {/* Mobile Full-Screen Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-dark-950 z-[60] lg:hidden">
          <div className="flex items-center h-14 px-2 gap-2 border-b border-dark-800">
            <button 
              onClick={closeSearch}
              className="p-2 hover:bg-dark-800 rounded-full flex-shrink-0"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <form onSubmit={handleSearch} className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Rechercher sur ${platformName}...`}
                className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-full focus:outline-none focus:border-primary-500 text-base"
                autoFocus
              />
            </form>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-2 hover:bg-dark-800 rounded-full flex-shrink-0"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
          {/* Search suggestions could go here */}
          <div className="p-4">
            <p className="text-dark-400 text-sm">Recherchez des vidéos, chaînes...</p>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-dark-950/95 backdrop-blur-sm border-b border-dark-800 z-50 px-2 sm:px-4">
        <div className="flex items-center justify-between h-full gap-2 sm:gap-4 max-w-full">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            <button onClick={onMenuClick} className="p-2 hover:bg-dark-800 rounded-full flex-shrink-0 flex items-center justify-center">
              <FiMenu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <FiPlay className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-white leading-none">{platformName.toUpperCase()}</span>
            </Link>
          </div>

          {/* Center: Search Bar (Hidden on mobile, replaced by icon) */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-4 hidden sm:block">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-4 py-2 pl-10 bg-dark-900/80 border border-dark-700 rounded-full focus:outline-none focus:border-primary-500 focus:bg-dark-900 text-sm transition-colors"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-700 rounded-full"
                >
                  <FiX className="w-4 h-4 text-dark-400" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-full transition-colors"
              >
                <FiSearch className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Search Button */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:bg-dark-800 rounded-full sm:hidden"
            >
              <FiSearch className="w-5 h-5" />
            </button>

            {isAuthenticated ? (
            <>
              <Link to="/upload" className="p-2 hover:bg-dark-800 rounded-full flex items-center justify-center" title="Uploader une vidéo">
                <FiVideo className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-dark-800 rounded-full relative hidden sm:flex items-center justify-center"
              >
                <FiBell className="w-5 h-5" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex-shrink-0"
                  style={{ padding: 0, background: 'none', border: 'none' }}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-dark-700 flex items-center justify-center">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.displayName} 
                        className="w-9 h-9 rounded-full object-cover"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      />
                    ) : (
                      <FiUser className="w-5 h-5" />
                    )}
                  </div>
                </button>
                {showDropdown && (
                  <div className="dropdown">
                    <div className="p-4 border-b border-dark-700">
                      <p className="font-medium">{user?.displayName}</p>
                      <p className="text-sm text-dark-400">@{user?.username}</p>
                    </div>
                    
                    {/* Channel Switcher */}
                    {channels.length > 0 && (
                    <div className="p-2 border-b border-dark-700">
                      <p className="text-xs text-dark-400 px-2 mb-1">Chaîne active</p>
                      <div className="relative" ref={channelSwitcherRef}>
                        <button 
                          onClick={() => setShowChannelSwitcher(!showChannelSwitcher)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                            {(channel?.avatar_url || user?.avatarUrl) ? (
                              <img src={channel?.avatar_url || user?.avatarUrl} alt={channel?.name || ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-medium">
                                {channel?.name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium truncate">{channel?.name || 'Sélectionner'}</p>
                            <p className="text-xs text-dark-400">@{channel?.handle || '---'}</p>
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
                    )}

                    {channel && (
                      <Link to={`/channel/${channel.handle}`} className="dropdown-item" onClick={() => setShowDropdown(false)}>
                        <FiUser className="w-5 h-5" />
                        <span>Ma chaîne</span>
                      </Link>
                    )}
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
                    {user?.role === 'admin' && (
                      <Link to="/admin" className="dropdown-item text-primary-400" onClick={() => setShowDropdown(false)}>
                        <FiShield className="w-5 h-5" />
                        <span>Administration</span>
                      </Link>
                    )}
                    <Link to="/license" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <FiFileText className="w-5 h-5" />
                      <span>Licence</span>
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
            <Link 
              to="/login" 
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-full shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 text-sm"
            >
              <FiUser className="w-4 h-4" />
              <span>Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
    </>
  )
}
