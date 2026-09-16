import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, ShieldCheck, X } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'

export default function TransactionPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  targetStatusLabel = 'Confirmed',
  isLoading = false,
}) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!password.trim()) return
    onConfirm(password)
  }

  const handleClose = () => {
    setPassword('')
    setShowPassword(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-card w-full max-w-md p-6 rounded-2xl relative z-10 border border-primary/30 shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-dark-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Security Verification</h3>
              <p className="text-xs text-slate-400">Order approval authorization required</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-dark-bg text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-dark-bg/60 p-4 rounded-xl border border-dark-border text-xs space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Target Order:</span>
            <span className="font-mono font-bold text-white">{orderId}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Action Required:</span>
            <span className="font-bold text-emerald-400">Approve & Mark {targetStatusLabel}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" /> Transaction Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter 6-digit security password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Enter your transaction password to confirm and approve this seller shop order.
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              isLoading={isLoading}
              disabled={!password.trim()}
            >
              Approve Order
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
