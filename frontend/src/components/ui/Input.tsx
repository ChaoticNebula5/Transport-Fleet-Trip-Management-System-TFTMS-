import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    const [focused, setFocused] = useState(false)
    const hasValue = Boolean(props.value || props.defaultValue)

    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost z-10">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            onFocus={(e) => {
              setFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              props.onBlur?.(e)
            }}
            className={`
              w-full bg-slate-dark/80 border rounded-lg
              px-4 py-3 text-sm text-white placeholder-transparent
              transition-all duration-200 focus-ring
              ${icon ? 'pl-10' : ''}
              ${error
                ? 'border-danger/50 focus:border-danger'
                : focused
                  ? 'border-flux-blue/50'
                  : 'border-slate-light/30 hover:border-slate-light/50'
              }
            `}
            placeholder={label}
          />
          <motion.label
            animate={{
              y: focused || hasValue ? -24 : 0,
              x: focused || hasValue ? (icon ? -28 : 0) : 0,
              scale: focused || hasValue ? 0.85 : 1,
              color: error
                ? '#ef4444'
                : focused
                  ? '#3b82f6'
                  : '#64748b',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`
              absolute top-3 text-sm pointer-events-none origin-left
              ${icon ? 'left-10' : 'left-4'}
            `}
          >
            {label}
          </motion.label>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className="text-danger text-xs mt-1 ml-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
