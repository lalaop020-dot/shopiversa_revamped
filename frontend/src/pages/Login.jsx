import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import useAuthStore from '../store/useAuthStore'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const { user, role } = await login(data.email, data.password)
      toast.success(`Welcome back, ${user.name}!`)
      if (role === 'customer') navigate('/')
      else navigate(`/${role}/dashboard`)
    } catch (error) {
      const shopStatus = error?.response?.data?.shopStatus
      const msg = error?.response?.data?.message || error.message || 'Invalid credentials'
      if (shopStatus) {
        navigate('/seller-pending', { state: { shopStatus, email: data.email } })
      } else {
        toast.error(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome Back</h2>
        <p className="text-slate-400 text-sm">Login to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <Input id="email" label="Email Address" placeholder="name@example.com"
            className="pl-10" error={errors.email?.message} {...register('email')} />
          <Mail className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <Input id="password" label="Password" type={showPassword ? 'text' : 'password'}
            placeholder="••••••••" className="pl-10" error={errors.password?.message} {...register('password')} />
          <Lock className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-300">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <Button type="submit" className="w-full" isLoading={isLoading}>Sign In</Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-bold hover:underline">Sign Up</Link>
      </p>
    </div>
  )
}
