import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/trips': 'Trip Management',
  '/reports': 'Analytics & Reports',
  '/admin': 'Administration',
}

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const title = pageTitles[location.pathname] || 'TFTMS'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-slate-light/10">
      <div className="flex items-center justify-between px-6 h-14">
        {/* Page Title */}
        <motion.h1
          key={location.pathname}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="text-lg font-semibold text-white"
        >
          {title}
        </motion.h1>

        {/* User Info */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-cloud">{user.email}</p>
                <p className="text-[11px] text-mist">{user.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-flux-blue to-flux-violet flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
            </div>
          )}

          <div className="w-px h-6 bg-slate-light/20" />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-2 rounded-lg text-ghost hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut size={18} />
          </motion.button>
        </div>
      </div>
    </header>
  )
}
