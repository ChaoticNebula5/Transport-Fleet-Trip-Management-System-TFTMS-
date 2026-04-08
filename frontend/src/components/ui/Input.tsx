import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    const [focused, setFocused] = useState(false)
    const hasValue = Boolean(props.value || props.defaultValue)
    const isActive = focused || hasValue

    return (
      <div className={`relative ${className}`}>
        {/* Label — positioned ABOVE the input box when active */}
        <AnimatePresence>
          {isActive && (
            <motion.label
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className={`block text-xs font-medium mb-1.5 ${
                error ? 'text-danger' : focused ? 'text-flux-blue' : 'text-mist'
              }`}
            >
              {label}
            </motion.label>
          )}
        </AnimatePresence>

        <div className="relative">
          {icon && (
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200 ${
              focused ? 'text-flux-blue' : 'text-ghost'
            }`}>
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
              px-4 py-3 text-sm text-white
              transition-all duration-200 focus-ring
              ${icon ? 'pl-10' : ''}
              ${error
                ? 'border-danger/50 focus:border-danger'
                : focused
                  ? 'border-flux-blue/50'
                  : 'border-slate-light/30 hover:border-slate-light/50'
              }
            `}
            placeholder={isActive ? '' : label}
          />
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
