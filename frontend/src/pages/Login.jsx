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
  const { login, setAuth } = useAuthStore()
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
      const msg = error?.response?.data?.message || error.message || 'Invalid credentials'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // Demo login helper
  const demoLogin = async (email, password, role) => {
    setIsLoading(true)
    try {
      const { user } = await login(email, password)
      toast.success(`Logged in as ${role}`)
      if (role === 'customer') navigate('/')
      else navigate(`/${role}/dashboard`)
    } catch {
      toast.error(`Demo ${role} not seeded yet. Run seed.py first.`)
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

      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dark-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-dark-card px-2 text-slate-500">Quick Demo Login</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" size="sm" className="text-[10px] px-0 h-10 border-primary/30 hover:border-primary"
          onClick={() => demoLogin('customer@demo.com', 'demo1234', 'customer')}>Customer</Button>
        <Button variant="outline" size="sm" className="text-[10px] px-0 h-10 border-green-500/30 hover:border-green-500"
          onClick={() => demoLogin('seller@demo.com', 'demo1234', 'seller')}>Seller</Button>
        <Button variant="outline" size="sm" className="text-[10px] px-0 h-10 border-red-500/30 hover:border-red-500"
          onClick={() => demoLogin('admin@shopiversa.com', 'adminpassword123', 'admin')}>Admin</Button>
      </div>

      <p className="text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-bold hover:underline">Sign Up</Link>
      </p>
    </div>
  )
}
