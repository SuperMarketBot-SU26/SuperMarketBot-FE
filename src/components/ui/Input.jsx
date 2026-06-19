import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  icon,
  error,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-smb-on-surface">
          {label}
          {required && <span className="text-smb-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon name={icon} className="text-[18px] text-smb-on-surface-variant" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded border bg-smb-surface-container-lowest px-4 py-2.5 text-sm text-smb-on-surface
            placeholder:text-smb-on-surface-variant/50
            focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20
            disabled:cursor-not-allowed disabled:opacity-50
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-smb-error focus:border-smb-error focus:ring-smb-error/20' : 'border-smb-outline-variant'}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-smb-error">{error}</p>
      )}
    </div>
  )
}

export default Input
