import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { toast } from 'react-toastify'
import { statusPalette } from '../utils/robotHelpers'
import { getRobot, getRobotPose } from '../api/robotApi'
import { DualBatteryIndicator } from './DualBatteryIndicator'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// NOTE: If the BE's /routes/types endpoint fails, routeTypes stays [] and the
// dropdown will be empty. That is intentional — no hardcoded mock data.

export const ROUTE_TYPE_META = {
  patrol:     { label: 'Tuần tra',   color: '#264191', dot: 'bg-blue-700',    text: 'text-blue-700',   border: 'border-blue-200',   bg: 'bg-blue-50',    icon: 'shield'        },
  restock:    { label: 'Nhập hàng',  color: '#7c3aed', dot: 'bg-purple-600',  text: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50',  icon: 'inventory_2'   },
  delivery:   { label: 'Giao hàng',  color: '#0891b2', dot: 'bg-cyan-600',    text: 'text-cyan-700',   border: 'border-cyan-200',   bg: 'bg-cyan-50',    icon: 'local_shipping'},
  ad:         { label: 'Quảng cáo',  color: '#ea580c', dot: 'bg-orange-600',  text: 'text-orange-700', border: 'border-orange-200', bg: 'bg-orange-50',  icon: 'campaign'      },
  navigation: { label: 'Điều hướng', color: '#16a34a', dot: 'bg-green-600',   text: 'text-green-700',  border: 'border-green-200',  bg: 'bg-green-50',   icon: 'navigation'    },
  custom:     { label: 'Tùy chỉnh',  color: '#6b7280', dot: 'bg-gray-500',    text: 'text-gray-700',   border: 'border-gray-200',   bg: 'bg-gray-50',    icon: 'route'         },
  default:    { label: 'Khác',       color: '#264191', dot: 'bg-blue-700',    text: 'text-blue-700',   border: 'border-blue-200',   bg: 'bg-blue-50',    icon: 'route'         },
}

export function getRouteTypeMeta(type) {
  return ROUTE_TYPE_META[type] || ROUTE_TYPE_META.default
}

/**
 * RobotAssignmentPanel
 * Sidebar for the Giám Sát Robot page. Tabbed view:
 *   • Tab 1 — "Điều Khiển Nhiệm Vụ" : Dispatch ad/patrol autonomous missions.
 *   • Tab 2 — "Trạng Thái & Can Thiệp" : Battery, controls, fleet list, connection.
 */
export function RobotAssignmentPanel({
  robots = [],
  poses = {},
  routes = [],
  map = null,
  selectedRobotCode = null,
  onSelectRobot,
  onMissionDispatched,
}) {
  const [tab, setTab] = useState('missions') // Default to 'missions' (Điều Khiển Nhiệm Vụ)

  // Shared robot selector — dùng chung cho cả 2 tab
  const activeRobotCode = selectedRobotCode || robots?.[0]?.robotCode || ''
  const selectedRobotObj = robots.find(
    (r) => r.robotCode === activeRobotCode ||
      (activeRobotCode === 'RB001' && r.robotCode === 'RB0001') ||
      (activeRobotCode === 'RB0001' && r.robotCode === 'RB001')
  )

  return (
    <div className="flex h-full flex-col rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
      {/* Shared Robot Selector — nằm trên Tabs, dùng chung */}
      <div className="px-3 pt-3 pb-1">
        <select
          value={activeRobotCode}
          onChange={(e) => {
            const r = robots.find((item) => item.robotCode === e.target.value)
            if (r && onSelectRobot) onSelectRobot(r)
          }}
          className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none focus:border-smb-primary"
        >
          {robots.length === 0 ? (
            <option value="">Chưa có robot (Nhấn F5 để tải lại)</option>
          ) : (
            robots.map((r) => (
              <option key={r.robotCode} value={r.robotCode}>
                {r.robotName || r.robotCode} · {r.status} · {r.batteryPct ?? '?'}%
              </option>
            ))
          )}
        </select>
      </div>

      <Tabs value={tab} onChange={setTab} />
      {/* Tab content — flex-1 min-h-0 so scroll works */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {tab === 'missions' ? (
          <AutonomousTab 
            robots={robots} 
            routes={routes} 
            map={map} 
            selectedRobotCode={activeRobotCode}
            onSelectRobot={onSelectRobot}
            onMissionDispatched={onMissionDispatched}
          />
        ) : (
          <RobotsTab
            robots={robots}
            poses={poses}
            selectedRobotCode={activeRobotCode}
            selectedRobotObj={selectedRobotObj}
            onSelectRobot={onSelectRobot}
            onMissionDispatched={onMissionDispatched}
          />
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  Autonomous 3-Flow Tab                                               */
/* -------------------------------------------------------------------- */

import {
  dispatchAutonomous,
  cancelRobotNavigation,
  emergencyStopRobot,
  getRobotOperationReadiness,
  pauseRobotNavigation,
  resumeRobotNavigation,
  getActiveCampaigns,
  getRobotMissionState,
  publishRobotCommand,
} from '../api/navigationApi'
import { getShelves } from '../api/shelvesApi'

// Status badge colours
const STATUS_OK  = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
const STATUS_ERR = 'bg-rose-500/10 text-rose-600 border-rose-500/20'

function StatusBadge({ msg }) {
  if (!msg) return null
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${msg.type === 'success' ? STATUS_OK : STATUS_ERR}`}>
      <span className="mt-0.5 shrink-0">{msg.type === 'success' ? '✅' : '❌'}</span>
      <span className="flex-1 leading-snug">{msg.text}</span>
    </div>
  )
}

function WaypointList({ waypoints }) {
  const [expanded, setExpanded] = useState(false)
  if (!waypoints?.length) return null

  const visibleWaypoints = expanded ? waypoints : waypoints.slice(0, 5)
  const remaining = waypoints.length - 5

  return (
    <div className="mt-3 rounded-xl border border-smb-outline-variant bg-smb-surface-container p-3 space-y-1.5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-smb-on-surface-variant">
        {waypoints.length} điểm đến được tính toán
      </p>
      {visibleWaypoints.map((wp, i) => {
        const productName = wp.playlist?.[0]?.productName || wp.productNames?.[0]
        const hasMoreProducts = (wp.playlist?.length > 1) || (wp.productNames?.length > 1)
        
        return (
          <div key={wp.nodeId ?? i} className="flex flex-col gap-0.5 mb-1.5 border-b border-smb-outline-variant/30 pb-1.5 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 text-[11px] text-smb-on-surface">
              <span className="flex size-5 items-center justify-center rounded-full bg-smb-primary/10 text-[10px] font-bold text-smb-primary shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 font-bold text-smb-primary-container truncate" title={wp.shelfName ? `${wp.shelfName} (${wp.nodeName || `Node #${wp.nodeId}`})` : (wp.nodeName || `Kệ hàng (Node #${wp.nodeId})`)}>
                {wp.shelfName ? `${wp.shelfName} (${wp.nodeName || `Node #${wp.nodeId}`})` : (wp.nodeName || `Kệ hàng (Node #${wp.nodeId})`)}
              </span>
              {wp.dwellTimeSeconds && (
                <span className="rounded bg-smb-surface-container-lowest px-1.5 py-0.5 text-[10px] text-smb-on-surface-variant shrink-0">
                  ⏱ {wp.dwellTimeSeconds}s
                </span>
              )}
            </div>
            {productName && (
              <div className="pl-7 text-[10px] text-smb-on-surface-variant flex items-center gap-1">
                <Icon name="campaign" className="text-[12px] text-orange-500" />
                <span className="truncate">Sản phẩm: {productName} {hasMoreProducts ? '(+...)' : ''}</span>
              </div>
            )}
            <div className="pl-7 text-[9px] font-mono text-smb-on-surface-variant/70">
              Tọa độ: ({typeof wp.xCoord === 'number' ? wp.xCoord.toFixed(1) : '?'}, {typeof wp.yCoord === 'number' ? wp.yCoord.toFixed(1) : '?'})
            </div>
          </div>
        )
      })}
      {!expanded && remaining > 0 && (
        <button 
          onClick={() => setExpanded(true)}
          className="w-full text-center text-[10px] text-smb-primary hover:text-smb-primary-container font-semibold py-1 hover:bg-smb-primary/5 rounded transition-colors mt-1"
        >
          + Xem thêm {remaining} điểm đến nữa…
        </button>
      )}
      {expanded && remaining > 0 && (
        <button 
          onClick={() => setExpanded(false)}
          className="w-full text-center text-[10px] text-smb-primary hover:text-smb-primary-container font-semibold py-1 hover:bg-smb-primary/5 rounded transition-colors mt-1"
        >
          Thu gọn danh sách
        </button>
      )}
    </div>
  )
}

function AutonomousTab({ robots = [], routes = [], map, selectedRobotCode, onSelectRobot, onMissionDispatched }) {
  const selectedRobot = selectedRobotCode || ''

  const [selectedPatrolRoute, setSelectedPatrolRoute] = useState('')
  const [patrolMode, setPatrolMode] = useState('route') // 'route' | 'shelf'
  const [shelves, setShelves] = useState([])
  const [selectedShelfIds, setSelectedShelfIds] = useState([])
  const [patrolDwell, setPatrolDwell] = useState(3.0) // thời gian lia camera tại mỗi kệ (giây)

  useEffect(() => {
    getShelves().then(setShelves).catch(() => {})
  }, [])

  const validShelves = useMemo(() => shelves.filter(s => s.nodeId != null), [shelves])

  const selectedNodeIds = useMemo(() => {
    const ids = validShelves
      .filter(s => selectedShelfIds.includes(s.shelfId))
      .map(s => s.nodeId)
    return [...new Set(ids)]
  }, [validShelves, selectedShelfIds])

  // Duration settings
  const [adDuration, setAdDuration] = useState('') // optional total duration in minutes

  const [adMsg, setAdMsg]         = useState(null)
  const [adWaypoints, setAdWaypoints] = useState(null)
  const [patrolMsg, setPatrolMsg] = useState(null)
  const [patrolWaypoints, setPatrolWaypoints] = useState(null)
  const [readiness, setReadiness] = useState(null)
  
  const [adMode, setAdMode] = useState('free') // 'free' | 'shelf'
  const [selectedAdShelfIds, setSelectedAdShelfIds] = useState([])

  const [missionState, setMissionState] = useState(null)

  const [dispatching, setDispatching] = useState(false)

  useEffect(() => {
    if (!selectedRobot) {
      setMissionState(null)
      return
    }
    const poll = async () => {
      try {
        const state = await getRobotMissionState(selectedRobot)
        setMissionState(state)
      } catch {
        setMissionState(null)
      }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [selectedRobot])

  const selectedRobotId = robots.find((robot) => robot.robotCode === selectedRobot)?.robotId

  const patrolRoutes = useMemo(() => {
    const matched = routes.filter((route) =>
      (!route.robotId || route.robotId === selectedRobotId) &&
      (route.routeType === 'patrol' || route.routeType === 'custom')
    )
    return matched.length > 0 ? matched : routes
  }, [routes, selectedRobotId])

  const activePatrolRoute = patrolRoutes.some((route) => String(route.robotRouteId) === selectedPatrolRoute)
    ? selectedPatrolRoute
    : patrolRoutes[0] ? String(patrolRoutes[0].robotRouteId) : ''

  const handleDispatch = async (flowType, extra = {}) => {
    setDispatching(true)
    const clear = () => {
      if (flowType === 'ad')      { setAdMsg(null); setAdWaypoints(null) }
      if (flowType === 'patrol')  { setPatrolMsg(null); setPatrolWaypoints(null) }
    }
    clear()
    try {
      const payload = {
        robotCode: selectedRobot,
        flowType,
        ...extra,
      }
      if (payload.robotRouteId) {
        const check = await getRobotOperationReadiness(payload)
        setReadiness(check)
        if (!check.ready) throw new Error(check.errors?.join(' • ') || 'Hệ thống chưa sẵn sàng')
      }
      const data = await dispatchAutonomous(payload)
      const msg = `✅ ${data.message || `Đã phát lệnh ${flowType}!`}`
      if (flowType === 'ad')      { setAdMsg({ type: 'success', text: msg });      setAdWaypoints(data.waypoints) }
      if (flowType === 'patrol')  { setPatrolMsg({ type: 'success', text: msg });  setPatrolWaypoints(data.waypoints) }
      if (onMissionDispatched) {
        onMissionDispatched({
          ...data,
          flowType,
          status: 'NAVIGATING',
          currentWaypointIndex: 0,
        })
      }
    } catch (e) {
      const err = `❌ ${e?.response?.data?.detail || e?.response?.data?.title || e?.response?.data?.message || e?.message || 'Lỗi phát lệnh'}`
      if (flowType === 'ad')      setAdMsg({ type: 'error', text: err })
      if (flowType === 'patrol')  setPatrolMsg({ type: 'error', text: err })
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 text-xs">
      {/* Guide Active Warning Banner */}
      {missionState && missionState.flowType === 'guide' && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-300 animate-pulse">
          <div className="flex items-center gap-2">
            <Icon name="alt_route" className="text-[18px] text-amber-600" />
            <span className="font-bold">Robot đang dẫn đường khách mua sắm</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/80">
            Khách hàng đang dùng giỏ hàng thông minh. Nếu bạn phát lệnh Quảng cáo hoặc Tuần tra lúc này, Robot sẽ ưu tiên nhiệm vụ Admin và hủy phiên dẫn đường.
          </p>
        </div>
      )}

      {/* Flow Cards */}
      <div className="flex flex-col gap-3">

        {/* ── Flow 1: Quảng Cáo (Ad) ── */}
        <div className="rounded-2xl border-2 border-orange-400 bg-orange-50/40 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-orange-600 text-white shadow-xs">
                <Icon name="campaign" className="text-[17px]" />
              </span>
              <div>
                <p className="font-extrabold text-orange-950 text-sm">Flow Quảng Cáo Kệ Hàng</p>
                <p className="text-xs font-semibold text-orange-900">Phát video & TTS giới thiệu sản phẩm tại kệ</p>
              </div>
            </div>
            <span className="rounded-full bg-orange-200 px-2.5 py-1 text-[11px] font-bold text-orange-950 border border-orange-300">Tự động TTS</span>
          </div>

          {/* Ad Mode Segmented Buttons */}
          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-orange-200/70 p-1 border border-orange-300">
            <button
              type="button"
              onClick={() => setAdMode('free')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                adMode === 'free'
                  ? 'bg-white text-orange-950 shadow-md'
                  : 'text-orange-900 hover:text-orange-950'
              }`}
            >
              <Icon name="route" className="text-[15px]" />
              Tự Do
            </button>
            <button
              type="button"
              onClick={() => setAdMode('shelf')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                adMode === 'shelf'
                  ? 'bg-white text-orange-950 shadow-md'
                  : 'text-orange-900 hover:text-orange-950'
              }`}
            >
              <Icon name="format_list_bulleted" className="text-[15px]" />
              Theo Kệ
            </button>
          </div>

          {adMode === 'free' ? (
            <>
              <div className="mb-3.5 flex flex-col">
                <label className="mb-1 text-xs font-extrabold text-neutral-900">
                  Tổng thời gian đi dạo (phút)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    placeholder="1 vòng"
                    value={adDuration}
                    onChange={(e) => setAdDuration(e.target.value)}
                    className="w-full rounded-xl border-2 border-orange-300 bg-white py-2 pl-3 pr-12 text-xs font-extrabold text-neutral-900 outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm"
                  />
                  <span className="absolute right-3 text-xs font-bold text-orange-900 pointer-events-none">
                    phút
                  </span>
                </div>
                <span className="mt-1 text-xs font-semibold text-neutral-800">Robot đi liên tục không dừng, phát quảng cáo toàn siêu thị. Trống = đi 1 vòng.</span>
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  disabled={dispatching}
                  onClick={() => handleDispatch('ad', {
                    dwellTimeSeconds: 0,
                    isLooping: true,
                    durationMinutes: adDuration ? Number(adDuration) : undefined,
                  })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:from-orange-700 hover:to-amber-700 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="play_arrow" className="text-[16px]" />}
                  Phát Lệnh Quảng Cáo Tự Do
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">
                  Danh sách kệ (Đã chọn: {selectedAdShelfIds.length}/{validShelves.length})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAdShelfIds.length === validShelves.length) setSelectedAdShelfIds([])
                    else setSelectedAdShelfIds(validShelves.map(s => s.shelfId))
                  }}
                  className="text-xs font-extrabold text-orange-700 hover:text-orange-900 hover:underline"
                >
                  {selectedAdShelfIds.length === validShelves.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              </div>
              <div className="mb-3 max-h-[220px] overflow-y-auto rounded-xl border-2 border-orange-200 bg-white p-2 shadow-inner">
                {validShelves.map((shelf) => {
                  const isSelected = selectedAdShelfIds.includes(shelf.shelfId)
                  return (
                    <label
                      key={`ad-${shelf.shelfId}`}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg p-2.5 transition-colors ${
                        isSelected 
                          ? 'bg-orange-100 border border-orange-300 shadow-xs' 
                          : 'hover:bg-neutral-100 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded accent-orange-600 cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedAdShelfIds(prev => [...prev, shelf.shelfId])
                          else setSelectedAdShelfIds(prev => prev.filter(id => id !== shelf.shelfId))
                        }}
                      />
                      <Icon name="shelves" className="text-[18px] text-orange-700 shrink-0" />
                      <div className="flex-1 text-xs">
                        <span className="font-bold text-neutral-900">{shelf.shelfName}</span>
                        {shelf.aisleName && (
                          <span className="ml-1.5 text-[11px] font-semibold text-neutral-600">
                            ({shelf.aisleName})
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })}
                {validShelves.length === 0 && (
                  <div className="p-3 text-center text-xs font-semibold text-neutral-600">
                    Không có kệ nào được gán tọa độ (nodeId).
                  </div>
                )}
              </div>

              {/* Note giải thích tự động tính thời gian theo playlist - Nền sáng chữ đen đậm rõ 100% */}
              <div className="mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs text-neutral-900 shadow-xs">
                <div className="flex items-start gap-2">
                  <Icon name="info" className="mt-0.5 text-[18px] text-amber-800 shrink-0" />
                  <p className="leading-relaxed font-semibold">
                    Robot sẽ lần lượt đến các kệ đã chọn, tự động đọc và chiếu <strong className="font-extrabold text-orange-900 underline decoration-orange-400">tất cả chiến dịch quảng cáo</strong> trên kệ theo thứ tự ưu tiên điểm gói (VIP &gt; Nâng cao &gt; Cơ bản) cho tới hết, sau đó tự động hoàn tất và quay về trạm.
                  </p>
                </div>
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  disabled={dispatching || selectedAdShelfIds.length === 0}
                  onClick={() => handleDispatch('ad', {
                    shelfIds: selectedAdShelfIds,
                  })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:from-orange-700 hover:to-amber-700 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="play_arrow" className="text-[16px]" />}
                  Bắt Đầu Quảng Cáo Theo Kệ
                </button>
              </div>
            </>
          )}

          <StatusBadge msg={adMsg} />
          <WaypointList waypoints={adWaypoints} />
        </div>

        {/* ── Flow 2: Tuần Tra Kệ Hàng (Patrol) ── */}
        <div className="rounded-2xl border-2 border-blue-400 bg-blue-50/40 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <Icon name="shield" className="text-[17px]" />
              </span>
              <div>
                <p className="font-extrabold text-blue-950 text-sm">Flow Tuần Tra Kệ Hàng</p>
                <p className="text-xs font-semibold text-blue-900">Robot chụp ảnh kệ → Gemini AI phân tích mật độ</p>
              </div>
            </div>
            <span className="rounded-full bg-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-950 border border-blue-300">AI Vision</span>
          </div>

          {/* Patrol Mode Segmented Buttons */}
          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-blue-200/70 p-1 border border-blue-300">
            <button
              type="button"
              onClick={() => setPatrolMode('route')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                patrolMode === 'route'
                  ? 'bg-white text-blue-950 shadow-md'
                  : 'text-blue-900 hover:text-blue-950'
              }`}
            >
              <Icon name="route" className="text-[15px]" />
              Theo Route
            </button>
            <button
              type="button"
              onClick={() => setPatrolMode('shelf')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                patrolMode === 'shelf'
                  ? 'bg-white text-blue-950 shadow-md'
                  : 'text-blue-900 hover:text-blue-950'
              }`}
            >
              <Icon name="format_list_bulleted" className="text-[15px]" />
              Chọn Kệ
            </button>
          </div>

          {patrolMode === 'route' ? (
            <>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-blue-700/70">
                Lộ trình tuần tra đã cấu hình
              </label>
              <select
                value={activePatrolRoute}
                onChange={(e) => setSelectedPatrolRoute(e.target.value)}
                className="mb-3 w-full rounded-xl border border-blue-500/40 bg-smb-surface-container-lowest px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none focus:border-blue-500"
              >
                <option value="">— Chọn route tuần tra —</option>
                {patrolRoutes.map((route) => (
                  <option key={route.robotRouteId} value={route.robotRouteId}>
                    {route.routeName} · {route.waypointCount} kệ
                  </option>
                ))}
              </select>

              <div className="mb-3 flex gap-2">
                <button
                  disabled={dispatching || !activePatrolRoute}
                  onClick={() => handleDispatch('patrol', {
                    robotRouteId: Number(activePatrolRoute),
                    floorId: map?.floorId || 1,
                    dwellTimeSeconds: Number(patrolDwell) || 3
                  })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="search" className="text-[16px]" />}
                  Phát Lệnh Tuần Tra Theo Route
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Sweep / Dwell Duration Selector */}
              <div className="mb-2.5 flex items-center justify-between rounded-xl bg-blue-500/10 px-3 py-2 border border-blue-500/20">
                <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-200">Thời gian lia camera tại kệ:</span>
                <div className="flex items-center gap-1">
                  {[2.0, 2.5, 3.0].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setPatrolDwell(dur)}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${
                        patrolDwell === dur
                          ? 'bg-blue-600 text-white shadow-sm scale-105'
                          : 'bg-white/70 text-blue-800 hover:bg-white dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {dur.toFixed(1)}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-blue-700/70">
                  Danh sách kệ (Đã chọn: {selectedShelfIds.length}/{validShelves.length} kệ · {selectedNodeIds.length} WP)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedShelfIds.length === validShelves.length) {
                      setSelectedShelfIds([])
                    } else {
                      setSelectedShelfIds(validShelves.map(s => s.shelfId))
                    }
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {selectedShelfIds.length === validShelves.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              </div>
              <div className="mb-3 max-h-[300px] overflow-y-auto rounded-xl border border-blue-500/20 bg-smb-surface-container-lowest p-1.5 space-y-1">
                {validShelves.map((shelf) => {
                  const isSelected = selectedShelfIds.includes(shelf.shelfId)
                  return (
                    <label
                      key={shelf.shelfId}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-blue-50/50 ${
                        isSelected ? 'bg-blue-100/60 dark:bg-blue-900/40 border border-blue-400/40' : 'border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded accent-blue-600"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedShelfIds(prev => [...prev, shelf.shelfId])
                          } else {
                            setSelectedShelfIds(prev => prev.filter(id => id !== shelf.shelfId))
                          }
                        }}
                      />
                      <Icon name="shelves" className="text-[16px] text-blue-600/70" />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-smb-on-surface">{shelf.shelfName}</span>
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
                            WP #{shelf.nodeId}
                          </span>
                        </div>
                        <div className="text-[10px] text-smb-on-surface-variant">
                          Kệ #{shelf.shelfId}{shelf.aisleName ? ` · Dãy: ${shelf.aisleName}` : ''}
                        </div>
                      </div>
                    </label>
                  )
                })}
                {validShelves.length === 0 && (
                  <div className="p-3 text-center text-xs text-smb-on-surface-variant">
                    Không có kệ nào được gán tọa độ (nodeId).
                  </div>
                )}
              </div>
              <div className="mb-3 flex gap-2">
                <button
                  disabled={dispatching || selectedShelfIds.length === 0}
                  onClick={() => handleDispatch('patrol', {
                    nodeIds: selectedNodeIds,
                    shelfIds: selectedShelfIds,
                    floorId: map?.floorId || 1,
                    dwellTimeSeconds: Number(patrolDwell) || 3
                  })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="search" className="text-[16px]" />}
                  Tuần Tra {selectedShelfIds.length} Kệ Đã Chọn
                </button>
              </div>
            </>
          )}

          <StatusBadge msg={patrolMsg} />
          <WaypointList waypoints={patrolWaypoints} />
        </div>

      </div>

      {readiness && (
        <div className={`rounded-xl border p-3 ${readiness.ready ? STATUS_OK : STATUS_ERR}`}>
          <p className="font-bold">Preflight: {readiness.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</p>
          {readiness.errors?.map((error) => <p key={error} className="mt-1">• {error}</p>)}
        </div>
      )}

    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  Tabs                                                                */
/* -------------------------------------------------------------------- */

function Tabs({ value, onChange }) {
  const items = [
    { id: 'missions', label: 'Điều Khiển Nhiệm Vụ', icon: 'smart_toy' },
    { id: 'status', label: 'Trạng Thái & Can Thiệp', icon: 'settings_remote' },
  ]
  return (
    <div className="p-2 border-b border-smb-outline-variant/60 bg-smb-surface-container-low/50">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-smb-surface-container-high/60 p-1">
        {items.map((it) => {
          const active = value === it.id
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                active
                  ? 'bg-smb-surface-container-lowest text-smb-primary shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'text-smb-on-surface-variant/80 hover:text-smb-on-surface'
              }`}
            >
              <Icon name={it.icon} className="text-[16px]" />
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  Shared helpers                                                      */
/* -------------------------------------------------------------------- */

function labelForStatus(s, isCharging = false) {
  if (isCharging || s === 'Offline_Charging' || s === 'Charging') return 'đang sạc'
  switch (s) {
    case 'Moving': return 'đang di chuyển'
    case 'Idle': return 'rảnh'
    case 'Interacting': return 'đang tương tác'
    case 'Power_Off': return 'đã tắt nguồn'
    case 'Online': return 'online'
    default: return s
  }
}

/* -------------------------------------------------------------------- */
/*  Robot detail modal                                                  */
/* -------------------------------------------------------------------- */

function RobotDetailModal({ robotCode, onClose }) {
  const [robot, setRobot] = useState(null)
  const [pose, setPose] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
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
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Lỗi tải thông tin robot.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs smb-fade-in">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl smb-pop-in">
        <div className="flex items-center justify-between border-b border-smb-outline-variant p-4">
          <h2 className="text-sm font-semibold text-smb-on-surface">Thông Tin Chi Tiết Robot</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container-hover"
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
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${robot.deviceIsCharging ? 'bg-amber-500' : p.dot} text-smb-on-primary shadow-xs`}>
                  <Icon name="smart_toy" className="text-2xl" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-smb-on-surface">{robot.robotName}</p>
                    {robot.deviceIsCharging && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Icon name="bolt" className="text-[10px] text-amber-500" />
                        Đang sạc
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-smb-on-surface-variant">{robot.robotCode}</p>
                </div>
              </div>
              <div className="border-t border-smb-outline-variant" />
              <DualBatteryIndicator
                batteryPct={robot.batteryPct}
                deviceBatteryPct={robot.deviceBatteryPct}
                deviceIsCharging={robot.deviceIsCharging}
                espBatteryPct={robot.espBatteryPct}
                espBatteryVolts={robot.espBatteryVolts}
                robotStatus={robot.status}
                variant="card"
              />
              <div className="border-t border-smb-outline-variant" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-xs text-smb-on-surface-variant">Trạng thái</dt>
                <dd className={`font-semibold ${robot.deviceIsCharging ? 'text-amber-600 dark:text-amber-400 flex items-center gap-1' : p.text}`}>
                  {robot.deviceIsCharging ? (
                    <>
                      <Icon name="bolt" className="text-[14px] text-amber-500 animate-pulse" />
                      Đang sạc (Điện thoại)
                    </>
                  ) : (
                    labelForStatus(robot.status)
                  )}
                </dd>
                <dt className="text-xs text-smb-on-surface-variant">Nhiệm vụ</dt>
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
                <dt className="text-xs text-smb-on-surface-variant">Chế độ</dt>
                <dd className="font-medium text-smb-on-surface">{robot.mode}</dd>
                <dt className="text-xs text-smb-on-surface-variant">IP</dt>
                <dd className="font-medium text-smb-on-surface tabular-nums">{robot.ipAddress ?? '—'}</dd>
                <dt className="text-xs text-smb-on-surface-variant">Tọa độ</dt>
                <dd className="font-medium text-smb-on-surface tabular-nums">
                  {typeof (pose?.x ?? pose?.xCoord) === 'number' && typeof (pose?.y ?? pose?.yCoord) === 'number'
                    ? `(${(pose.x ?? pose.xCoord).toFixed(2)}, ${(pose.y ?? pose.yCoord).toFixed(2)})`
                    : '—'}
                </dd>
                <dt className="text-xs text-smb-on-surface-variant">Hướng</dt>
                <dd className="font-medium text-smb-on-surface tabular-nums">
                  {typeof (pose?.headingDeg ?? pose?.headingYawDeg) === 'number'
                    ? `${(pose.headingDeg ?? pose.headingYawDeg).toFixed(1)}°`
                    : '—'}
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
/*  Tab 1 — Robot list                                                  */
/* -------------------------------------------------------------------- */

function RobotsTab({ robots = [], poses = {}, selectedRobotCode, onSelectRobot, onMissionDispatched }) {
  const [detailRobotCode, setDetailRobotCode] = useState(null)
  const [ctrlLoading, setCtrlLoading] = useState(false)
  const [ctrlMsg, setCtrlMsg] = useState(null)
  const [activeKey, setActiveKey] = useState(null)
  const [teleopSpeed, setTeleopSpeed] = useState(80)

  const selectedRobot = selectedRobotCode || (robots[0]?.robotCode ?? '')
  const selectedRobotObj = robots.find(
    (r) => r.robotCode === selectedRobot ||
      (selectedRobot === 'RB001' && r.robotCode === 'RB0001') ||
      (selectedRobot === 'RB0001' && r.robotCode === 'RB001')
  )

  // ─── Điều Khiển Lái Tay Trực Tiếp (MQTT Backend & ESP32) ───────────────────
  const moveIntervalRef = useRef(null)
  const isMovingRef = useRef(false)
  const teleopSpeedRef = useRef(80)
  teleopSpeedRef.current = teleopSpeed

  const sendRawCommand = useCallback((x, y, strafe = 0) => {
    if (!selectedRobot) return
    const payloadStr = JSON.stringify({ t: 'joy', x, y, s: strafe })
    publishRobotCommand({
      robotCode: selectedRobot,
      command: 'MANUAL_TELEOP',
      payload: payloadStr,
      commandType: 'MANUAL_TELEOP',
      payloadJson: payloadStr,
    }).catch(() => {})
  }, [selectedRobot])

  const startManualDrive = useCallback((direction, x, y, strafe = 0) => {
    if (!selectedRobot) return
    setActiveKey(direction)
    isMovingRef.current = true

    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current)
    }

    // Gửi lệnh đầu tiên ngay lập tức
    sendRawCommand(x, y, strafe)

    // Lặp gửi lại mỗi 140ms để nuôi Watchdog (>500ms) trên firmware ESP32 mượt mà
    moveIntervalRef.current = setInterval(() => {
      sendRawCommand(x, y, strafe)
    }, 140)
  }, [selectedRobot, sendRawCommand])

  const stopManualDrive = useCallback(() => {
    if (!selectedRobot && !isMovingRef.current) return
    setActiveKey(null)
    isMovingRef.current = false

    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current)
      moveIntervalRef.current = null
    }

    // Dừng motor ngay lập tức
    sendRawCommand(0, 0, 0)
    // Backup stop lần 2 sau 70ms đảm bảo nhận lệnh dừng
    setTimeout(() => {
      sendRawCommand(0, 0, 0)
    }, 70)
  }, [selectedRobot, sendRawCommand])

  // Lắng nghe phím mũi tên & WASD trên bàn phím
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua khi người dùng đang nhập liệu trong ô input / select / textarea
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return
      const spd = teleopSpeedRef.current || 80

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        if (e.repeat) return
        startManualDrive('forward', 0, spd, 0)
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        if (e.repeat) return
        startManualDrive('backward', 0, -spd, 0)
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        if (e.repeat) return
        startManualDrive('left', -spd, 0, 0)
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        if (e.repeat) return
        startManualDrive('right', spd, 0, 0)
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        stopManualDrive()
      }
    }

    const handleKeyUp = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 's', 'S', 'a', 'A', 'd', 'D', ' '].includes(e.key)) {
        stopManualDrive()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current)
      }
    }
  }, [selectedRobot, startManualDrive, stopManualDrive])

  const handleControl = async (action, label) => {
    if (!selectedRobot) return
    setCtrlLoading(true)
    setCtrlMsg(null)
    try {
      await action(selectedRobot)
      setCtrlMsg({ type: 'success', text: `✅ Đã gửi lệnh ${label} tới Robot ${selectedRobot}.` })
      toast.success(`Đã gửi lệnh ${label} tới Robot ${selectedRobot}`)
    } catch (e) {
      const err = e?.response?.data?.detail || e?.message || `Không gửi được ${label}.`
      setCtrlMsg({ type: 'error', text: `❌ ${err}` })
      toast.error(err)
    } finally {
      setCtrlLoading(false)
    }
  }

  const handleCancelMission = async () => {
    if (!selectedRobot) return
    if (!window.confirm(`Bạn có chắc muốn dừng nhiệm vụ của Robot ${selectedRobot}?`)) return
    setCtrlLoading(true)
    setCtrlMsg(null)
    try {
      await cancelRobotNavigation(selectedRobot)
      setCtrlMsg({ type: 'success', text: `⏹ Đã gửi lệnh DỪNG NHIỆM VỤ tới Robot ${selectedRobot}.` })
      toast.warn(`⏹ Đã gửi lệnh DỪNG NHIỆM VỤ tới Robot ${selectedRobot}`)
    } catch (e) {
      const err = `❌ Lỗi: ${e?.message}`
      setCtrlMsg({ type: 'error', text: err })
      toast.error(err)
    } finally {
      setCtrlLoading(false)
    }
  }

  const handleReturn = async (nodeId, destinationName) => {
    if (!selectedRobot) return
    setCtrlLoading(true)
    setCtrlMsg(null)
    try {
      const data = await dispatchAutonomous({
        robotCode: selectedRobot,
        flowType: 'return',
        nodeIds: [nodeId],
        floorId: 1,
      })
      const msg = `🚀 Robot đang quay về ${destinationName}.`
      setCtrlMsg({ type: 'success', text: msg })
      toast.info(msg)
      if (onMissionDispatched) {
        onMissionDispatched({
          ...data,
          flowType: 'return',
          status: 'NAVIGATING',
          currentWaypointIndex: 0,
        })
      }
    } catch (e) {
      const err = `❌ Lỗi phát lệnh: ${e?.response?.data?.detail || e?.message}`
      setCtrlMsg({ type: 'error', text: err })
      toast.error(err)
    } finally {
      setCtrlLoading(false)
    }
  }

  const handleCancelRobot = async (robotCode) => {
    try {
      await cancelRobotNavigation(robotCode)
      toast.warn(`Đã gửi lệnh dừng khẩn cấp cho Robot ${robotCode}`)
    } catch (e) {
      toast.error(`Lỗi khi dừng khẩn cấp: ${e.message}`)
    }
  }

  // ─── Quản lý Kết Nối Robot (Agent Server & Rosbridge WebSocket) ───────────
  const [rosWsUrl, setRosWsUrl] = useState(() => {
    return localStorage.getItem('globalSetting_rosWsUrl') || 'ws://snake.local:9090'
  })
  const [wsConnected, setWsConnected] = useState(false)
  const [wsConnecting, setWsConnecting] = useState(false)
  const [showWsConfig, setShowWsConfig] = useState(false)
  const [agentStatus, setAgentStatus] = useState('checking') // 'checking' | 'running' | 'starting' | 'stopped' | 'unreachable'
  const [agentMode, setAgentMode] = useState(null)
  const [bootLoading, setBootLoading] = useState(null) // 'slam' | 'amcl' | 'stop' | 'save' | null

  // Trích xuất Agent Server API URL từ WebSocket URL
  const getAgentApiUrl = (urlStr) => {
    try {
      const url = new URL((urlStr || 'ws://snake.local:9090').replace('ws://', 'http://'))
      return `http://${url.hostname}:5000/api/robot`
    } catch {
      return 'http://192.168.0.100:5000/api/robot'
    }
  }

  // Định kỳ kiểm tra trạng thái Agent Server trên Robot
  const checkAgentStatus = async () => {
    try {
      const apiUrl = getAgentApiUrl(rosWsUrl)
      const res = await fetch(`${apiUrl}/status`, { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      if (data.status === 'running') {
        setAgentStatus('running')
        setAgentMode(data.mode && data.mode !== 'unknown' ? data.mode : null)
      } else if (data.status === 'starting') {
        setAgentStatus('starting')
      } else {
        setAgentStatus('stopped')
        setAgentMode(null)
      }
    } catch {
      setAgentStatus('unreachable')
    }
  }

  useEffect(() => {
    checkAgentStatus()
    const timer = setInterval(checkAgentStatus, 4000)
    return () => clearInterval(timer)
  }, [rosWsUrl])

  // Khởi động ROS 2 OS (SLAM hoặc AMCL)
  const handleStartOS = async (mode) => {
    setBootLoading(mode)
    const apiUrl = getAgentApiUrl(rosWsUrl)
    try {
      if (mode === 'amcl') {
        // Đồng bộ Active Map nếu có
        try {
          const baseUrl = window.SMB_ENV?.BE_URL !== undefined ? window.SMB_ENV.BE_URL : 'http://localhost:5000'
          const token = localStorage.getItem('accessToken')
          const headers = { 'ngrok-skip-browser-warning': 'true' }
          if (token) headers['Authorization'] = 'Bearer ' + token

          const activeMapRes = await fetch(`${baseUrl}/api/v1/maps/active?floorId=1`, { headers })
          if (activeMapRes.ok) {
            const activeMapData = await activeMapRes.json()
            if (activeMapData?.floorplanImageUrl) {
              const yamlStr = `image: active_map.pgm\nresolution: ${activeMapData.resolution || 0.05}\norigin: [${activeMapData.originX || 0.0}, ${activeMapData.originY || 0.0}, ${activeMapData.originYaw || 0.0}]\nnegate: 0\noccupied_thresh: 0.65\nfree_thresh: 0.196\n`
              const yamlB64 = btoa(unescape(encodeURIComponent(yamlStr)))

              let imgUrl = activeMapData.floorplanImageUrl
              if (imgUrl.startsWith('/')) imgUrl = baseUrl + imgUrl

              const pgmB64 = await new Promise((resolve, reject) => {
                const img = new Image()
                img.crossOrigin = 'Anonymous'
                img.onload = () => {
                  const canvas = document.createElement('canvas')
                  canvas.width = img.width
                  canvas.height = img.height
                  const ctx = canvas.getContext('2d')
                  ctx.drawImage(img, 0, 0)
                  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                  const header = `P5\n${canvas.width} ${canvas.height}\n255\n`
                  const headerBytes = new TextEncoder().encode(header)
                  const pixelBytes = new Uint8Array(canvas.width * canvas.height)
                  for (let i = 0; i < pixelBytes.length; i++) {
                    const r = imgData.data[i * 4]
                    const g = imgData.data[i * 4 + 1]
                    const b = imgData.data[i * 4 + 2]
                    pixelBytes[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
                  }
                  const pgmBuffer = new Uint8Array(headerBytes.length + pixelBytes.length)
                  pgmBuffer.set(headerBytes, 0)
                  pgmBuffer.set(pixelBytes, headerBytes.length)
                  let binaryString = ''
                  const chunkSize = 8192
                  for (let i = 0; i < pgmBuffer.length; i += chunkSize) {
                    binaryString += String.fromCharCode.apply(null, pgmBuffer.subarray(i, i + chunkSize))
                  }
                  resolve(btoa(binaryString))
                }
                img.onerror = () => reject(new Error('Failed to load map image'))
                fetch(imgUrl)
                  .then(r => r.blob())
                  .then(b => { img.src = URL.createObjectURL(b) })
                  .catch(() => { img.src = imgUrl })
              })

              await fetch(`${apiUrl}/upload_map`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ yaml_b64: yamlB64, pgm_b64: pgmB64 })
              })
            }
          }
        } catch (syncErr) {
          console.warn('Map sync failed, proceeding with robot default map:', syncErr)
        }
      }

      const res = await fetch(`${apiUrl}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(`Khởi động thất bại: ${data.error}`)
      } else {
        toast.success(`Đã kích hoạt chế độ: ${mode === 'amcl' ? 'Dẫn Đường Tự Hành (AMCL)' : 'Quét Bản Đồ Mới (SLAM)'}`)
        setTimeout(checkAgentStatus, 2000)
      }
    } catch (e) {
      toast.error(`Không thể kết nối đến Agent Server: ${e.message}`)
    } finally {
      setBootLoading(null)
    }
  }

  // Dừng ROS 2 OS
  const handleStopOS = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn DỪNG HOẠT ĐỘNG hệ thống ROS 2 trên Robot?')) return
    setBootLoading('stop')
    const apiUrl = getAgentApiUrl(rosWsUrl)
    try {
      await fetch(`${apiUrl}/stop`, { method: 'POST' })
      toast.warn('Đã gửi lệnh Dừng Hoạt Động tới Robot.')
      setTimeout(checkAgentStatus, 1500)
    } catch (e) {
      toast.error(`Lỗi khi dừng ROS 2: ${e.message}`)
    } finally {
      setBootLoading(null)
    }
  }

  // Lưu bản đồ SLAM
  const handleSaveMap = async () => {
    setBootLoading('save')
    const apiUrl = getAgentApiUrl(rosWsUrl)
    try {
      const res = await fetch(`${apiUrl}/save_map`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        toast.error(`Lỗi lưu bản đồ: ${data.error}`)
      } else {
        if (data.yaml_b64 && data.pgm_b64) {
          const aYaml = document.createElement('a')
          aYaml.href = 'data:text/yaml;base64,' + data.yaml_b64
          aYaml.download = 'active_map.yaml'
          aYaml.click()
          const aPgm = document.createElement('a')
          aPgm.href = 'data:image/x-portable-graymap;base64,' + data.pgm_b64
          aPgm.download = 'active_map.pgm'
          aPgm.click()
        }
        toast.success(`Đã lưu bản đồ thành công: ${data.message || 'Bản đồ đã cập nhật'}`)
      }
    } catch (e) {
      toast.error(`Không thể kết nối với Agent Server để lưu bản đồ: ${e.message}`)
    } finally {
      setBootLoading(null)
    }
  }

  // Quản lý WebSocket Rosbridge
  const handleToggleWs = () => {
    if (wsConnected) {
      if (window._rosInstance) {
        window._rosInstance.close()
        window._rosInstance = null
      }
      setWsConnected(false)
      toast.info('Đã ngắt kết nối cổng WebSocket.')
      return
    }

    setWsConnecting(true)
    localStorage.setItem('globalSetting_rosWsUrl', rosWsUrl)
    try {
      const ws = new WebSocket(rosWsUrl)
      ws.onopen = () => {
        setWsConnected(true)
        setWsConnecting(false)
        window._rosInstance = ws
        toast.success(`Đã kết nối thành công tới ${rosWsUrl}`)
      }
      ws.onerror = () => {
        setWsConnected(false)
        setWsConnecting(false)
        toast.error(`Không thể kết nối tới ${rosWsUrl}`)
      }
      ws.onclose = () => {
        setWsConnected(false)
        setWsConnecting(false)
      }
    } catch (e) {
      setWsConnected(false)
      setWsConnecting(false)
      toast.error(`Lỗi WebSocket: ${e.message}`)
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
        {/* ── 1. KHỐI KẾT NỐI, TRẠNG THÁI PIN, CẢNH BÁO SẠC VÀ 6 NÚT CAN THIỆP ROBOT ── */}
        <div className="p-3.5 space-y-3 border-b border-smb-outline-variant/60 bg-smb-surface-container-low/30">
          {/* 1. KẾT NỐI & CHẾ ĐỘ VẬN HÀNH (Màu nền sáng đồng bộ, Kích hoạt dẫn đường & Kết nối Robot) */}
          <div className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container p-3.5 space-y-3 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-smb-on-surface flex items-center gap-1.5">
                  1. KẾT NỐI & DẪN ĐƯỜNG ROBOT
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-smb-surface-container-high text-smb-on-surface-variant border border-smb-outline-variant/60">
                  {selectedRobot}
                </span>
              </div>
              <p className="text-[11px] text-smb-on-surface-variant mt-1">
                Kích hoạt chế độ dẫn đường tự hành và kết nối điều khiển robot.
              </p>
            </div>

            {/* 2 Nút: Kích Hoạt Dẫn Đường & Dừng Dẫn Đường */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleStartOS('amcl')}
                disabled={bootLoading !== null}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-center text-xs font-bold text-white shadow-xs transition-all active:scale-95 ${
                  agentStatus === 'running' && agentMode === 'amcl'
                    ? 'bg-emerald-700 ring-2 ring-emerald-400'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                } disabled:opacity-50`}
                title="Kích hoạt chế độ dẫn đường tự hành cho Robot"
              >
                <span>🧭</span>
                <span>{bootLoading === 'amcl' ? 'Đang bật...' : 'Kích Hoạt Dẫn Đường'}</span>
              </button>

              <button
                type="button"
                onClick={handleStopOS}
                disabled={bootLoading !== null}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 px-2 text-center text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
                title="Dừng toàn bộ hệ thống dẫn đường của Robot"
              >
                <span>🛑</span>
                <span>{bootLoading === 'stop' ? 'Đang dừng...' : 'Dừng Dẫn Đường'}</span>
              </button>
            </div>

            {/* Nút Kích Hoạt Kết Nối Robot (Ẩn địa chỉ ws://snake.local:9090 mặc định) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-smb-on-surface-variant">
                  Cổng giao tiếp thông tin với Robot:
                </span>
                <button
                  type="button"
                  onClick={() => setShowWsConfig(!showWsConfig)}
                  className="text-[10px] text-smb-on-surface-variant/80 hover:text-smb-primary transition-colors flex items-center gap-0.5"
                  title="Cấu hình IP/Port kết nối nếu cần"
                >
                  <Icon name="settings" className="text-[11px]" />
                  <span>{showWsConfig ? 'Thu gọn' : 'Đổi IP'}</span>
                </button>
              </div>

              {showWsConfig && (
                <input
                  type="text"
                  value={rosWsUrl}
                  onChange={(e) => setRosWsUrl(e.target.value)}
                  placeholder="ws://snake.local:9090"
                  className="w-full rounded-lg bg-smb-surface-container-high border border-smb-outline-variant px-3 py-1.5 text-xs font-mono text-smb-on-surface placeholder-smb-on-surface-variant/50 outline-none focus:border-smb-primary mb-1.5"
                />
              )}

              <button
                type="button"
                onClick={handleToggleWs}
                disabled={wsConnecting}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs active:scale-98 ${
                  wsConnected
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } disabled:opacity-50`}
              >
                <Icon name={wsConnecting ? 'sync' : wsConnected ? 'link_off' : 'wifi'} className={`text-[16px] ${wsConnecting ? 'animate-spin' : ''}`} />
                <span>
                  {wsConnecting
                    ? 'Đang kích hoạt kết nối...'
                    : wsConnected
                      ? 'Ngắt Kết Nối Robot'
                      : 'Kích Hoạt Kết Nối Robot'}
                </span>
              </button>
            </div>

            {/* Bảng Hiển Thị Trạng Thái (Hệ thống Robot & Cổng điều khiển) */}
            <div className="pt-2 border-t border-smb-outline-variant/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-smb-on-surface-variant">Hệ thống Robot:</span>
                <span className="font-semibold text-right">
                  {agentStatus === 'running' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 justify-end">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Đang hoạt động {agentMode ? `[${agentMode === 'amcl' ? 'Dẫn Đường' : 'Quét Map'}]` : ''}
                    </span>
                  ) : agentStatus === 'starting' ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Đang khởi động...</span>
                  ) : agentStatus === 'stopped' ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold">Đã Dừng</span>
                  ) : (
                    <span className="text-smb-on-surface-variant">Ngoại tuyến (Unreachable)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-smb-on-surface-variant">Cổng điều khiển:</span>
                <span className="font-semibold">
                  {wsConnected ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      Đã kết nối
                    </span>
                  ) : wsConnecting ? (
                    <span className="text-amber-600 dark:text-amber-400">Đang kết nối...</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400">Chưa kết nối</span>
                  )}
                </span>
              </div>
            </div>

            {/* Liên kết mở nhanh màn hình phụ ROS Tool / Camera AI */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-smb-outline-variant/60">
              <a
                href="/ros-ai-monitor.html"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-smb-surface-container-high hover:bg-smb-surface-container-highest py-1.5 px-2 text-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-smb-outline-variant/60 transition-all"
                title="Mở màn hình Camera AI Kệ hàng"
              >
                <Icon name="videocam" className="text-[14px]" />
                Camera AI Kệ
              </a>
              <a
                href="/ros-test.html"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-smb-surface-container-high hover:bg-smb-surface-container-highest py-1.5 px-2 text-center text-[11px] font-medium text-smb-on-surface-variant border border-smb-outline-variant/60 transition-all"
                title="Mở bảng vận hành ROS 2 chi tiết"
              >
                <Icon name="terminal" className="text-[14px]" />
                Bảng Vận Hành ROS
              </a>
            </div>
          </div>

          {/* Dual-Battery System Indicator (Khối Pin Tổng & Tablet & Động Cơ) */}
          {selectedRobotObj && (
            <DualBatteryIndicator
              batteryPct={selectedRobotObj.batteryPct}
              deviceBatteryPct={selectedRobotObj.deviceBatteryPct}
              deviceIsCharging={selectedRobotObj.deviceIsCharging}
              espBatteryPct={selectedRobotObj.espBatteryPct}
              espBatteryVolts={selectedRobotObj.espBatteryVolts}
              robotStatus={selectedRobotObj.status}
              variant="card"
            />
          )}

          {/* Robot Charging Safety Notice (Cảnh báo đang cắm sạc) */}
          {(selectedRobotObj?.deviceIsCharging || selectedRobotObj?.status === 'Offline_Charging' || selectedRobotObj?.status === 'Charging') && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 flex items-center gap-2.5 shadow-xs">
              <Icon name="bolt" className="text-[22px] text-amber-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Robot đang cắm sạc pin ({selectedRobotObj.deviceBatteryPct ?? selectedRobotObj.batteryPct}%)</span>
                <p className="text-[11px] opacity-90 mt-0.5">Vui lòng rút dây sạc ra khỏi thiết bị trước khi phát lệnh điều hướng robot di chuyển.</p>
              </div>
            </div>
          )}

          {/* Cụm 6 Nút Điều Khiển & Can Thiệp Khẩn Cấp */}
          <div className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-smb-on-surface">
                Can thiệp & Điều khiển khẩn cấp
              </span>
              <span className="text-[10px] text-smb-on-surface-variant font-mono font-bold">
                {selectedRobot}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={ctrlLoading || !selectedRobot}
                onClick={() => handleControl(pauseRobotNavigation, 'TẠM DỪNG')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="pause" className="text-[16px]" />
                Tạm dừng
              </button>
              <button
                type="button"
                disabled={ctrlLoading || !selectedRobot}
                onClick={() => handleControl(resumeRobotNavigation, 'TIẾP TỤC')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="play_arrow" className="text-[16px]" />
                Tiếp tục
              </button>
              <button
                type="button"
                disabled={ctrlLoading || !selectedRobot}
                onClick={handleCancelMission}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="stop" className="text-[16px]" />
                Dừng nhiệm vụ
              </button>
              <button
                type="button"
                disabled={ctrlLoading || !selectedRobot}
                onClick={() => handleControl(emergencyStopRobot, 'E-STOP')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-950 hover:bg-red-900 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="e911_emergency" className="text-[16px]" />
                E-STOP
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                disabled={ctrlLoading || !selectedRobot}
                onClick={() => handleReturn(10029, 'Trạm Sạc (WP7)')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="ev_station" className="text-[16px]" />
                Về Trạm Sạc (WP7)
              </button>
              <button
                type="button"
                disabled={ctrlLoading || !selectedRobot}
                onClick={() => handleReturn(10033, 'Vị Trí Gốc (WP8)')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="flag" className="text-[16px]" />
                Về Vị Trí Gốc (WP8)
              </button>
            </div>

            <StatusBadge msg={ctrlMsg} />
          </div>
        </div>

          {/* ── 2. ĐIỀU KHIỂN LÁI TAY ROBOT (D-PAD & BÀN PHÍM) ── */}
          <div className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-smb-on-surface flex items-center gap-1.5">
                <Icon name="sports_esports" className="text-[16px] text-indigo-500" />
                Điều khiển lái tay (Lên / Xuống / Trái / Phải)
              </span>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {activeKey ? `Phím: ${activeKey.toUpperCase()}` : 'Phím mũi tên / WASD'}
              </span>
            </div>

            {/* Tốc độ lái tay selector */}
            <div className="flex items-center justify-between px-1 py-0.5">
              <span className="text-[11px] font-semibold text-smb-on-surface-variant flex items-center gap-1">
                <Icon name="speed" className="text-[14px] text-indigo-500" />
                Tốc độ motor:
              </span>
              <div className="flex items-center gap-1 bg-smb-surface-container-lowest p-1 rounded-lg border border-smb-outline-variant/50">
                {[
                  { label: 'Chậm (40%)', val: 40 },
                  { label: 'Vừa (70%)', val: 70 },
                  { label: 'Nhanh (100%)', val: 100 },
                ].map((lvl) => (
                  <button
                    key={lvl.val}
                    type="button"
                    onClick={() => setTeleopSpeed(lvl.val)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      teleopSpeed === lvl.val
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-smb-on-surface hover:bg-indigo-500/10'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* D-Pad Buttons */}
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              {/* Nút Tiến */}
              <button
                type="button"
                disabled={!selectedRobot}
                onMouseDown={() => startManualDrive('forward', 0, teleopSpeed, 0)}
                onMouseUp={stopManualDrive}
                onMouseLeave={stopManualDrive}
                onTouchStart={(e) => { e.preventDefault(); startManualDrive('forward', 0, teleopSpeed, 0) }}
                onTouchEnd={stopManualDrive}
                onTouchCancel={stopManualDrive}
                className={`flex size-14 items-center justify-center rounded-2xl transition-all shadow-md active:scale-90 ${
                  activeKey === 'forward'
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/40 scale-95'
                    : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-indigo-500/15 hover:text-indigo-600 border-2 border-smb-outline-variant'
                }`}
                title="Tiến lên (Mũi tên Lên / Phím W)"
              >
                <Icon name="arrow_upward" className="text-[26px]" />
              </button>

              {/* Hàng ngang: Trái - Dừng - Phải */}
              <div className="flex items-center justify-center gap-2">
                {/* Nút Rẽ Trái */}
                <button
                  type="button"
                  disabled={!selectedRobot}
                  onMouseDown={() => startManualDrive('left', -teleopSpeed, 0, 0)}
                  onMouseUp={stopManualDrive}
                  onMouseLeave={stopManualDrive}
                  onTouchStart={(e) => { e.preventDefault(); startManualDrive('left', -teleopSpeed, 0, 0) }}
                  onTouchEnd={stopManualDrive}
                  onTouchCancel={stopManualDrive}
                  className={`flex size-14 items-center justify-center rounded-2xl transition-all shadow-md active:scale-90 ${
                    activeKey === 'left'
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/40 scale-95'
                      : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-indigo-500/15 hover:text-indigo-600 border-2 border-smb-outline-variant'
                  }`}
                  title="Quay trái (Mũi tên Trái / Phím A)"
                >
                  <Icon name="arrow_back" className="text-[26px]" />
                </button>

                {/* Nút Dừng Trung Tâm */}
                <button
                  type="button"
                  disabled={!selectedRobot}
                  onClick={stopManualDrive}
                  className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 hover:bg-rose-500 hover:text-white border-2 border-rose-400/40 shadow-md transition-all active:scale-90"
                  title="Dừng khẩn cấp / Dừng lại (Phím Space)"
                >
                  <Icon name="pan_tool" className="text-[22px]" />
                </button>

                {/* Nút Rẽ Phải */}
                <button
                  type="button"
                  disabled={!selectedRobot}
                  onMouseDown={() => startManualDrive('right', teleopSpeed, 0, 0)}
                  onMouseUp={stopManualDrive}
                  onMouseLeave={stopManualDrive}
                  onTouchStart={(e) => { e.preventDefault(); startManualDrive('right', teleopSpeed, 0, 0) }}
                  onTouchEnd={stopManualDrive}
                  onTouchCancel={stopManualDrive}
                  className={`flex size-14 items-center justify-center rounded-2xl transition-all shadow-md active:scale-90 ${
                    activeKey === 'right'
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/40 scale-95'
                      : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-indigo-500/15 hover:text-indigo-600 border-2 border-smb-outline-variant'
                  }`}
                  title="Quay phải (Mũi tên Phải / Phím D)"
                >
                  <Icon name="arrow_forward" className="text-[26px]" />
                </button>
              </div>

              {/* Nút Lùi */}
              <button
                type="button"
                disabled={!selectedRobot}
                onMouseDown={() => startManualDrive('backward', 0, -teleopSpeed, 0)}
                onMouseUp={stopManualDrive}
                onMouseLeave={stopManualDrive}
                onTouchStart={(e) => { e.preventDefault(); startManualDrive('backward', 0, -teleopSpeed, 0) }}
                onTouchEnd={stopManualDrive}
                onTouchCancel={stopManualDrive}
                className={`flex size-14 items-center justify-center rounded-2xl transition-all shadow-md active:scale-90 ${
                  activeKey === 'backward'
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/40 scale-95'
                    : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-indigo-500/15 hover:text-indigo-600 border-2 border-smb-outline-variant'
                }`}
                title="Lùi lại (Mũi tên Xuống / Phím S)"
              >
                <Icon name="arrow_downward" className="text-[26px]" />
              </button>
            </div>

            <div className="rounded-lg bg-smb-surface-container-lowest/80 p-2 text-center text-[10px] text-smb-on-surface-variant leading-relaxed border border-smb-outline-variant/40">
              💡 <b>Mẹo:</b> Nhấp giữ nút chuột hoặc dùng các <b>phím mũi tên (↑ ↓ ← →)</b> hoặc <b>W, A, S, D</b> trên bàn phím để điều khiển xe trực tiếp. Phím <b>Space</b> để dừng.
            </div>
          </div>
      </div>

      <RobotDetailModal robotCode={detailRobotCode} onClose={() => setDetailRobotCode(null)} />
    </>
  )
}


export default RobotAssignmentPanel
