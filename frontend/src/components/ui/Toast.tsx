import { create } from 'zustand'
import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

/* ---- Store ---- */

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface ToastState {
  toasts: Toast[]
  add: (type: Toast['type'], message: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  add: (type, message) => {
    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { id, type, message }] })
    setTimeout(() => get().remove(id), 4000)
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

/* ---- Icon map ---- */

const icons: Record<Toast['type'], ReactNode> = {
  success: <CheckCircle size={18} className="text-ok" />,
  error: <XCircle size={18} className="text-danger" />,
  warning: <AlertTriangle size={18} className="text-warn" />,
  info: <Info size={18} className="text-info" />,
}

const borders: Record<Toast['type'], string> = {
  success: 'border-ok/20',
  error: 'border-danger/20',
  warning: 'border-warn/20',
  info: 'border-info/20',
}

/* ---- Component ---- */

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={`glass-strong rounded-xl px-4 py-3 flex items-start gap-3 border ${borders[toast.type]}`}
          >
            <div className="mt-0.5 shrink-0">{icons[toast.type]}</div>
            <p className="text-sm text-cloud flex-1">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="shrink-0 p-0.5 text-ghost hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
