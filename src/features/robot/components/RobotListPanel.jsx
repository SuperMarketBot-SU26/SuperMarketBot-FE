import React, { useMemo } from 'react'
import { statusPalette } from '../utils/robotHelpers'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * RobotListPanel — sidebar showing every robot with status/battery.
 * Click a row to center the map on it and load its assigned route in the assignment panel.
 */
export function RobotListPanel({
  robots = [],
  poses = {},
  assignments = {},
  routes = [],
  selectedRobotCode = null,
  onSelect,
}) {
  const routeById = useMemo(() => {
    const m = new Map()
    routes.forEach((r) => m.set(r.robotRouteId, r))
    return m
  }, [routes])

  // Summary chips
  const summary = useMemo(() => {
    const acc = { Moving: 0, Idle: 0, Interacting: 0, Offline_Charging: 0, Power_Off: 0 }
    robots.forEach((r) => { acc[r.status] = (acc[r.status] ?? 0) + 1 })
    return acc
  }, [robots])

  if (!robots.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6 text-center text-smb-on-surface-variant">
        <Icon name="smart_toy" className="text-4xl" />
        <p className="text-sm">Chưa có robot nào trong hệ thống.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
      <header className="border-b border-smb-outline-variant p-4">
        <h3 className="text-sm font-semibold text-smb-on-surface">Danh sách Robot</h3>
        <p className="text-xs text-smb-on-surface-variant">
          {robots.length} robot đang hoạt động
        </p>

        {/* Status chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(summary).map(([status, count]) => {
            if (!count) return null
            const p = statusPalette(status)
            return (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${p.bg} ${p.text}`}
              >
                <span className={`size-1.5 rounded-full ${p.dot}`} />
                {count} {labelForStatus(status)}
              </span>
            )
          })}
        </div>
      </header>

      <ul className="flex-1 divide-y divide-smb-outline-variant overflow-y-auto">
        {robots.map((r) => {
          const pose = poses[r.robotCode]
          const p = statusPalette(r.status)
          const isSel = selectedRobotCode === r.robotCode
          const assignedRouteId = assignments[r.robotCode]
          const assignedRoute = assignedRouteId ? routeById.get(assignedRouteId) : null
          return (
            <li key={r.robotId}>
              <button
                type="button"
                onClick={() => onSelect?.(r)}
                className={`flex w-full flex-col gap-2 p-4 text-left transition-colors ${
                  isSel ? 'bg-smb-active-bg' : 'hover:bg-smb-surface-container-low'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-full ${p.dot} text-smb-on-primary`}>
                      <Icon name="smart_toy" className="text-[18px]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-smb-on-surface">{r.robotName}</p>
                      <p className="text-xs text-smb-on-surface-variant">{labelForStatus(r.status)} · {r.mode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-smb-on-surface">
                      {r.batteryPct}%
                    </p>
                    <p className="text-[10px] text-smb-on-surface-variant">
                      {pose ? `(${(pose.x ?? 0).toFixed(1)}, ${(pose.y ?? 0).toFixed(1)})` : '—'}
                    </p>
                  </div>
                </div>

                {assignedRoute ? (
                  <div className="flex items-center gap-1.5 rounded bg-smb-surface-container-low px-2 py-1 text-xs">
                    <Icon name="route" className="text-[14px] text-smb-primary-container" />
                    <span className="truncate text-smb-on-surface-variant">
                      {assignedRoute.routeName}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded border border-dashed border-smb-outline-variant px-2 py-1 text-xs text-smb-on-surface-variant">
                    <Icon name="link_off" className="text-[14px]" />
                    Chưa gán lộ trình
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function labelForStatus(s) {
  switch (s) {
    case 'Moving': return 'đang di chuyển'
    case 'Idle': return 'rảnh'
    case 'Interacting': return 'đang tương tác'
    case 'Offline_Charging': return 'sạc / ngoại tuyến'
    case 'Power_Off': return 'đã tắt nguồn'
    default: return s
  }
}

export default RobotListPanel
