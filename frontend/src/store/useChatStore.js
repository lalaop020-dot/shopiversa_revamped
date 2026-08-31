import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

const useChatStore = create(
  persist(
    (set, get) => ({
      conversations: {},
      botStatus: {},

      fetchConversations: async () => {
        try {
          const { data } = await api.get('/chat/conversations')
          const convs = data.data.conversations
          const conversationsMap = {}
          convs.forEach(c => { conversationsMap[c.email] = [] })
          set({ conversations: conversationsMap })
          return convs
        } catch (e) { return [] }
      },

      fetchMessages: async (partnerEmail) => {
        try {
          const { data } = await api.get(`/chat/messages/${partnerEmail}`)
          const messages = data.data.messages
          set((state) => ({
            conversations: { ...state.conversations, [partnerEmail]: messages }
          }))
          return messages
        } catch (e) { return [] }
      },

      getMessages: (email) => {
        const msgs = (get().conversations || {})[email]
        if (Array.isArray(msgs) && msgs.length > 0) return msgs
        return [{ id: 0, text: 'Hello! I am your AI Support Assistant. How can I help you today?', sender: 'bot', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
      },

      sendMessage: async (email, text, senderRole) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const optimistic = { id: Date.now(), text, sender: senderRole === 'admin' ? 'admin' : 'user', time }

        // Optimistic update
        set((state) => {
          const safeConvs = state.conversations || {}
          const current = Array.isArray(safeConvs[email]) ? safeConvs[email] : [
            { id: 0, text: 'Hello! I am your AI Support Assistant. How can I help you today?', sender: 'bot', time }
          ]
          return { conversations: { ...safeConvs, [email]: [...current, optimistic] } }
        })

        // Persist to backend
        try {
          await api.post('/chat/messages', { recipientEmail: email, text })
        } catch (e) {
          console.error('Chat send failed', e)
        }

        // Bot reply logic (if not admin and bot is active)
        const botActive = (get().botStatus || {})[email] !== false
        if (senderRole !== 'admin' && botActive) {
          const lower = text.toLowerCase()
          const needsHuman = lower.includes('admin') || lower.includes('human') || lower.includes('agent')
          setTimeout(() => {
            let botReply = "I'm your AI assistant. I can help with basic queries! Type 'admin' to reach a human."
            if (needsHuman) {
              botReply = "Forwarding to our support team. An admin will be with you shortly."
              set(state => ({ botStatus: { ...(state.botStatus || {}), [email]: false } }))
            }
            const botMsg = { id: Date.now() + 1, text: botReply, sender: 'bot', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            set((state) => {
              const cur = state.conversations[email] || []
              return { conversations: { ...state.conversations, [email]: [...cur, botMsg] } }
            })
          }, 800)
        }
      },

      getActiveConversations: () => {
        const conversations = get().conversations || {}
        const botStatus = get().botStatus || {}
        return Object.keys(conversations).map(email => {
          const chat = conversations[email]
          const isArray = Array.isArray(chat)
          const lastMsg = isArray ? chat[chat.length - 1] : null
          return {
            email, lastMessage: lastMsg?.text || '', time: lastMsg?.time || '',
            unreadCount: isArray ? chat.filter(m => m?.sender === 'user').length : 0,
            isBotMode: botStatus[email] !== false,
          }
        })
      },
    }),
    { name: 'chat-storage-v3' }
  )
)

export default useChatStore
