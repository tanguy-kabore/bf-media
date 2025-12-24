import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import usePlatformStore from './store/platformStore'
import Layout from './components/Layout'
import MaintenanceMode from './components/MaintenanceMode'
import Home from './pages/Home'
import Watch from './pages/Watch'
import Channel from './pages/Channel'
import Search from './pages/Search'
import Upload from './pages/Upload'
import Studio from './pages/Studio'
import Subscriptions from './pages/Subscriptions'
import History from './pages/History'
import Saved from './pages/Saved'
import Liked from './pages/Liked'
import Settings from './pages/Settings'
import ManageChannels from './pages/ManageChannels'
import Category from './pages/Category'
import Explore from './pages/Explore'
import Playlist from './pages/Playlist'
import Admin from './pages/Admin'
import Earnings from './pages/Earnings'
import Login from './pages/Login'
import Register from './pages/Register'
import Terms from './pages/Terms'
import License from './pages/License'
import NotFound from './pages/NotFound'

function App() {
  const { fetchUser, token, user } = useAuthStore()
  const { fetchSettings, initialized, isMaintenanceMode, settings } = usePlatformStore()

  useEffect(() => {
    if (token) {
      fetchUser()
    }
  }, [token])

  useEffect(() => {
    if (!initialized) {
      fetchSettings()
    }
  }, [initialized])

  // Debug logs
  useEffect(() => {
    if (initialized) {
      console.log('Platform initialized:', initialized)
      console.log('Settings:', settings)
      console.log('Maintenance mode:', isMaintenanceMode())
      console.log('User:', user)
    }
  }, [initialized, settings, user])

  // Show maintenance mode for non-admin users
  const inMaintenanceMode = initialized && isMaintenanceMode()
  const isAdmin = user && ['admin', 'superadmin'].includes(user.role)
  
  if (inMaintenanceMode && !isAdmin) {
    console.log('Showing maintenance mode page')
    return <MaintenanceMode />
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/channel/:handle" element={<Channel />} />
        <Route path="/search" element={<Search />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/studio/*" element={<Studio />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/history" element={<History />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/liked" element={<Liked />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/channels/manage" element={<ManageChannels />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/playlist/:id" element={<Playlist />} />
        <Route path="/license" element={<License />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
