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
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={selectRef}>
      {label && (
        <label className="text-sm font-medium text-smb-on-surface">
          {label}
          {required && <span className="text-smb-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex w-full items-center justify-between rounded border bg-smb-surface-container-lowest px-4 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-smb-error' : 'border-smb-outline-variant'}
            ${isOpen ? 'ring-2 ring-smb-primary-container/20 border-smb-primary-container' : ''}
          `}
          {...props}
        >
          <span className={selectedOption ? 'text-smb-on-surface' : 'text-smb-on-surface-variant/50'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <Icon 
            name={isOpen ? 'expand_less' : 'expand_more'} 
            className={`text-[20px] text-smb-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded border border-smb-outline-variant bg-smb-surface-container-lowest shadow-lg">
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`
                    flex w-full items-center justify-between px-4 py-2.5 text-sm text-left
                    hover:bg-smb-surface-container-low
                    ${option.value === value ? 'bg-smb-active-bg text-smb-primary-container' : 'text-smb-on-surface'}
                  `}
                >
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-smb-on-surface-variant">{option.description}</span>
                  )}
                  {option.value === value && (
                    <Icon name="check" className="text-[18px] text-smb-primary-container" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-smb-error">{error}</p>
      )}
    </div>
  )
}

export default Select
