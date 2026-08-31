import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { motion } from 'framer-motion'

export function Card({ 
  children, 
  className, 
  animate = true,
  ...props 
}) {
  const Component = animate ? motion.div : 'div'
  
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.4 }
  } : {}

  return (
    <Component
      className={twMerge(
        'glass-card p-6 rounded-xl overflow-hidden',
        className
      )}
      {...animationProps}
      {...props}
    >
      {children}
    </Component>
  )
}
