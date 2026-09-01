import { useState, useRef, useEffect } from 'react'
import { Send, User, X, Minimize2, Maximize2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from './common/Button'
import { ChatMessageBubble } from './ChatMessageBubble'
import useAuthStore from '../store/useAuthStore'
import useChatStore from '../store/useChatStore'

/**
 * `product` (optional): { id, name, image } — when set (e.g. opened via
 * "Chat with Seller" on a product page), it's pinned as a reminder banner
 * and attached to the first message sent this session, so the recipient
 * sees exactly which listing prompted the conversation.
 */
export function ChatWindow({ recipientEmail, recipientName = 'Chat', product, onClose }) {
  const currentUserId = useAuthStore((state) => state.user?.id)

  const messages = useChatStore((state) => state.getMessages(recipientEmail))
  const fetchMessages = useChatStore((state) => state.fetchMessages)
  const sendMessage = useChatStore((state) => state.sendMessage)

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollRef = useRef(null)
  const productAttachedRef = useRef(false) // only tag the first outgoing message with product context

  useEffect(() => {
    if (recipientEmail) fetchMessages(recipientEmail)
  }, [recipientEmail, fetchMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !recipientEmail || isSending) return
    const text = input
    const attachProduct = product && !productAttachedRef.current
    setInput('')
    setIsSending(true)
    try {
      await sendMessage(recipientEmail, text, attachProduct ? product.id : undefined)
      if (attachProduct) productAttachedRef.current = true
    } catch {
      setInput(text) // restore on failure so the message isn't lost
    } finally {
      setIsSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[100] sm:w-80 lg:w-96 bg-dark-card border border-dark-border rounded-2xl flex flex-col shadow-2xl ${
        isMinimized ? 'h-16' : 'h-[70vh] max-h-[500px]'
      } transition-all duration-300`}
    >
      {/* Header */}
      <div className="p-4 border-b border-dark-border flex items-center justify-between bg-primary/5 rounded-t-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-dark-card rounded-full" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{recipientName}</div>
            <div className="text-[10px] text-green-500 uppercase font-bold tracking-widest">Online</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded-lg">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Pinned product context */}
          {product && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-border bg-dark-bg/40 shrink-0">
              {product.image && (
                <img src={product.image} alt={product.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-[9px] text-slate-500 uppercase tracking-wide">Asking about</div>
                <div className="text-xs font-medium truncate">{product.name}</div>
              </div>
            </div>
          )}

          {/* Messages Section */}
          <div
            ref={scrollRef}
            className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide bg-dark-bg/10"
          >
            {messages.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">
                No messages yet — say hello!
              </div>
            )}
            {messages.map((msg, index) => (
              <ChatMessageBubble key={msg.id || index} msg={msg} isMe={msg.senderId === currentUserId} />
            ))}
          </div>

          {/* Input Section */}
          <form onSubmit={handleSend} className="p-4 border-t border-dark-border flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-grow bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white disabled:opacity-60"
            />
            <Button type="submit" size="sm" className="w-10 h-10 p-0 rounded-xl" isLoading={isSending}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </motion.div>
  )
}
