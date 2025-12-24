import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

const usePlatformStore = create(
  persist(
    (set, get) => ({
      settings: {
        platform_name: 'BF Media',
        platform_description: 'Plateforme de partage de vidéos',
        maintenance_mode: false,
        registration_enabled: true,
        ads_enabled: true,
        default_storage_limit: 5368709120,
        max_video_size: 2147483648
      },
      loading: false,
      initialized: false,

      fetchSettings: async () => {
        try {
          const response = await api.get('/platform/settings')
          console.log('Fetched platform settings from API:', response.data)
          set({ 
            settings: response.data, // Replace all settings instead of merging
            initialized: true 
          })
        } catch (error) {
          console.error('Failed to fetch platform settings:', error)
          set({ initialized: true })
        }
      },

      fetchAdminSettings: async () => {
        set({ loading: true })
        try {
          const response = await api.get('/admin/settings')
          set({ 
            settings: { ...get().settings, ...response.data },
            loading: false 
          })
          return response.data
        } catch (error) {
          console.error('Failed to fetch admin settings:', error)
          set({ loading: false })
          throw error
        }
      },

      updateSetting: async (key, value) => {
        try {
          await api.patch(`/admin/settings/${key}`, { value })
          set({ 
            settings: { ...get().settings, [key]: value }
          })
        } catch (error) {
          console.error('Failed to update setting:', error)
          throw error
        }
      },

      updateSettings: async (newSettings) => {
        try {
          await api.put('/admin/settings', newSettings)
          set({ 
            settings: { ...get().settings, ...newSettings }
          })
        } catch (error) {
          console.error('Failed to update settings:', error)
          throw error
        }
      },

      getPlatformName: () => get().settings.platform_name || 'BF Media',
      isMaintenanceMode: () => get().settings.maintenance_mode === true,
      isRegistrationEnabled: () => get().settings.registration_enabled !== false,
      areAdsEnabled: () => get().settings.ads_enabled !== false
    }),
    {
      name: 'bf-platform-settings',
      partialize: (state) => ({ settings: state.settings, initialized: state.initialized })
    }
  )
)

export default usePlatformStore
