import { useEffect } from 'react'
import { Bell, ShoppingCart, DollarSign, Award, Info, Trash2, CheckSquare } from 'lucide-react'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import useNotificationStore from '../store/useNotificationStore'
import { timeAgo } from '../utils/formatters'
import toast from 'react-hot-toast'

const TYPE_ICONS = {
  order: ShoppingCart,
  wallet: DollarSign,
  package: Award,
  info: Info,
}

export default function NotificationsPage() {
  const notifications = useNotificationStore((state) => state.notifications)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const clearAll = useNotificationStore((state) => state.clearAll)
  const deleteNotification = useNotificationStore((state) => state.deleteNotification)

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    await markAllRead()
    toast.success('All notifications marked as read')
  }

  const handleClearAll = async () => {
    await clearAll()
    toast.success('Notifications history cleared')
  }

  const handleDelete = async (id) => {
    await deleteNotification(id)
    toast.success('Notification removed')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-slate-400 text-sm">Stay updated with activities, orders, and wallet notifications.</p>
        </div>
        {notifications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Mark all read
            </Button>
            <Button variant="danger" size="sm" onClick={handleClearAll} className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Clear all
            </Button>
          </div>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-dark-border">
          {notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] || Info
            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-6 hover:bg-white/5 transition-all flex items-start gap-4 relative ${
                  !notif.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  !notif.isRead ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-slate-500'
                }`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                    {notif.title}
                    {!notif.isRead && <div className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-400 mt-1 max-w-2xl">{notif.message}</p>
                  <span className="text-xs text-slate-500 mt-2 block">{timeAgo(notif.createdAt)}</span>
                </div>
                <button
                  onClick={() => handleDelete(notif.id)}
                  className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
          {notifications.length === 0 && (
            <div className="p-20 text-center text-slate-500 space-y-4">
              <Bell className="w-12 h-12 mx-auto text-slate-600" />
              <div>You have no notifications at the moment.</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
