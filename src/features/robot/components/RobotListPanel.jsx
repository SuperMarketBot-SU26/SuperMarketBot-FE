import React, { useMemo, useState } from 'react'
import { statusPalette } from '../utils/robotHelpers'
import { getRobot, getRobotPose } from '../api/robotApi'
import { DualBatteryIndicator } from './DualBatteryIndicator'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function labelForStatus(s, isCharging = false) {
  if (isCharging || s === 'Offline_Charging' || s === 'Charging') return 'Đang sạc'
  switch (s) {
    case 'Moving': return 'Đang di chuyển'
    case 'Idle': return 'Đang rảnh'
    case 'Interacting': return 'Tương tác'
    case 'Power_Off': return 'Tắt nguồn'
    case 'Online': return 'Online'
    default: return s
  }
}

function BatteryBar({ pct }) {
  const bat = Math.max(0, Math.min(100, pct || 0))
  const colorClass =
    bat > 50 ? 'bg-emerald-500' : bat > 20 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="flex items-center gap-1.5" title={`Dung lượng pin: ${bat}%`}>
      <div className="relative h-2 w-7 overflow-hidden rounded-full bg-smb-surface-container-high border border-smb-outline-variant/60">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${bat}%` }}
        />
      </div>
      <span className="text-[11px] font-bold tabular-nums text-smb-on-surface">{bat}%</span>
    </div>
  )
}

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

  const p = statusPalette(robot?.deviceIsCharging ? 'Offline_Charging' : (robot?.status ?? 'Unknown'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 smb-fade-in">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-2xl smb-pop-in">
        <div className="flex items-center justify-between border-b border-smb-outline-variant/60 p-4">
          <h2 className="text-sm font-bold text-smb-on-surface">Thông Tin Chi Tiết Robot</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-smb-on-surface-variant hover:bg-smb-surface-container-low"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-3xl text-smb-primary">progress_activity</span>
            </div>
          ) : error ? (
            <p className="py-4 text-center text-xs font-semibold text-rose-500">{error}</p>
          ) : robot ? (
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${robot.deviceIsCharging ? 'bg-amber-500' : p.dot} text-white shadow-md`}>
                  <Icon name="smart_toy" className="text-2xl" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-smb-on-surface">{robot.robotName}</p>
                    {robot.deviceIsCharging && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Icon name="bolt" className="text-[10px] text-amber-500" />
                        Đang sạc
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-smb-on-surface-variant/80">{robot.robotCode}</p>
                </div>
              </div>
              <div className="border-t border-smb-outline-variant/40" />
              <DualBatteryIndicator
                batteryPct={robot.batteryPct}
                deviceBatteryPct={robot.deviceBatteryPct}
                deviceIsCharging={robot.deviceIsCharging}
                espBatteryPct={robot.espBatteryPct}
                espBatteryVolts={robot.espBatteryVolts}
                variant="card"
              />
              <div className="border-t border-smb-outline-variant/40" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="text-smb-on-surface-variant">Trạng thái</dt>
                <dd className={`font-semibold ${robot.deviceIsCharging ? 'text-amber-600 dark:text-amber-400 flex items-center gap-1' : p.text}`}>
                  {robot.deviceIsCharging ? (
                    <>
                      <Icon name="bolt" className="text-[13px] text-amber-500 animate-pulse" />
                      Đang sạc (Điện thoại)
                    </>
                  ) : (
                    labelForStatus(robot.status)
                  )}
                </dd>
                <dt className="text-smb-on-surface-variant">Nhiệm vụ</dt>
                <dd className="font-semibold text-xs">
                  {robot.activeFlowType === 'ad' ? (
                    <span className="text-emerald-600 dark:text-emerald-400">📢 Quảng cáo</span>
                  ) : robot.activeFlowType === 'patrol' ? (
                    <span className="text-blue-600 dark:text-blue-400">🔍 Tuần tra</span>
                  ) : robot.activeFlowType === 'guide' ? (
                    <span className="text-purple-600 dark:text-purple-400">🛒 Dẫn đường</span>
                  ) : robot.activeFlowType === 'return' ? (
                    <span className="text-orange-600 dark:text-orange-400">🏠 Quay về trạm</span>
                  ) : (
                    <span className="text-smb-on-surface-variant">Chờ lệnh</span>
                  )}
                </dd>
                <dt className="text-smb-on-surface-variant">Chế độ</dt>
                <dd className="font-semibold text-smb-on-surface">{robot.mode}</dd>
                <dt className="text-smb-on-surface-variant">Vị trí (X, Y)</dt>
                <dd className="font-semibold tabular-nums text-smb-on-surface">
                  {typeof (pose?.x ?? pose?.xCoord) === 'number' && typeof (pose?.y ?? pose?.yCoord) === 'number'
                    ? `(${(pose.x ?? pose.xCoord).toFixed(2)}m, ${(pose.y ?? pose.yCoord).toFixed(2)}m)`
                    : '—'}
                </dd>
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

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
    robots.forEach((r) => {
      const isCharging = r.deviceIsCharging === true || r.status === 'Offline_Charging' || r.status === 'Charging'
      if (isCharging) {
        acc.Offline_Charging = (acc.Offline_Charging ?? 0) + 1
      } else if (r.status === 'Moving' || r.mode === 'moving') {
        acc.Moving = (acc.Moving ?? 0) + 1
      } else if (r.status === 'Interacting' || r.mode === 'interacting') {
        acc.Interacting = (acc.Interacting ?? 0) + 1
      } else if (r.status === 'Power_Off' || r.status === 'Offline') {
        acc.Power_Off = (acc.Power_Off ?? 0) + 1
      } else {
        acc.Idle = (acc.Idle ?? 0) + 1
      }
    })
    return acc
  }, [robots])

  if (!robots.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-smb-on-surface-variant">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-smb-surface-container-low">
          <Icon name="smart_toy" className="text-3xl text-smb-outline" />
        </div>
        <p className="text-xs font-semibold">Chưa có robot nào trong hệ thống</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden bg-smb-surface-container-lowest">
        <header className="border-b border-smb-outline-variant/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-smb-on-surface">Danh Sách Robot</h3>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {robots.length} Units
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(summary).map(([status, count]) => {
              if (!count) return null
              const p = statusPalette(status)
              return (
                <span key={status} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${p.bg} ${p.text} border-current/20`}>
                  <span className={`size-1.5 rounded-full ${p.dot}`} />
                  {count} {labelForStatus(status)}
                </span>
              )
            })}
          </div>
        </header>

        <ul className="flex-1 divide-y divide-smb-outline-variant/40 overflow-y-auto">
          {robots.map((r) => {
            const pose = poses[r.robotCode]
            const isCharging = r.deviceIsCharging === true || r.status === 'Offline_Charging' || r.status === 'Charging'
            const p = statusPalette(isCharging ? 'Offline_Charging' : r.status)
            const isSel = selectedRobotCode === r.robotCode
            const assignedRouteId = assignments[r.robotCode]
            const assignedRoute = assignedRouteId ? routeById.get(assignedRouteId) : null
            const isMoving = (r.status === 'Moving' || r.mode === 'moving') && !isCharging
            const isAd = r.activeFlowType === 'ad'
            const isPatrol = r.activeFlowType === 'patrol'
            const isGuide = r.activeFlowType === 'guide'
            const isReturn = r.activeFlowType === 'return'

            return (
              <li key={r.robotId}>
                <button
                  type="button"
                  onClick={() => onSelect?.(r)}
                  className={`flex w-full flex-col gap-2 p-3 text-left transition-all ${
                    isSel
                      ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500 dark:bg-emerald-500/15'
                      : 'hover:bg-smb-surface-container-low/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                          isCharging ? 'bg-amber-500' : isAd ? 'bg-emerald-600' : isPatrol ? 'bg-blue-600' : isGuide ? 'bg-purple-600' : p.dot
                        } text-white shadow-xs`}>
                          <Icon
                            name={isCharging ? 'bolt' : isAd ? 'campaign' : isPatrol ? 'search' : isGuide ? 'navigation' : 'smart_toy'}
                            className="text-[18px]"
                          />
                        </div>
                        {isCharging ? (
                          <span className="absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-white dark:ring-gray-900" title="Đang sạc pin">
                            <Icon name="bolt" className="text-[9px]" />
                          </span>
                        ) : isMoving && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="truncate text-xs font-bold text-smb-on-surface">{r.robotName}</p>
                          {isCharging && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                              <Icon name="bolt" className="text-[10px] text-amber-500" />
                              Sạc
                            </span>
                          )}
                          {isAd && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                              <Icon name="campaign" className="text-[10px] text-emerald-500" />
                              QC
                            </span>
                          )}
                          {isPatrol && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 px-1.5 py-0.2 text-[9px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                              <Icon name="search" className="text-[10px] text-blue-500" />
                              Tuần tra
                            </span>
                          )}
                          {isGuide && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-500/15 px-1.5 py-0.2 text-[9px] font-bold text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0">
                              <Icon name="navigation" className="text-[10px] text-purple-500" />
                              Dẫn đường
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-smb-on-surface-variant/80 flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-[10px] opacity-75">{r.robotCode} ·</span>
                          {isCharging ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5">
                              <Icon name="bolt" className="text-[11px] text-amber-500" />
                              Đang sạc (Điện thoại)
                            </span>
                          ) : (
                            <span className={`font-semibold ${p.text}`}>{labelForStatus(r.status)}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <DualBatteryIndicator
                        batteryPct={r.batteryPct}
                        deviceBatteryPct={r.deviceBatteryPct}
                        deviceIsCharging={r.deviceIsCharging}
                        espBatteryPct={r.espBatteryPct}
                        espBatteryVolts={r.espBatteryVolts}
                        variant="compact"
                      />
                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={(e) => { e.stopPropagation(); setDetailRobotCode(r.robotCode) }}
                        className="flex size-6 items-center justify-center rounded-lg text-smb-on-surface-variant/70 hover:bg-smb-surface-container hover:text-smb-primary"
                      >
                        <Icon name="info" className="text-[16px]" />
                      </button>
                    </div>
                  </div>

                  {isCharging ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      <Icon name="bolt" className="text-[13px] text-amber-500 shrink-0" />
                      <span className="truncate">Điện thoại đang cắm sạc ({r.deviceBatteryPct ?? r.batteryPct ?? 0}%)</span>
                    </div>
                  ) : isAd ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      <Icon name="campaign" className="text-[13px] text-emerald-500 shrink-0" />
                      <span className="truncate">Phát QC: {r.activeMission?.campaignName || 'Chiến dịch siêu thị'}</span>
                    </div>
                  ) : isPatrol ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                      <Icon name="search" className="text-[13px] text-blue-500 shrink-0" />
                      <span className="truncate">Đang tuần tra kệ hàng AI Vision</span>
                    </div>
                  ) : isGuide ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                      <Icon name="navigation" className="text-[13px] text-purple-500 shrink-0" />
                      <span className="truncate">Đang dẫn đường cho khách</span>
                    </div>
                  ) : isReturn ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-[11px] text-orange-700 dark:text-orange-300 font-medium">
                      <Icon name="home" className="text-[13px] text-orange-500 shrink-0" />
                      <span className="truncate">Đang quay về trạm sạc</span>
                    </div>
                  ) : assignedRoute ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-smb-surface-container-low/80 px-2.5 py-1 text-[11px]">
                      <Icon name="route" className="text-[14px] text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate font-medium text-smb-on-surface">{assignedRoute.routeName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-smb-outline-variant/60 px-2.5 py-1 text-[10px] text-smb-on-surface-variant/70">
                      <Icon name="check_circle" className="text-[13px] text-emerald-500/80" />
                      Sẵn sàng nhận lệnh
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
