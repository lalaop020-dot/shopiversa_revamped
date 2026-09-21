import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'

// A payment screenshot is a Cloudinary https URL. Older records point at a
// local, auth-gated file the browser can't load in an <img>, so they get a note.
const isViewable = (url) => typeof url === 'string' && url.startsWith('http')

// Thumbnail that opens the full screenshot in a lightbox.
export default function ProofViewer({ url }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!url) return <span className="text-xs text-slate-500">No screenshot</span>
  if (!isViewable(url)) return <span className="text-xs text-slate-500" title="Stored before cloud storage was enabled">Legacy file</span>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-12 h-12 rounded-lg overflow-hidden border border-dark-border hover:border-primary transition-colors bg-dark-bg"
        title="View screenshot"
      >
        <img src={url} alt="Payment proof" className="w-full h-full object-cover" loading="lazy" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-w-3xl w-full max-h-[90vh] flex flex-col bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
              <span className="text-sm font-semibold">Payment screenshot</span>
              <div className="flex items-center gap-3">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Open original <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="overflow-auto p-4 flex justify-center">
              {failed ? (
                <div className="text-slate-400 text-sm py-10">Could not load the screenshot.</div>
              ) : (
                <img src={url} alt="Payment proof" className="max-w-full h-auto rounded-lg" onError={() => setFailed(true)} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
