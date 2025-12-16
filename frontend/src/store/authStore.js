import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      channel: null,
      channels: [],
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { user, channel, accessToken } = response.data
          set({
            user,
            channel,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false
          })
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: error.response?.data?.error || 'Erreur de connexion' }
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', data)
          const { user, channel, accessToken } = response.data
          set({
            user,
            channel,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false
          })
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: error.response?.data?.error || 'Erreur d\'inscription' }
        }
      },

      logout: () => {
        set({
          user: null,
          channel: null,
          channels: [],
          token: null,
          isAuthenticated: false
        })
        delete api.defaults.headers.common['Authorization']
      },

      fetchUser: async () => {
        const token = get().token
        if (!token) return

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/me')
          set({
            user: response.data,
            channel: response.data.channel,
            isAuthenticated: true
          })
        } catch (error) {
          get().logout()
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }))
      },

      updateChannel: (channelData) => {
        set((state) => ({
          channel: { ...state.channel, ...channelData }
        }))
      },

      fetchChannels: async () => {
        try {
          const response = await api.get('/channels/my')
          const channels = response.data.channels || []
          set({ channels })
          // Set first channel as active if no channel is selected
          if (channels.length > 0 && !get().channel) {
            set({ channel: channels[0] })
          }
          return channels
        } catch (error) {
          console.error('Error fetching channels:', error)
          return []
        }
      },

      switchChannel: (channelId) => {
        const channels = get().channels
        const channel = channels.find(c => c.id === channelId)
        if (channel) {
          set({ channel })
        }
      },

      createChannel: async (data) => {
        try {
          const response = await api.post('/channels', data)
          const newChannel = response.data.channel
          set((state) => ({
            channels: [...state.channels, newChannel],
            channel: newChannel
          }))
          return { success: true, channel: newChannel }
        } catch (error) {
          return { success: false, error: error.response?.data?.error || 'Erreur lors de la création' }
        }
      },

      deleteChannel: async (channelId) => {
        try {
          await api.delete(`/channels/${channelId}`)
          const channels = get().channels.filter(c => c.id !== channelId)
          set({ channels })
          // Switch to another channel if the deleted one was active, or clear if no channels left
          if (get().channel?.id === channelId) {
            set({ channel: channels.length > 0 ? channels[0] : null })
          }
          return { success: true }
        } catch (error) {
          return { success: false, error: error.response?.data?.error || 'Erreur lors de la suppression' }
        }
      }
    }),
    {
      name: 'bf-media-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        channel: state.channel,
        channels: state.channels,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore
