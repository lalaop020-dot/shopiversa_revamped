import { useState, useRef, useEffect } from 'react'
import { Send, User, X, Minimize2, Maximize2, Bot } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './common/Button'
import useAuthStore from '../store/useAuthStore'
import useChatStore from '../store/useChatStore'

export function ChatWindow({ recipient = 'Support', onClose }) {
  const { user } = useAuthStore()
  const email = user?.email || 'customer@demo.com'

  const messages = useChatStore((state) => state.getMessages(email))
  const sendMessage = useChatStore((state) => state.sendMessage)

  const [input, setInput] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    sendMessage(email, input, 'user')
    setInput('')
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
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-dark-card rounded-full" />
          </div>
          <div>
            <div className="font-bold text-sm">{recipient}</div>
            <div className="text-[10px] text-green-500 uppercase font-bold tracking-widest">Online</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
          {/* Messages Section */}
          <div 
            ref={scrollRef}
            className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide bg-dark-bg/10"
          >
            {messages.map((msg, index) => {
              if (!msg) return null;
              const isMe = msg.sender === 'user'
              const isBot = msg.sender === 'bot'
              
              return (
                <div 
                  key={msg.id || index} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && (
                    <span className="text-[9px] text-slate-500 mb-1 flex items-center gap-1">
                      {isBot ? <Bot className="w-2.5 h-2.5 text-primary" /> : <User className="w-2.5 h-2.5" />}
                      {isBot ? 'Bot' : 'Support Agent'}
                    </span>
                  )}
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    isMe 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : isBot
                        ? 'bg-dark-card border border-dark-border text-slate-300 rounded-tl-none font-medium italic'
                        : 'bg-dark-card border border-dark-border text-white rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-600 mt-1">{msg.time}</span>
                </div>
              )
            })}
          </div>

          {/* Input Section */}
          <form onSubmit={handleSend} className="p-4 border-t border-dark-border flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white"
            />
            <Button type="submit" size="sm" className="w-10 h-10 p-0 rounded-xl">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </motion.div>
  )
}
