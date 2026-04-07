import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  color: 'blue' | 'cyan' | 'green' | 'amber' | 'red' | 'violet'
  suffix?: string
  delay?: number
}

const colorMap = {
  blue: {
    gradient: 'from-flux-blue/20 to-flux-blue/5',
    icon: 'text-flux-blue',
    border: 'border-flux-blue/15',
    glow: 'shadow-flux-blue/10',
  },
  cyan: {
    gradient: 'from-flux-cyan/20 to-flux-cyan/5',
    icon: 'text-flux-cyan',
    border: 'border-flux-cyan/15',
    glow: 'shadow-flux-cyan/10',
  },
  green: {
    gradient: 'from-ok/20 to-ok/5',
    icon: 'text-ok',
    border: 'border-ok/15',
    glow: 'shadow-ok/10',
  },
  amber: {
    gradient: 'from-warn/20 to-warn/5',
    icon: 'text-warn',
    border: 'border-warn/15',
    glow: 'shadow-warn/10',
  },
  red: {
    gradient: 'from-danger/20 to-danger/5',
    icon: 'text-danger',
    border: 'border-danger/15',
    glow: 'shadow-danger/10',
  },
  violet: {
    gradient: 'from-flux-violet/20 to-flux-violet/5',
    icon: 'text-flux-violet',
    border: 'border-flux-violet/15',
    glow: 'shadow-flux-violet/10',
  },
}

function useAnimatedCounter(target: number, duration = 1200, inView: boolean) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)

  useEffect(() => {
    if (!inView) return
    startTime.current = null

    const step = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCount(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [target, duration, inView])

  return count
}

export default function StatCard({ label, value, icon: Icon, color, suffix = '', delay = 0 }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const animatedValue = useAnimatedCounter(value, 1200, inView)
  const c = colorMap[color]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay }}
      whileHover={{ y: -3, scale: 1.01 }}
      className={`
        glass-card rounded-xl p-5 border ${c.border}
        bg-gradient-to-br ${c.gradient}
        hover:shadow-lg ${c.glow}
        transition-shadow duration-300
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-mist uppercase tracking-wider">{label}</p>
        <div className={`p-2 rounded-lg bg-white/5 ${c.icon}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">
        {animatedValue.toLocaleString()}{suffix}
      </p>
    </motion.div>
  )
}
