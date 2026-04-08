import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bus, Filter, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { tripsApi, type TripRow } from '../api/endpoints'
import { useUIStore } from '../stores/uiStore'
import { useAuthStore } from '../stores/authStore'
import DataTable from '../components/ui/DataTable'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useToastStore } from '../components/ui/Toast'

const STATUSES = ['ALL', 'PLANNED', 'STARTED', 'END_REQUESTED', 'COMPLETED', 'CANCELLED']
const SHIFTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']

interface LookupRoute {
  route_id: number
  route_code: string
  route_name: string
  start_point: string
  end_point: string
}
interface LookupVehicle {
  vehicle_id: number
  registration_no: string
  model: string
  capacity: number
}
interface LookupStaff {
  staff_id: number
  full_name: string
  staff_type: string
  license_no: string
}

const getApiErrorMessage = (err: any, fallback: string) => {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === 'string' && first.trim()) return first
    if (first?.msg) return String(first.msg)
  }
  return fallback
}

export default function TripsPage() {
  const markVisited = useUIStore((s) => s.markVisited)
  const user = useAuthStore((s) => s.user)
  const toast = useToastStore((s) => s.add)

  const [trips, setTrips] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const limit = 15

  // Action modals
  const [actionModal, setActionModal] = useState<{
    type: 'start' | 'end' | 'verify' | 'cancel' | 'incident'
    trip: TripRow
  } | null>(null)
  const [odometerValue, setOdometerValue] = useState('')
  const [incidentForm, setIncidentForm] = useState({ severity: 'LOW', category: '', description: '' })
  const [actionLoading, setActionLoading] = useState(false)

  // Create Trip modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    route_id: 0,
    vehicle_id: 0,
    driver_staff_id: 0,
    conductor_staff_id: 0,
    trip_date: '',
    shift: 'MORNING',
  })
  const [lookupRoutes, setLookupRoutes] = useState<LookupRoute[]>([])
  const [lookupVehicles, setLookupVehicles] = useState<LookupVehicle[]>([])
  const [lookupDrivers, setLookupDrivers] = useState<LookupStaff[]>([])
  const [lookupConductors, setLookupConductors] = useState<LookupStaff[]>([])

  useEffect(() => {
    markVisited('/trips')
  }, [])

  const loadTrips = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, limit }
      if (statusFilter !== 'ALL') params.status = statusFilter
      const res = await tripsApi.list(params)
      setTrips(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch {
      setTrips([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    loadTrips()
  }, [loadTrips])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // Load lookups when create modal opens
  const openCreateModal = async () => {
    setShowCreateModal(true)
    setCreateForm({ route_id: 0, vehicle_id: 0, driver_staff_id: 0, conductor_staff_id: 0, trip_date: '', shift: 'MORNING' })
    try {
      const [rRes, vRes, dRes, cRes] = await Promise.all([
        tripsApi.lookupRoutes(),
        tripsApi.lookupVehicles(),
        tripsApi.lookupStaff('DRIVER'),
        tripsApi.lookupStaff('CONDUCTOR'),
      ])
      setLookupRoutes(rRes.data)
      setLookupVehicles(vRes.data)
      setLookupDrivers(dRes.data)
      setLookupConductors(cRes.data)
    } catch {
      toast('error', 'Failed to load lookup data')
    }
  }

  const submitCreateTrip = async () => {
    if (!createForm.route_id || !createForm.vehicle_id || !createForm.driver_staff_id || !createForm.trip_date) {
      toast('error', 'Please fill all required fields')
      return
    }
    setCreateLoading(true)
    try {
      await tripsApi.create({
        route_id: createForm.route_id,
        vehicle_id: createForm.vehicle_id,
        driver_staff_id: createForm.driver_staff_id,
        conductor_staff_id: createForm.conductor_staff_id || null,
        trip_date: createForm.trip_date,
        shift: createForm.shift,
      })
      toast('success', 'Trip created successfully!')
      setShowCreateModal(false)
      loadTrips()
    } catch (err: any) {
      toast('error', err.response?.data?.detail || 'Failed to create trip')
    } finally {
      setCreateLoading(false)
    }
  }

  const executeAction = async () => {
    if (!actionModal) return

    if (actionModal.type === 'start' || actionModal.type === 'end' || actionModal.type === 'verify') {
      const reading = Number(odometerValue)
      if (!Number.isFinite(reading) || reading <= 0) {
        toast('error', 'Please enter a valid odometer value greater than 0')
        return
      }
    }

    setActionLoading(true)
    try {
      switch (actionModal.type) {
        case 'start':
          await tripsApi.start(actionModal.trip.trip_id, Number(odometerValue))
          toast('success', `Trip #${actionModal.trip.trip_id} started`)
          break
        case 'end':
          await tripsApi.requestEnd(actionModal.trip.trip_id, Number(odometerValue))
          toast('success', `End requested for trip #${actionModal.trip.trip_id}`)
          break
        case 'verify':
          await tripsApi.verify(actionModal.trip.trip_id, Number(odometerValue))
          toast('success', `Trip #${actionModal.trip.trip_id} verified`)
          break
        case 'cancel':
          await tripsApi.cancel(actionModal.trip.trip_id)
          toast('success', `Trip #${actionModal.trip.trip_id} cancelled`)
          break
        case 'incident':
          await tripsApi.reportIncident(
            actionModal.trip.trip_id,
            incidentForm.severity,
            incidentForm.category,
            incidentForm.description
          )
          toast('success', 'Incident reported')
          break
      }
      setActionModal(null)
      setOdometerValue('')
      setIncidentForm({ severity: 'LOW', category: '', description: '' })
      loadTrips()
    } catch (err: any) {
      toast('error', getApiErrorMessage(err, 'Action failed'))
    } finally {
      setActionLoading(false)
    }
  }

  const getActions = (trip: TripRow) => {
    const role = user?.role || ''
    const actions: { label: string; type: 'start' | 'end' | 'verify' | 'cancel' | 'incident'; variant: 'primary' | 'secondary' | 'danger' | 'ghost' }[] = []

    if (trip.status === 'PLANNED' && role === 'DRIVER') {
      actions.push({ label: 'Start', type: 'start', variant: 'primary' })
    }
    if (trip.status === 'STARTED' && role === 'DRIVER') {
      actions.push({ label: 'End', type: 'end', variant: 'secondary' })
    }
    if (trip.status === 'STARTED' && (role === 'DRIVER' || role === 'CONDUCTOR')) {
      actions.push({ label: 'Incident', type: 'incident', variant: 'ghost' })
    }
    if (trip.status === 'END_REQUESTED' && role === 'ADMIN') {
      actions.push({ label: 'Verify', type: 'verify', variant: 'primary' })
    }
    if (!['COMPLETED', 'CANCELLED'].includes(trip.status) && role === 'ADMIN') {
      actions.push({ label: 'Cancel', type: 'cancel', variant: 'danger' })
    }

    return actions
  }

  const columns = [
    { key: 'trip_id', header: 'ID', className: 'w-16' },
    { key: 'trip_date', header: 'Date' },
    { key: 'shift', header: 'Shift' },
    { key: 'route_id', header: 'Route', render: (r: TripRow) => `R-${r.route_id}` },
    { key: 'vehicle_id', header: 'Vehicle', render: (r: TripRow) => `V-${r.vehicle_id}` },
    {
      key: 'status',
      header: 'Status',
      render: (r: TripRow) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r: TripRow) => {
        const actions = getActions(r)
        if (actions.length === 0) return null
        return (
          <div className="flex gap-2 justify-end">
            {actions.map((a) => (
              <Button
                key={a.type}
                size="sm"
                variant={a.variant}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  setActionModal({ type: a.type, trip: r })
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )
      },
    },
  ]

  const modalTitle = actionModal
    ? {
        start: `Start Trip #${actionModal.trip.trip_id}`,
        end: `Request End — Trip #${actionModal.trip.trip_id}`,
        verify: `Verify Trip #${actionModal.trip.trip_id}`,
        cancel: `Cancel Trip #${actionModal.trip.trip_id}`,
        incident: `Report Incident — Trip #${actionModal.trip.trip_id}`,
      }[actionModal.type]
    : ''

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-flux-blue/10">
            <Bus size={20} className="text-flux-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Trip Management</h2>
            <p className="text-xs text-mist">{total} total trips</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Create Trip Button */}
          {canCreate && (
            <Button size="sm" onClick={openCreateModal}>
              <Plus size={14} className="mr-1.5" />
              New Trip
            </Button>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-ghost" />
            <div className="flex gap-1 p-1 rounded-xl bg-slate-dark/50 border border-slate-light/10">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s)
                    setPage(1)
                  }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-flux-blue/20 text-flux-blue'
                      : 'text-ghost hover:text-mist'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={trips} keyField="trip_id" loading={loading} emptyMessage="No trips found" />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ghost">
          Page {page} of {totalPages}
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

      {/* ---- CREATE TRIP MODAL ---- */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Schedule New Trip">
        <div className="space-y-4">
          {/* Route */}
          <div>
            <label className="text-xs text-mist mb-1.5 block font-medium">Route *</label>
            <select
              value={createForm.route_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, route_id: Number(e.target.value) }))}
              className="w-full bg-slate-dark/80 border border-slate-light/30 rounded-lg px-4 py-3 text-sm text-white focus-ring appearance-none cursor-pointer"
            >
              <option value={0}>Select a route...</option>
              {lookupRoutes.map((r) => (
                <option key={r.route_id} value={r.route_id}>
                  [{r.route_code}] {r.route_name} ({r.start_point} → {r.end_point})
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle */}
          <div>
            <label className="text-xs text-mist mb-1.5 block font-medium">Vehicle *</label>
            <select
              value={createForm.vehicle_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, vehicle_id: Number(e.target.value) }))}
              className="w-full bg-slate-dark/80 border border-slate-light/30 rounded-lg px-4 py-3 text-sm text-white focus-ring appearance-none cursor-pointer"
            >
              <option value={0}>Select a vehicle...</option>
              {lookupVehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.registration_no} — {v.model} (Cap: {v.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Driver */}
          <div>
            <label className="text-xs text-mist mb-1.5 block font-medium">Driver *</label>
            <select
              value={createForm.driver_staff_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, driver_staff_id: Number(e.target.value) }))}
              className="w-full bg-slate-dark/80 border border-slate-light/30 rounded-lg px-4 py-3 text-sm text-white focus-ring appearance-none cursor-pointer"
            >
              <option value={0}>Select a driver...</option>
              {lookupDrivers.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.full_name} {s.license_no ? `(${s.license_no})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Conductor (optional) */}
          <div>
            <label className="text-xs text-mist mb-1.5 block font-medium">Conductor <span className="text-ghost">(optional)</span></label>
            <select
              value={createForm.conductor_staff_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, conductor_staff_id: Number(e.target.value) }))}
              className="w-full bg-slate-dark/80 border border-slate-light/30 rounded-lg px-4 py-3 text-sm text-white focus-ring appearance-none cursor-pointer"
            >
              <option value={0}>None</option>
              {lookupConductors.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Shift row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Trip Date"
                type="date"
                value={createForm.trip_date}
                onChange={(e) => setCreateForm((f) => ({ ...f, trip_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-mist mb-1.5 block font-medium">Shift *</label>
              <div className="flex gap-1.5">
                {SHIFTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCreateForm((f) => ({ ...f, shift: s }))}
                    className={`flex-1 px-2 py-2 text-xs rounded-lg font-medium transition-all cursor-pointer border ${
                      createForm.shift === s
                        ? 'bg-flux-blue/15 text-flux-blue border-flux-blue/30'
                        : 'bg-slate-dark/50 text-ghost border-slate-light/10 hover:border-slate-light/30'
                    }`}
                  >
                    {s.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button loading={createLoading} onClick={submitCreateTrip}>
              <Plus size={14} className="mr-1.5" />
              Create Trip
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- ACTION MODALS (start/end/verify/cancel/incident) ---- */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={modalTitle}>
        {actionModal?.type === 'cancel' ? (
          <div className="space-y-4">
            <p className="text-sm text-mist">Are you sure you want to cancel this trip? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setActionModal(null)}>No, Keep</Button>
              <Button variant="danger" loading={actionLoading} onClick={executeAction}>Yes, Cancel Trip</Button>
            </div>
          </div>
        ) : actionModal?.type === 'incident' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-mist mb-1 block">Severity</label>
              <div className="flex gap-2">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setIncidentForm((f) => ({ ...f, severity: s }))}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                      incidentForm.severity === s
                        ? 'bg-flux-blue/20 text-flux-blue border border-flux-blue/30'
                        : 'bg-slate-dark text-ghost border border-slate-light/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Category"
              value={incidentForm.category}
              onChange={(e) => setIncidentForm((f) => ({ ...f, category: e.target.value }))}
            />
            <div>
              <label className="text-xs text-mist mb-1 block">Description</label>
              <textarea
                value={incidentForm.description}
                onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-slate-dark/80 border border-slate-light/30 rounded-lg px-4 py-3 text-sm text-white focus-ring resize-none"
                placeholder="Describe the incident..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setActionModal(null)}>Cancel</Button>
              <Button loading={actionLoading} onClick={executeAction}>Report Incident</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label={actionModal?.type === 'verify' ? 'Verified End Odometer' : `Odometer ${actionModal?.type === 'end' ? 'End' : 'Start'} Reading`}
              type="number"
              value={odometerValue}
              onChange={(e) => setOdometerValue(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setActionModal(null)}>Cancel</Button>
              <Button loading={actionLoading} onClick={executeAction}>
                {actionModal?.type === 'start' ? 'Start Trip' : actionModal?.type === 'end' ? 'Request End' : 'Verify Trip'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  )
}
