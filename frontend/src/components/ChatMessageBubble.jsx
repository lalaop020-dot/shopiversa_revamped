import { Link } from 'react-router-dom'

/**
 * One chat bubble. When the message carries product context (set when a
 * customer starts a chat from a product page), a small product card renders
 * above the bubble so whoever's reading the thread can see at a glance which
 * listing is being discussed.
 */
export function ChatMessageBubble({ msg, isMe }) {
  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
      {msg.productId && (
        <Link
          to={`/product/${msg.productId}`}
          target="_blank"
          className={`flex items-center gap-2 mb-1.5 max-w-[80%] bg-dark-bg border border-primary/30 rounded-xl p-2 hover:border-primary transition-colors ${
            isMe ? 'flex-row-reverse' : ''
          }`}
        >
          {msg.productImage && (
            <img src={msg.productImage} alt={msg.productName} className="w-9 h-9 rounded-lg object-cover shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-[9px] text-primary font-bold uppercase tracking-wide">Regarding</div>
            <div className="text-xs font-medium truncate">{msg.productName || 'Product'}</div>
          </div>
        </Link>
      )}
      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
        isMe
          ? 'bg-primary text-white rounded-tr-none'
          : 'bg-dark-card border border-dark-border text-white rounded-tl-none'
      }`}>
        {msg.text}
      </div>
      <span className="text-[9px] text-slate-600 mt-1">{msg.time}</span>
    </div>
  )
}
