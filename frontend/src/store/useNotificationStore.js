import { create } from 'zustand'
import api from '../api/axios'

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications')
      const notifications = data.data.notifications
      set({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length })
      return notifications
    } catch {
      return []
    }
  },

  markRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      set((state) => {
        const notifications = state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n)
        return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length }
      })
    } catch { /* leave state as-is on failure */ }
  },

  markAllRead: async () => {
    try {
      await api.put('/notifications/read-all')
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }))
    } catch { /* leave state as-is on failure */ }
  },

  clearAll: async () => {
    try {
      await api.delete('/notifications/clear')
      set({ notifications: [], unreadCount: 0 })
    } catch { /* leave state as-is on failure */ }
  },

  deleteNotification: async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      set((state) => {
        const notifications = state.notifications.filter((n) => n.id !== id)
        return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length }
      })
    } catch { /* leave state as-is on failure */ }
  },
}))

export default useNotificationStore
