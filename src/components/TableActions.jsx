import React, { useState, useRef, useEffect } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function TableActions({ actions = [] }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface"
        title="Hành động"
      >
        <Icon name="more_vert" className="text-[20px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest shadow-lg">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick?.()
                setOpen(false)
              }}
              className={`
                flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors
                ${action.disabled
                  ? 'cursor-not-allowed text-smb-on-surface-variant/40'
                  : action.danger
                  ? 'text-smb-error hover:bg-smb-error-container'
                  : 'text-smb-on-surface hover:bg-smb-surface-container'
                }
              `}
              disabled={action.disabled}
            >
              {action.icon && (
                <Icon name={action.icon} className="text-[16px]" />
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TableActions
