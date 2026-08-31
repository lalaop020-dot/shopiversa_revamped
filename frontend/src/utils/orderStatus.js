import { Clock, CheckCircle, PackageCheck, Truck, CheckCircle2, XCircle } from 'lucide-react'

// Forward-only fulfillment pipeline mirrored from the backend's ORDER_FLOW
// (marketplace/app/api/v1/endpoints/orders.py). Backend status values stay
// "Shipped"/"Delivered" (renaming a Postgres enum value is destructive), but
// this app shows them to users as "Departed"/"Received".
export const ORDER_FLOW = ['Processing', 'Confirmed', 'Packed', 'Shipped', 'Delivered']

export const ORDER_STATUS_META = {
  Processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-500', icon: Clock },
  Confirmed: { label: 'Confirmed', color: 'bg-cyan-500/10 text-cyan-500', icon: CheckCircle },
  Packed: { label: 'Packed', color: 'bg-purple-500/10 text-purple-500', icon: PackageCheck },
  Shipped: { label: 'Departed', color: 'bg-accent-gold/10 text-accent-gold', icon: Truck },
  Delivered: { label: 'Received', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
  Cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-500', icon: XCircle },
}

export function statusLabel(status) {
  return ORDER_STATUS_META[status]?.label || status
}

export function statusMeta(status) {
  return ORDER_STATUS_META[status] || { label: status, color: 'bg-slate-500/10 text-slate-500', icon: Clock }
}

// Statuses a seller/admin may move an order forward to, given its current
// status — mirrors the backend's forward-only + terminal-state guard so the
// UI never offers a transition the API would reject.
export function nextStatusOptions(currentStatus) {
  if (currentStatus === 'Delivered' || currentStatus === 'Cancelled') return []
  const currentIdx = ORDER_FLOW.indexOf(currentStatus)
  const forward = ORDER_FLOW.slice(currentIdx + 1)
  return [...forward, 'Cancelled']
}
