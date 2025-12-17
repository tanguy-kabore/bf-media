import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { FiUser, FiLock, FiBell, FiShield, FiCamera, FiCheckCircle, FiUpload, FiX, FiClock, FiAlertCircle } from 'react-icons/fi'
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

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [verificationForm, setVerificationForm] = useState({
    documentType: 'national_id',
    fullName: '',
    dateOfBirth: '',
    documentFrontUrl: '',
    documentBackUrl: ''
  })
  const [uploadingDoc, setUploadingDoc] = useState({ front: false, back: false })
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const frontInputRef = useRef(null)
  const backInputRef = useRef(null)

  useEffect(() => {
    if (activeTab === 'verification') fetchVerificationStatus()
  }, [activeTab])

  const fetchVerificationStatus = async () => {
    try {
      const res = await api.get('/users/verification/status')
      setVerificationStatus(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDocUpload = async (e, side) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingDoc(prev => ({ ...prev, [side]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/upload/document', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setVerificationForm(prev => ({ ...prev, [side === 'front' ? 'documentFrontUrl' : 'documentBackUrl']: res.data.url }))
      toast.success(`Document ${side === 'front' ? 'recto' : 'verso'} uploadé`)
    } catch (e) {
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploadingDoc(prev => ({ ...prev, [side]: false }))
    }
  }

  const submitVerification = async (e) => {
    e.preventDefault()
    if (!verificationForm.documentFrontUrl || !verificationForm.fullName) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (verificationForm.documentType === 'national_id' && !verificationForm.documentBackUrl) {
      toast.error('Veuillez uploader les deux côtés de la carte d\'identité')
      return
    }
    setSubmittingVerification(true)
    try {
      await api.post('/users/verification/request', verificationForm)
      toast.success('Demande de vérification soumise')
      fetchVerificationStatus()
      setVerificationForm({ documentType: 'national_id', fullName: '', dateOfBirth: '', documentFrontUrl: '', documentBackUrl: '' })
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur')
    } finally {
      setSubmittingVerification(false)
    }
  }

  const tabs = [
    { id: 'profile', icon: FiUser, label: 'Profil' },
    { id: 'password', icon: FiLock, label: 'Mot de passe' },
    { id: 'notifications', icon: FiBell, label: 'Notifications' },
    { id: 'privacy', icon: FiShield, label: 'Confidentialité' },
    { id: 'verification', icon: FiCheckCircle, label: 'Vérification' },
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

          {activeTab === 'verification' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Vérification du compte</h2>
                {verificationStatus?.hasBadge && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                    <FiCheckCircle className="w-4 h-4" /> Compte vérifié
                  </span>
                )}
              </div>

              {verificationStatus?.hasBadge ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <FiCheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-green-400">Votre compte est vérifié</p>
                      <p className="text-sm text-dark-400">Vous bénéficiez du badge de vérification sur votre profil.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Pending request notice */}
                  {verificationStatus?.requests?.some(r => r.status === 'pending') && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <FiClock className="w-6 h-6 text-yellow-400" />
                        <div>
                          <p className="font-medium text-yellow-400">Demande en cours d'examen</p>
                          <p className="text-sm text-dark-400">Votre demande est en cours de traitement. Nous vous informerons du résultat.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last rejected request */}
                  {verificationStatus?.requests?.find(r => r.status === 'rejected') && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FiAlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-400">Dernière demande rejetée</p>
                          <p className="text-sm text-dark-400 mt-1">
                            Raison : {verificationStatus.requests.find(r => r.status === 'rejected')?.rejection_reason || 'Non spécifiée'}
                          </p>
                          <p className="text-sm text-dark-400 mt-1">Vous pouvez soumettre une nouvelle demande ci-dessous.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification form */}
                  {!verificationStatus?.requests?.some(r => r.status === 'pending') && (
                    <form onSubmit={submitVerification} className="space-y-4">
                      <div className="bg-dark-800 rounded-lg p-4">
                        <p className="text-sm text-dark-400 mb-2">
                          Pour vérifier votre compte, veuillez soumettre une pièce d'identité valide. Vos documents seront examinés par notre équipe.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Type de document *</label>
                        <select
                          value={verificationForm.documentType}
                          onChange={(e) => setVerificationForm({ ...verificationForm, documentType: e.target.value, documentBackUrl: '' })}
                          className="input"
                        >
                          <option value="national_id">Carte Nationale d'Identité (CNI)</option>
                          <option value="passport">Passeport</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Nom complet (tel qu'il apparaît sur le document) *</label>
                        <input
                          type="text"
                          value={verificationForm.fullName}
                          onChange={(e) => setVerificationForm({ ...verificationForm, fullName: e.target.value })}
                          className="input"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Date de naissance</label>
                        <input
                          type="date"
                          value={verificationForm.dateOfBirth}
                          onChange={(e) => setVerificationForm({ ...verificationForm, dateOfBirth: e.target.value })}
                          className="input"
                        />
                      </div>

                      {/* Document uploads */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {verificationForm.documentType === 'national_id' ? 'Recto de la CNI *' : 'Page d\'identité du passeport *'}
                          </label>
                          <input type="file" ref={frontInputRef} onChange={(e) => handleDocUpload(e, 'front')} accept="image/*" className="hidden" />
                          <div 
                            onClick={() => !uploadingDoc.front && frontInputRef.current?.click()}
                            className={`border-2 border-dashed border-dark-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors ${verificationForm.documentFrontUrl ? 'border-green-500' : ''}`}
                          >
                            {uploadingDoc.front ? (
                              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                            ) : verificationForm.documentFrontUrl ? (
                              <div className="space-y-2">
                                <FiCheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                                <p className="text-sm text-green-400">Document uploadé</p>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setVerificationForm(f => ({ ...f, documentFrontUrl: '' })) }} className="text-xs text-red-400 hover:underline">Supprimer</button>
                              </div>
                            ) : (
                              <>
                                <FiUpload className="w-8 h-8 text-dark-400 mx-auto mb-2" />
                                <p className="text-sm text-dark-400">Cliquez pour uploader</p>
                              </>
                            )}
                          </div>
                        </div>

                        {verificationForm.documentType === 'national_id' && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Verso de la CNI *</label>
                            <input type="file" ref={backInputRef} onChange={(e) => handleDocUpload(e, 'back')} accept="image/*" className="hidden" />
                            <div 
                              onClick={() => !uploadingDoc.back && backInputRef.current?.click()}
                              className={`border-2 border-dashed border-dark-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors ${verificationForm.documentBackUrl ? 'border-green-500' : ''}`}
                            >
                              {uploadingDoc.back ? (
                                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                              ) : verificationForm.documentBackUrl ? (
                                <div className="space-y-2">
                                  <FiCheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                                  <p className="text-sm text-green-400">Document uploadé</p>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setVerificationForm(f => ({ ...f, documentBackUrl: '' })) }} className="text-xs text-red-400 hover:underline">Supprimer</button>
                                </div>
                              ) : (
                                <>
                                  <FiUpload className="w-8 h-8 text-dark-400 mx-auto mb-2" />
                                  <p className="text-sm text-dark-400">Cliquez pour uploader</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button type="submit" disabled={submittingVerification} className="btn btn-primary w-full">
                        {submittingVerification ? 'Envoi en cours...' : 'Soumettre la demande'}
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* Request history */}
              {verificationStatus?.requests?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Historique des demandes</h3>
                  <div className="space-y-2">
                    {verificationStatus.requests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {req.status === 'pending' ? 'En attente' : req.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                          </span>
                          <span className="text-sm">{req.document_type === 'national_id' ? 'CNI' : 'Passeport'}</span>
                        </div>
                        <span className="text-xs text-dark-400">{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
