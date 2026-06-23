import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function FilterBar({ filters = [], onChange, onReset, children }) {
  const handleChange = (key, value) => {
    onChange?.({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
    </div>
  )
}

export function FilterChip({ label, options = [], value, onChange }) {
  const selected = value || options[0]?.value

  return (
    <div className="flex items-center gap-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange?.(opt.value)}
          className={`
            flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all
            ${selected === opt.value
              ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
              : 'text-smb-on-surface-variant hover:bg-smb-surface-container'
            }
          `}
        >
          {opt.icon && <Icon name={opt.icon} className="text-[14px]" />}
          {opt.label}
          {opt.count !== undefined && (
            <span className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${selected === opt.value ? 'bg-smb-on-primary-container/20' : 'bg-smb-surface-container text-smb-on-surface-variant'}`}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Tìm kiếm...', className = '' }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Icon name="search" className="pointer-events-none absolute left-3 text-[18px] text-smb-outline" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest py-2 pl-9 pr-8 text-sm text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.('')}
          className="absolute right-2 rounded-full p-0.5 text-smb-outline hover:bg-smb-surface-container transition-colors"
        >
          <Icon name="close" className="text-[14px]" />
        </button>
      )}
    </div>
  )
}

export default FilterBar
