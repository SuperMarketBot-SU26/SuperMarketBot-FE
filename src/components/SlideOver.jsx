import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * SlideOver — bảng trượt vào từ phải, dùng cho xem chi tiết account.
 * Không che UI chính (overlay mỏng), user có thể đọc nhanh.
 */
export function SlideOver({ open, onClose, title, subtitle, children, width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />
      <aside
        className={`relative flex w-full ${width} flex-col bg-smb-surface-container-lowest shadow-2xl smb-slide-in motion-reduce:animate-none`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-smb-outline-variant px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-smb-on-surface">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-smb-on-surface-variant">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface"
            aria-label="Đóng"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </aside>
    </div>,
    document.body
  )
}

export default SlideOver