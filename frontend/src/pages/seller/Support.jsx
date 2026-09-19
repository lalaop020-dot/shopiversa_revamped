import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Clock, ShieldCheck, Plus, Ticket, X } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { ChatMessageBubble } from '../../components/ChatMessageBubble'
import useAuthStore from '../../store/useAuthStore'
import useChatStore from '../../store/useChatStore'
import toast from 'react-hot-toast'

/**
 * Seller Support page — a dedicated chat channel with admin support.
 * Uses the same ChatStore/API as the rest of the messaging system so that
 * every message the seller sends here is immediately visible in AdminSupport.
 */
export default function SupportTickets() {
  const currentUserId = useAuthStore((state) => state.user?.id)
  const conversationsList = useChatStore((state) => state.conversationsList)
  const fetchConversations = useChatStore((state) => state.fetchConversations)
  const conversations = useChatStore((state) => state.conversations)
  const fetchMessages = useChatStore((state) => state.fetchMessages)
  const sendMessage = useChatStore((state) => state.sendMessage)

  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showQuickModal, setShowQuickModal] = useState(false)
  const [quickMsg, setQuickMsg] = useState('')
  const scrollRef = useRef(null)

  // Load conversations on mount so we can find the admin contact.
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Identify the admin conversation partner.
  const adminConv = conversationsList.find((c) => c.role === 'admin')
  const adminEmail = adminConv?.email || null

  useEffect(() => {
    if (adminEmail) fetchMessages(adminEmail)
  }, [adminEmail, fetchMessages])

  const currentMessages = adminEmail ? (conversations[adminEmail] || []) : []

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentMessages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    if (!adminEmail) {
      toast.error('Support contact not found. Please try again.')
      return
    }
    setIsSending(true)
    try {
      await sendMessage(adminEmail, replyText)
      setReplyText('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleQuickSend = async (e) => {
    e.preventDefault()
    if (!quickMsg.trim()) return
    if (!adminEmail) {
      toast.error('Support contact not found.')
      return
    }
    setIsSending(true)
    try {
      await sendMessage(adminEmail, quickMsg)
      setQuickMsg('')
      setShowQuickModal(false)
      toast.success('Message sent to support!')
    } catch {
      toast.error('Failed to send')
    } finally {
      setIsSending(false)
    }
  }

  const quickTopics = [
    '💰 Wallet withdrawal is pending',
    '📦 Issue with my product listing',
    '🔑 Account access problem',
    '📊 Package upgrade inquiry',
    '🚚 Order fulfillment question',
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Help &amp; Support</h1>
          <p className="text-slate-400">
            Chat directly with our admin support team. We typically reply within minutes.
          </p>
        </div>
        <Button onClick={() => setShowQuickModal(true)}>
          <Plus className="w-4 h-4" /> Quick Message
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 border-l-4 border-primary">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{currentMessages.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">Messages</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-green-500">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">Live</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">Support Status</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-accent-gold">
          <div className="p-3 bg-accent-gold/10 text-accent-gold rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">&lt; 5 min</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">Avg Response</div>
          </div>
        </Card>
      </div>

      {/* Main Chat Panel */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Topic Shortcuts */}
        <Card className="lg:col-span-1 p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-dark-border">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <Ticket className="w-4 h-4 text-primary" />
              Common Topics
            </h3>
            <p className="text-xs text-slate-500 mt-1">Click to start a conversation</p>
          </div>
          <div className="flex-grow p-3 space-y-2 overflow-y-auto">
            {quickTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => {
                  setReplyText(topic)
                }}
                className="w-full text-left text-xs px-4 py-3 rounded-xl border border-dark-border hover:border-primary hover:bg-primary/5 transition-all text-slate-300 hover:text-white"
              >
                {topic}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-dark-border">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Admin support is online
            </div>
          </div>
        </Card>

        {/* Chat Thread */}
        <Card className="lg:col-span-2 p-0 flex flex-col overflow-hidden" style={{ height: '520px' }}>
          {/* Thread Header */}
          <div className="p-4 border-b border-dark-border flex items-center gap-3 bg-dark-bg/25">
            <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
              S
            </div>
            <div>
              <h4 className="font-bold text-sm">Shopiversa Support</h4>
              <span className="text-[10px] text-green-500 uppercase font-bold tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" /> Online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-4 bg-dark-bg/10">
            {/* Welcome bubble if no messages yet */}
            {currentMessages.length === 0 && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                  S
                </div>
                <div className="bg-dark-card border border-dark-border rounded-2xl rounded-tl-none px-4 py-3 max-w-sm">
                  <p className="text-sm text-slate-300">
                    👋 Hello! Welcome to Shopiversa Support. How can we help you today?
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Support Team</span>
                </div>
              </div>
            )}
            {currentMessages.map((msg, index) => (
              <ChatMessageBubble key={msg.id || index} msg={msg} isMe={msg.senderId === currentUserId} />
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-dark-border flex gap-3 bg-dark-bg/25">
            <input
              type="text"
              placeholder="Type your message to support..."
              className="input-field flex-grow py-3"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={isSending}
            />
            <Button type="submit" className="flex items-center justify-center p-3" isLoading={isSending}>
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </div>

      {/* Quick Message Modal */}
      {showQuickModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickModal(false)} />
          <Card className="w-full max-w-lg relative z-10 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Quick Message to Support</h2>
              <button onClick={() => setShowQuickModal(false)} className="p-2 hover:bg-dark-bg rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleQuickSend}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Your Message</label>
                <textarea
                  className="input-field min-h-[120px] py-3"
                  placeholder="Describe your issue or question..."
                  value={quickMsg}
                  onChange={(e) => setQuickMsg(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-4 pt-2">
                <Button variant="outline" className="flex-grow" type="button" onClick={() => setShowQuickModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-grow" isLoading={isSending}>
                  Send to Support
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
