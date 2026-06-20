import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function ChartCard({ title, subtitle, icon, children, className = '' }) {
  return (
    <div className={`rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-5 ${className}`}>
      {(title || icon) && (
        <div className="mb-4 flex items-center gap-3">
          {icon && (
            <div className="flex size-9 items-center justify-center rounded-lg bg-smb-primary-container/10">
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
      )}
      {children}
    </div>
  )
}

export default ChartCard
