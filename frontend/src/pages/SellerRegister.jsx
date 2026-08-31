import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Store, Mail, Lock, User, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import useAuthStore from '../store/useAuthStore'
import toast from 'react-hot-toast'

const sellerSchema = z.object({
  shopName: z.string().min(3, 'Shop name must be at least 3 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export default function SellerRegister() {
  const [isLoading, setIsLoading] = useState(false)
  const { registerSeller } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(sellerSchema),
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const { user } = await registerSeller(data.name, data.shopName, data.email, data.password)
      toast.success('Shop application submitted!')
      navigate('/seller-pending', { state: { shopStatus: user.shopStatus, shopName: user.shopName } })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Sell on Shopiversa</h2>
        <p className="text-slate-400 text-sm">Start your business in minutes</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {['300–2000 Product Limits', 'Fast Crypto Payouts', 'Global Storefront Access'].map(b => (
          <div key={b} className="flex items-center gap-2 text-xs text-green-500 font-medium">
            <CheckCircle2 className="w-4 h-4" /> {b}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <Input id="shopName" label="Shop Name" placeholder="My Awesome Store"
            className="pl-10" error={errors.shopName?.message} {...register('shopName')} />
          <Store className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <Input id="name" label="Your Full Name" placeholder="John Doe"
            className="pl-10" error={errors.name?.message} {...register('name')} />
          <User className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <Input id="email" label="Email Address" placeholder="you@shop.com"
            className="pl-10" error={errors.email?.message} {...register('email')} />
          <Mail className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <Input id="password" label="Password" type="password" placeholder="••••••••"
            className="pl-10" error={errors.password?.message} {...register('password')} />
          <Lock className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
        </div>
        <Button type="submit" className="w-full" isLoading={isLoading}>Submit Application</Button>
      </form>
      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
      </p>
    </div>
  )
}
