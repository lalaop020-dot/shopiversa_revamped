import { Link, useLocation } from 'react-router-dom'
import { Clock, XCircle, ShieldAlert } from 'lucide-react'

const STATUS_CONTENT = {
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    title: 'Application Under Review',
    message: "Your shop application has been submitted and is waiting for admin approval. You'll be able to log in as soon as it's approved.",
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-500',
    title: 'Application Rejected',
    message: 'Your shop application was rejected. Please contact support for more information.',
  },
  suspended: {
    icon: ShieldAlert,
    color: 'text-red-500',
    title: 'Shop Suspended',
    message: 'Your shop has been suspended. Please contact support for more information.',
  },
}

export default function SellerPending() {
  const location = useLocation()
  const shopStatus = location.state?.shopStatus || 'pending'
  const shopName = location.state?.shopName
  const { icon: Icon, color, title, message } = STATUS_CONTENT[shopStatus] || STATUS_CONTENT.pending

  return (
    <div className="space-y-6 text-center">
      <Icon className={`w-14 h-14 mx-auto ${color}`} />
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {shopName && <p className="text-slate-400 text-sm mt-1">{shopName}</p>}
        <p className="text-slate-400 text-sm mt-3">{message}</p>
      </div>
      <Link to="/login" className="inline-block text-primary font-bold hover:underline text-sm">
        Back to Login
      </Link>
    </div>
  )
}
