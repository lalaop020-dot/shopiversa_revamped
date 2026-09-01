import { ChevronLeft, ChevronRight } from 'lucide-react'

// Builds a condensed page list with ellipsis gaps, e.g. [1, '…', 4, 5, 6, '…', 20]
function buildPageList(page, pages) {
  const delta = 1
  const range = []
  for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) range.push(i)
  if (range[0] > 1) {
    if (range[0] > 2) range.unshift('…')
    range.unshift(1)
  }
  if (range[range.length - 1] < pages) {
    if (range[range.length - 1] < pages - 1) range.push('…')
    range.push(pages)
  }
  return range
}

/**
 * Reusable page-number control. Pass `total`/`limit` to show a "Showing X–Y of Z" caption.
 */
export function Pagination({ page, pages, onPageChange, total, limit }) {
  if (!pages || pages <= 1) return null

  const pageList = buildPageList(page, pages)
  const rangeStart = total != null && limit ? (page - 1) * limit + 1 : null
  const rangeEnd = total != null && limit ? Math.min(page * limit, total) : null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
      {total != null && (
        <p className="text-xs text-slate-500">
          Showing {rangeStart}–{rangeEnd} of {total}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-dark-border text-slate-400 hover:text-white hover:bg-dark-card disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pageList.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-2 text-slate-600 text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-all ${
                p === page ? 'bg-primary text-white' : 'text-slate-400 hover:text-white hover:bg-dark-card'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="p-2 rounded-lg border border-dark-border text-slate-400 hover:text-white hover:bg-dark-card disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
