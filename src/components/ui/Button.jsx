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
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-smb-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-smb-primary-container text-smb-on-primary hover:opacity-90',
    secondary: 'border border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:bg-smb-surface-container',
    outline: 'border border-smb-outline-variant bg-transparent text-smb-on-surface-variant hover:bg-smb-surface-container-low',
    ghost: 'bg-transparent text-smb-on-surface-variant hover:bg-smb-surface-container-low',
    success: 'bg-green-600 text-white hover:bg-green-700',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="animate-spin">
          <Icon name="progress_activity" className="text-[18px]" />
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} className="text-[18px]" />
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <Icon name={icon} className="text-[18px]" />
          )}
        </>
      )}
    </button>
  )
}

export default Button
