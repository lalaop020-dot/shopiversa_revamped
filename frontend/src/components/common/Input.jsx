import { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const Input = forwardRef(function Input({ 
  label, 
  error, 
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
      <input
        ref={ref}
        id={id}
        className={twMerge(
          'input-field',
          error && 'border-red-500 focus:ring-red-500/50',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  )
})
