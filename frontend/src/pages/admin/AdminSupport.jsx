import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Clock } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import useAuthStore from '../../store/useAuthStore'
import useChatStore from '../../store/useChatStore'
import toast from 'react-hot-toast'

export default function AdminSupport() {
  const currentUserId = useAuthStore((state) => state.user?.id)
  const conversationsList = useChatStore((state) => state.conversationsList)
  const fetchConversations = useChatStore((state) => state.fetchConversations)
  const conversations = useChatStore((state) => state.conversations)
  const fetchMessages = useChatStore((state) => state.fetchMessages)
  const sendMessage = useChatStore((state) => state.sendMessage)

  const [selectedChatEmail, setSelectedChatEmail] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Default to the first conversation once the list loads, without forcing
  // a second render via setState-in-effect.
  const activeEmail = selectedChatEmail || conversationsList[0]?.email || null

  useEffect(() => {
    if (activeEmail) fetchMessages(activeEmail)
  }, [activeEmail, fetchMessages])

  const currentMessages = activeEmail ? (conversations[activeEmail] || []) : []
  const selectedConv = conversationsList.find(c => c.email === activeEmail)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    if (!activeEmail) {
      toast.error('Select a conversation first')
      return
    }
    setIsSending(true)
    try {
      await sendMessage(activeEmail, replyText)
      setReplyText('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentMessages])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Support Chat Center</h1>
        <p className="text-slate-400">Respond to customer and seller messages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Active Conversations List */}
        <Card className="lg:col-span-1 p-0 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-dark-border">
            <h3 className="font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Conversations</h3>
          </div>
          <div className="flex-grow overflow-y-auto divide-y divide-dark-border">
            {conversationsList.map((chat) => (
              <button
                key={chat.email}
                onClick={() => setSelectedChatEmail(chat.email)}
                className={`w-full p-4 text-left transition-colors flex items-start gap-3 hover:bg-white/5 ${
                  activeEmail === chat.email ? 'bg-primary/10 border-l-4 border-primary' : ''
                }`}
              >
                <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  {chat.name?.[0]?.toUpperCase() || chat.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-grow overflow-hidden">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-xs truncate">{chat.name || chat.email}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5 shrink-0"><Clock className="w-2.5 h-2.5" /> {chat.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-1">{chat.lastMessage}</p>
                  <span className="text-[9px] bg-dark-bg text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold mt-2 inline-block">
                    {chat.role}
                  </span>
                </div>
              </button>
            ))}
            {conversationsList.length === 0 && (
              <div className="p-10 text-center text-slate-500 text-sm">
                No conversations yet.
              </div>
            )}
          </div>
        </Card>

        {/* Chat Thread Panel */}
        <Card className="lg:col-span-2 p-0 flex flex-col h-full overflow-hidden">
          {activeEmail ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-bg/25">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                    {(selectedConv?.name || activeEmail)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{selectedConv?.name || activeEmail}</h4>
                    <span className="text-[10px] text-slate-500">{activeEmail}</span>
                  </div>
                </div>
              </div>

              {/* Messages scrolling list */}
              <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-4 bg-dark-bg/10">
                {currentMessages.map((msg, index) => {
                  const isMe = msg.senderId === currentUserId
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl p-4 text-sm relative shadow-md ${
                        isMe
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-dark-card border border-dark-border text-white rounded-tl-none'
                      }`}>
                        <div>{msg.text}</div>
                        <div className="text-[9px] text-slate-500 text-right mt-1.5">{msg.time}</div>
                      </div>
                    </div>
                  )
                })}
                {currentMessages.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-8">No messages yet.</div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-4 border-t border-dark-border flex gap-3 bg-dark-bg/25">
                <input
                  type="text"
                  placeholder="Type your reply here..."
                  className="input-field flex-grow py-3"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={isSending}
                />
                <Button type="submit" className="flex items-center justify-center p-3" isLoading={isSending}>
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-slate-500 space-y-4">
              <MessageSquare className="w-16 h-16 text-slate-600 animate-pulse" />
              <div className="text-center">
                <h3 className="font-bold text-white text-base">Select a Chat</h3>
                <p className="text-xs text-slate-500 mt-1">Choose a conversation from the left sidebar to view history and start typing replies.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
