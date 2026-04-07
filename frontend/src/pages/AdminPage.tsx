import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { authApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useToastStore } from '../components/ui/Toast'

interface UserRow {
  user_id: number
  email: string
  role: string
  is_active: boolean
}

const ROLES = ['ADMIN', 'MANAGER', 'DRIVER', 'CONDUCTOR']

export default function AdminPage() {
  const markVisited = useUIStore((s) => s.markVisited)
  const toast = useToastStore((s) => s.add)

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Edit modal
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Register modal
  const [showRegister, setShowRegister] = useState(false)
  const [regForm, setRegForm] = useState({ email: '', password: '', role: 'DRIVER' })
  const [registering, setRegistering] = useState(false)

  useEffect(() => { markVisited('/admin') }, [])

  useEffect(() => { loadUsers() }, [page])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await authApi.listUsers(page, limit)
      const d = res.data
      setUsers(d.data || d || [])
      setTotal(d.total || (d.data || d).length || 0)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const openEdit = (user: UserRow) => {
    setEditUser(user)
    setEditRole(user.role)
    setEditActive(user.is_active)
  }

  const saveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      await authApi.updateUser(editUser.user_id, { role: editRole, is_active: editActive })
      toast('success', `User ${editUser.email} updated`)
      setEditUser(null)
      loadUsers()
    } catch (err: any) {
      toast('error', err.response?.data?.detail || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const registerUser = async () => {
    setRegistering(true)
    try {
      await authApi.register(regForm.email, regForm.password, regForm.role)
      toast('success', `User ${regForm.email} created`)
      setShowRegister(false)
      setRegForm({ email: '', password: '', role: 'DRIVER' })
      loadUsers()
    } catch (err: any) {
      toast('error', err.response?.data?.detail || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const columns = [
    { key: 'user_id', header: 'ID', className: 'w-16' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (r: UserRow) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-flux-indigo/10 text-flux-indigo">
          {r.role}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (r: UserRow) => <StatusBadge status={r.is_active ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r: UserRow) => (
        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
          Edit
        </Button>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-warn/10">
            <ShieldCheck size={20} className="text-warn" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Administration</h2>
            <p className="text-xs text-mist">{total} users</p>
          </div>
        </div>

        <Button onClick={() => setShowRegister(true)}>
          <UserPlus size={16} />
          New User
        </Button>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={users} keyField="user_id" loading={loading} emptyMessage="No users found" />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ghost">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit User — ${editUser?.email || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-mist mb-2 block">Role</label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setEditRole(r)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    editRole === r
                      ? 'bg-flux-blue/20 text-flux-blue border border-flux-blue/30'
                      : 'bg-slate-dark text-ghost border border-slate-light/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-mist">Active</label>
            <button
              onClick={() => setEditActive(!editActive)}
              className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${
                editActive ? 'bg-ok' : 'bg-slate-light'
              }`}
            >
              <motion.div
                animate={{ x: editActive ? 20 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-4 h-4 rounded-full bg-white shadow mt-0.5"
              />
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button loading={saving} onClick={saveEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Register Modal */}
      <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Register New User">
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={regForm.email}
            onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            value={regForm.password}
            onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
          />
          <div>
            <label className="text-xs text-mist mb-2 block">Role</label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegForm((f) => ({ ...f, role: r }))}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    regForm.role === r
                      ? 'bg-flux-blue/20 text-flux-blue border border-flux-blue/30'
                      : 'bg-slate-dark text-ghost border border-slate-light/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button loading={registering} onClick={registerUser}>Create User</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
