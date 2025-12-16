import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX, FiExternalLink } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useAuthStore from '../store/authStore'

export default function ManageChannels() {
  const { user, channels, channel: activeChannel, fetchChannels, createChannel, deleteChannel, switchChannel } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', handle: '', description: '' })

  useEffect(() => {
    fetchChannels()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await createChannel(formData)
    
    if (result.success) {
      toast.success('Chaîne créée avec succès')
      setShowCreateModal(false)
      setFormData({ name: '', handle: '', description: '' })
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }

  const handleDelete = async (channelId, channelName) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la chaîne "${channelName}" ? Cette action est irréversible et supprimera toutes les vidéos associées.`)) {
      return
    }

    const result = await deleteChannel(channelId)
    
    if (result.success) {
      toast.success('Chaîne supprimée')
    } else {
      toast.error(result.error)
    }
  }

  const handleHandleChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    setFormData({ ...formData, handle: value })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes chaînes</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <FiPlus className="w-5 h-5" />
          <span>Créer une chaîne</span>
        </button>
      </div>

      <div className="space-y-4">
        {channels.map((ch) => (
          <div 
            key={ch.id} 
            className={`bg-dark-900 rounded-xl p-4 border ${ch.id === activeChannel?.id ? 'border-primary-500' : 'border-dark-800'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-dark-700 overflow-hidden flex-shrink-0">
                {(ch.avatar_url || user?.avatarUrl) ? (
                  <img src={ch.avatar_url || user?.avatarUrl} alt={ch.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                    {ch.name?.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{ch.name}</h3>
                  {ch.id === activeChannel?.id && (
                    <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full">Active</span>
                  )}
                  {!!ch.is_verified && <FiCheck className="w-4 h-4 text-primary-500" />}
                </div>
                <p className="text-dark-400">@{ch.handle}</p>
                <div className="flex gap-4 text-sm text-dark-400 mt-1">
                  <span>{ch.subscriber_count || 0} abonnés</span>
                  <span>{ch.video_count || 0} vidéos</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {ch.id !== activeChannel?.id && (
                  <button
                    onClick={() => switchChannel(ch.id)}
                    className="btn btn-secondary text-sm"
                  >
                    Activer
                  </button>
                )}
                <Link
                  to={`/channel/${ch.handle}`}
                  className="p-2 hover:bg-dark-700 rounded-lg"
                  title="Voir la chaîne"
                >
                  <FiExternalLink className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => handleDelete(ch.id, ch.name)}
                  className="p-2 hover:bg-dark-700 rounded-lg text-red-400"
                  title="Supprimer"
                                  >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {channels.length === 0 && (
          <div className="text-center py-12 text-dark-400">
            <p>Vous n'avez pas encore de chaîne.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary mt-4"
            >
              Créer ma première chaîne
            </button>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-dark-900 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Créer une chaîne</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-dark-700 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom de la chaîne *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Ma super chaîne"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Identifiant (URL) *</label>
                <div className="flex items-center">
                  <span className="text-dark-400 mr-1">@</span>
                  <input
                    type="text"
                    value={formData.handle}
                    onChange={handleHandleChange}
                    className="input flex-1"
                    placeholder="ma-chaine"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                </div>
                <p className="text-xs text-dark-400 mt-1">3-30 caractères, lettres minuscules, chiffres, - et _ uniquement</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full min-h-[100px]"
                  placeholder="Décrivez votre chaîne..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost">
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Création...' : 'Créer la chaîne'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
