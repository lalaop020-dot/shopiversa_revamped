import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import {
  Store, Mail, Lock, User, CheckCircle2, ChevronRight, ChevronLeft,
  UploadCloud, CreditCard, BookOpen, ShieldCheck, X, ImageIcon, Camera,
  RefreshCw, Bot,
} from 'lucide-react'
import { useState, useRef, useCallback, useMemo } from 'react'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import useAuthStore from '../store/useAuthStore'
import toast from 'react-hot-toast'

// ── Schemas ───────────────────────────────────────────────────
const step1Schema = z.object({
  shopName: z.string().min(3, 'Shop name must be at least 3 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const step2Schema = z.object({
  docFrontImage: z.string().min(1, 'Please upload the front view of your official document'),
  docBackImage: z.string().min(1, 'Please upload the back view of your official document'),
})

// ── Progress Step Indicator ────────────────────────────────────
function StepIndicator({ current }) {
  const steps = [
    { label: 'Account Info', icon: Store },
    { label: 'KYC Verification', icon: ShieldCheck },
  ]
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const Icon = s.icon
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500',
                  done
                    ? 'bg-secondary border-secondary text-white scale-95'
                    : active
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/40 scale-100'
                    : 'bg-dark-bg border-dark-border text-slate-500',
                ].join(' ')}
              >
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={[
                  'text-[10px] font-semibold tracking-wide uppercase',
                  active ? 'text-primary' : done ? 'text-secondary' : 'text-slate-500',
                ].join(' ')}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-16 mx-2 mt-[-14px]">
                <div className="h-px w-full bg-dark-border relative overflow-hidden">
                  <div
                    className="absolute inset-0 h-full bg-gradient-to-r from-secondary to-primary transition-all duration-700"
                    style={{ width: done ? '100%' : '0%' }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Image Upload Zone ──────────────────────────────────────────
function ImageUploadZone({ title, preview, onUpload, onClear, error, badgeText = 'Document uploaded' }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => onUpload(e.target.result)
    reader.readAsDataURL(file)
  }, [onUpload])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  return (
    <div className="space-y-2 flex-1">
      {title && (
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>{title}</span>
          {preview && (
            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">Uploaded ✓</span>
          )}
        </label>
      )}

      {preview ? (
        // ── Preview ──────────────────────────────────────────
        <div className="relative group rounded-xl overflow-hidden border-2 border-primary/40 bg-dark-bg">
          {/* Document frame overlay */}
          <div className="relative">
            <img
              src={preview}
              alt={title || "KYC Document"}
              className="w-full object-cover max-h-48"
            />
            {/* Corner brackets overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-sm" />
              <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-sm" />
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-sm" />
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-sm" />
            </div>
            {/* Green verified badge */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-secondary/90 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium shadow-md">
              <CheckCircle2 className="w-3 h-3" /> {badgeText}
            </div>
          </div>
          {/* Remove button */}
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-dark-bg/80 backdrop-blur-sm border border-dark-border flex items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-500/50 transition-all duration-200 opacity-0 group-hover:opacity-100"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        // ── Drop Zone ─────────────────────────────────────────
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={[
            'relative flex flex-col items-center justify-center gap-2.5 py-8 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 group min-h-[150px]',
            dragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : error
              ? 'border-red-500/50 bg-red-500/5 hover:border-red-400'
              : 'border-dark-border bg-dark-bg hover:border-primary/60 hover:bg-dark-card',
          ].join(' ')}
        >
          {/* Animated icon container */}
          <div className={[
            'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
            dragging ? 'bg-primary/20 scale-110' : 'bg-dark-card group-hover:bg-primary/10 group-hover:scale-105',
          ].join(' ')}>
            {dragging
              ? <UploadCloud className="w-6 h-6 text-primary" />
              : <ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-primary transition-colors duration-300" />
            }
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
              {dragging ? 'Drop image here' : title || 'Click or drag & drop'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">PNG, JPG, WEBP — max 5 MB</p>
          </div>
          {/* Subtle corner decorations */}
          <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-dark-border rounded-tl-sm opacity-60" />
          <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-dark-border rounded-tr-sm opacity-60" />
          <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-dark-border rounded-bl-sm opacity-60" />
          <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-dark-border rounded-br-sm opacity-60" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {error && !preview && (
        <span className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </span>
      )}
    </div>
  )
}

// ── Avatar Upload ──────────────────────────────────────────────
function AvatarUpload({ preview, onUpload }) {
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = (e) => onUpload(e.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Clickable avatar ring */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group w-20 h-20 rounded-full focus:outline-none"
        title="Upload profile picture"
      >
        {/* Animated gradient ring */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-secondary to-primary animate-spin [animation-duration:3s] opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute inset-[2px] rounded-full bg-dark-card" />

        {/* Avatar content */}
        <span className="absolute inset-[3px] rounded-full overflow-hidden flex items-center justify-center bg-dark-bg">
          {preview ? (
            <img src={preview} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-slate-500 group-hover:text-primary transition-colors duration-300" />
          )}
        </span>

        {/* Camera badge */}
        <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary border-2 border-dark-bg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
          <Camera className="w-3 h-3 text-white" />
        </span>
      </button>

      <p className="text-xs text-slate-500">
        {preview ? (
          <span className="text-secondary font-medium">Photo uploaded ✓ — click to change</span>
        ) : (
          'Optional — add a profile photo'
        )}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}

// ── CAPTCHA ──────────────────────────────────────────────
function genChallenge() {
  const ops = ['+', '−', '×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a, b
  if (op === '+') { a = rand(10, 49); b = rand(10, 49) }
  else if (op === '−') { a = rand(20, 60); b = rand(5, a - 5) }
  else { a = rand(2, 12); b = rand(2, 12) }
  const answer = op === '+' ? a + b : op === '−' ? a - b : a * b
  return { expr: `${a} ${op} ${b}`, answer }
}
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function CaptchaBox({ onVerified }) {
  const [challenge, setChallenge] = useState(() => genChallenge())
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle') // idle | success | error
  const [shaking, setShaking] = useState(false)

  const refresh = () => {
    setChallenge(genChallenge())
    setInput('')
    setStatus('idle')
    onVerified(false)
  }

  const handleChange = (val) => {
    setInput(val)
    setStatus('idle')
    onVerified(false)
  }

  const verify = () => {
    const correct = parseInt(input, 10) === challenge.answer
    if (correct) {
      setStatus('success')
      onVerified(true)
    } else {
      setStatus('error')
      onVerified(false)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }
  }

  const borderColor =
    status === 'success' ? 'border-secondary' :
    status === 'error'   ? 'border-red-500' :
    'border-dark-border hover:border-primary/50'

  const bgColor =
    status === 'success' ? 'bg-secondary/5' :
    status === 'error'   ? 'bg-red-500/5' :
    'bg-dark-bg'

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
        <Bot className="w-4 h-4 text-slate-400" />
        Human Verification
        <span className="ml-auto text-[10px] font-normal text-slate-500 bg-dark-card px-2 py-0.5 rounded-full border border-dark-border">CAPTCHA</span>
      </label>

      <div
        className={[
          'flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300',
          bgColor, borderColor,
          shaking ? 'animate-[shake_0.4s_ease]' : '',
        ].join(' ')}
      >
        {/* Challenge display */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-1">
            {/* Decorative shield dots */}
            <div className="flex flex-col gap-0.5 mr-1">
              {[0,1,2].map(i => (
                <div key={i} className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                  status === 'success' ? 'bg-secondary' : status === 'error' ? 'bg-red-400' : 'bg-dark-border'
                }`} />
              ))}
            </div>

            {/* Math expression */}
            <div className="px-4 py-2 rounded-lg bg-dark-card border border-dark-border font-mono text-base font-bold tracking-widest text-white select-none">
              {challenge.expr} = ?
            </div>
          </div>

          {/* Answer input */}
          <input
            type="number"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            placeholder="?"
            className="w-16 text-center font-mono text-lg font-bold input-field px-2 py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          {/* Verify button */}
          <button
            type="button"
            onClick={verify}
            disabled={!input || status === 'success'}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              status === 'success'
                ? 'bg-secondary/20 text-secondary cursor-default'
                : 'bg-primary/20 text-primary hover:bg-primary hover:text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : 'Verify'}
          </button>
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={refresh}
          className="text-slate-500 hover:text-primary transition-colors duration-200 hover:rotate-180 transition-transform"
          title="New challenge"
        >
          <RefreshCw className="w-4 h-4 transition-transform duration-500" />
        </button>
      </div>

      {/* Status feedback */}
      {status === 'success' && (
        <p className="text-xs text-secondary flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Verification passed — you're human!
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Incorrect answer. Try again or refresh for a new challenge.
        </p>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function SellerRegister() {
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Profile picture (frontend only — not sent to backend)
  const [profilePic, setProfilePic] = useState('')

  // KYC state (frontend only — not sent to backend)
  const [docFrontImage, setDocFrontImage] = useState('')
  const [docBackImage, setDocBackImage] = useState('')
  const [kycErrors, setKycErrors] = useState({})

  // CAPTCHA state
  const [captchaPassed, setCaptchaPassed] = useState(false)

  // Slide direction for step transition
  const [slideDir, setSlideDir] = useState('right')

  const { registerSeller, saveKycData } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ resolver: zodResolver(step1Schema) })

  // ── Step 1 → Step 2 ───────────────────────────────────────
  const goToKyc = handleSubmit(() => {
    setSlideDir('right')
    setStep(1)
  })

  // ── Step 2 → Back ─────────────────────────────────────────
  const goBack = () => {
    setSlideDir('left')
    setStep(0)
  }

  // ── KYC Validation ────────────────────────────────────────
  const validateKyc = () => {
    const errs = {}
    if (!docFrontImage) errs.docFrontImage = 'Please upload the front view of your official document'
    if (!docBackImage) errs.docBackImage = 'Please upload the back view of your official document'
    if (!captchaPassed) errs.captcha = 'Please complete the CAPTCHA verification'
    setKycErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Final Submit ──────────────────────────────────────────
  const onSubmit = async () => {
    if (!validateKyc()) return
    setIsLoading(true)
    try {
      const { shopName, name, email, password } = getValues()
      // Save KYC images and profile pic to the persisted auth store
      // so they can be displayed in the seller profile after login.
      saveKycData({ docFrontImage, docBackImage, profilePic })
      // KYC images are stored locally; only core fields are sent to the backend.
      const { user } = await registerSeller(name, shopName, email, password)
      toast.success('Shop application submitted! We\'ll review your KYC documents.')
      navigate('/seller-pending', { state: { shopStatus: user.shopStatus, shopName: user.shopName } })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Sell on Shopiversa</h2>
        <p className="text-slate-400 text-sm mt-1">
          {step === 0 ? 'Start your business in minutes' : 'Verify your identity to get approved faster'}
        </p>
      </div>

      {/* Perks (step 0 only) */}
      {step === 0 && (
        <div className="grid grid-cols-1 gap-2 animate-slide-up">
          {['300–2000 Product Limits', 'Fast Crypto Payouts', 'Global Storefront Access'].map(b => (
            <div key={b} className="flex items-center gap-2 text-xs text-green-500 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {b}
            </div>
          ))}
        </div>
      )}

      {/* Step Indicator */}
      <StepIndicator current={step} />

      {/* ── STEP 1: Account Info ─────────────────────────── */}
      <div
        className="transition-all duration-400"
        style={{ display: step === 0 ? 'block' : 'none' }}
      >
        <form onSubmit={goToKyc} className="space-y-4">
          {/* Profile Picture */}
          <AvatarUpload preview={profilePic} onUpload={setProfilePic} />

          <div className="relative">
            <Input
              id="shopName"
              label="Shop Name"
              placeholder="My Awesome Store"
              className="pl-10"
              error={errors.shopName?.message}
              {...register('shopName')}
            />
            <Store className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
          </div>
          <div className="relative">
            <Input
              id="name"
              label="Your Full Name"
              placeholder="John Doe"
              className="pl-10"
              error={errors.name?.message}
              {...register('name')}
            />
            <User className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
          </div>
          <div className="relative">
            <Input
              id="email"
              label="Email Address"
              placeholder="you@shop.com"
              className="pl-10"
              error={errors.email?.message}
              {...register('email')}
            />
            <Mail className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
          </div>
          <div className="relative">
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              className="pl-10"
              error={errors.password?.message}
              {...register('password')}
            />
            <Lock className="absolute left-3 top-[38px] w-5 h-5 text-slate-500" />
          </div>

          <Button type="submit" className="w-full group mt-2">
            Continue to KYC
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </form>
      </div>

      {/* ── STEP 2: KYC Verification ─────────────────────── */}
      <div
        className="transition-all duration-400"
        style={{ display: step === 1 ? 'block' : 'none' }}
      >
        <div className="space-y-5">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary">Why KYC?</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Identity verification helps us keep Shopiversa safe and speeds up your shop approval.
              </p>
            </div>
          </div>

          {/* Official Document Upload Section */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Upload the official documents(ID card, Driving license)
              </label>
              <p className="text-xs text-slate-400 mt-1">
                Please upload clear front view and back view pictures of your official document.
              </p>
            </div>

            {/* Dual Upload Grid (Front & Back View) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUploadZone
                title="Front View Picture"
                badgeText="Front view uploaded"
                preview={docFrontImage}
                onUpload={(img) => { setDocFrontImage(img); setKycErrors(p => ({ ...p, docFrontImage: '' })) }}
                onClear={() => setDocFrontImage('')}
                error={kycErrors.docFrontImage}
              />

              <ImageUploadZone
                title="Back View Picture"
                badgeText="Back view uploaded"
                preview={docBackImage}
                onUpload={(img) => { setDocBackImage(img); setKycErrors(p => ({ ...p, docBackImage: '' })) }}
                onClear={() => setDocBackImage('')}
                error={kycErrors.docBackImage}
              />
            </div>
          </div>

          {/* Upload Guidelines */}
          {(!docFrontImage || !docBackImage) && (
            <div className="space-y-1.5 p-3 rounded-xl bg-dark-card border border-dark-border">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Photo guidelines</p>
              {[
                'Place document on a flat, well-lit surface',
                'All four corners of both front and back sides must be visible',
                'Ensure text and details are sharp and readable — no blur',
                'Accepted formats: JPG, PNG, WEBP (max 5 MB)',
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                  {tip}
                </div>
              ))}
            </div>
          )}

          {/* CAPTCHA */}
          <CaptchaBox onVerified={setCaptchaPassed} />
          {kycErrors.captcha && !captchaPassed && (
            <p className="-mt-3 text-xs text-red-400 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> {kycErrors.captcha}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 group"
              onClick={goBack}
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back
            </Button>
            <Button
              type="button"
              className="flex-[2] group"
              isLoading={isLoading}
              onClick={onSubmit}
            >
              {!isLoading && <ShieldCheck className="w-4 h-4" />}
              Submit Application
            </Button>
          </div>
        </div>
      </div>

      {/* Sign-in link */}
      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-bold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  )
}
