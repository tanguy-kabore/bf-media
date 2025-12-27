import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiDollarSign, FiTrendingUp, FiClock, FiCheck, FiAlertCircle, 
  FiEye, FiVideo, FiCalendar, FiDownload, FiRefreshCw, FiCreditCard,
  FiInfo, FiArrowRight, FiArrowUp, FiArrowDown, FiPlay, FiHeart,
  FiThumbsUp, FiMessageSquare, FiShare2
} from 'react-icons/fi'
import api from '../services/api'
import useAuthStore from '../store/authStore'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatWeek = (weekStart) => {
  if (!weekStart) return ''
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

export default function Earnings() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState(null)
  const [realtime, setRealtime] = useState(null)
  const [earnings, setEarnings] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [earningsPage, setEarningsPage] = useState(1)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [earningsPagination, setEarningsPagination] = useState({})
  const [paymentsPagination, setPaymentsPagination] = useState({})
  
  // Filtres pour l'historique
  const [filters, setFilters] = useState({
    type: 'all', // all, view, like, comment, share
    status: 'all', // all, pending, approved, paid
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    fetchSummary()
    fetchRealtime()
    if (activeTab === 'earnings') fetchEarnings()
    if (activeTab === 'payments') fetchPayments()
  }, [activeTab, earningsPage, paymentsPage, filters])

  // Auto-refresh realtime data every 10 seconds pour un affichage plus dynamique
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'overview') {
        fetchRealtime()
        fetchSummary() // Rafraîchir aussi le summary pour les totaux
      }
    }, 10000) // 10 secondes pour un affichage plus réactif
    return () => clearInterval(interval)
  }, [activeTab])

  const fetchSummary = async () => {
    try {
      const res = await api.get('/earnings/summary')
      setSummary(res.data)
    } catch (error) {
      console.error('Error fetching summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRealtime = async () => {
    try {
      const res = await api.get('/earnings/realtime')
      setRealtime(res.data)
    } catch (error) {
      console.error('Error fetching realtime:', error)
    }
  }

  const fetchEarnings = async () => {
    try {
      // Construire les paramètres de requête avec les filtres
      const params = new URLSearchParams({
        page: earningsPage,
        limit: 20
      })
      
      if (filters.type !== 'all') params.append('type', filters.type)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      
      const res = await api.get(`/earnings/history?${params.toString()}`)
      setEarnings(res.data.earnings)
      setEarningsPagination(res.data.pagination)
    } catch (error) {
      console.error('Error fetching earnings:', error)
    }
  }

  const fetchPayments = async () => {
    try {
      const res = await api.get(`/earnings/payments?page=${paymentsPage}&limit=20`)
      setPayments(res.data.payments)
      setPaymentsPagination(res.data.pagination)
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user?.isVerified && !user?.is_verified) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-900 rounded-2xl border border-dark-800 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Compte non vérifié</h2>
          <p className="text-dark-400 mb-6">
            Vous devez avoir un compte vérifié pour accéder aux revenus et aux paiements.
          </p>
          <Link 
            to="/settings" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors"
          >
            Demander la vérification
            <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const StatCard = ({ icon: Icon, label, value, subValue, color = 'primary', trend }) => (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 sm:p-6">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 sm:p-3 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}-400`} />
        </div>
        {trend && (
          <span className={`text-xs sm:text-sm font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-xs sm:text-sm text-dark-400 mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mb-1">{value}</p>
      {subValue && <p className="text-xs text-dark-500">{subValue}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Mes revenus</h1>
              <p className="text-sm sm:text-base text-dark-400">Suivez vos gains et vos paiements</p>
            </div>
            <button 
              onClick={fetchSummary}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors text-sm sm:text-base"
            >
              <FiRefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <StatCard
              icon={FiDollarSign}
              label="Revenus totaux"
              value={formatCurrency(summary.summary.total_earnings)}
              color="primary"
            />
            <StatCard
              icon={FiClock}
              label="En attente"
              value={formatCurrency(summary.summary.pending_earnings)}
              subValue="À approuver"
              color="yellow"
            />
            <StatCard
              icon={FiTrendingUp}
              label="Disponible"
              value={formatCurrency(summary.summary.available_for_withdrawal)}
              subValue="Prêt pour paiement"
              color="green"
            />
            <StatCard
              icon={FiCheck}
              label="Payé"
              value={formatCurrency(summary.summary.paid_earnings)}
              subValue={`${summary.stats.total_transactions} transactions`}
              color="blue"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-dark-900 rounded-xl border border-dark-800 overflow-hidden">
          <div className="border-b border-dark-800 overflow-x-auto">
            <div className="flex min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Vue d'ensemble
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors ${
                  activeTab === 'earnings'
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Historique des revenus
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors ${
                  activeTab === 'payments'
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Paiements
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Real-time Stats */}
                {realtime && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Current Week */}
                    <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 rounded-xl border border-primary-500/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm sm:text-base">Cette semaine</h3>
                        <span className="text-xs text-dark-400">{realtime.current_week?.week_number}</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-primary-400 mb-2">
                        {formatCurrency(realtime.current_week?.earnings || 0)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <FiEye className="w-4 h-4 text-blue-400" />
                          <span className="text-dark-400">{realtime.current_week?.views || 0} vues</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiPlay className="w-4 h-4 text-green-400" />
                          <span className="text-dark-400">{realtime.current_week?.watch_minutes || 0} min</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-primary-500/20">
                        <p className="text-xs text-dark-400 mb-2 font-medium">Engagement</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <FiThumbsUp className="w-3.5 h-3.5 text-pink-400" />
                            <span className="text-dark-400">{realtime.current_week?.likes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiMessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-dark-400">{realtime.current_week?.comments || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiShare2 className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-dark-400">{realtime.current_week?.shares || 0}</span>
                          </div>
                        </div>
                      </div>
                      {realtime.current_week?.estimated_total > 0 && (
                        <div className="mt-3 pt-3 border-t border-primary-500/20">
                          <p className="text-xs text-dark-400">
                            Estimation fin de semaine: <span className="text-primary-400 font-semibold">{formatCurrency(realtime.current_week.estimated_total)}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Last Week Comparison */}
                    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm sm:text-base">Semaine précédente</h3>
                        <span className="text-xs text-dark-400">{realtime.last_week?.week_number}</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold mb-2">
                        {formatCurrency(realtime.last_week?.earnings || 0)}
                      </div>
                      <div className="flex items-center gap-2">
                        {realtime.last_week?.earnings > 0 ? (
                          <>
                            {realtime.trend > 0 ? (
                              <span className="flex items-center gap-1 text-green-400 text-sm">
                                <FiArrowUp className="w-4 h-4" /> +{realtime.trend}%
                              </span>
                            ) : realtime.trend < 0 ? (
                              <span className="flex items-center gap-1 text-red-400 text-sm">
                                <FiArrowDown className="w-4 h-4" /> {realtime.trend}%
                              </span>
                            ) : (
                              <span className="text-dark-400 text-sm">Pas de changement</span>
                            )}
                            <span className="text-xs text-dark-500">vs semaine précédente</span>
                          </>
                        ) : (
                          <span className="text-dark-400 text-sm">Pas de données pour la semaine précédente</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Earning Rates Info */}
                {realtime?.rates && (
                  <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 sm:p-6">
                    <h3 className="font-semibold text-sm sm:text-base mb-4">Comment sont calculés vos revenus ?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <FiEye className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{realtime.rates.PER_VIEW} XOF</p>
                          <p className="text-xs text-dark-400">par vue</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <FiClock className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{realtime.rates.PER_WATCH_MINUTE} XOF</p>
                          <p className="text-xs text-dark-400">par minute de visionnage</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <FiTrendingUp className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">+{realtime.rates.ENGAGEMENT_BONUS * 100}% bonus</p>
                          <p className="text-xs text-dark-400">si rétention &gt; {realtime.rates.MIN_RETENTION_FOR_BONUS * 100}%</p>
                        </div>
                      </div>
                      {realtime.rates.PER_LIKE && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-pink-500/20 rounded-lg">
                            <FiThumbsUp className="w-4 h-4 text-pink-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{realtime.rates.PER_LIKE} XOF</p>
                            <p className="text-xs text-dark-400">par like</p>
                          </div>
                        </div>
                      )}
                      {realtime.rates.PER_COMMENT && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <FiMessageSquare className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{realtime.rates.PER_COMMENT} XOF</p>
                            <p className="text-xs text-dark-400">par commentaire</p>
                          </div>
                        </div>
                      )}
                      {realtime.rates.PER_SHARE && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-orange-500/20 rounded-lg">
                            <FiShare2 className="w-4 h-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{realtime.rates.PER_SHARE} XOF</p>
                            <p className="text-xs text-dark-400">par partage</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Weekly Earnings Chart */}
                {summary?.weekly_earnings && summary.weekly_earnings.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">Historique par semaine</h3>
                    <div className="space-y-3">
                      {summary.weekly_earnings.map((week, index) => (
                        <div key={index} className="flex items-center gap-3 sm:gap-4">
                          <div className="w-28 sm:w-36 text-xs sm:text-sm text-dark-400">
                            {formatWeek(week.week_start)}
                          </div>
                          <div className="flex-1">
                            <div className="h-8 sm:h-10 bg-dark-700 rounded-lg overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-end px-3"
                                style={{ width: `${Math.max(5, (week.total / Math.max(...summary.weekly_earnings.map(w => w.total || 1))) * 100)}%` }}
                              >
                                <span className="text-xs sm:text-sm font-medium text-white">
                                  {formatCurrency(week.total)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-16 sm:w-20 text-right text-xs sm:text-sm text-dark-400">
                            {week.transactions} trans.
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Earnings Breakdown */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-4">Répartition des revenus</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                      <div className="flex items-center gap-3 mb-2">
                        <FiEye className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-dark-400">Revenus des vues</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold">{formatCurrency(summary.stats.view_earnings)}</p>
                    </div>
                    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                      <div className="flex items-center gap-3 mb-2">
                        <FiVideo className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-dark-400">Revenus publicitaires</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold">{formatCurrency(summary.stats.ad_earnings)}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <FiInfo className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-blue-400 mb-2 text-sm sm:text-base">Informations de paiement</h4>
                      <p className="text-xs sm:text-sm text-dark-300 mb-3">
                        Les paiements sont effectués par l'administration après approbation de vos revenus. 
                        Assurez-vous que vos informations bancaires sont à jour dans vos paramètres.
                      </p>
                      <Link 
                        to="/settings" 
                        className="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-400 hover:text-blue-300"
                      >
                        Gérer mes informations de paiement
                        <FiArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Earnings History Tab */}
            {activeTab === 'earnings' && (
              <div className="space-y-4">
                {/* Filtres */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
                  <h3 className="font-semibold text-sm mb-4">Filtres</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-dark-400 mb-1.5">Type</label>
                      <select 
                        value={filters.type}
                        onChange={(e) => setFilters({...filters, type: e.target.value})}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                      >
                        <option value="all">Tous</option>
                        <option value="view">Vues</option>
                        <option value="like">Likes</option>
                        <option value="comment">Commentaires</option>
                        <option value="share">Partages</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1.5">Statut</label>
                      <select 
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                      >
                        <option value="all">Tous</option>
                        <option value="pending">En attente</option>
                        <option value="approved">Approuvé</option>
                        <option value="paid">Payé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1.5">Date début</label>
                      <input 
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1.5">Date fin</label>
                      <input 
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                  {(filters.type !== 'all' || filters.status !== 'all' || filters.dateFrom || filters.dateTo) && (
                    <button
                      onClick={() => setFilters({ type: 'all', status: 'all', dateFrom: '', dateTo: '' })}
                      className="mt-3 text-xs text-primary-400 hover:text-primary-300"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>

                {earnings.length === 0 ? (
                  <div className="text-center py-12">
                    <FiDollarSign className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                    <p className="text-dark-400">Aucun revenu pour le moment</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards */}
                    <div className="block lg:hidden space-y-3">
                      {earnings.map((earning) => (
                        <div key={earning.id} className="bg-dark-800 rounded-lg border border-dark-700 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1 truncate">
                                {earning.video_title || earning.description || 'Revenu'}
                              </p>
                              <p className="text-xs text-dark-400">
                                {formatDate(earning.created_at)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs flex-shrink-0 ml-2 ${
                              earning.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                              earning.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {earning.status === 'paid' ? 'Payé' : earning.status === 'approved' ? 'Approuvé' : 'En attente'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-dark-500 capitalize">{earning.earning_type}</span>
                            </div>
                            {earning.earning_type === 'view' && earning.description && (
                              <div className="flex items-center gap-1.5 text-dark-400">
                                <FiPlay className="w-3 h-3" />
                                {earning.description.match(/(\d+)\s*min/)?.[1] || 0} min
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-dark-700">
                            <span className="text-xs text-dark-500">Montant</span>
                            <span className="text-lg font-bold text-primary-400">{formatCurrency(earning.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-dark-800 border-b border-dark-700">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-dark-400">Date</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-dark-400">Description</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-dark-400">Type</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-dark-400">Détails</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-dark-400">Montant</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-dark-400">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                          {earnings.map((earning) => {
                            // Extraire les détails de la description
                            const minutes = earning.description?.match(/(\d+)\s*min/)?.[1] || 0
                            const retention = earning.description?.match(/(\d+)%/)?.[1] || 0
                            
                            return (
                              <tr key={earning.id} className="hover:bg-dark-800/50">
                                <td className="px-3 py-3 text-xs whitespace-nowrap">{formatDate(earning.created_at)}</td>
                                <td className="px-3 py-3 text-xs">
                                  <div className="max-w-[200px] truncate">
                                    {earning.video_title || earning.description || 'Revenu'}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-xs">
                                  <span className="capitalize inline-flex items-center gap-1">
                                    {earning.earning_type === 'view' && <FiEye className="w-3 h-3 text-blue-400" />}
                                    {earning.earning_type === 'like' && <FiThumbsUp className="w-3 h-3 text-pink-400" />}
                                    {earning.earning_type === 'comment' && <FiMessageSquare className="w-3 h-3 text-purple-400" />}
                                    {earning.earning_type === 'share' && <FiShare2 className="w-3 h-3 text-orange-400" />}
                                    {earning.earning_type === 'view' ? 'Vue' : earning.earning_type === 'like' ? 'Like' : earning.earning_type === 'comment' ? 'Commentaire' : earning.earning_type === 'share' ? 'Partage' : earning.earning_type}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-xs text-dark-400">
                                  {earning.earning_type === 'view' && minutes > 0 && (
                                    <div className="flex items-center gap-3">
                                      <span className="flex items-center gap-1">
                                        <FiPlay className="w-3 h-3" />
                                        {minutes} min
                                      </span>
                                      {retention > 0 && (
                                        <span className="text-dark-500">
                                          {retention}% rét.
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {earning.earning_type !== 'view' && <span className="text-dark-600">-</span>}
                                </td>
                                <td className="px-3 py-3 text-xs font-semibold text-primary-400 whitespace-nowrap">
                                  {formatCurrency(earning.amount)}
                                </td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                    earning.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                    earning.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {earning.status === 'paid' ? 'Payé' : earning.status === 'approved' ? 'Approuvé' : 'En attente'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {earningsPagination.pages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <button
                          onClick={() => setEarningsPage(p => Math.max(1, p - 1))}
                          disabled={earningsPage === 1}
                          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Précédent
                        </button>
                        <span className="text-sm text-dark-400">
                          Page {earningsPage} sur {earningsPagination.pages}
                        </span>
                        <button
                          onClick={() => setEarningsPage(p => Math.min(earningsPagination.pages, p + 1))}
                          disabled={earningsPage === earningsPagination.pages}
                          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Suivant
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <FiCreditCard className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                    <p className="text-dark-400">Aucun paiement pour le moment</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards */}
                    <div className="block sm:hidden space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="bg-dark-800 rounded-lg border border-dark-700 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1">
                                Paiement #{payment.id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-dark-400">
                                {formatDate(payment.paid_at || payment.created_at)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs flex-shrink-0 ml-2 ${
                              payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              payment.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                              payment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {payment.status === 'completed' ? 'Complété' : 
                               payment.status === 'processing' ? 'En cours' :
                               payment.status === 'failed' ? 'Échoué' : 'En attente'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-dark-500 capitalize">{payment.payment_method}</span>
                            <span className="text-lg font-bold text-green-400">{formatCurrency(payment.amount)}</span>
                          </div>
                          {payment.notes && (
                            <p className="text-xs text-dark-500 mt-2">{payment.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-dark-800 border-b border-dark-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Référence</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Méthode</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Montant</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                          {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-dark-800/50">
                              <td className="px-4 py-3 text-sm">{formatDate(payment.paid_at || payment.created_at)}</td>
                              <td className="px-4 py-3 text-sm font-mono text-xs">
                                {payment.payment_reference || payment.id.slice(0, 12)}
                              </td>
                              <td className="px-4 py-3 text-sm capitalize">{payment.payment_method}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-400">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  payment.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                  payment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {payment.status === 'completed' ? 'Complété' : 
                                   payment.status === 'processing' ? 'En cours' :
                                   payment.status === 'failed' ? 'Échoué' : 'En attente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {paymentsPagination.pages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <button
                          onClick={() => setPaymentsPage(p => Math.max(1, p - 1))}
                          disabled={paymentsPage === 1}
                          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Précédent
                        </button>
                        <span className="text-sm text-dark-400">
                          Page {paymentsPage} sur {paymentsPagination.pages}
                        </span>
                        <button
                          onClick={() => setPaymentsPage(p => Math.min(paymentsPagination.pages, p + 1))}
                          disabled={paymentsPage === paymentsPagination.pages}
                          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Suivant
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
