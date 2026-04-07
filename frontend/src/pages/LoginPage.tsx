import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Zap } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch {
      setShakeKey((k) => k + 1)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        key={shakeKey}
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={
          error && shakeKey > 0
            ? {
                opacity: 1,
                scale: 1,
                y: 0,
                x: [0, -12, 12, -8, 8, -4, 4, 0],
              }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          error && shakeKey > 0
            ? { x: { duration: 0.5, ease: 'easeOut' }, default: { type: 'spring', stiffness: 250, damping: 22 } }
            : { type: 'spring', stiffness: 250, damping: 22 }
        }
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl border border-slate-light/10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-flux-blue to-flux-cyan flex items-center justify-center shadow-lg shadow-flux-blue/25"
            >
              <Zap size={24} className="text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-1"
            >
              Fleet Command
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-mist"
            >
              Sign in to your TFTMS account
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  clearError()
                }}
                icon={<Mail size={16} />}
                autoComplete="email"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearError()
                }}
                icon={<Lock size={16} />}
                error={error || undefined}
                autoComplete="current-password"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                loading={isLoading}
                className="w-full"
                size="lg"
              >
                Sign In
              </Button>
            </motion.div>
          </form>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-ghost mt-6"
        >
          Transport Fleet & Trip Management System
        </motion.p>
      </motion.div>
    </div>
  )
}
