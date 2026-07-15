import React, { useMemo, useState } from 'react'
import { statusPalette } from '../utils/robotHelpers'
import { getRobot, getRobotPose } from '../api/robotApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
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

/* -------------------------------------------------------------------- */
/*  RobotDetailModal                                                    */
/* -------------------------------------------------------------------- */

function RobotDetailModal({ robotCode, onClose }) {
  const [robot, setRobot] = useState(null)
  const [pose, setPose] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  React.useEffect(() => {
    if (!robotCode) return
    let cancelled = false
    setLoading(true)
    setRobot(null)
    setPose(null)
    setError(null)

    const load = async () => {
      try {
        const [r, p] = await Promise.all([
          getRobot(robotCode),
          getRobotPose(robotCode).catch(() => null),
        ])
        if (!cancelled) {
          setRobot(r)
          setPose(p)
          if (!r) setError('Không tìm thấy robot này.')
        }
      } catch {
        if (!cancelled) setError('Không tải được thông tin robot.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [robotCode])

  if (!robotCode) return null

  const p = robot ? statusPalette(robot.status) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-smb-outline-variant p-4">
          <h2 className="text-base font-semibold text-smb-on-surface">Thông tin Robot</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-smb-on-surface-variant hover:bg-smb-surface-container-low"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <span className="material-symbols-outlined animate-spin text-3xl text-smb-on-surface-variant">progress_activity</span>
            </div>
          ) : error ? (
            <p className="py-4 text-center text-sm text-smb-error">{error}</p>
          ) : robot ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${p.dot} text-smb-on-primary`}>
                  <Icon name="smart_toy" className="text-2xl" />
                </div>
                <div>
                  <p className="font-semibold text-smb-on-surface">{robot.robotName}</p>
                  <p className="text-xs text-smb-on-surface-variant">{robot.robotCode}</p>
                </div>
              </div>
              <div className="border-t border-smb-outline-variant" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-xs text-smb-on-surface-variant">Trạng thái</dt>
                <dd className={`font-medium ${p.text}`}>{labelForStatus(robot.status)}</dd>
                <dt className="text-xs text-smb-on-surface-variant">Chế độ</dt>
                <dd className="font-medium text-smb-on-surface">{robot.mode}</dd>
                <dt className="text-xs text-smb-on-surface-variant">Pin</dt>
                <dd className="font-medium text-smb-on-surface tabular-nums">{robot.batteryPct}%</dd>
                <dt className="text-xs text-smb-on-surface-variant">IP</dt>
                <dd className="font-medium text-smb-on-surface tabular-nums">{robot.ipAddress ?? '—'}</dd>
                <dt className="text-xs text-smb-on-surface-variant">Tọa độ</dt>
                <dd className="font-medium text-smb-on-surface tabular-nums">
                  {pose ? `(${pose.x.toFixed(2)}, ${pose.y.toFixed(2)})` : '—'}
                </dd>
                <dt className="text-xs text-smb-on-surface-variant">Hướng</dt>
                <dd className="font-medium text-smb-on-surface tabular-nums">
                  {pose ? `${pose.headingDeg.toFixed(1)}°` : '—'}
                </dd>
                <dt className="text-xs text-smb-on-surface-variant">Hoạt động lần cuối</dt>
                <dd className="text-xs font-medium text-smb-on-surface">
                  {robot.lastSeenAt ? new Date(robot.lastSeenAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </dd>
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  RobotListPanel                                                      */
/* -------------------------------------------------------------------- */

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
  const [detailRobotCode, setDetailRobotCode] = useState(null)

  const routeById = useMemo(() => {
    const m = new Map()
    routes.forEach((r) => m.set(r.robotRouteId, r))
    return m
  }, [routes])

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
    <>
      <div className="flex h-full flex-col rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
        <header className="border-b border-smb-outline-variant p-4">
          <h3 className="text-sm font-semibold text-smb-on-surface">Danh sách Robot</h3>
          <p className="text-xs text-smb-on-surface-variant">{robots.length} robot đang hoạt động</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(summary).map(([status, count]) => {
              if (!count) return null
              const p = statusPalette(status)
              return (
                <span key={status} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${p.bg} ${p.text}`}>
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
                  className={`flex w-full flex-col gap-2 p-4 text-left transition-colors ${isSel ? 'bg-smb-active-bg' : 'hover:bg-smb-surface-container-low'}`}
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
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-smb-on-surface">{r.batteryPct}%</p>
                        <p className="text-[10px] text-smb-on-surface-variant tabular-nums">
                          {pose ? `(${pose.x.toFixed(1)}, ${(pose.y ?? 0).toFixed(1)})` : '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={(e) => { e.stopPropagation(); setDetailRobotCode(r.robotCode) }}
                        className="flex size-7 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container-hover hover:text-smb-primary"
                      >
                        <Icon name="info" className="text-[16px]" />
                      </button>
                    </div>
                  </div>

                  {assignedRoute ? (
                    <div className="flex items-center gap-1.5 rounded bg-smb-surface-container-low px-2 py-1 text-xs">
                      <Icon name="route" className="text-[14px] text-smb-primary-container" />
                      <span className="truncate text-smb-on-surface-variant">{assignedRoute.routeName}</span>
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

      <RobotDetailModal robotCode={detailRobotCode} onClose={() => setDetailRobotCode(null)} />
    </>
  )
}

export default RobotListPanel
