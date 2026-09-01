import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

// Shared reference so `getMessages` doesn't hand back a fresh [] on every
// call when there's no history yet — a new array each render makes Zustand
// think the selector's output changed, causing an infinite render loop
// (React error #185) the first time a conversation with no messages opens.
const EMPTY_MESSAGES = []

const useChatStore = create(
  persist(
    (set, get) => ({
      conversations: {},     // partner email -> messages[]
      conversationsList: [], // [{ email, name, role, lastMessage, time }]

      fetchConversations: async () => {
        try {
          const { data } = await api.get('/chat/conversations')
          const list = data.data.conversations
          set({ conversationsList: list })
          return list
        } catch { return [] }
      },

      fetchMessages: async (partnerEmail) => {
        try {
          const { data } = await api.get(`/chat/messages/${encodeURIComponent(partnerEmail)}`)
          const messages = data.data.messages
          set((state) => ({ conversations: { ...state.conversations, [partnerEmail]: messages } }))
          return messages
        } catch { return [] }
      },

      getMessages: (email) => {
        const msgs = (get().conversations || {})[email]
        return Array.isArray(msgs) ? msgs : EMPTY_MESSAGES
      },

      sendMessage: async (email, text) => {
        const { data } = await api.post('/chat/messages', { recipientEmail: email, text })
        const msg = data.data.message
        set((state) => {
          const current = state.conversations[email] || []
          return { conversations: { ...state.conversations, [email]: [...current, msg] } }
        })
        // Keep the sidebar's lastMessage/time in sync.
        get().fetchConversations()
        return msg
      },
    }),
    { name: 'chat-storage-v4' }
  )
)

export default useChatStore
