import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { FiUser, FiLock, FiBell, FiShield, FiCamera } from 'react-icons/fi'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, isAuthenticated, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({ displayName: '', bio: '' })
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)
  
  // Preferences state
  const [notifications, setNotifications] = useState({
    newVideos: true,
    comments: true,
    subscribers: true
  })
  const [privacy, setPrivacy] = useState({
    privateSubscriptions: false,
    privatePlaylists: false
  })
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileData({ displayName: user.displayName || '', bio: user.bio || '' })
      setAvatarPreview(user.avatarUrl)
      fetchPreferences()
    }
  }, [user])

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/users/preferences')
      setNotifications(response.data.notifications)
      setPrivacy(response.data.privacy)
    } catch (error) {
      console.error('Error fetching preferences:', error)
    }
  }

  const saveNotifications = async (newNotifications) => {
    setNotifications(newNotifications)
    setSavingPrefs(true)
    try {
      await api.put('/users/preferences', { notifications: newNotifications })
      toast.success('Préférences enregistrées')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingPrefs(false)
    }
  }

  const savePrivacy = async (newPrivacy) => {
    setPrivacy(newPrivacy)
    setSavingPrefs(true)
    try {
      await api.put('/users/preferences', { privacy: newPrivacy })
      toast.success('Préférences enregistrées')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Preview
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)

    // Upload
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const response = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      updateUser({ avatarUrl: response.data.avatarUrl })
      toast.success('Photo de profil mise à jour')
    } catch (error) {
      toast.error('Erreur lors de l\'upload')
      setAvatarPreview(user?.avatarUrl)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put('/users/profile', profileData)
      updateUser(profileData)
      toast.success('Profil mis à jour')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Mot de passe modifié')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const tabs = [
    { id: 'profile', icon: FiUser, label: 'Profil' },
    { id: 'password', icon: FiLock, label: 'Mot de passe' },
    { id: 'notifications', icon: FiBell, label: 'Notifications' },
    { id: 'privacy', icon: FiShield, label: 'Confidentialité' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-48 flex-shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`sidebar-link w-full md:w-auto whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold">Informations du profil</h2>
              
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium mb-3">Photo de profil</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-dark-700 overflow-hidden">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-dark-400">
                          {user?.displayName?.charAt(0) || user?.username?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="btn btn-secondary"
                      disabled={uploadingAvatar}
                    >
                      <FiCamera className="w-4 h-4" />
                      <span>Changer la photo</span>
                    </button>
                    <p className="text-xs text-dark-400 mt-2">JPG, PNG ou WebP. Max 5 Mo.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nom affiché</label>
                <input
                  type="text"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="Parlez de vous..."
                />
              </div>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Changer le mot de passe</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Mot de passe actuel</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="input"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Modifier</button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Préférences de notification</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.newVideos}
                    onChange={(e) => saveNotifications({ ...notifications, newVideos: e.target.checked })}
                    disabled={savingPrefs}
                    className="w-5 h-5 rounded accent-primary-500" 
                  />
                  <span>Nouvelles vidéos des abonnements</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.comments}
                    onChange={(e) => saveNotifications({ ...notifications, comments: e.target.checked })}
                    disabled={savingPrefs}
                    className="w-5 h-5 rounded accent-primary-500" 
                  />
                  <span>Réponses à mes commentaires</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.subscribers}
                    onChange={(e) => saveNotifications({ ...notifications, subscribers: e.target.checked })}
                    disabled={savingPrefs}
                    className="w-5 h-5 rounded accent-primary-500" 
                  />
                  <span>Nouveaux abonnés</span>
                </label>
              </div>
              {savingPrefs && <p className="text-sm text-dark-400 mt-4">Enregistrement...</p>}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Paramètres de confidentialité</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={privacy.privateSubscriptions}
                    onChange={(e) => savePrivacy({ ...privacy, privateSubscriptions: e.target.checked })}
                    disabled={savingPrefs}
                    className="w-5 h-5 rounded accent-primary-500" 
                  />
                  <span>Garder mes abonnements privés</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={privacy.privatePlaylists}
                    onChange={(e) => savePrivacy({ ...privacy, privatePlaylists: e.target.checked })}
                    disabled={savingPrefs}
                    className="w-5 h-5 rounded accent-primary-500" 
                  />
                  <span>Garder mes playlists privées par défaut</span>
                </label>
              </div>
              {savingPrefs && <p className="text-sm text-dark-400 mt-4">Enregistrement...</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
