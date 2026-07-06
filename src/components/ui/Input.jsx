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
  success = false,
  hint,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const hasError = Boolean(error)
  const hasSuccess = success && !hasError

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-smb-on-surface">
          {label}
          {required && <span className="text-smb-error ml-0.5">*</span>}
        </label>
      )}
      <div
        className={`
          group relative flex items-center rounded border bg-smb-surface-container-lowest
          transition-[box-shadow,border-color,background-color] duration-[180ms]
          ease-[cubic-bezier(0.16,1,0.3,1)]
          focus-within:bg-smb-surface-container-lowest
          focus-within:shadow-[0_0_0_3px_rgb(74_222_128/0.30)]
          hover:border-smb-outline
          ${hasError
            ? 'border-smb-error focus-within:border-smb-error focus-within:shadow-[0_0_0_3px_rgb(186_26_26/0.18)]'
            : hasSuccess
              ? 'border-smb-success focus-within:border-smb-success focus-within:shadow-[0_0_0_3px_rgb(21_128_61/0.18)]'
              : 'border-smb-outline-variant focus-within:border-smb-primary-container'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        {icon && (
          <div className="pointer-events-none flex items-center pl-3 text-smb-on-surface-variant transition-colors duration-150 group-focus-within:text-smb-primary-container">
            <Icon name={icon} className="text-[18px]" />
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
            w-full bg-transparent px-3.5 py-2.5 text-sm text-smb-on-surface
            placeholder:text-smb-on-surface-variant/50
            focus:outline-none
            disabled:cursor-not-allowed
            ${icon ? 'pl-9' : ''}
          `}
          {...props}
        />
        {hasSuccess && (
          <div className="pointer-events-none pr-3 text-smb-success">
            <Icon name="check_circle" className="text-[18px]" />
          </div>
        )}
      </div>
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

export default Input