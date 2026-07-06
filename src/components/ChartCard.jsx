import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function ChartCard({
  title,
  subtitle,
  icon,
  children,
  className = '',
  // Optional: when provided the card becomes clickable / hoverable.
  onClick,
  actions,
}) {
  const interactive = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`
        rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-5
        transition-[box-shadow,border-color] duration-[180ms]
        ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:shadow-[0_2px_6px_-2px_rgb(15_23_42/0.06),0_4px_12px_-4px_rgb(15_23_42/0.05)]
        ${interactive ? 'cursor-pointer focus:outline-none focus-visible:shadow-[0_0_0_3px_rgb(74_222_128/0.30)]' : ''}
        ${className}
      `}
    >
      {(title || icon || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex size-9 items-center justify-center rounded-lg bg-smb-primary-container/10 transition-colors duration-150 group-hover:bg-smb-primary-container/15">
                <Icon name={icon} className="text-[20px] text-smb-primary-container" />
              </div>
            )}
            {(title || subtitle) && (
              <div>
                {title && <h3 className="text-sm font-semibold text-smb-on-surface">{title}</h3>}
                {subtitle && <p className="text-xs text-smb-on-surface-variant">{subtitle}</p>}
              </div>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export default ChartCard