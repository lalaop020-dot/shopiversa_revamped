import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink } from 'lucide-react'

// Full-screen image viewer, shared by payment screenshots and KYC documents.
//  - Phones: takes the whole screen; the image can be pinch-zoomed and panned.
//  - Desktop: a centered dialog.
//  - "Open in new tab" gives the raw image for zooming / saving.
// Closes on Esc, on a tap of the dark backdrop, or via the close button.
export default function ImageLightbox({ url, title = 'Image', onClose }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Lock page scroll behind the viewer (restore whatever was there before).
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!url) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-stretch sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-dark-card sm:border sm:border-dark-border sm:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-dark-border shrink-0">
          <span className="font-semibold text-sm truncate">{title}</span>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg px-3 min-h-[44px]"
            >
              <span className="hidden sm:inline">Open in new tab</span>
              <span className="sm:hidden">New tab</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center w-11 h-11 text-slate-300 hover:text-white hover:bg-dark-bg rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* touch-action lets the browser pinch-zoom / pan the image on phones */}
        <div className="flex-1 min-h-0 overflow-auto bg-black flex items-center justify-center p-2 sm:p-4" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
          {failed ? (
            <div className="text-slate-400 text-sm py-16 text-center px-6">
              Could not load the image.{' '}
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Try opening it in a new tab</a>
            </div>
          ) : (
            <img
              src={url}
              alt={title}
              onError={() => setFailed(true)}
              className="max-w-full max-h-full sm:max-h-[78vh] w-auto h-auto object-contain"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
