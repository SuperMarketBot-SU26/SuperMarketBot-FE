import React, { useState, useRef, useEffect } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Select({
  label,
  placeholder = 'Chọn một tùy chọn',
  options = [],
  value,
  onChange,
  error,
  hint,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const selectRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlight when opening, and scroll highlighted item into view.
  useEffect(() => {
    if (isOpen) {
      const idx = Math.max(0, options.findIndex((o) => o.value === value))
      setHighlighted(idx)
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(`[data-idx="${idx}"]`)
        el?.scrollIntoView({ block: 'nearest' })
      })
    }
  }, [isOpen, options, value])

  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) setIsOpen(true)
      else setHighlighted((h) => Math.min(options.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) setIsOpen(true)
      else setHighlighted((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (isOpen) {
        e.preventDefault()
        const opt = options[highlighted]
        if (opt) {
          onChange(opt.value)
          setIsOpen(false)
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const selectedOption = options.find((opt) => opt.value === value)
  const hasError = Boolean(error)

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={selectRef}>
      {label && (
        <label className="text-sm font-medium text-smb-on-surface">
          {label}
          {required && <span className="text-smb-error ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          group flex w-full items-center justify-between rounded border bg-smb-surface-container-lowest px-4 py-2.5 text-sm
          transition-[box-shadow,border-color,background-color] duration-[180ms]
          ease-[cubic-bezier(0.16,1,0.3,1)]
          focus:outline-none
          ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-smb-outline'}
          ${hasError
            ? 'border-smb-error'
            : isOpen
              ? 'border-smb-primary-container shadow-[0_0_0_3px_rgb(74_222_128/0.30)]'
              : 'border-smb-outline-variant'}
        `}
        {...props}
      >
        <span className={selectedOption ? 'text-smb-on-surface' : 'text-smb-on-surface-variant/50'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon
          name="expand_more"
          className={`text-[20px] text-smb-on-surface-variant transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? '-rotate-180 text-smb-primary-container' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded border border-smb-outline-variant bg-smb-surface-container-lowest shadow-[0_8px_24px_-8px_rgb(15_23_42/0.18),0_2px_6px_-2px_rgb(15_23_42/0.08)] smb-pop-in motion-reduce:animate-none"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.length === 0 && (
              <p className="px-4 py-3 text-center text-xs text-smb-on-surface-variant">
                Không có lựa chọn
              </p>
            )}
            {options.map((option, idx) => {
              const isSelected = option.value === value
              const isHighlighted = idx === highlighted
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-idx={idx}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`
                    flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm text-left
                    transition-colors duration-[120ms]
                    ${isHighlighted ? 'bg-smb-surface-container' : 'bg-transparent'}
                    ${isSelected ? 'text-smb-primary-container' : 'text-smb-on-surface'}
                  `}
                >
                  <span className={isSelected ? 'font-medium' : ''}>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-smb-on-surface-variant">{option.description}</span>
                  )}
                  {isSelected && (
                    <Icon name="check" className="text-[18px] text-smb-primary-container" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {hint && !hasError && (
        <p className="text-xs text-smb-on-surface-variant">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-xs text-smb-error">
          <Icon name="error" className="text-[14px]" />
          {error}
        </p>
      )}
    </div>
  )
}

export default Select