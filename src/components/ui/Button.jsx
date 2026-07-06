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
    'inline-flex items-center justify-center gap-2 font-medium rounded ' +
    'transition-[transform,box-shadow,background-color,border-color,color,opacity] ' +
    'duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] ' +
    'focus:outline-none focus-visible:shadow-[0_0_0_3px_rgb(74_222_128/0.30)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'active:translate-y-px active:scale-[0.985] ' +
    'motion-reduce:transition-none motion-reduce:active:transform-none'

  const variants = {
    primary:
      'bg-smb-primary-container text-smb-on-primary ' +
      'shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset,0_1px_2px_0_rgb(15_23_42/0.10)] ' +
      'hover:bg-smb-primary-container/95 hover:shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_4px_10px_-2px_rgb(15_23_42/0.18)]',
    secondary:
      'border border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface ' +
      'shadow-[0_1px_2px_0_rgb(15_23_42/0.04)] ' +
      'hover:bg-smb-surface-container hover:border-smb-outline hover:shadow-[0_2px_6px_-2px_rgb(15_23_42/0.08)]',
    outline:
      'border border-smb-outline-variant bg-transparent text-smb-on-surface-variant ' +
      'hover:bg-smb-surface-container-low hover:text-smb-on-surface hover:border-smb-outline',
    ghost:
      'bg-transparent text-smb-on-surface-variant ' +
      'hover:bg-smb-surface-container-low hover:text-smb-on-surface',
    success:
      'bg-green-600 text-white ' +
      'shadow-[0_1px_2px_0_rgb(15_23_42/0.10)] ' +
      'hover:bg-green-700 hover:shadow-[0_4px_10px_-2px_rgb(15_23_42/0.18)]',
    warning:
      'bg-yellow-500 text-white ' +
      'shadow-[0_1px_2px_0_rgb(15_23_42/0.10)] ' +
      'hover:bg-yellow-600 hover:shadow-[0_4px_10px_-2px_rgb(15_23_42/0.18)]',
    danger:
      'bg-red-600 text-white ' +
      'shadow-[0_1px_2px_0_rgb(15_23_42/0.10)] ' +
      'hover:bg-red-700 hover:shadow-[0_4px_10px_-2px_rgb(15_23_42/0.18)]',
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
        <>
          <span className="smb-spin inline-flex">
            <Icon name="progress_activity" className="text-[18px]" />
          </span>
          <span className="opacity-80">{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} className="text-[18px] transition-transform duration-150 group-hover:translate-x-[-1px]" />
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} className="text-[18px] transition-transform duration-150 group-hover:translate-x-[1px]" />
          )}
        </>
      )}
    </button>
  )
}

export default Button