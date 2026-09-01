import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Mail, MessageSquare, MapPin, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '../components/common/Card'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import api from '../api/axios'
import toast from 'react-hot-toast'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export default function Contact() {
  const [isLoading, setIsLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await api.post('/contact', data)
      toast.success("Message sent! We'll get back to you soon.")
      reset()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-10 animate-fade-in py-6">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Contact Us</h1>
        <p className="text-slate-400">
          Questions about an order, a shop application, or anything else? Send us a message and our team will get back to you.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="lg:col-span-2">
          <Card>
            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  id="name" label="Your Name" placeholder="John Doe"
                  error={errors.name?.message} {...register('name')}
                />
                <Input
                  id="email" label="Email Address" type="email" placeholder="name@example.com"
                  error={errors.email?.message} {...register('email')}
                />
              </div>
              <Input
                id="subject" label="Subject (optional)" placeholder="What's this about?"
                error={errors.subject?.message} {...register('subject')}
              />
              <div className="space-y-1.5">
                <label htmlFor="message" className="text-sm font-medium text-slate-300">Message</label>
                <textarea
                  id="message"
                  className="input-field min-h-[160px] py-3"
                  placeholder="Tell us how we can help..."
                  {...register('message')}
                />
                {errors.message?.message && (
                  <span className="text-xs text-red-500">{errors.message.message}</span>
                )}
              </div>
              <Button type="submit" className="w-full sm:w-auto" isLoading={isLoading}>
                Send Message
              </Button>
            </motion.form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Email</div>
              <div className="text-slate-400 text-sm">support@shopiversa.com</div>
            </div>
          </Card>
          <Card className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Live Chat</div>
              <div className="text-slate-400 text-sm">Available from your dashboard once signed in</div>
            </div>
          </Card>
          <Card className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Marketplace</div>
              <div className="text-slate-400 text-sm">A global, fully online multi-vendor platform</div>
            </div>
          </Card>
          <Card className="flex items-start gap-4 bg-primary/5 border-primary/20">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Have a quick question?</div>
              <Link to="/faq" className="text-primary text-sm font-medium hover:underline">Check the FAQs first &rarr;</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
