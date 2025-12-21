import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { 
  FiHome, FiUsers, FiVideo, FiFlag, FiSettings, FiDollarSign, 
  FiHardDrive, FiTrendingUp, FiUserCheck, FiEye, FiPieChart,
  FiGlobe, FiMonitor, FiSmartphone, FiSearch, FiEdit, FiTrash2, 
  FiToggleLeft, FiToggleRight, FiPlus, FiX, FiRefreshCw, FiArrowLeft,
  FiMenu, FiBell, FiLogOut, FiClock, FiExternalLink, FiUpload, FiLink,
  FiDownload, FiShield
} from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import usePlatformStore from '../store/platformStore'
import api from '../services/api'

const formatBytes = (bytes) => {
  const num = Number(bytes)
  if (!num || isNaN(num) || num <= 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(num) / Math.log(k))
  return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const StatCard = ({ icon: Icon, label, value, subValue, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-500',
    green: 'bg-green-500/10 text-green-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500',
    purple: 'bg-purple-500/10 text-purple-500'
  }
  return (
    <div className="bg-dark-800 rounded-xl p-3 sm:p-4 border border-dark-700 overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${colors[color]}`}><Icon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-dark-400 text-xs sm:text-sm truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold truncate">{value}</p>
          {subValue && <p className="text-xs text-dark-500 truncate">{subValue}</p>}
        </div>
      </div>
    </div>
  )
}

// Main Admin Component
export default function Admin() {
  const { user, logout } = useAuthStore()
  const platformName = usePlatformStore(state => state.getPlatformName())
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      navigate('/')
    }
  }, [user, navigate])

  useEffect(() => {
    const path = location.pathname.split('/').pop()
    if (['users', 'videos', 'reports', 'verifications', 'ads', 'settings'].includes(path)) {
      setActiveTab(path)
    } else {
      setActiveTab('dashboard')
    }
  }, [location])

  if (!user || !['admin', 'superadmin'].includes(user.role)) return null

  const isSuperAdmin = user.role === 'superadmin'

  const tabs = [
    { id: 'dashboard', icon: FiHome, label: 'Dashboard' },
    { id: 'users', icon: FiUsers, label: 'Utilisateurs' },
    { id: 'videos', icon: FiVideo, label: 'Vidéos' },
    { id: 'reports', icon: FiFlag, label: 'Signalements' },
    { id: 'verifications', icon: FiUserCheck, label: 'Vérifications' },
    { id: 'ads', icon: FiDollarSign, label: 'Publicités' },
    { id: 'logs', icon: FiClock, label: 'Logs activité' },
    ...(isSuperAdmin ? [{ id: 'admins', icon: FiUserCheck, label: 'Admins' }] : []),
    { id: 'settings', icon: FiSettings, label: 'Paramètres' }
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen min-h-dvh bg-dark-950">
      {/* Admin Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-dark-900 border-b border-dark-800 z-50 flex items-center justify-between px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-dark-800 rounded-lg">
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <FiShield className="w-5 h-5 text-primary-500" />
            <span className="font-semibold text-sm sm:text-base">Administration</span>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-xs sm:text-sm">
            <FiArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </Link>
          <button className="p-1.5 sm:p-2 hover:bg-dark-800 rounded-lg relative hidden sm:block">
            <FiBell className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-dark-700">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-dark-700 flex items-center justify-center overflow-hidden text-sm">
              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.username?.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="p-1.5 sm:p-2 hover:bg-dark-800 rounded-lg text-red-400" title="Déconnexion">
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-14">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-60 bg-dark-900 border-r border-dark-800 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-4 flex flex-col h-full">
            <h2 className="font-bold text-lg mb-4 px-2 text-primary-400">Administration</h2>
            <nav className="space-y-1 flex-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    activeTab === tab.id ? 'bg-primary-500/20 text-primary-500' : 'hover:bg-dark-800 text-dark-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-dark-800 pt-4">
              <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-800 text-dark-300">
                <FiArrowLeft className="w-5 h-5" />
                <span>Retour au site</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 lg:ml-0">
          <div className="p-3 sm:p-4 md:p-6 pb-24 lg:pb-6">
            {activeTab === 'dashboard' && <AdminDashboard />}
            {activeTab === 'users' && <AdminUsers />}
            {activeTab === 'videos' && <AdminVideos />}
            {activeTab === 'reports' && <AdminReports />}
            {activeTab === 'verifications' && <AdminVerifications />}
            {activeTab === 'ads' && <AdminAds />}
            {activeTab === 'logs' && <AdminLogs />}
            {activeTab === 'admins' && isSuperAdmin && <AdminAdmins />}
            {activeTab === 'settings' && <AdminSettings />}
          </div>
        </main>
      </div>

      {/* Mobile Tabs */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-dark-900 border-t border-dark-700 z-40">
        <div className="flex overflow-x-auto scrollbar-hide py-1 px-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg flex-shrink-0 min-w-[60px] ${activeTab === tab.id ? 'text-primary-500 bg-dark-800' : 'text-dark-400'}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-[10px] whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Dashboard
const AdminDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard')
      setData(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>
  if (!data) return <div className="text-center text-dark-400">Erreur</div>

  const { stats, charts, recentUsers, recentVideos } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <button onClick={() => { setLoading(true); fetchDashboard() }} disabled={loading} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Utilisateurs" value={formatNumber(stats.users)} subValue={`${stats.activeUsers} actifs`} color="primary" />
        <StatCard icon={FiVideo} label="Vidéos" value={formatNumber(stats.videos)} color="green" />
        <StatCard icon={FiEye} label="Vues (24h)" value={formatNumber(stats.viewsToday)} color="yellow" />
        <StatCard icon={FiHardDrive} label="Stockage" value={formatBytes(stats.totalStorage)} color="purple" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FiUserCheck} label="Nouveaux (24h)" value={stats.newUsersToday} color="green" />
        <StatCard icon={FiTrendingUp} label="Vues totales" value={formatNumber(stats.totalViews)} color="primary" />
        <StatCard icon={FiFlag} label="Signalements" value={stats.pendingReports} color="red" />
        <StatCard icon={FiPieChart} label="Chaînes" value={formatNumber(stats.channels)} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-xl border border-dark-700">
          <div className="p-4 border-b border-dark-700 flex justify-between"><h3 className="font-semibold">Utilisateurs récents</h3></div>
          <div className="divide-y divide-dark-700">
            {recentUsers?.slice(0, 5).map(u => (
              <div key={u.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-sm">{u.username?.charAt(0).toUpperCase()}</div>
                  <div><p className="font-medium text-sm">{u.username}</p><p className="text-xs text-dark-400">{u.email}</p></div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_active ? 'Actif' : 'Inactif'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-800 rounded-xl border border-dark-700">
          <div className="p-4 border-b border-dark-700"><h3 className="font-semibold">Vidéos récentes</h3></div>
          <div className="divide-y divide-dark-700">
            {recentVideos?.slice(0, 5).map(v => (
              <div key={v.id} className="p-3 flex items-center justify-between">
                <div><p className="font-medium text-sm truncate max-w-[200px]">{v.title}</p><p className="text-xs text-dark-400">{v.channel_name}</p></div>
                <span className={`px-2 py-0.5 rounded text-xs ${v.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FiGlobe className="w-4 h-4" /> Top Pays</h3>
          <div className="space-y-2">{charts?.topCountries?.slice(0, 5).map((c, i) => <div key={i} className="flex justify-between text-sm"><span>{c.country || 'Inconnu'}</span><span className="text-dark-400">{formatNumber(c.count)}</span></div>)}</div>
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FiMonitor className="w-4 h-4" /> Appareils</h3>
          <div className="space-y-2">{charts?.deviceDistribution?.map((d, i) => <div key={i} className="flex justify-between text-sm"><span className="flex items-center gap-2">{d.device_type === 'mobile' ? <FiSmartphone className="w-4 h-4" /> : <FiMonitor className="w-4 h-4" />}{d.device_type || 'Autre'}</span><span className="text-dark-400">{formatNumber(d.count)}</span></div>)}</div>
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FiGlobe className="w-4 h-4" /> Navigateurs</h3>
          <div className="space-y-2">{charts?.browserDistribution?.slice(0, 5).map((b, i) => <div key={i} className="flex justify-between text-sm"><span>{b.browser || 'Inconnu'}</span><span className="text-dark-400">{formatNumber(b.count)}</span></div>)}</div>
        </div>
      </div>
    </div>
  )
}

// Users Management - Part 1
const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { fetchUsers() }, [pagination.page, roleFilter, statusFilter])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: 20, ...(search && { search }), ...(roleFilter && { role: roleFilter }), ...(statusFilter && { status: statusFilter }) })
      const res = await api.get(`/admin/users?${params}`)
      setUsers(res.data.users || [])
      setPagination(res.data.pagination || { page: 1, total: 0, pages: 1 })
    } catch (e) { 
      console.error('Error fetching users:', e)
      setError(e.response?.data?.error || e.message || 'Erreur de chargement')
      setUsers([])
    }
    finally { setLoading(false) }
  }

  const handleSearch = (e) => { e.preventDefault(); setPagination(p => ({ ...p, page: 1 })); fetchUsers() }
  
  const adminCount = users.filter(u => u.role === 'admin' && u.is_active).length
  
  const updateUser = async (userId, updates) => {
    const user = users.find(u => u.id === userId)
    // Empêcher la désactivation du dernier admin actif
    if (user?.role === 'admin' && updates.isActive === false && adminCount <= 1) {
      alert('Impossible de désactiver le dernier administrateur actif')
      return
    }
    try { await api.patch(`/admin/users/${userId}`, updates); fetchUsers(); setShowModal(false) } catch (e) { console.error(e) }
  }
  
  const deleteUser = async (userId) => {
    const user = users.find(u => u.id === userId)
    // Empêcher la suppression du dernier admin
    if (user?.role === 'admin' && adminCount <= 1) {
      alert('Impossible de supprimer le dernier administrateur')
      return
    }
    if (!confirm('Supprimer cet utilisateur ?')) return
    try { await api.delete(`/admin/users/${userId}`); fetchUsers() } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <button onClick={fetchUsers} disabled={loading} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>
      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg" />
          </div>
        </form>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg">
          <option value="">Tous les rôles</option><option value="user">Utilisateur</option><option value="creator">Créateur</option><option value="moderator">Modérateur</option><option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg">
          <option value="">Tous</option><option value="active">Actifs</option><option value="inactive">Inactifs</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          <p className="font-medium">Erreur: {error}</p>
          <button onClick={fetchUsers} className="mt-2 text-sm underline">Réessayer</button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-dark-800 rounded-xl border border-dark-700 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-dark-700/50"><tr><th className="px-4 py-3 text-left text-sm">Utilisateur</th><th className="px-4 py-3 text-left text-sm">Rôle</th><th className="px-4 py-3 text-left text-sm">Statut</th><th className="px-4 py-3 text-left text-sm">Stockage</th><th className="px-4 py-3 text-right text-sm">Actions</th></tr></thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? <tr><td colSpan={5} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div></td></tr> :
            error ? <tr><td colSpan={5} className="py-8 text-center text-red-400">Erreur de chargement</td></tr> :
            users.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-dark-400">Aucun utilisateur</td></tr> :
            users.map(u => (
              <tr key={u.id} className="hover:bg-dark-700/30">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" /> : u.username?.charAt(0).toUpperCase()}</div><div><p className="font-medium">{u.username}</p><p className="text-sm text-dark-400">{u.email}</p></div></div></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${u.role === 'superadmin' ? 'bg-orange-500/20 text-orange-400' : u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'moderator' ? 'bg-purple-500/20 text-purple-400' : u.role === 'creator' ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-600'}`}>{u.role}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_active ? 'Actif' : 'Inactif'}</span></td>
                <td className="px-4 py-3 text-sm text-dark-400">{formatBytes(u.storage_used || 0)} / {formatBytes(u.storage_limit || 5368709120)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2">
                  <button onClick={() => { setSelectedUser(u); setShowModal(true) }} className="p-2 hover:bg-dark-600 rounded-lg" title="Modifier"><FiEdit className="w-4 h-4" /></button>
                  {u.role !== 'superadmin' && (
                    <>
                      <button 
                        onClick={() => updateUser(u.id, { isActive: !u.is_active })} 
                        className={`p-2 hover:bg-dark-600 rounded-lg ${u.is_active ? 'text-green-400' : 'text-red-400'}`}
                        title={u.is_active ? 'Désactiver' : 'Activer'}
                      >{u.is_active ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}</button>
                      <button 
                        onClick={() => deleteUser(u.id)} 
                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                        title="Supprimer"
                      ><FiTrash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.pages > 1 && <div className="px-4 py-3 border-t border-dark-700 flex justify-between"><span className="text-sm text-dark-400">Page {pagination.page}/{pagination.pages}</span><div className="flex gap-2"><button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Préc</button><button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Suiv</button></div></div>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div></div> :
        error ? <div className="text-center py-8 text-red-400">Erreur de chargement</div> :
        users.length === 0 ? <div className="text-center py-8 text-dark-400">Aucun utilisateur</div> :
        users.map(u => (
          <div key={u.id} className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center overflow-hidden">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-dark-400 truncate max-w-[150px]">{u.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${u.role === 'superadmin' ? 'bg-orange-500/20 text-orange-400' : u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'moderator' ? 'bg-purple-500/20 text-purple-400' : u.role === 'creator' ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-600'}`}>{u.role}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_active ? 'Actif' : 'Inactif'}</span>
                <span className="text-dark-400 text-xs">{formatBytes(u.storage_used || 0)}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setSelectedUser(u); setShowModal(true) }} className="p-2 hover:bg-dark-600 rounded-lg"><FiEdit className="w-4 h-4" /></button>
                {u.role !== 'superadmin' && (
                  <>
                    <button onClick={() => updateUser(u.id, { isActive: !u.is_active })} className={`p-2 hover:bg-dark-600 rounded-lg ${u.is_active ? 'text-green-400' : 'text-red-400'}`}>{u.is_active ? <FiToggleRight className="w-4 h-4" /> : <FiToggleLeft className="w-4 h-4" />}</button>
                    <button onClick={() => deleteUser(u.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><FiTrash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {pagination.pages > 1 && <div className="flex justify-between items-center pt-2"><span className="text-sm text-dark-400">Page {pagination.page}/{pagination.pages}</span><div className="flex gap-2"><button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Préc</button><button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Suiv</button></div></div>}
      </div>
      {showModal && selectedUser && <UserEditModal user={selectedUser} onClose={() => setShowModal(false)} onSave={updateUser} />}
    </div>
  )
}

const UserEditModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ role: user.role, isActive: user.is_active, isVerified: user.is_verified, storageLimit: user.storage_limit || 5368709120 })
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-xl w-full max-w-md border border-dark-700">
        <div className="flex justify-between p-4 border-b border-dark-700"><h3 className="font-semibold">Modifier</h3><button onClick={onClose}><FiX className="w-5 h-5" /></button></div>
        <form onSubmit={e => { e.preventDefault(); onSave(user.id, form) }} className="p-4 space-y-4">
          <div><label className="block text-sm mb-1">Rôle</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg"><option value="user">Utilisateur</option><option value="creator">Créateur</option><option value="moderator">Modérateur</option><option value="admin">Admin</option></select></div>
          <div><label className="block text-sm mb-1">Stockage</label><select value={form.storageLimit} onChange={e => setForm({ ...form, storageLimit: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg"><option value={1073741824}>1 GB</option><option value={5368709120}>5 GB</option><option value={10737418240}>10 GB</option><option value={53687091200}>50 GB</option></select></div>
          <div className="flex gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />Actif</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.isVerified} onChange={e => setForm({ ...form, isVerified: e.target.checked })} />Vérifié</label></div>
          <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-2 bg-dark-700 rounded-lg">Annuler</button><button type="submit" className="flex-1 py-2 bg-primary-500 rounded-lg">Enregistrer</button></div>
        </form>
      </div>
    </div>
  )
}

const AdminVideos = () => {
  const [videos, setVideos] = useState([])
  const [channels, setChannels] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')

  useEffect(() => { fetchChannels() }, [])
  useEffect(() => { fetchVideos() }, [pagination.page, statusFilter, channelFilter])

  const fetchChannels = async () => {
    try {
      const res = await api.get('/admin/channels')
      setChannels(res.data.channels || [])
    } catch (e) { console.error(e) }
  }

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ 
        page: pagination.page, 
        limit: 20, 
        ...(search && { search }), 
        ...(statusFilter && { status: statusFilter }),
        ...(channelFilter && { channelId: channelFilter })
      })
      const res = await api.get(`/admin/videos?${params}`)
      setVideos(res.data.videos)
      setPagination(res.data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSearch = (e) => { e.preventDefault(); setPagination(p => ({ ...p, page: 1 })); fetchVideos() }
  const updateVideo = async (id, updates) => { try { await api.patch(`/admin/videos/${id}`, updates); fetchVideos() } catch (e) { console.error(e) } }
  const deleteVideo = async (id) => { if (!confirm('Supprimer cette vidéo ?')) return; try { await api.delete(`/admin/videos/${id}`); fetchVideos() } catch (e) { console.error(e) } }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion des vidéos</h1>
      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]"><div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg" /></div></form>
        <select value={channelFilter} onChange={e => { setChannelFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg">
          <option value="">Toutes les chaînes</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg"><option value="">Tous statuts</option><option value="published">Publiées</option><option value="processing">En traitement</option><option value="private">Privées</option><option value="blocked">Bloquées</option></select>
      </div>
      {/* Desktop Table */}
      <div className="hidden md:block bg-dark-800 rounded-xl border border-dark-700 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-dark-700/50"><tr><th className="px-4 py-3 text-left text-sm">Vidéo</th><th className="px-4 py-3 text-left text-sm">Chaîne</th><th className="px-4 py-3 text-left text-sm">Propriétaire</th><th className="px-4 py-3 text-left text-sm">Statut</th><th className="px-4 py-3 text-left text-sm">Vues</th><th className="px-4 py-3 text-right text-sm">Actions</th></tr></thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? <tr><td colSpan={6} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div></td></tr> :
            videos.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-dark-400">Aucune vidéo</td></tr> :
            videos.map(v => (
              <tr key={v.id} className="hover:bg-dark-700/30">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-20 h-12 rounded bg-dark-600 overflow-hidden flex-shrink-0">{v.thumbnail_url && <img src={v.thumbnail_url} className="w-full h-full object-cover" />}</div><div><p className="font-medium truncate max-w-[200px]">{v.title}</p></div></div></td>
                <td className="px-4 py-3 text-sm">{v.channel_name}</td>
                <td className="px-4 py-3 text-sm text-dark-400">{v.owner_username}</td>
                <td className="px-4 py-3"><select value={v.status} onChange={e => updateVideo(v.id, { status: e.target.value })} className={`px-2 py-1 rounded text-xs border-0 ${v.status === 'published' ? 'bg-green-500/20 text-green-400' : v.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}><option value="published">Publiée</option><option value="private">Privée</option><option value="blocked">Bloquée</option></select></td>
                <td className="px-4 py-3 text-sm text-dark-400">{formatNumber(v.view_count)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2"><Link to={`/watch/${v.id}`} target="_blank" className="p-2 hover:bg-dark-600 rounded-lg"><FiEye className="w-4 h-4" /></Link><button onClick={() => deleteVideo(v.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><FiTrash2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.pages > 1 && <div className="px-4 py-3 border-t border-dark-700 flex justify-between"><span className="text-sm text-dark-400">Page {pagination.page}/{pagination.pages}</span><div className="flex gap-2"><button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Préc</button><button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Suiv</button></div></div>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div></div> :
        videos.length === 0 ? <div className="text-center py-8 text-dark-400">Aucune vidéo</div> :
        videos.map(v => (
          <div key={v.id} className="bg-dark-800 rounded-xl border border-dark-700 p-3">
            <div className="flex gap-3">
              <div className="w-24 h-14 rounded bg-dark-600 overflow-hidden flex-shrink-0">{v.thumbnail_url && <img src={v.thumbnail_url} className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{v.title}</p>
                <p className="text-xs text-dark-400">{v.channel_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <select value={v.status} onChange={e => updateVideo(v.id, { status: e.target.value })} className={`px-2 py-0.5 rounded text-xs border-0 ${v.status === 'published' ? 'bg-green-500/20 text-green-400' : v.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}><option value="published">Publiée</option><option value="private">Privée</option><option value="blocked">Bloquée</option></select>
                  <span className="text-xs text-dark-400">{formatNumber(v.view_count)} vues</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Link to={`/watch/${v.id}`} target="_blank" className="p-2 hover:bg-dark-600 rounded-lg"><FiEye className="w-4 h-4" /></Link>
                <button onClick={() => deleteVideo(v.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><FiTrash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {pagination.pages > 1 && <div className="flex justify-between items-center pt-2"><span className="text-sm text-dark-400">Page {pagination.page}/{pagination.pages}</span><div className="flex gap-2"><button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Préc</button><button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages} className="px-3 py-1 bg-dark-700 rounded disabled:opacity-50">Suiv</button></div></div>}
      </div>
    </div>
  )
}

// Reports Management
const AdminReports = () => {
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportDetails, setReportDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => { fetchReports(); fetchStats() }, [statusFilter])

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/reports/stats')
      setStats(res.data)
    } catch (e) { console.error(e) }
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/reports?status=${statusFilter}`)
      setReports(res.data.reports || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openReportDetails = async (report) => {
    setSelectedReport(report)
    setLoadingDetails(true)
    try {
      const res = await api.get(`/admin/reports/${report.id}`)
      setReportDetails(res.data)
    } catch (e) { console.error(e) }
    finally { setLoadingDetails(false) }
  }

  const handleReport = async (id, status, actionTaken = '', videoAction = null) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status, actionTaken, videoAction })
      fetchReports()
      fetchStats()
      setSelectedReport(null)
      setReportDetails(null)
    } catch (e) { console.error(e) }
  }

  const reasonLabels = {
    spam: 'Spam', harassment: 'Harcèlement', hate_speech: 'Discours haineux',
    violence: 'Violence', nudity: 'Nudité', copyright: 'Droits d\'auteur',
    misinformation: 'Désinformation', other: 'Autre'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Signalements</h1>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg">
            <option value="pending">En attente</option>
            <option value="reviewing">En cours</option>
            <option value="resolved">Résolus</option>
            <option value="dismissed">Rejetés</option>
          </select>
          <button onClick={() => { fetchReports(); fetchStats() }} disabled={loading} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-1"><FiClock className="w-4 h-4" /><span className="text-xs">En attente</span></div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-1"><FiEye className="w-4 h-4" /><span className="text-xs">En cours</span></div>
            <p className="text-2xl font-bold">{stats.reviewing}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1"><FiUserCheck className="w-4 h-4" /><span className="text-xs">Résolus</span></div>
            <p className="text-2xl font-bold">{stats.resolved}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-2 text-red-400 mb-1"><FiX className="w-4 h-4" /><span className="text-xs">Rejetés</span></div>
            <p className="text-2xl font-bold">{stats.dismissed}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-2 text-primary-400 mb-1"><FiFlag className="w-4 h-4" /><span className="text-xs">Aujourd'hui</span></div>
            <p className="text-2xl font-bold">{stats.todayCount}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-1"><FiTrendingUp className="w-4 h-4" /><span className="text-xs">Cette semaine</span></div>
            <p className="text-2xl font-bold">{stats.weekCount}</p>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-dark-800 rounded-xl border border-dark-700 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-dark-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Contenu</th>
              <th className="px-4 py-3 text-left text-sm">Signaleur</th>
              <th className="px-4 py-3 text-left text-sm">Raison</th>
              <th className="px-4 py-3 text-left text-sm">Date</th>
              <th className="px-4 py-3 text-right text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div></td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-dark-400">Aucun signalement {statusFilter === 'pending' ? 'en attente' : ''}</td></tr>
            ) : reports.map(r => (
              <tr key={r.id} className="hover:bg-dark-700/30 cursor-pointer" onClick={() => openReportDetails(r)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {r.video_thumbnail && <img src={r.video_thumbnail} alt="" className="w-16 h-9 object-cover rounded" />}
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{r.video_title || 'Contenu supprimé'}</p>
                      <p className="text-xs text-dark-400">{r.channel_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{r.reporter_username}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">{reasonLabels[r.reason] || r.reason}</span>
                </td>
                <td className="px-4 py-3 text-sm text-dark-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openReportDetails(r)} className="p-2 hover:bg-dark-600 rounded-lg" title="Détails">
                      <FiEye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div></div> :
        reports.length === 0 ? <div className="text-center py-8 text-dark-400">Aucun signalement {statusFilter === 'pending' ? 'en attente' : ''}</div> :
        reports.map(r => (
          <div key={r.id} className="bg-dark-800 rounded-xl border border-dark-700 p-3" onClick={() => openReportDetails(r)}>
            <div className="flex gap-3">
              {r.video_thumbnail && <img src={r.video_thumbnail} alt="" className="w-20 h-12 object-cover rounded flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{r.video_title || 'Contenu supprimé'}</p>
                <p className="text-xs text-dark-400">{r.channel_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">{reasonLabels[r.reason] || r.reason}</span>
                  <span className="text-xs text-dark-500">par {r.reporter_username}</span>
                </div>
              </div>
              <button className="p-2 hover:bg-dark-600 rounded-lg self-center"><FiEye className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          details={reportDetails}
          loading={loadingDetails}
          reasonLabels={reasonLabels}
          onClose={() => { setSelectedReport(null); setReportDetails(null) }}
          onAction={handleReport}
        />
      )}
    </div>
  )
}

// Report Details Modal
const ReportDetailsModal = ({ report, details, loading, reasonLabels, onClose, onAction }) => {
  const [actionTaken, setActionTaken] = useState('')
  const [videoAction, setVideoAction] = useState('')

  const r = details?.report || report
  const otherReports = details?.otherReports || []

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-dark-900 rounded-xl w-full max-w-2xl border border-dark-700 my-4 sm:my-8 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h3 className="font-semibold flex items-center gap-2">
            <FiFlag className="w-5 h-5 text-red-400" />
            Détails du signalement
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded"><FiX className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
            {/* Video Info */}
            {r.video_title && (
              <div className="bg-dark-800 rounded-lg p-3 sm:p-4">
                <h4 className="text-sm font-medium text-dark-400 mb-2 sm:mb-3">Vidéo signalée</h4>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {r.video_thumbnail && <img src={r.video_thumbnail} alt="" className="w-full sm:w-32 h-auto sm:h-20 object-cover rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{r.video_title}</p>
                    <p className="text-xs sm:text-sm text-dark-400">Chaîne: {r.channel_name} (@{r.channel_handle})</p>
                    <p className="text-xs sm:text-sm text-dark-400">Propriétaire: {r.owner_username}</p>
                    <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-dark-400">
                      <span>{formatNumber(r.video_views)} vues</span>
                      <span>{formatNumber(r.video_likes)} likes</span>
                      <span className={`px-2 py-0.5 rounded ${r.video_status === 'published' ? 'bg-green-500/20 text-green-400' : r.video_status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{r.video_status}</span>
                    </div>
                  </div>
                </div>
                <Link to={`/watch/${r.content_id}`} target="_blank" className="inline-flex items-center gap-2 mt-3 text-sm text-primary-400 hover:text-primary-300">
                  <FiExternalLink className="w-4 h-4" /> Voir la vidéo
                </Link>
              </div>
            )}

            {/* Report Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-dark-800 rounded-lg p-3 sm:p-4">
                <h4 className="text-sm font-medium text-dark-400 mb-2">Signalement</h4>
                <p className="text-xs sm:text-sm"><span className="text-dark-400">Raison:</span> <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">{reasonLabels[r.reason] || r.reason}</span></p>
                <p className="text-xs sm:text-sm mt-2"><span className="text-dark-400">Date:</span> {new Date(r.created_at).toLocaleString('fr-FR')}</p>
                <p className="text-xs sm:text-sm mt-2"><span className="text-dark-400">Statut:</span> <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : r.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-dark-600'}`}>{r.status}</span></p>
              </div>
              <div className="bg-dark-800 rounded-lg p-3 sm:p-4">
                <h4 className="text-sm font-medium text-dark-400 mb-2">Signaleur</h4>
                <p className="text-xs sm:text-sm"><span className="text-dark-400">Utilisateur:</span> {r.reporter_username}</p>
                <p className="text-xs sm:text-sm mt-2 break-all"><span className="text-dark-400">Email:</span> {r.reporter_email}</p>
              </div>
            </div>

            {/* Description */}
            {r.description && (
              <div className="bg-dark-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-dark-400 mb-2">Description</h4>
                <p className="text-sm">{r.description}</p>
              </div>
            )}

            {/* Other Reports for same content */}
            {otherReports.length > 0 && (
              <div className="bg-dark-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-dark-400 mb-2">Autres signalements ({otherReports.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {otherReports.map(or => (
                    <div key={or.id} className="flex justify-between text-sm p-2 bg-dark-700 rounded">
                      <span>{or.reporter_username} - {reasonLabels[or.reason] || or.reason}</span>
                      <span className="text-dark-400">{new Date(or.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {r.status === 'pending' && (
              <div className="bg-dark-800 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-dark-400">Actions</h4>
                
                {r.content_type === 'video' && r.video_title && (
                  <div>
                    <label className="block text-sm mb-2">Action sur la vidéo</label>
                    <select value={videoAction} onChange={e => setVideoAction(e.target.value)} className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg">
                      <option value="">Aucune action</option>
                      <option value="block">Bloquer la vidéo</option>
                      <option value="delete">Supprimer la vidéo</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm mb-2">Note (optionnel)</label>
                  <textarea
                    value={actionTaken}
                    onChange={e => setActionTaken(e.target.value)}
                    placeholder="Décrivez l'action prise..."
                    rows={2}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => onAction(r.id, 'dismissed', actionTaken)} className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <FiX className="w-4 h-4" /> Rejeter
                  </button>
                  <button onClick={() => onAction(r.id, 'resolved', actionTaken || (videoAction ? `Vidéo ${videoAction === 'delete' ? 'supprimée' : 'bloquée'}` : 'Signalement validé'), videoAction)} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <FiUserCheck className="w-4 h-4" /> Valider
                  </button>
                </div>
              </div>
            )}

            {/* Already handled */}
            {r.status !== 'pending' && r.reviewed_by && (
              <div className="bg-dark-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-dark-400 mb-2">Traité par</h4>
                <p className="text-sm">{r.reviewer_username} le {new Date(r.reviewed_at).toLocaleString('fr-FR')}</p>
                {r.action_taken && <p className="text-sm mt-2 text-dark-400">Action: {r.action_taken}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const AdminVerifications = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => { fetchRequests() }, [statusFilter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/verifications?status=${statusFilter}`)
      setRequests(res.data.requests || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleReview = async (id, status) => {
    try {
      await api.patch(`/admin/verifications/${id}`, { status, rejection_reason: status === 'rejected' ? rejectionReason : null })
      fetchRequests()
      setSelectedRequest(null)
      setRejectionReason('')
    } catch (e) { console.error(e) }
  }

  const revokeBadge = async (userId) => {
    if (!confirm('Retirer le badge de vérification ?')) return
    try {
      await api.delete(`/admin/verifications/badge/${userId}`)
      fetchRequests()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Demandes de vérification</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg">
          <option value="">Toutes</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-dark-800 rounded-xl border border-dark-700 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-dark-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Utilisateur</th>
              <th className="px-4 py-3 text-left text-sm">Document</th>
              <th className="px-4 py-3 text-left text-sm">Nom complet</th>
              <th className="px-4 py-3 text-left text-sm">Statut</th>
              <th className="px-4 py-3 text-left text-sm">Date</th>
              <th className="px-4 py-3 text-right text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-dark-400">Aucune demande</td></tr>
            ) : requests.map(r => (
              <tr key={r.id} className="hover:bg-dark-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-dark-600 overflow-hidden">
                      {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{r.username?.charAt(0).toUpperCase()}</div>}
                    </div>
                    <div>
                      <p className="font-medium">{r.display_name || r.username}</p>
                      <p className="text-sm text-dark-400">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs bg-dark-600">{r.document_type === 'national_id' ? 'CNI' : 'Passeport'}</span>
                </td>
                <td className="px-4 py-3 text-sm">{r.full_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    r.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {r.status === 'pending' ? 'En attente' : r.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-dark-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setSelectedRequest(r)} className="p-2 hover:bg-dark-600 rounded-lg" title="Voir détails">
                      <FiEye className="w-4 h-4" />
                    </button>
                    {r.status === 'approved' && (
                      <button onClick={() => revokeBadge(r.user_id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400" title="Retirer le badge">
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div></div> :
        requests.length === 0 ? <div className="text-center py-8 text-dark-400">Aucune demande</div> :
        requests.map(r => (
          <div key={r.id} className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dark-600 overflow-hidden">
                  {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{r.username?.charAt(0).toUpperCase()}</div>}
                </div>
                <div>
                  <p className="font-medium">{r.display_name || r.username}</p>
                  <p className="text-xs text-dark-400 truncate max-w-[150px]">{r.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : r.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {r.status === 'pending' ? 'En attente' : r.status === 'approved' ? 'Approuvée' : 'Rejetée'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs bg-dark-600">{r.document_type === 'national_id' ? 'CNI' : 'Passeport'}</span>
                <span className="text-dark-400 text-xs">{r.full_name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setSelectedRequest(r)} className="p-2 hover:bg-dark-600 rounded-lg"><FiEye className="w-4 h-4" /></button>
                {r.status === 'approved' && <button onClick={() => revokeBadge(r.user_id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><FiX className="w-4 h-4" /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-xl w-full max-w-2xl border border-dark-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-dark-700">
              <h3 className="font-semibold">Demande de vérification</h3>
              <button onClick={() => { setSelectedRequest(null); setRejectionReason('') }}><FiX className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* User info */}
              <div className="flex items-center gap-4 p-4 bg-dark-800 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-dark-600 overflow-hidden">
                  {selectedRequest.avatar_url ? <img src={selectedRequest.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{selectedRequest.username?.charAt(0).toUpperCase()}</div>}
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedRequest.display_name || selectedRequest.username}</p>
                  <p className="text-dark-400">{selectedRequest.email}</p>
                  <p className="text-sm text-dark-500">Nom sur document : {selectedRequest.full_name}</p>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-medium mb-3">Documents soumis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-dark-400 mb-2">{selectedRequest.document_type === 'national_id' ? 'Recto CNI' : 'Page passeport'}</p>
                    <a href={selectedRequest.document_front_url} target="_blank" rel="noopener noreferrer" className="block border border-dark-700 rounded-lg overflow-hidden hover:border-primary-500 transition-colors">
                      <img src={selectedRequest.document_front_url} alt="Document front" className="w-full h-48 object-cover" />
                    </a>
                  </div>
                  {selectedRequest.document_back_url && (
                    <div>
                      <p className="text-sm text-dark-400 mb-2">Verso CNI</p>
                      <a href={selectedRequest.document_back_url} target="_blank" rel="noopener noreferrer" className="block border border-dark-700 rounded-lg overflow-hidden hover:border-primary-500 transition-colors">
                        <img src={selectedRequest.document_back_url} alt="Document back" className="w-full h-48 object-cover" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t border-dark-700">
                  <div>
                    <label className="block text-sm font-medium mb-2">Raison du rejet (optionnel)</label>
                    <textarea 
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg"
                      placeholder="Ex: Document illisible, informations non concordantes..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleReview(selectedRequest.id, 'approved')} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium">
                      Approuver
                    </button>
                    <button onClick={() => handleReview(selectedRequest.id, 'rejected')} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium">
                      Rejeter
                    </button>
                  </div>
                </div>
              )}

              {selectedRequest.status !== 'pending' && (
                <div className={`p-4 rounded-lg ${selectedRequest.status === 'approved' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <p className={`font-medium ${selectedRequest.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedRequest.status === 'approved' ? 'Demande approuvée' : 'Demande rejetée'}
                  </p>
                  {selectedRequest.rejection_reason && <p className="text-sm text-dark-400 mt-1">Raison : {selectedRequest.rejection_reason}</p>}
                  <p className="text-xs text-dark-500 mt-2">Le {new Date(selectedRequest.reviewed_at).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const AdminAds = () => {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAd, setEditingAd] = useState(null)

  useEffect(() => { fetchAds() }, [])
  const fetchAds = async () => { setLoading(true); try { const res = await api.get('/admin/ads'); setAds(res.data.ads || []) } catch (e) { console.error(e) } finally { setLoading(false) } }
  const saveAd = async (data) => { try { if (editingAd) await api.patch(`/admin/ads/${editingAd.id}`, data); else await api.post('/admin/ads', data); fetchAds(); setShowModal(false); setEditingAd(null) } catch (e) { console.error(e) } }
  const deleteAd = async (id) => { if (!confirm('Supprimer ?')) return; try { await api.delete(`/admin/ads/${id}`); fetchAds() } catch (e) { console.error(e) } }
  const toggleStatus = async (ad) => { try { await api.patch(`/admin/ads/${ad.id}`, { status: ad.status === 'active' ? 'paused' : 'active' }); fetchAds() } catch (e) { console.error(e) } }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Publicités</h1>
        <button 
          onClick={() => { setEditingAd(null); setShowModal(true) }} 
          className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/40 hover:scale-[1.02]"
        >
          <FiPlus className="w-5 h-5" /> 
          <span>Nouvelle publicité</span>
        </button>
      </div>
      {/* Desktop Table */}
      <div className="hidden md:block bg-dark-800 rounded-xl border border-dark-700 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-dark-700/50"><tr><th className="px-4 py-3 text-left text-sm">Titre</th><th className="px-4 py-3 text-left text-sm">Type</th><th className="px-4 py-3 text-left text-sm">Statut</th><th className="px-4 py-3 text-left text-sm">Impressions</th><th className="px-4 py-3 text-left text-sm">Clics</th><th className="px-4 py-3 text-right text-sm">Actions</th></tr></thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? <tr><td colSpan={6} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div></td></tr> :
            ads.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-dark-400">Aucune publicité</td></tr> :
            ads.map(a => (
              <tr key={a.id} className="hover:bg-dark-700/30">
                <td className="px-4 py-3 font-medium">{a.title}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-dark-600">{a.ad_type}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${a.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-dark-600'}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-sm">{formatNumber(a.impressions || 0)}</td>
                <td className="px-4 py-3 text-sm">{formatNumber(a.clicks || 0)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => { setEditingAd(a); setShowModal(true) }} className="p-2 hover:bg-dark-600 rounded-lg"><FiEdit className="w-4 h-4" /></button><button onClick={() => deleteAd(a.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><FiTrash2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div></div> :
        ads.length === 0 ? <div className="text-center py-8 text-dark-400">Aucune publicité</div> :
        ads.map(a => (
          <div key={a.id} className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">{a.title}</p>
              <span className={`px-2 py-1 rounded text-xs ${a.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-dark-600'}`}>{a.status}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-xs bg-dark-600">{a.ad_type}</span>
                <span className="text-dark-400 text-xs">{formatNumber(a.impressions || 0)} imp.</span>
                <span className="text-dark-400 text-xs">{formatNumber(a.clicks || 0)} clics</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingAd(a); setShowModal(true) }} className="p-2 hover:bg-dark-600 rounded-lg"><FiEdit className="w-4 h-4" /></button>
                <button onClick={() => deleteAd(a.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><FiTrash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showModal && <AdModal ad={editingAd} onClose={() => { setShowModal(false); setEditingAd(null) }} onSave={saveAd} />}
    </div>
  )
}

const AdModal = ({ ad, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('general')
  const [uploading, setUploading] = useState(false)
  const [mediaInputMode, setMediaInputMode] = useState(ad?.media_url?.startsWith('/uploads') ? 'upload' : 'url')
  
  // Helper to parse targeting arrays (handles both string and array formats)
  const parseTargetArray = (data) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    try {
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  
  // Determine targeting mode based on existing data
  const hasTargeting = ad && (
    parseTargetArray(ad.target_countries).length > 0 ||
    parseTargetArray(ad.target_devices).length > 0 ||
    parseTargetArray(ad.target_categories).length > 0
  )
  
  const [form, setForm] = useState({ 
    title: ad?.title || '', 
    description: ad?.description || '', 
    ad_type: ad?.ad_type || 'banner', 
    media_url: ad?.media_url || '', 
    target_url: ad?.target_url || '', 
    position: ad?.position || 'in_feed', 
    status: ad?.status || 'draft',
    targeting_mode: hasTargeting ? 'targeted' : 'general',
    target_countries: parseTargetArray(ad?.target_countries),
    target_devices: parseTargetArray(ad?.target_devices),
    target_categories: parseTargetArray(ad?.target_categories),
    start_date: ad?.start_date ? ad.start_date.split('T')[0] : '',
    end_date: ad?.end_date ? ad.end_date.split('T')[0] : '',
    budget: ad?.budget || '',
    cpm: ad?.cpm || ''
  })

  const countries = [
    { code: 'BF', name: 'Burkina Faso' }, { code: 'CI', name: "Côte d'Ivoire" }, { code: 'ML', name: 'Mali' },
    { code: 'SN', name: 'Sénégal' }, { code: 'NE', name: 'Niger' }, { code: 'TG', name: 'Togo' },
    { code: 'BJ', name: 'Bénin' }, { code: 'GH', name: 'Ghana' }, { code: 'FR', name: 'France' },
    { code: 'US', name: 'États-Unis' }, { code: 'CA', name: 'Canada' }, { code: 'BE', name: 'Belgique' }
  ]
  const devices = [{ id: 'desktop', name: 'Ordinateur' }, { id: 'mobile', name: 'Mobile' }, { id: 'tablet', name: 'Tablette' }]
  const categories = [
    { id: 'music', name: 'Musique' }, { id: 'sports', name: 'Sports' }, { id: 'entertainment', name: 'Divertissement' },
    { id: 'news', name: 'Actualités' }, { id: 'education', name: 'Éducation' }, { id: 'gaming', name: 'Jeux vidéo' },
    { id: 'tech', name: 'Technologie' }, { id: 'lifestyle', name: 'Lifestyle' }
  ]
  const positions = [
    { id: 'in_feed', name: 'Dans le flux', desc: 'Entre les vidéos suggérées' },
    { id: 'pre_roll', name: 'Pré-roll', desc: 'Avant la vidéo (skippable 5s)' },
    { id: 'mid_roll', name: 'Mid-roll', desc: 'Pendant la vidéo' },
    { id: 'header', name: 'Bannière haute', desc: 'En haut de page' },
    { id: 'footer', name: 'Bannière basse', desc: 'En bas de page' }
  ]

  const toggleArrayItem = (field, item) => {
    const arr = form[field]
    setForm({ ...form, [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await api.post('/ads/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setForm({ ...form, media_url: res.data.url })
    } catch (error) {
      console.error('Upload error:', error)
      alert('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      target_countries: JSON.stringify(form.target_countries),
      target_devices: JSON.stringify(form.target_devices),
      target_categories: JSON.stringify(form.target_categories)
    }
    onSave(data)
  }

  const getMediaPreview = () => {
    if (!form.media_url) return null
    const isVideo = form.media_url.match(/\.(mp4|webm)$/i)
    // Handle both relative and absolute URLs
    let fullUrl = form.media_url
    if (form.media_url.startsWith('/uploads')) {
      // Use window.location.origin for uploaded files
      const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin
      fullUrl = `${apiBase}${form.media_url}`
    }
    
    if (isVideo) {
      return (
        <video 
          src={fullUrl} 
          className="w-full h-40 object-contain rounded-lg bg-black" 
          controls 
          preload="metadata"
        />
      )
    }
    return (
      <img 
        src={fullUrl} 
        alt="Preview" 
        className="w-full h-40 object-contain rounded-lg bg-dark-700" 
        onError={(e) => { e.target.src = '/placeholder.jpg' }} 
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-xl w-full max-w-2xl border border-dark-700 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-dark-700">
          <h3 className="font-semibold text-lg">{ad ? 'Modifier' : 'Nouvelle'} publicité</h3>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg"><FiX className="w-5 h-5" /></button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {[
            { id: 'general', label: 'Général' },
            { id: 'media', label: 'Média' },
            { id: 'targeting', label: 'Ciblage' },
            { id: 'schedule', label: 'Planification' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-primary-400 border-b-2 border-primary-400' : 'text-dark-400 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'general' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Titre *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg focus:border-primary-500 focus:outline-none" placeholder="Nom de la campagne" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg focus:border-primary-500 focus:outline-none resize-none" rows={2} placeholder="Description de la publicité..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type de publicité</label>
                  <select value={form.ad_type} onChange={e => setForm({ ...form, ad_type: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg">
                    <option value="banner">Bannière image</option>
                    <option value="video">Vidéo publicitaire</option>
                    <option value="overlay">Overlay (superposition)</option>
                    <option value="sponsored">Contenu sponsorisé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg">
                    <option value="draft">Brouillon</option>
                    <option value="active">Actif</option>
                    <option value="paused">En pause</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Position d'affichage</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {positions.map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setForm({ ...form, position: pos.id })}
                      className={`p-3 rounded-lg border text-left transition-all ${form.position === pos.id ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 hover:border-dark-600'}`}
                    >
                      <p className="font-medium text-sm">{pos.name}</p>
                      <p className="text-xs text-dark-400">{pos.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL de destination *</label>
                <input type="url" value={form.target_url} onChange={e => setForm({ ...form, target_url: e.target.value })} required className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg focus:border-primary-500 focus:outline-none" placeholder="https://votre-site.com" />
              </div>
            </>
          )}

          {activeTab === 'media' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Source du média</label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setMediaInputMode('upload')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mediaInputMode === 'upload' ? 'bg-primary-500 text-white' : 'bg-dark-700 hover:bg-dark-600'}`}
                  >
                    <FiUpload className="w-4 h-4" /> Uploader un fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaInputMode('url')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mediaInputMode === 'url' ? 'bg-primary-500 text-white' : 'bg-dark-700 hover:bg-dark-600'}`}
                  >
                    <FiLink className="w-4 h-4" /> Coller une URL
                  </button>
                </div>

                {mediaInputMode === 'upload' ? (
                  <div className="border-2 border-dashed border-dark-600 rounded-xl p-6 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      id="ad-media-upload"
                      accept="image/*,video/mp4,video/webm"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="ad-media-upload" className="cursor-pointer">
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                          <p className="text-sm text-dark-400">Upload en cours...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FiUpload className="w-10 h-10 text-dark-400" />
                          <p className="font-medium">Cliquez pour sélectionner</p>
                          <p className="text-xs text-dark-400">JPG, PNG, GIF, WEBP, MP4, WEBM (max 50MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={form.media_url}
                    onChange={e => setForm({ ...form, media_url: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg focus:border-primary-500 focus:outline-none"
                    placeholder="https://exemple.com/image.jpg"
                  />
                )}
              </div>

              {form.media_url && (
                <div>
                  <label className="block text-sm font-medium mb-2">Aperçu</label>
                  <div className="bg-dark-800 rounded-xl p-3 border border-dark-700">
                    {getMediaPreview()}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-dark-400 truncate flex-1">{form.media_url}</p>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, media_url: '' })}
                        className="ml-2 p-1.5 hover:bg-dark-600 rounded text-red-400"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-dark-800/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">📐 Dimensions recommandées</p>
                <ul className="text-xs text-dark-400 space-y-1">
                  <li>• <strong>Sidebar</strong>: 300x250px ou 300x600px</li>
                  <li>• <strong>Dans le flux</strong>: 16:9 (1280x720px)</li>
                  <li>• <strong>Bannière</strong>: 728x90px ou 970x90px</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'targeting' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Mode de ciblage</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm({ ...form, targeting_mode: 'general' })} className={`p-3 rounded-lg border text-left transition-all ${form.targeting_mode === 'general' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 hover:border-dark-600'}`}>
                    <FiGlobe className="w-5 h-5 mb-1" />
                    <p className="font-medium text-sm">Général</p>
                    <p className="text-xs text-dark-400">Tous les utilisateurs</p>
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, targeting_mode: 'targeted' })} className={`p-3 rounded-lg border text-left transition-all ${form.targeting_mode === 'targeted' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 hover:border-dark-600'}`}>
                    <FiUsers className="w-5 h-5 mb-1" />
                    <p className="font-medium text-sm">Ciblé</p>
                    <p className="text-xs text-dark-400">Audience spécifique</p>
                  </button>
                </div>
              </div>

              {form.targeting_mode === 'targeted' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pays ciblés</label>
                    <div className="flex flex-wrap gap-2">
                      {countries.map(c => (
                        <button key={c.code} type="button" onClick={() => toggleArrayItem('target_countries', c.code)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.target_countries.includes(c.code) ? 'bg-primary-500 text-white' : 'bg-dark-700 hover:bg-dark-600'}`}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                    {form.target_countries.length === 0 && <p className="text-xs text-dark-400 mt-1">Aucun = tous les pays</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Appareils ciblés</label>
                    <div className="flex flex-wrap gap-2">
                      {devices.map(d => (
                        <button key={d.id} type="button" onClick={() => toggleArrayItem('target_devices', d.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${form.target_devices.includes(d.id) ? 'bg-primary-500 text-white' : 'bg-dark-700 hover:bg-dark-600'}`}>
                          {d.id === 'desktop' ? <FiMonitor className="w-3 h-3" /> : <FiSmartphone className="w-3 h-3" />}
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Catégories de contenu</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button key={cat.id} type="button" onClick={() => toggleArrayItem('target_categories', cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.target_categories.includes(cat.id) ? 'bg-primary-500 text-white' : 'bg-dark-700 hover:bg-dark-600'}`}>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'schedule' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date de début</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date de fin</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Budget (FCFA)</label>
                  <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg" placeholder="Ex: 50000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CPM (Coût pour 1000 vues)</label>
                  <input type="number" step="0.01" value={form.cpm} onChange={e => setForm({ ...form, cpm: e.target.value })} className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg" placeholder="Ex: 500" />
                </div>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-3 text-sm text-dark-400">
                <p>• Laissez les dates vides pour une diffusion immédiate et illimitée</p>
                <p>• Le budget permet de limiter les dépenses totales</p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4 border-t border-dark-700">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">Annuler</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium">{ad ? 'Enregistrer' : 'Créer la publicité'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const AdminSettings = () => {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [platformName, setPlatformName] = useState('')

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => { 
    try { 
      const res = await api.get('/admin/settings')
      setSettings(res.data)
      setPlatformName(res.data.platform_name || '')
    } catch (e) { console.error(e) } 
    finally { setLoading(false) } 
  }

  const updateSetting = async (key, value) => { 
    setSaving(true)
    try { 
      await api.patch(`/admin/settings/${key}`, { value })
      setSettings({ ...settings, [key]: value })
    } catch (e) { console.error(e) } 
    finally { setSaving(false) }
  }

  const savePlatformName = async () => {
    if (platformName !== settings.platform_name) {
      await updateSetting('platform_name', platformName)
    }
  }

  const isEnabled = (key) => settings[key] === true || settings[key] === 'true'

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <button onClick={fetchSettings} disabled={loading} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
        <div className="p-4">
          <h3 className="font-semibold mb-4">Général</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div><p className="font-medium">Nom de la plateforme</p><p className="text-sm text-dark-400">Affiché partout sur le site</p></div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={platformName} 
                  onChange={e => setPlatformName(e.target.value)} 
                  onBlur={savePlatformName}
                  onKeyDown={e => e.key === 'Enter' && savePlatformName()}
                  className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg w-48" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Mode maintenance</p><p className="text-sm text-dark-400">Bloquer l'accès au site</p></div>
              <button 
                onClick={() => updateSetting('maintenance_mode', !isEnabled('maintenance_mode'))} 
                disabled={saving}
                className={`p-2 rounded-lg transition-colors ${isEnabled('maintenance_mode') ? 'bg-red-500/20 text-red-400' : 'bg-dark-700 text-dark-400'}`}
              >
                {isEnabled('maintenance_mode') ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold mb-4">Inscriptions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Inscriptions activées</p><p className="text-sm text-dark-400">Permettre les nouveaux comptes</p></div>
              <button 
                onClick={() => updateSetting('registration_enabled', !isEnabled('registration_enabled'))} 
                disabled={saving}
                className={`p-2 rounded-lg transition-colors ${isEnabled('registration_enabled') ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}
              >
                {isEnabled('registration_enabled') ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold mb-4">Stockage</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Limite par défaut</p><p className="text-sm text-dark-400">Espace pour les nouveaux utilisateurs</p></div>
              <select 
                value={settings.default_storage_limit || 5368709120} 
                onChange={e => updateSetting('default_storage_limit', e.target.value)} 
                className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg"
              >
                <option value="1073741824">1 GB</option>
                <option value="2147483648">2 GB</option>
                <option value="5368709120">5 GB</option>
                <option value="10737418240">10 GB</option>
                <option value="21474836480">20 GB</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Taille max vidéo</p><p className="text-sm text-dark-400">Taille maximale par fichier</p></div>
              <select 
                value={settings.max_video_size || 2147483648} 
                onChange={e => updateSetting('max_video_size', e.target.value)} 
                className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg"
              >
                <option value="536870912">500 MB</option>
                <option value="1073741824">1 GB</option>
                <option value="2147483648">2 GB</option>
                <option value="5368709120">5 GB</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold mb-4">Publicités</h3>
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Publicités activées</p><p className="text-sm text-dark-400">Afficher les publicités sur le site</p></div>
            <button 
              onClick={() => updateSetting('ads_enabled', !isEnabled('ads_enabled'))} 
              disabled={saving}
              className={`p-2 rounded-lg transition-colors ${isEnabled('ads_enabled') ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}
            >
              {isEnabled('ads_enabled') ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Activity Logs
const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [filters, setFilters] = useState({
    action_type: '',
    action: '',
    search: '',
    date_from: '',
    date_to: ''
  })

  useEffect(() => { fetchLogs() }, [pagination.page])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: 50 })
      if (filters.action_type) params.append('action_type', filters.action_type)
      if (filters.action) params.append('action', filters.action)
      if (filters.search) params.append('search', filters.search)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      
      const res = await api.get(`/admin/logs?${params}`)
      setLogs(res.data.logs || [])
      setPagination(res.data.pagination || { page: 1, total: 0, pages: 1 })
      setStats(res.data.stats)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const applyFilters = () => {
    setPagination(p => ({ ...p, page: 1 }))
    fetchLogs()
  }

  const clearFilters = () => {
    setFilters({ action_type: '', action: '', search: '', date_from: '', date_to: '' })
    setPagination(p => ({ ...p, page: 1 }))
    setTimeout(fetchLogs, 0)
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ limit: 10000 })
      if (filters.action_type) params.append('action_type', filters.action_type)
      if (filters.action) params.append('action', filters.action)
      if (filters.search) params.append('search', filters.search)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      
      const res = await api.get(`/admin/logs?${params}`)
      const data = res.data.logs || []
      
      // Generate CSV
      const headers = ['Date', 'Utilisateur', 'Email', 'Rôle', 'Action', 'Type', 'Cible Type', 'Cible ID', 'IP', 'User Agent', 'Détails']
      const rows = data.map(log => [
        new Date(log.created_at).toISOString(),
        log.username || 'Système',
        log.email || '',
        log.user_role || '',
        log.action,
        log.action_type,
        log.target_type || '',
        log.target_id || '',
        log.ip_address || '',
        (log.user_agent || '').replace(/"/g, '""'),
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ])
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')
      
      // Download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `logs_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } catch (e) { 
      console.error(e)
      alert('Erreur lors de l\'export')
    }
    finally { setExporting(false) }
  }

  const actionTypeLabels = {
    auth: 'Authentification',
    video: 'Vidéos',
    channel: 'Chaînes',
    comment: 'Commentaires',
    admin: 'Administration',
    user: 'Utilisateur',
    system: 'Système'
  }

  const actionLabels = {
    login: 'Connexion',
    logout: 'Déconnexion',
    register: 'Inscription',
    upload_video: 'Upload vidéo',
    delete_video: 'Suppression vidéo',
    update_video: 'Modification vidéo',
    add_comment: 'Ajout commentaire',
    delete_comment: 'Suppression commentaire',
    subscribe: 'Abonnement',
    unsubscribe: 'Désabonnement',
    like_video: 'Like vidéo',
    dislike_video: 'Dislike vidéo',
    admin_update_user: 'Modif. utilisateur',
    admin_delete_user: 'Suppression utilisateur',
    admin_delete_video: 'Suppression vidéo (admin)',
    admin_verify_user: 'Vérification utilisateur',
    admin_handle_report: 'Traitement signalement'
  }

  const actionTypeColors = {
    auth: 'bg-blue-500/20 text-blue-400',
    video: 'bg-purple-500/20 text-purple-400',
    channel: 'bg-green-500/20 text-green-400',
    comment: 'bg-yellow-500/20 text-yellow-400',
    admin: 'bg-red-500/20 text-red-400',
    user: 'bg-cyan-500/20 text-cyan-400',
    system: 'bg-gray-500/20 text-gray-400'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logs d'activité</h1>
          <p className="text-dark-400 text-sm">{pagination.total} entrées au total</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV} 
            disabled={exporting} 
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 text-sm"
          >
            <FiDownload className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Export...' : 'Export CSV'}
          </button>
          <button onClick={fetchLogs} disabled={loading} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <p className="text-dark-400 text-xs mb-1">Aujourd'hui</p>
            <p className="text-2xl font-bold">{stats.todayCount || 0}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <p className="text-dark-400 text-xs mb-1">Cette semaine</p>
            <p className="text-2xl font-bold">{stats.weekCount || 0}</p>
          </div>
          {stats.actionTypes?.slice(0, 3).map(at => (
            <div key={at.action_type} className="bg-dark-800 rounded-xl border border-dark-700 p-4">
              <p className="text-dark-400 text-xs mb-1">{actionTypeLabels[at.action_type] || at.action_type}</p>
              <p className="text-2xl font-bold">{at.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs text-dark-400 mb-1">Recherche</label>
            <input
              type="text"
              placeholder="Utilisateur, action, IP..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Type</label>
            <select
              value={filters.action_type}
              onChange={e => setFilters({ ...filters, action_type: e.target.value })}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm"
            >
              <option value="">Tous</option>
              {Object.entries(actionTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Date début</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Date fin</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={e => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm [color-scheme:dark]"
            />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={applyFilters} className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg text-sm">
              Filtrer
            </button>
            <button onClick={clearFilters} className="px-3 py-2 bg-dark-600 hover:bg-dark-500 rounded-lg text-sm" title="Réinitialiser">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-dark-400">Aucun log trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-dark-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-300">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-300">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-300">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-300">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-300">Cible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-300">IP</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-300">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-dark-700/30">
                    <td className="px-4 py-3 text-xs text-dark-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center overflow-hidden text-xs">
                          {log.avatar_url ? <img src={log.avatar_url} className="w-full h-full object-cover" alt="" /> : (log.username?.charAt(0) || 'S').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{log.username || 'Système'}</p>
                          <p className="text-[10px] text-dark-500">{log.user_role || 'system'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{actionLabels[log.action] || log.action}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${actionTypeColors[log.action_type] || 'bg-dark-700 text-dark-400'}`}>
                        {actionTypeLabels[log.action_type] || log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-dark-400">
                      {log.target_type ? (
                        <span className="font-mono text-[10px]">{log.target_type}:{log.target_id?.substring(0, 8)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-dark-500 font-mono">{log.ip_address || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {log.details && Object.keys(log.details).length > 0 && (
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded text-[10px]"
                        >
                          Voir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-400">
            Affichage {((pagination.page - 1) * 50) + 1} - {Math.min(pagination.page * 50, pagination.total)} sur {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-dark-700 rounded-lg disabled:opacity-50 text-sm"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-dark-400 text-sm">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-dark-700 rounded-lg disabled:opacity-50 text-sm"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="font-semibold">Détails du log</h3>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-dark-700 rounded-lg">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div>
                <p className="text-xs text-dark-400">Date</p>
                <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-400">Utilisateur</p>
                <p className="text-sm">{selectedLog.username || 'Système'} ({selectedLog.user_role})</p>
              </div>
              <div>
                <p className="text-xs text-dark-400">Action</p>
                <p className="text-sm">{selectedLog.action} ({selectedLog.action_type})</p>
              </div>
              {selectedLog.target_type && (
                <div>
                  <p className="text-xs text-dark-400">Cible</p>
                  <p className="text-sm font-mono">{selectedLog.target_type}: {selectedLog.target_id}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-dark-400">Adresse IP</p>
                <p className="text-sm font-mono">{selectedLog.ip_address || '-'}</p>
              </div>
              {selectedLog.user_agent && (
                <div>
                  <p className="text-xs text-dark-400">User Agent</p>
                  <p className="text-xs font-mono text-dark-300 break-all">{selectedLog.user_agent}</p>
                </div>
              )}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 mb-2">Données additionnelles</p>
                  <pre className="text-xs bg-dark-900 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Admin Management (Superadmin only)
const AdminAdmins = () => {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => { fetchAdmins() }, [])

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/admins')
      setAdmins(res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const searchUsers = async () => {
    if (!searchUser.trim()) return
    try {
      const res = await api.get(`/admin/users?search=${searchUser}&limit=10`)
      setSearchResults(res.data.users?.filter(u => !['admin', 'superadmin'].includes(u.role)) || [])
    } catch (e) { console.error(e) }
  }

  const promoteToAdmin = async (userId) => {
    try {
      await api.post(`/admin/admins/promote/${userId}`)
      fetchAdmins()
      setShowPromoteModal(false)
      setSearchUser('')
      setSearchResults([])
    } catch (e) { 
      alert(e.response?.data?.error || 'Erreur')
    }
  }

  const updateAdmin = async (id, updates) => {
    try {
      await api.patch(`/admin/admins/${id}`, updates)
      fetchAdmins()
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur')
    }
  }

  const deleteAdmin = async (id) => {
    if (!confirm('Supprimer cet administrateur ?')) return
    try {
      await api.delete(`/admin/admins/${id}`)
      fetchAdmins()
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur')
    }
  }

  const roleColors = {
    superadmin: 'bg-red-500/20 text-red-400',
    admin: 'bg-purple-500/20 text-purple-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Gestion des Administrateurs</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPromoteModal(true)} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> Promouvoir
          </button>
          <button onClick={fetchAdmins} disabled={loading} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-dark-400">Aucun administrateur</div>
        ) : (
          <div className="divide-y divide-dark-700">
            {admins.map(admin => (
              <div key={admin.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center overflow-hidden">
                    {admin.avatar_url ? <img src={admin.avatar_url} className="w-full h-full object-cover" /> : admin.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{admin.display_name || admin.username}</p>
                    <p className="text-sm text-dark-400">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${roleColors[admin.role]}`}>
                    {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                  </span>
                  {admin.role !== 'superadmin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateAdmin(admin.id, { isActive: !admin.is_active })}
                        className={`p-2 rounded-lg ${admin.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                        title={admin.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {admin.is_active ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => updateAdmin(admin.id, { role: 'user' })}
                        className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg"
                        title="Rétrograder"
                      >
                        <FiUsers className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteAdmin(admin.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg"
                        title="Supprimer"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="font-semibold">Promouvoir un utilisateur</h3>
              <button onClick={() => { setShowPromoteModal(false); setSearchResults([]) }} className="p-2 hover:bg-dark-700 rounded-lg">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Rechercher par username ou email..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUsers()}
                  className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg"
                />
                <button onClick={searchUsers} className="px-4 py-2 bg-primary-500 rounded-lg">
                  <FiSearch className="w-5 h-5" />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="divide-y divide-dark-700 max-h-60 overflow-y-auto">
                  {searchResults.map(user => (
                    <div key={user.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.username}</p>
                          <p className="text-xs text-dark-400">{user.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => promoteToAdmin(user.id)}
                        className="px-3 py-1 bg-primary-500 hover:bg-primary-600 rounded text-sm"
                      >
                        Promouvoir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
