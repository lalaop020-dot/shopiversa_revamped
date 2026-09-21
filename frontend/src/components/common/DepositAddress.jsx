import { useState } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

// Map the network labels used across the UI to the keys of the wallets object
// returned by the server ({ usdt, eth, btc }).
export const NETWORK_KEYS = { 'USDT': 'usdt', 'ETH (TRC20)': 'eth', 'BTC': 'btc' }

export const addressFor = (wallets, network) => (wallets?.[NETWORK_KEYS[network] || 'usdt'] || '').trim()

// The platform's deposit address for one network, with a copy button.
// When the admin hasn't set it yet we say so — never show a made-up address.
export default function DepositAddress({ address, network }) {
  const [copied, setCopied] = useState(false)

  if (!address) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>The {network} payment address hasn't been set up yet. Please choose another network or contact support before sending anything.</span>
      </div>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast.success(`${network} address copied!`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — please select the address and copy it manually')
    }
  }

  return (
    <div className="flex items-center gap-2 bg-dark-bg rounded-lg p-3 font-mono text-xs break-all border border-dark-border">
      <span className="flex-1 text-slate-200 select-all">{address}</span>
      <button type="button" onClick={copy} aria-label={`Copy ${network} address`} className="p-2 hover:text-primary transition-colors shrink-0">
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}
