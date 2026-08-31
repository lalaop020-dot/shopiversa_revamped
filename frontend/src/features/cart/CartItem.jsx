import { Trash2, Plus, Minus } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

export function CartItem({ item, onUpdateQuantity, onRemove }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-dark-border last:border-0 group">
      <div className="w-20 h-20 bg-dark-bg border border-dark-border rounded-xl overflow-hidden shrink-0">
        <img src={item.image || 'https://via.placeholder.com/100'} alt={item.name} className="w-full h-full object-cover" />
      </div>
      
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-sm lg:text-base group-hover:text-primary transition-colors">{item.name}</h4>
          <button 
            onClick={() => onRemove(item.id)}
            className="p-1 text-slate-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">{item.category}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-lg scale-90 origin-left">
            <button 
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              className="p-1.5 hover:text-primary transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              disabled={item.stock != null && item.quantity >= item.stock}
              className="p-1.5 hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-inherit disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="font-bold text-primary">{formatCurrency(item.price * item.quantity)}</div>
        </div>
      </div>
    </div>
  )
}
