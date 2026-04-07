import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { reportsApi } from '../api/endpoints'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const tabs = [
  { key: 'trip', label: 'Trip Summary' },
  { key: 'vehicle', label: 'Vehicle Utilization' },
  { key: 'incident', label: 'Incident Summary' },
]

const PIE_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ReportsPage() {
  const markVisited = useUIStore((s) => s.markVisited)
  const [activeTab, setActiveTab] = useState('trip')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => { markVisited('/reports') }, [])

  useEffect(() => {
    loadData()
  }, [activeTab, page])

  const loadData = async () => {
    setLoading(true)
    try {
      let res: any
      switch (activeTab) {
        case 'trip':
          res = await reportsApi.tripSummary({ page, limit })
          break
        case 'vehicle':
          res = await reportsApi.vehicleUtilization(page, limit)
          break
        case 'incident':
          res = await reportsApi.incidentSummary({ page, limit })
          break
      }
      setData(res?.data?.data || [])
      setTotal(res?.data?.total || 0)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const tripColumns = [
    { key: 'trip_id', header: 'Trip ID' },
    { key: 'trip_date', header: 'Date' },
    { key: 'route_name', header: 'Route', render: (r: any) => r.route_name || `Route ${r.route_id || '—'}` },
    { key: 'vehicle_reg', header: 'Vehicle', render: (r: any) => r.vehicle_reg || r.registration_no || '—' },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status || 'PLANNED'} /> },
    { key: 'stop_count', header: 'Stops', render: (r: any) => r.stop_count ?? '—' },
    { key: 'total_boarded', header: 'Boarded', render: (r: any) => r.total_boarded ?? '—' },
  ]

  const vehicleColumns = [
    { key: 'registration_no', header: 'Vehicle', render: (r: any) => r.registration_no || r.vehicle_reg || '—' },
    { key: 'model', header: 'Model', render: (r: any) => r.model ?? '—' },
    { key: 'total_trips', header: 'Total Trips' },
    { key: 'total_distance', header: 'Distance (km)', render: (r: any) => r.total_distance != null ? Number(r.total_distance).toFixed(1) : '—' },
    { key: 'status', header: 'Status', render: (r: any) => r.status ? <StatusBadge status={r.status} /> : '—' },
  ]

  const incidentColumns = [
    { key: 'category', header: 'Category', render: (r: any) => r.category || '—' },
    { key: 'severity', header: 'Severity', render: (r: any) => <StatusBadge status={r.severity || '—'} /> },
    { key: 'incident_count', header: 'Count' },
    { key: 'latest_reported_at', header: 'Latest', render: (r: any) => r.latest_reported_at ? new Date(r.latest_reported_at).toLocaleDateString() : '—' },
  ]

  const getColumns = () => {
    switch (activeTab) {
      case 'trip': return tripColumns
      case 'vehicle': return vehicleColumns
      case 'incident': return incidentColumns
      default: return []
    }
  }

  const getKeyField = () => {
    switch (activeTab) {
      case 'trip': return 'trip_id'
      case 'vehicle': return 'registration_no'
      case 'incident': return 'category'
      default: return 'id'
    }
  }

  // Chart data
  const chartData = activeTab === 'vehicle'
    ? data.slice(0, 8).map((d: any) => ({
        name: d.registration_no || d.vehicle_reg || '?',
        trips: d.total_trips || 0,
      }))
    : activeTab === 'incident'
      ? data.reduce((acc: any[], d: any) => {
          const existing = acc.find((a) => a.name === d.severity)
          if (existing) {
            existing.count += d.incident_count || 1
          } else {
            acc.push({ name: d.severity || 'Other', count: d.incident_count || 1 })
          }
          return acc
        }, [])
      : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-flux-violet/10">
            <BarChart3 size={20} className="text-flux-violet" />
          </div>
          <h2 className="text-lg font-semibold text-white">Analytics & Reports</h2>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-dark/50 border border-slate-light/10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`relative px-4 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === tab.key ? 'text-white' : 'text-ghost hover:text-mist'
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="report-tab"
                  className="absolute inset-0 rounded-lg bg-flux-blue/15 border border-flux-blue/15"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <AnimatePresence mode="wait">
        {(activeTab === 'vehicle' || activeTab === 'incident') && chartData.length > 0 && (
          <motion.div
            key={activeTab + '-chart'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card hover={false}>
              <h3 className="text-sm font-semibold text-white mb-4">
                {activeTab === 'vehicle' ? 'Fleet Trip Distribution' : 'Incidents by Severity'}
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'vehicle' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
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
                      <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="name"
                        paddingAngle={4}
                        strokeWidth={0}
                      >
                        {chartData.map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#0f1629',
                          border: '1px solid rgba(59,130,246,0.15)',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#cbd5e1',
                        }}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <DataTable
            columns={getColumns()}
            data={data}
            keyField={getKeyField()}
            loading={loading}
            emptyMessage="No report data available"
          />
        </motion.div>
      </AnimatePresence>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ghost">
          Page {page} of {totalPages} · {total} records
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
