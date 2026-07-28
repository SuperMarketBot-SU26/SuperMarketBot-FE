import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-bold rounded-xl ' +
    'transition-all duration-150 active:scale-95 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

  const variants = {
    primary:
      'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ' +
      'hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/30',
    secondary:
      'border border-smb-outline-variant/70 bg-smb-surface-container-lowest text-smb-on-surface ' +
      'shadow-xs hover:border-smb-primary hover:bg-smb-surface-container',
    outline:
      'border border-smb-outline-variant/70 bg-transparent text-smb-on-surface-variant ' +
      'hover:bg-smb-surface-container-low hover:text-smb-on-surface hover:border-smb-primary/50',
    ghost:
      'bg-transparent text-smb-on-surface-variant ' +
      'hover:bg-smb-surface-container-low hover:text-smb-on-surface',
    success:
      'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ' +
      'hover:bg-emerald-500',
    warning:
      'bg-amber-600 text-white shadow-md shadow-amber-600/20 ' +
      'hover:bg-amber-500',
    danger:
      'bg-rose-600 text-white shadow-md shadow-rose-600/20 ' +
      'hover:bg-rose-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-xs',
    lg: 'px-6 py-3 text-sm',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="animate-spin inline-flex">
            <Icon name="progress_activity" className="text-[18px]" />
          </span>
          <span className="opacity-80">{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} className="text-[18px]" />
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} className="text-[18px]" />
          )}
        </>
      )}
    </button>
  )
}

export default Button