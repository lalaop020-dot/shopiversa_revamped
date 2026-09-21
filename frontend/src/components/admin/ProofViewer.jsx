import { useState } from 'react'
import ImageLightbox from '../common/ImageLightbox'

// A payment screenshot is a Cloudinary https URL. Older records point at a
// local, auth-gated file the browser can't load in an <img>, so they get a note.
const isViewable = (url) => typeof url === 'string' && url.startsWith('http')

// Thumbnail + "View" that opens the full screenshot in the shared lightbox.
export default function ProofViewer({ url, title = 'Payment screenshot' }) {
  const [open, setOpen] = useState(false)

  if (!url) return <span className="text-xs text-slate-500">No screenshot</span>
  if (!isViewable(url)) return <span className="text-xs text-slate-500" title="Stored before cloud storage was enabled">Legacy file</span>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 group min-h-[44px]"
        title="View screenshot"
      >
        <span className="block w-12 h-12 rounded-lg overflow-hidden border border-dark-border group-hover:border-primary transition-colors bg-dark-bg shrink-0">
          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </span>
        <span className="text-xs font-semibold text-primary group-hover:underline">View</span>
      </button>
      {open && <ImageLightbox url={url} title={title} onClose={() => setOpen(false)} />}
    </>
  )
}
