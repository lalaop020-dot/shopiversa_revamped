import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import useAuthStore from '../store/useAuthStore'
import toast from 'react-hot-toast'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['customer', 'seller']),
})

export default function Register() {
  const [isLoading, setIsLoading] = useState(false)
  const { registerCustomer } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'customer' }
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const { role } = await registerCustomer(data.name, data.email, data.password)
      toast.success('Account created successfully!')
      navigate(role === 'customer' ? '/' : '/seller/dashboard')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create Account</h2>
        <p className="text-slate-400 text-sm">Join the Shopiversa marketplace today</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <Input id="name" label="Full Name" placeholder="John Doe"
            className="pl-10" error={errors.name?.message} {...register('name')} />
          <User className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <Input id="email" label="Email Address" placeholder="name@example.com"
            className="pl-10" error={errors.email?.message} {...register('email')} />
          <Mail className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <Input id="password" label="Password" type="password" placeholder="••••••••"
            className="pl-10" error={errors.password?.message} {...register('password')} />
          <Lock className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <Button type="submit" className="w-full" isLoading={isLoading}>Create Account</Button>
      </form>
      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
      </p>
      <p className="text-center text-sm text-slate-400">
        Want to sell?{' '}
        <Link to="/seller-register" className="text-green-400 font-bold hover:underline">Apply as Seller</Link>
      </p>
    </div>
  )
}
