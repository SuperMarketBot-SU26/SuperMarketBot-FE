import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * FleetStatsHeader — top KPI strip: total robots, moving, low battery, offline.
 */
export function FleetStatsHeader({ robots = [] }) {
  const total = robots.length
  const moving = robots.filter((r) => r.status === 'Moving').length
  const lowBat = robots.filter((r) => r.batteryPct < 25 && r.status !== 'Power_Off').length
  const offline = robots.filter((r) =>
    ['Power_Off', 'Offline_Charging'].includes(r.status)
  ).length

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon="smart_toy" label="Tổng robot" value={total} accent="primary" />
      <StatCard icon="directions_run" label="Đang di chuyển" value={moving} accent="success" />
      <StatCard icon="battery_alert" label="Pin yếu (<25%)" value={lowBat} accent="warning" />
      <StatCard icon="power_off" label="Ngoại tuyến / Đang sạc" value={offline} accent="muted" />
    </div>
  )
}

function StatCard({ icon, label, value, accent }) {
  const accentMap = {
    primary: { bg: 'bg-smb-active-bg', icon: 'text-smb-primary-container' },
    success: { bg: 'bg-smb-success-bg', icon: 'text-smb-success' },
    warning: { bg: 'bg-smb-tertiary-fixed', icon: 'text-smb-on-tertiary-fixed-variant' },
    muted:   { bg: 'bg-smb-surface-container-low', icon: 'text-smb-on-surface-variant' },
  }
  const a = accentMap[accent]
  return (
    <div className="flex items-center gap-3 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
      <div className={`flex size-10 items-center justify-center rounded ${a.bg}`}>
        <Icon name={icon} className={`text-[20px] ${a.icon}`} />
      </div>
      <div>
        <p className="text-xs text-smb-on-surface-variant">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-smb-on-surface">{value}</p>
      </div>
    </div>
  )
}

export default FleetStatsHeader
