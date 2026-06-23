import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function TableActions({ actions = [] }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleOpen = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuHeight = actions.length * 44 + 8  // approximate: ~44px per item + padding
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= menuHeight
      ? rect.bottom + 4          // enough room below → open downward
      : rect.top - menuHeight - 4 // not enough room → flip upward
    setCoords({
      top,
      left: Math.max(0, rect.right - 160),
    })
    setOpen(true)
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface"
        title="Hành động"
      >
        <Icon name="more_vert" className="text-[20px]" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-50 min-w-[160px] rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest shadow-lg"
        >
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
        </div>,
        document.body
      )}
    </div>
  )
}

export default TableActions
