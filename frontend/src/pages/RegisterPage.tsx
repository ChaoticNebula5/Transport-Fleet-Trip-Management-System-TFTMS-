import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Bus, UserPlus, User } from 'lucide-react'
import { authApi } from '../api/endpoints'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useToastStore } from '../components/ui/Toast'

const ROLES = [
  { value: 'DRIVER', label: 'Driver' },
  { value: 'CONDUCTOR', label: 'Conductor' },
  { value: 'MANAGER', label: 'Manager' },
]

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('DRIVER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToastStore((s) => s.add)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Full Name is required')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await authApi.register(email, password, role, fullName.trim())
      toast('success', 'Account created successfully!')
      // Auto-login after registration
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 22 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl border border-slate-light/10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: 20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-flux-cyan via-flux-blue to-flux-indigo flex items-center justify-center shadow-lg shadow-flux-cyan/30"
            >
              <UserPlus size={28} className="text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-1"
            >
              Join Fleet Command
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-mist"
            >
              Create your TFTMS account
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  setError('')
                }}
                icon={<User size={16} />}
                autoComplete="name"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                icon={<Mail size={16} />}
                autoComplete="email"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                icon={<Lock size={16} />}
                autoComplete="new-password"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError('')
                }}
                icon={<Lock size={16} />}
                autoComplete="new-password"
                required
              />
            </motion.div>

            {/* Role Picker */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
            >
              <label className="block text-xs font-medium text-mist mb-2">Select your role</label>
              <div className="flex gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-all cursor-pointer border ${
                      role === r.value
                        ? 'bg-flux-blue/15 text-flux-blue border-flux-blue/30'
                        : 'bg-slate-dark/50 text-ghost border-slate-light/10 hover:border-slate-light/30'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-danger text-xs text-center"
              >
                {error}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-2"
            >
              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Create Account
              </Button>
            </motion.div>
          </form>

          {/* Login link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-ghost">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-flux-blue hover:text-flux-cyan font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-ghost mt-6 flex items-center justify-center gap-1.5"
        >
          <Bus size={12} />
          Transport Fleet & Trip Management System
        </motion.p>
      </motion.div>
    </div>
  )
}
