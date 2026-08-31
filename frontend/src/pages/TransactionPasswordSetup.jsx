import { useState } from 'react'
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import useAuthStore from '../store/useAuthStore'
import toast from 'react-hot-toast'

export default function TransactionPasswordSetup() {
  const navigate = useNavigate()
  const setTransactionPassword = useAuthStore((state) => state.setTransactionPassword)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password must be at least 6 digits')
    if (password !== confirmPassword) return toast.error('Passwords do not match')

    setIsLoading(true)
    try {
      await setTransactionPassword(password, confirmPassword)
      toast.success('Transaction password set successfully!')
      navigate('/seller/dashboard')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to set transaction password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Secure Your Wallet</h2>
        <p className="text-slate-400 text-sm mt-1">Set a transaction password for all financial operations.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Set Transaction Password (6-8 Digits)" 
          type="password" 
          placeholder="••••••" 
          maxLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="tracking-widest text-center text-xl"
        />
        <Input 
          label="Confirm Transaction Password" 
          type="password" 
          placeholder="••••••" 
          maxLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="tracking-widest text-center text-xl"
        />

        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-xs text-slate-500 leading-relaxed">
          <p><strong>Note:</strong> This password is different from your login password. It will be required for all withdrawals, shop modifications, and sensitive account changes.</p>
        </div>

        <Button type="submit" className="w-full h-12" isLoading={isLoading}>
          Finish Setup <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    </div>
  )
}
