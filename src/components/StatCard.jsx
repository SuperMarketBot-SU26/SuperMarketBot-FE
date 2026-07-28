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
    primary: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-500/30',
    success: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-500/30',
    warning: 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/20 dark:border-amber-500/30',
    danger: 'text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/20 dark:border-rose-500/30',
    info: 'text-sky-700 bg-sky-500/10 border-sky-500/20 dark:text-sky-400 dark:bg-sky-500/20 dark:border-sky-500/30',
  }

  const trendColorMap = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-smb-on-surface-variant/80',
  }

  const interactive = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`
        relative overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest p-5
        shadow-sm transition-all duration-200 hover:shadow-md hover:border-smb-primary/40
        ${interactive ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-smb-on-surface-variant/80 uppercase">
            {title}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-smb-on-surface tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs font-medium text-smb-on-surface-variant/80 truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${colorMap[color]}`}>
              {trend === 'up' && <Icon name="trending_up" className="text-[14px]" />}
              {trend === 'down' && <Icon name="trending_down" className="text-[14px]" />}
              <span className={trendColorMap[trend]}>{trendValue}</span>
            </div>
          )}
        </div>

        {icon && (
          <div
            className={`
              flex size-12 shrink-0 items-center justify-center rounded-xl border ${colorMap[color]}
              shadow-inner transition-transform duration-200
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