import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { FiUploadCloud, FiX, FiVideo } from 'react-icons/fi'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Upload() {
  const navigate = useNavigate()
  const { isAuthenticated, channel } = useAuthStore()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'public',
    categoryId: '',
    tags: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/videos/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    const videoFile = acceptedFiles[0]
    if (videoFile) {
      setFile(videoFile)
      setFormData(prev => ({ ...prev, title: videoFile.name.replace(/\.[^/.]+$/, '') }))
      const url = URL.createObjectURL(videoFile)
      setPreview(url)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'] },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024 * 1024
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      toast.error('Sélectionnez une vidéo')
      return
    }

    setUploading(true)
    setProgress(0)

    const data = new FormData()
    data.append('video', file)
    data.append('title', formData.title)
    data.append('description', formData.description)
    data.append('visibility', formData.visibility)
    if (channel?.id) data.append('channelId', channel.id)
    if (formData.categoryId) data.append('categoryId', formData.categoryId)
    if (formData.tags) data.append('tags', JSON.stringify(formData.tags.split(',').map(t => t.trim())))

    try {
      const response = await api.post('/videos/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total)
          setProgress(percent)
        }
      })
      toast.success('Vidéo uploadée avec succès !')
      navigate(`/watch/${response.data.video.id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setPreview(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <FiVideo className="w-16 h-16 mx-auto text-dark-600" />
        <h2 className="text-xl font-semibold mt-4">Connectez-vous pour uploader</h2>
        <p className="text-dark-400 mt-2">Vous devez être connecté pour uploader des vidéos</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto w-full overflow-x-hidden">
      {/* Header - stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Uploader une vidéo</h1>
        {channel && (
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <span className="hidden sm:inline">Sur la chaîne:</span>
            <div className="flex items-center gap-2 bg-dark-800 px-3 py-1.5 rounded-full">
              <div className="w-5 h-5 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                {channel.avatar_url ? (
                  <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">{channel.name?.charAt(0)}</div>
                )}
              </div>
              <span className="font-medium text-white text-sm">{channel.name}</span>
            </div>
          </div>
        )}
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg sm:rounded-xl p-6 sm:p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 hover:border-dark-500'
          }`}
        >
          <input {...getInputProps()} />
          <FiUploadCloud className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-dark-500" />
          <p className="text-base sm:text-lg mt-3 sm:mt-4 px-2">
            {isDragActive ? 'Déposez la vidéo ici' : 'Glissez-déposez une vidéo ou cliquez pour sélectionner'}
          </p>
          <p className="text-dark-500 mt-2 text-sm">MP4, WebM, MOV, AVI • Max 2 Go</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Video preview */}
            <div className="relative aspect-video bg-dark-800 rounded-lg sm:rounded-xl overflow-hidden">
              <video src={preview} className="w-full h-full object-contain" controls />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 p-2 bg-dark-900/80 rounded-full hover:bg-dark-800"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Form fields */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 sm:mb-2">Titre *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input w-full"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 sm:mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input w-full min-h-[100px] sm:min-h-[120px] resize-none"
                  placeholder="Décrivez votre vidéo..."
                />
              </div>

              {/* Visibility and Category - side by side on mobile */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">Visibilité</label>
                  <select
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleChange}
                    className="input w-full text-sm"
                  >
                    <option value="public">Publique</option>
                    <option value="unlisted">Non répertoriée</option>
                    <option value="private">Privée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">Catégorie</label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="input w-full text-sm"
                  >
                    <option value="">Sélectionner</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 sm:mb-2">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="musique, vlog, tutoriel"
                />
              </div>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload en cours...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button type="button" onClick={removeFile} className="btn btn-secondary w-full sm:w-auto" disabled={uploading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={uploading}>
              {uploading ? 'Upload en cours...' : 'Publier'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
