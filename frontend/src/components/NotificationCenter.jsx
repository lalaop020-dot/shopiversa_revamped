import { useEffect } from 'react'
import { Bell, ShoppingCart, DollarSign, Award, Info, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import useNotificationStore from '../store/useNotificationStore'
import useAuthStore from '../store/useAuthStore'
import { timeAgo } from '../utils/formatters'

const TYPE_ICONS = {
  order: ShoppingCart,
  wallet: DollarSign,
  package: Award,
  info: Info,
  message: MessageSquare,
}

// Where a "New message from ..." notification should take you, by role.
const MESSAGE_INBOX_PATH = { customer: '/messages', seller: '/seller/messages', admin: '/admin/support' }

export function NotificationCenter({ isOpen, onClose }) {
  const notifications = useNotificationStore((state) => state.notifications)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const markRead = useNotificationStore((state) => state.markRead)
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const role = useAuthStore((state) => state.role)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) fetchNotifications()
  }, [isOpen, fetchNotifications])

  const handleNotifClick = (notif) => {
    if (!notif.isRead) markRead(notif.id)
    if (notif.type === 'message') {
      const path = MESSAGE_INBOX_PATH[role]
      if (path) {
        navigate(path)
        onClose()
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-16 right-0 w-[calc(100vw-2rem)] max-w-sm sm:w-80 lg:w-96 bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Notifications</h3>
              </div>
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all as read</button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Info
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`p-4 border-b border-dark-border hover:bg-white/5 transition-all cursor-pointer relative ${
                      !notif.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        !notif.isRead ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-slate-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold flex items-center gap-2">
                          {notif.title}
                          {!notif.isRead && <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{notif.message}</p>
                        <span className="text-[10px] text-slate-500 mt-2 block">{timeAgo(notif.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {notifications.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  No new notifications.
                </div>
              )}
            </div>

            <div className="p-3 bg-dark-bg text-center border-t border-dark-border">
              <Link to="/notifications" onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-white transition-all">
                View All Notifications
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
