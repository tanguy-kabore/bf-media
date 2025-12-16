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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Uploader une vidéo</h1>
        {channel && (
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <span>Sur la chaîne:</span>
            <div className="flex items-center gap-2 bg-dark-800 px-3 py-1.5 rounded-full">
              <div className="w-5 h-5 rounded-full bg-dark-600 overflow-hidden">
                {channel.avatar_url ? (
                  <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">{channel.name?.charAt(0)}</div>
                )}
              </div>
              <span className="font-medium text-white">{channel.name}</span>
            </div>
          </div>
        )}
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 hover:border-dark-500'
          }`}
        >
          <input {...getInputProps()} />
          <FiUploadCloud className="w-16 h-16 mx-auto text-dark-500" />
          <p className="text-lg mt-4">
            {isDragActive ? 'Déposez la vidéo ici' : 'Glissez-déposez une vidéo ou cliquez pour sélectionner'}
          </p>
          <p className="text-dark-500 mt-2">MP4, WebM, MOV, AVI • Max 2 Go</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative aspect-video bg-dark-800 rounded-xl overflow-hidden">
              <video src={preview} className="w-full h-full object-contain" controls />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 p-2 bg-dark-900/80 rounded-full hover:bg-dark-800"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titre *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input min-h-[120px] resize-none"
                  placeholder="Décrivez votre vidéo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Visibilité</label>
                <select
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="public">Publique</option>
                  <option value="unlisted">Non répertoriée</option>
                  <option value="private">Privée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Catégorie</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="input"
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

          <div className="flex justify-end gap-3">
            <button type="button" onClick={removeFile} className="btn btn-secondary" disabled={uploading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Upload en cours...' : 'Publier'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
