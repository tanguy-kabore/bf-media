import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
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
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'

function App() {
  const { fetchUser, token } = useAuthStore()

  useEffect(() => {
    if (token) {
      fetchUser()
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
        <Route path="/channels/manage" element={<ManageChannels />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
