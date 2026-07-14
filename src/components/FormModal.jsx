import React, { useEffect } from 'react'
import { Button } from './ui/Button'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * Modal that grows with its content up to the viewport height, then scrolls
 * inside the modal body instead of pushing the page behind it. While the
 * modal is open the document is scroll-locked so wheel/touch events never
 * fall through to the page underneath.
 */
export function FormModal({ title, onClose, onSubmit, children, footer }) {
  // Prevent the background page from scrolling while the modal is open.
  // `overflow` alone isn't enough on iOS / overscroll, so we also pin the
  // body and remember where the user was.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const prevWidth = document.body.style.width
    const scrollY = window.scrollY

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.position = prevPosition
      document.body.style.top = prevTop
      document.body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        // Click outside the panel to close.
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-smb-surface-container-lowest shadow-xl">
        {/* Header — fixed at the top, doesn't scroll */}
        <div className="flex shrink-0 items-center justify-between border-b border-smb-outline-variant px-6 py-4">
          <h2 className="text-base font-semibold text-smb-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Body — scrolls when content overflows. `overscroll-contain` keeps
            the scroll chained inside the modal so it never reaches the page
            behind, and `-mx-6 px-6` keeps a clean gutter while letting the
            scrollbar sit flush against the panel edge. */}
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            {children}
          </div>

          {/* Footer — fixed at the bottom, doesn't scroll */}
          <div className="shrink-0 border-t border-smb-outline-variant bg-smb-surface-container-lowest px-6 py-3">
            {footer || (
              <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={onClose}>
                  Hủy
                </Button>
                <Button variant="primary" type="submit">
                  Lưu
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-smb-on-surface">{label}</label>
      {children}
    </div>
  )
}

export default FormModal