import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bus, MapPin, AlertTriangle, Activity, Clock, TrendingUp } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { reportsApi, tripsApi } from '../api/endpoints'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DashboardStats {
  totalTrips: number
  activeTrips: number
  incidents: number
  fleetUtilization: number
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
} as const

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
}

export default function DashboardPage() {
  const markVisited = useUIStore((s) => s.markVisited)
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0,
    activeTrips: 0,
    incidents: 0,
    fleetUtilization: 0,
  })
  const [recentTrips, setRecentTrips] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    markVisited('/dashboard')
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [tripRes, incidentRes, vehicleRes] = await Promise.allSettled([
        tripsApi.list({ page: 1, limit: 10 }),
        reportsApi.incidentSummary({ page: 1, limit: 5 }),
        reportsApi.vehicleUtilization(1, 10),
      ])

      if (tripRes.status === 'fulfilled') {
        const trips = tripRes.value.data.data || []
        setRecentTrips(trips.slice(0, 5))
        const active = trips.filter((t: any) => t.status === 'STARTED').length
        setStats((s) => ({
          ...s,
          totalTrips: tripRes.value.data.total || trips.length,
          activeTrips: active,
        }))

        // Build chart data from trips by date
        const dateMap: Record<string, number> = {}
        trips.forEach((t: any) => {
          const d = t.trip_date || 'Unknown'
          dateMap[d] = (dateMap[d] || 0) + 1
        })
        setChartData(
          Object.entries(dateMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date: date.slice(5), trips: count }))
        )
      }

      if (incidentRes.status === 'fulfilled') {
        setStats((s) => ({ ...s, incidents: incidentRes.value.data.total || 0 }))
      }

      if (vehicleRes.status === 'fulfilled') {
        const vehicles = vehicleRes.value.data.data || []
        const total = vehicleRes.value.data.total || 1
        const utilized = vehicles.filter((v: any) => (v.total_trips || 0) > 0).length
        setStats((s) => ({
          ...s,
          fleetUtilization: total > 0 ? Math.round((utilized / total) * 100) : 0,
        }))
      }
    } catch {
      // Stats stay at 0
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Trips" value={stats.totalTrips} icon={Bus} color="blue" delay={0} />
        <StatCard label="Active Now" value={stats.activeTrips} icon={Activity} color="cyan" delay={0.05} />
        <StatCard label="Incidents" value={stats.incidents} icon={AlertTriangle} color="amber" delay={0.1} />
        <StatCard
          label="Fleet Utilization"
          value={stats.fleetUtilization}
          icon={TrendingUp}
          color="green"
          suffix="%"
          delay={0.15}
        />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Chart */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card hover={false} className="h-full">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-flux-blue" />
              Trip Activity
            </h3>
            <div className="h-56">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1629',
                        border: '1px solid rgba(59,130,246,0.15)',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#cbd5e1',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="trips"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#tripGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-ghost text-sm">
                  {loading ? 'Loading chart...' : 'No trip data available'}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Recent Trips */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card hover={false} className="h-full">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-flux-cyan" />
              Recent Trips
            </h3>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-16 h-4 animate-shimmer rounded" />
                    <div className="w-24 h-4 animate-shimmer rounded" />
                  </div>
                ))
              ) : recentTrips.length === 0 ? (
                <p className="text-ghost text-sm py-4 text-center">No trips yet</p>
              ) : (
                recentTrips.map((trip: any, i: number) => (
                  <motion.div
                    key={trip.trip_id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center justify-between py-2 border-b border-slate-light/5 last:border-0"
                  >
                    <div>
                      <p className="text-sm text-cloud font-medium">Trip #{trip.trip_id}</p>
                      <p className="text-xs text-ghost">{trip.trip_date} · {trip.shift}</p>
                    </div>
                    <StatusBadge status={trip.status} />
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
