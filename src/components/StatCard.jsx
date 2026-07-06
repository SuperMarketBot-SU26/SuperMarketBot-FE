import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'primary',
  onClick,
  className = '',
}) {
  const colorMap = {
    primary: 'text-smb-primary-container bg-smb-primary-container/10',
    success: 'text-green-600 bg-green-50',
    warning: 'text-amber-600 bg-amber-50',
    danger: 'text-red-600 bg-red-50',
    info: 'text-blue-600 bg-blue-50',
  }

  const trendColorMap = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-smb-on-surface-variant',
  }

  const interactive = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`
        rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-5
        smb-lift motion-reduce:transform-none
        ${interactive ? 'cursor-pointer focus:outline-none focus-visible:shadow-[0_0_0_3px_rgb(74_222_128/0.30)]' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-smb-on-surface-variant">{title}</p>
          <p className="mt-2 text-3xl font-bold text-smb-on-surface tabular-nums">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-smb-on-surface-variant">{subtitle}</p>
          )}
          {trend && (
            <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendColorMap[trend]}`}>
              {trend === 'up' && <Icon name="trending_up" className="text-[14px]" />}
              {trend === 'down' && <Icon name="trending_down" className="text-[14px]" />}
              {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`
              flex size-12 items-center justify-center rounded-lg ${colorMap[color]}
              transition-transform duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]
              ${interactive ? 'group-hover:scale-105' : ''}
            `}
          >
            <Icon name={icon} className="text-[24px]" />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard