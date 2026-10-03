import { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const Input = forwardRef(function Input({ 
  label, 
  error, 
  icon: Icon,
  rightElement,
  className, 
  id,
  ...props 
}, ref) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
        )}
        <input
          ref={ref}
          id={id}
          className={twMerge(
            'input-field',
            Icon && 'pl-10',
            rightElement && 'pr-10',
            error && 'border-red-500 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  )
})
