import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  onClick?: () => void
}

export default function Card({ children, className = '', hover = true, glow = false, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={`
        glass-card rounded-xl p-5
        transition-shadow duration-300
        ${hover ? 'cursor-pointer hover:border-flux-blue/20' : ''}
        ${glow ? 'glow-blue' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
