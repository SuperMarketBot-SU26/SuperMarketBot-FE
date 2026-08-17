import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { statusPalette } from '../utils/robotHelpers'
import {
  getRoute,
  createRoute,
} from '../api/robotRoutesApi'
import { getRobot, getRobotPose } from '../api/robotApi'
import { getZones as fetchZones } from '../api/zonesApi'

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
 *   • Tab 1 — "Gán lộ trình"   : route-centric. Lists every route; lets the
 *                                 operator preview its polyline on the map and
 *                                 create a new route (dropdowns for Map/Zone,
 *                                 chip-based ordered node picker).
 *   • Tab 2 — "Robot"          : list of robots, click to select.
 *
 * Route↔robot assignment is not wired because the BE doesn't expose
 * `POST /v1/routes/{id}/assign`. Once that endpoint lands, reintroduce the
 * assign UI; until then this panel stays read-only for the assignment side.
 */
export function RobotAssignmentPanel({
  robots = [],
  poses = {},
  routes = [],
  map = null,
  selectedRobotCode = null,
  onSelectRobot,
  onPreviewRoute,
  onRouteCreated,
}) {
  const [tab, setTab] = useState('assign') // land on the action page by default
  const [selectedRouteForExecution, setSelectedRouteForExecution] = useState(null)

  // Switch to the "Robot" tab automatically the first time a robot gets picked
  // from the map (so the operator sees context for which one they clicked).
  useEffect(() => {
    if (selectedRobotCode) setTab('robots')
  }, [selectedRobotCode])

  return (
    <div className="flex h-full flex-col rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
      <Tabs value={tab} onChange={setTab} />
      {/* Tab content — flex-1 min-h-0 so scroll works */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {tab === 'assign' ? (
          <AssignTab
            robots={robots}
            routes={routes}
            map={map}
            onPreviewRoute={onPreviewRoute}
            onRouteCreated={onRouteCreated}
            onSelectForExecution={(route) => {
              setSelectedRouteForExecution(route)
              setTab('autonomous')
            }}
          />
        ) : tab === 'autonomous' ? (
          <AutonomousTab 
            robots={robots} 
            routes={routes} 
            map={map} 
            defaultRoute={selectedRouteForExecution} 
            selectedRobotCode={selectedRobotCode}
            onSelectRobot={onSelectRobot}
          />
        ) : (
          <RobotsTab
            robots={robots}
            poses={poses}
            selectedRobotCode={selectedRobotCode}
            onSelectRobot={onSelectRobot}
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
              <span className="flex-1 font-bold text-smb-primary-container truncate" title={wp.nodeName || `Node #${wp.nodeId}`}>
                {wp.nodeName || `Kệ hàng (Node #${wp.nodeId})`}
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

function AutonomousTab({ robots = [], routes = [], map, defaultRoute, selectedRobotCode, onSelectRobot }) {
  const selectedRobot = selectedRobotCode || ''
  const setSelectedRobot = (code) => {
    const robot = robots.find(r => r.robotCode === code)
    if (robot && onSelectRobot) onSelectRobot(robot)
  }

  const [selectedPatrolRoute, setSelectedPatrolRoute] = useState('')
  const [patrolMode, setPatrolMode] = useState('route') // 'route' | 'shelf'
  const [shelves, setShelves] = useState([])
  const [selectedNodeIds, setSelectedNodeIds] = useState([])

  useEffect(() => {
    getShelves().then(setShelves).catch(() => {})
  }, [])

  const validShelves = useMemo(() => shelves.filter(s => s.nodeId != null), [shelves])


  // Dwell & Duration settings
  const [adDwell, setAdDwell] = useState(20) // default 20s for shelf
  const [adDuration, setAdDuration] = useState('') // optional total duration in minutes

  const [adMsg, setAdMsg]         = useState(null)
  const [adWaypoints, setAdWaypoints] = useState(null)
  const [patrolMsg, setPatrolMsg] = useState(null)
  const [patrolWaypoints, setPatrolWaypoints] = useState(null)
  const [estopMsg, setEstopMsg]   = useState(null)
  const [readiness, setReadiness] = useState(null)
  
  const [missionState, setMissionState] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')

  const [dispatching, setDispatching] = useState(false)

  useEffect(() => {
    getActiveCampaigns().then(setCampaigns).catch(() => {})
  }, [])

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
        // fail silently
      }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [selectedRobot])

  // Auto-select the first robot when the list first loads
  useEffect(() => {
    if (robots.length > 0 && !selectedRobot) {
      setSelectedRobot(robots[0].robotCode)
    }
  }, [robots, selectedRobot])

  // Auto-select route when navigating from AssignTab
  useEffect(() => {
    if (defaultRoute) {
      if (defaultRoute.routeType?.toLowerCase().includes('ad')) {
         // Defaulting to ad campaign 
      } else {
         setSelectedPatrolRoute(String(defaultRoute.robotRouteId))
      }
      if (defaultRoute.robotId) {
         const matchedRobot = robots.find(r => r.robotId === defaultRoute.robotId)
         if (matchedRobot) setSelectedRobot(matchedRobot.robotCode)
      }
    }
  }, [defaultRoute, robots])

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

    } catch (e) {
      const err = `❌ ${e?.response?.data?.detail || e?.response?.data?.title || e?.response?.data?.message || e?.message || 'Lỗi phát lệnh'}`
      if (flowType === 'ad')      setAdMsg({ type: 'error', text: err })
      if (flowType === 'patrol')  setPatrolMsg({ type: 'error', text: err })
    } finally {
      setDispatching(false)
    }
  }

  const handleControl = async (action, label) => {
    setDispatching(true)
    setEstopMsg(null)
    try {
      await action(selectedRobot)
      setEstopMsg({ type: 'success', text: `Đã gửi lệnh ${label} tới ${selectedRobot}.` })
    } catch (e) {
      setEstopMsg({ type: 'error', text: e?.response?.data?.detail || e?.message || `Không gửi được ${label}.` })
    } finally {
      setDispatching(false)
    }
  }

  const handleCancel = async () => {
    setDispatching(true)
    setEstopMsg(null)
    try {
      await cancelRobotNavigation(selectedRobot)
      setEstopMsg({ type: 'success', text: `⏹ Đã gửi lệnh DỪNG NHIỆM VỤ tới Robot ${selectedRobot}.` })

    } catch (e) {
      setEstopMsg({ type: 'error', text: `❌ Lỗi: ${e?.message}` })
    } finally {
      setDispatching(false)
    }
  }

  const campaignOptions = [
    { value: '', label: '— Không gắn chiến dịch (Quảng cáo tự do toàn siêu thị) —' },
    ...campaigns.map((c) => ({ value: String(c.campaignId), label: c.campaignName || `#${c.campaignId}` })),
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 text-xs">
      {/* Robot selector */}
      <div className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container p-3.5">
        <label className="mb-2 block font-bold text-smb-on-surface text-[11px] uppercase tracking-wider">Robot thực thi</label>
        <select
          value={selectedRobot}
          onChange={(e) => setSelectedRobot(e.target.value)}
          className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none focus:border-smb-primary"
        >
          {robots.length === 0 ? (
            <option value="">Chưa có robot (Nhấn F5 để thử lại)</option>
          ) : (
            robots.map((r) => (
              <option key={r.robotCode} value={r.robotCode}>
                {r.robotName || r.robotCode} · {r.status} · {r.batteryPct ?? '?'}%
              </option>
            ))
          )}
        </select>
      </div>

      {missionState && missionState.status !== 'COMPLETED' && missionState.waypoints?.length > 0 && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 mb-2 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-center mb-2 relative z-10">
              <div className="flex items-center gap-2">
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                 </span>
                 <span className="font-bold text-indigo-700 text-[11px] uppercase tracking-wider">Nhiệm vụ hiện tại</span>
              </div>
              <span className="rounded-full bg-indigo-500 text-white px-2 py-0.5 text-[10px] font-bold">
                 {missionState.flowType?.toUpperCase()}
              </span>
           </div>
           <div className="relative z-10 flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                 <span className="text-indigo-800/70 font-medium">Trạng thái:</span>
                 <span className="font-bold text-indigo-700">{missionState.status}</span>
              </div>
              <div className="flex justify-between text-xs">
                 <span className="text-indigo-800/70 font-medium">Waypoint:</span>
                 <span className="font-bold text-indigo-700">
                    {missionState.currentWaypointIndex + 1} / {missionState.waypoints.length}
                 </span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-2">
                 <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, ((missionState.currentWaypointIndex + 1) / missionState.waypoints.length) * 100)}%` }}></div>
              </div>
           </div>
        </div>
      )}

      {/* 3 Flow Cards */}
      <div className="flex flex-col gap-4">
        {/* Flow 1: Quảng Cáo */}
        <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-50/30 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-orange-500/15">
                <Icon name="campaign" className="text-[18px] text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-orange-700 dark:text-orange-400">Flow Quảng Cáo</p>
                <p className="text-[10px] text-orange-600/70">Quảng cáo theo Chiến dịch hoặc Toàn siêu thị</p>
              </div>
            </div>
            <span className="rounded-full bg-orange-500/20 px-2.5 py-1 text-[10px] font-bold text-orange-700">Linh hoạt</span>
          </div>

          {/* Campaign Selector */}
          <div className="mb-3 space-y-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-orange-700/70">
              Chiến dịch (Campaign)
            </label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full rounded-xl border border-orange-500/40 bg-smb-surface-container-lowest px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none focus:border-orange-500"
            >
              {campaignOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Dwell Time & Duration Setting */}
          <div className="mb-3 space-y-2.5 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-orange-700/70">
                Dừng tại mỗi kệ (Dwell Time)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={adDwell}
                  onChange={(e) => setAdDwell(Number(e.target.value))}
                  className="w-20 rounded-lg border border-orange-500/40 bg-smb-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-smb-on-surface outline-none focus:border-orange-500"
                />
                <span className="text-[11px] text-orange-700/80">giây / kệ (để phát video & TTS)</span>
              </div>
            </div>

            {!selectedCampaign && (
              <div className="border-t border-orange-500/15 pt-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-orange-700/70">
                  Tổng thời gian di chuyển (Hẹn giờ lặp lại)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    placeholder="Tùy chọn"
                    value={adDuration}
                    onChange={(e) => setAdDuration(e.target.value)}
                    className="w-24 rounded-lg border border-orange-500/40 bg-smb-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-smb-on-surface outline-none focus:border-orange-500"
                  />
                  <span className="text-[11px] text-orange-700/80">phút (để trống = đi 1 vòng toàn bộ kệ)</span>
                </div>
              </div>
            )}
          </div>

          <button
            disabled={dispatching}
            onClick={() => {
              handleDispatch('ad', {
                campaignId: selectedCampaign ? Number(selectedCampaign) : null,
                fullZoneMap: !selectedCampaign,
                durationMinutes: adDuration ? Number(adDuration) : null,
                dwellTimeSeconds: adDwell ? Number(adDwell) : 20,
                isLooping: !!adDuration,
              })
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:from-orange-700 hover:to-orange-600 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="play_arrow" className="text-[16px]" />}
            {selectedCampaign ? 'Phát Lệnh Quảng Cáo Theo Chiến Dịch' : 'Phát Lệnh Quảng Cáo Tự Do (Toàn Siêu Thị)'}
          </button>

          <StatusBadge msg={adMsg} />
          <WaypointList waypoints={adWaypoints} />
        </div>

        {/* Flow 2: Tuần Tra */}
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-50/30 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/15">
                <Icon name="shield" className="text-[18px] text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-blue-700 dark:text-blue-400">Flow Tuần Tra Kệ Hàng</p>
                <p className="text-[10px] text-blue-600/70">Robot chụp ảnh kệ → Gemini AI phân tích mật độ</p>
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-500/20">
                  🔍 AI Vision Scan: Chụp ảnh & Phân tích kệ hàng
                </div>
              </div>
            </div>
            <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-bold text-blue-700">AI Vision</span>
          </div>

          {/* Patrol Mode Segmented Buttons */}
          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-blue-500/10 p-1">
            <button
              type="button"
              onClick={() => setPatrolMode('route')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                patrolMode === 'route'
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-blue-950 dark:text-blue-300'
                  : 'text-blue-700/70 hover:text-blue-800'
              }`}
            >
              <Icon name="route" className="text-[14px]" />
              Theo Route
            </button>
            <button
              type="button"
              onClick={() => setPatrolMode('shelf')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                patrolMode === 'shelf'
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-blue-950 dark:text-blue-300'
                  : 'text-blue-700/70 hover:text-blue-800'
              }`}
            >
              <Icon name="format_list_bulleted" className="text-[14px]" />
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
                  onClick={() => handleDispatch('patrol', { robotRouteId: Number(activePatrolRoute) })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="search" className="text-[16px]" />}
                  Phát lệnh tuần tra
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-blue-700/70">
                  Danh sách kệ (Đã chọn: {selectedNodeIds.length}/{validShelves.length} kệ)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedNodeIds.length === validShelves.length) {
                      setSelectedNodeIds([])
                    } else {
                      setSelectedNodeIds(validShelves.map(s => s.nodeId))
                    }
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {selectedNodeIds.length === validShelves.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              </div>
              <div className="mb-3 max-h-[300px] overflow-y-auto rounded-xl border border-blue-500/20 bg-smb-surface-container-lowest p-1.5">
                {validShelves.map((shelf) => {
                  const isSelected = selectedNodeIds.includes(shelf.nodeId)
                  return (
                    <label
                      key={shelf.shelfId}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-blue-50/50 ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded accent-blue-600"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNodeIds(prev => [...prev, shelf.nodeId])
                          } else {
                            setSelectedNodeIds(prev => prev.filter(id => id !== shelf.nodeId))
                          }
                        }}
                      />
                      <Icon name="shelves" className="text-[16px] text-blue-600/70" />
                      <div className="flex-1 text-xs">
                        <span className="font-semibold text-smb-on-surface">{shelf.shelfName}</span>
                        {shelf.aisleName && (
                          <span className="ml-1 text-[10px] text-smb-on-surface-variant">
                            ({shelf.aisleName})
                          </span>
                        )}
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
                  disabled={dispatching || selectedNodeIds.length === 0}
                  onClick={() => handleDispatch('patrol', { nodeIds: selectedNodeIds })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : null}
                  🚀 Tuần tra kệ đã chọn
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

      <div className="grid grid-cols-2 gap-2">
        <button disabled={dispatching} onClick={() => handleControl(pauseRobotNavigation, 'TẠM DỪNG')} className="rounded-xl bg-amber-500 py-2.5 font-bold text-white disabled:opacity-50">⏸ Tạm dừng</button>
        <button disabled={dispatching} onClick={() => handleControl(resumeRobotNavigation, 'TIẾP TỤC')} className="rounded-xl bg-emerald-600 py-2.5 font-bold text-white disabled:opacity-50">▶ Tiếp tục</button>
        <button disabled={dispatching} onClick={handleCancel} className="rounded-xl bg-rose-600 py-2.5 font-bold text-white disabled:opacity-50">⏹ Dừng nhiệm vụ</button>
        <button disabled={dispatching} onClick={() => handleControl(emergencyStopRobot, 'E-STOP')} className="rounded-xl bg-red-950 py-2.5 font-bold text-white disabled:opacity-50">🚨 E-STOP</button>
        <button disabled={dispatching} onClick={() => handleDispatch('return', { nodeIds: [10023], floorId: 1 })} className="col-span-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 font-bold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50">🏠 Về Trạm Sạc (WP7)</button>
      </div>
      <StatusBadge msg={estopMsg} />

    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  Tabs                                                                */
/* -------------------------------------------------------------------- */

function Tabs({ value, onChange }) {
  const items = [
    { id: 'assign', label: 'Gán Lộ Trình', icon: 'route' },
    { id: 'autonomous', label: 'Flow Tự Hành', icon: 'smart_toy' },
    { id: 'robots', label: 'Đội Robot', icon: 'precision_manufacturing' },
  ]
  return (
    <div className="p-2 border-b border-smb-outline-variant/60 bg-smb-surface-container-low/50">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-smb-surface-container-high/60 p-1">
        {items.map((it) => {
          const active = value === it.id
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all duration-150 active:scale-95 ${
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 smb-fade-in">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-2xl smb-pop-in">
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
/*  Tab 1 — Robot list                                                  */
/* -------------------------------------------------------------------- */

function RobotsTab({ robots = [], poses = {}, selectedRobotCode, onSelectRobot }) {
  const [detailRobotCode, setDetailRobotCode] = useState(null)
  
  const handleCancelRobot = async (robotCode) => {
    try {
      await cancelRobotNavigation(robotCode)
      alert(`Đã gửi lệnh dừng khẩn cấp cho Robot ${robotCode}`)
    } catch (e) {
      alert(`Lỗi khi dừng khẩn cấp: ${e.message}`)
    }
  }

  const summary = useMemo(() => {
    const acc = { Moving: 0, Idle: 0, Interacting: 0, Offline_Charging: 0, Power_Off: 0 }
    robots.forEach((r) => { acc[r.status] = (acc[r.status] ?? 0) + 1 })
    return acc
  }, [robots])

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="p-4">
          <h3 className="text-sm font-semibold text-smb-on-surface">Danh sách Robot</h3>
          <p className="text-xs text-smb-on-surface-variant">{robots.length} robot đang hoạt động</p>
          {!!robots.length && (
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
          )}
        </header>

        {!robots.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-6 text-center text-smb-on-surface-variant">
            <Icon name="smart_toy" className="text-3xl" />
            <p className="text-xs">Chưa có robot nào trong hệ thống.</p>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-smb-outline-variant overflow-y-auto">
            {robots.map((r) => {
              const pose = poses[r.robotCode]
              const p = statusPalette(r.status)
              const isSel = selectedRobotCode === r.robotCode
              return (
                <li key={r.robotId}>
                  <div
                    onClick={() => onSelectRobot?.(r)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer transition-colors ${isSel ? 'bg-smb-active-bg' : 'hover:bg-smb-surface-container-low'}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${p.dot} text-smb-on-primary`}>
                        <Icon name="smart_toy" className="text-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-smb-on-surface">{r.robotName}</p>
                        <p className="truncate text-xs text-smb-on-surface-variant">{labelForStatus(r.status)} · {r.mode}</p>
                        <p className="mt-0.5 truncate text-[11px] italic text-smb-on-surface-variant">Chưa gán lộ trình</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-smb-on-surface">{r.batteryPct}%</p>
                        <p className="text-[10px] text-smb-on-surface-variant tabular-nums">
                          {pose ? `(${pose.x.toFixed(1)}, ${(pose.y ?? 0).toFixed(1)})` : '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        title="Dừng Khẩn Cấp (Cancel Route)"
                        onClick={(e) => { e.stopPropagation(); handleCancelRobot(r.robotCode) }}
                        className="flex size-7 shrink-0 items-center justify-center rounded text-rose-500 hover:bg-rose-500/10"
                      >
                        <Icon name="cancel" className="text-[16px]" />
                      </button>
                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={(e) => { e.stopPropagation(); setDetailRobotCode(r.robotCode) }}
                        className="flex size-7 shrink-0 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container-hover hover:text-smb-primary"
                      >
                        <Icon name="info" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <RobotDetailModal robotCode={detailRobotCode} onClose={() => setDetailRobotCode(null)} />
    </>
  )
}

/* -------------------------------------------------------------------- */
/*  Tab 2 — Assign route (route-centric, read-only assignment side)     */
/* -------------------------------------------------------------------- */

function AssignTab({
  robots, routes, map,
  onPreviewRoute, onRouteCreated, onSelectForExecution
}) {
  const [mode, setMode] = useState('list') // 'list' | 'create'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-smb-outline-variant p-4">
        <h3 className="text-sm font-semibold text-smb-on-surface">Gán lộ trình</h3>
        <p className="mt-1 text-xs text-smb-on-surface-variant">
          Quản lý lộ trình trên sơ đồ mặt bằng hiện tại.
        </p>
      </header>

      <div className="flex border-b border-smb-outline-variant">
        <SubTab active={mode === 'list'} onClick={() => setMode('list')}>
          Tất cả lộ trình ({routes.length})
        </SubTab>
        <SubTab active={mode === 'new'} onClick={() => setMode('new')}>
          Tạo lộ trình mới
        </SubTab>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'list' ? (
          <RouteList
            routes={routes}
            onPreviewRoute={onPreviewRoute}
            onSelectForExecution={onSelectForExecution}
          />
        ) : (
          <NewRouteForm
            key={map?.mapId ?? 'no-active-map'}
            robots={robots}
            map={map}
            onCreated={() => {
              setMode('list')
              onRouteCreated?.()
            }}
          />
        )}
      </div>
    </div>
  )
}

function SubTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'border-b-2 border-smb-primary-container text-smb-primary-container'
          : 'border-b-2 border-transparent text-smb-on-surface-variant hover:text-smb-on-surface'
      }`}
    >
      {children}
    </button>
  )
}

/* --- Route list (route-centric, no assignment actions) -------------- */

function RouteList({ routes, onPreviewRoute, onSelectForExecution }) {
  if (!routes.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-smb-on-surface-variant">
        <Icon name="route" className="text-3xl" />
        <p className="text-sm">Chưa có lộ trình nào trong hệ thống.</p>
        <p className="text-xs">Mở tab "Tạo lộ trình mới" để bắt đầu.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {routes.map((r) => {
        const isOwner = r.robotId
        return (
          <li
            key={r.robotRouteId}
            className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low"
          >
            {/* Header */}
            <div 
              className="flex items-start justify-between gap-3 p-3 pb-2 cursor-pointer hover:bg-smb-surface-container-high transition-colors"
              onClick={() => onSelectForExecution?.(r)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-smb-on-surface group-hover:text-smb-primary">{r.routeName}</p>
                <p className="mt-0.5 text-[11px] text-smb-on-surface-variant">
                  Map #{r.mapId} · {r.zoneName ?? 'Chưa gán khu vực'} · {JSON.parse(r.pathNodesJson || '[]').length || r.waypointCount || 0} điểm đến
                </p>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-smb-on-surface-variant">
                    {r.description}
                  </p>
                )}
              </div>
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: getRouteTypeMeta(r.routeType).color + '20',
                  color: getRouteTypeMeta(r.routeType).color,
                }}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {getRouteTypeMeta(r.routeType).icon}
                </span>
                {getRouteTypeMeta(r.routeType).label}
              </span>
            </div>

            {/* Owner (which robot owns this route) */}
            <div className="border-t border-smb-outline-variant px-3 py-1.5 text-[11px] text-smb-on-surface-variant flex justify-between items-center">
              <span>
                Dành cho: <span className="font-mono text-smb-primary font-semibold">{r.robotCode || (r.robotId ? `Robot #${r.robotId}` : 'Mọi Robot')}</span>
              </span>
              {r.createdAt && (
                <span className="text-[10px] opacity-70">
                  Tạo ngày: {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            {onPreviewRoute && (
              <div className="flex gap-2 border-t border-smb-outline-variant px-3 py-2">
                <button
                  type="button"
                  onClick={async () => {
                    const detail = await getRoute(r.robotRouteId)
                    onPreviewRoute(detail)
                  }}
                  className="flex w-full items-center justify-center gap-1 rounded border border-smb-outline-variant px-2 py-1.5 text-xs font-medium text-smb-on-surface-variant hover:bg-smb-surface-container-lowest"
                >
                  <Icon name="visibility" className="text-[14px]" /> Xem trước trên bản đồ
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* --- New route form (matches RobotRouteCreateDto) ------------------- */

function NewRouteForm({ robots, map, onCreated }) {
  // RobotRouteCreateDto: { mapId, robotId, routeName, routeType?, description?, zoneId?, nodeIds: number[] }
  const [form, setForm] = useState({
    routeName: '',
    routeType: 'patrol',
    description: '',
    robotId: robots.length === 1 ? String(robots[0].robotId) : '',
    mapId: map?.mapId ?? '',
    zoneId: '',
    nodeIds: [], // ordered array of numbers
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [zones, setZones] = useState([])
  const [loadingZones, setLoadingZones] = useState(false)

  // Auto-select robot if only 1 exists
  useEffect(() => {
    if (robots.length === 1 && !form.robotId) {
      setForm(prev => ({ ...prev, robotId: String(robots[0].robotId) }))
    }
  }, [robots, form.robotId])

  // When mapId changes, reload zones from /v1/zones (filtered by floor).
  useEffect(() => {
    const floorId = map?.floorId
    if (!form.mapId || floorId == null) {
      setZones([])
      setForm((prev) => (prev.zoneId ? { ...prev, zoneId: '' } : prev))
      return
    }
    let cancelled = false
    setLoadingZones(true)
    fetchZones({ floorId })
      .then((list) => {
        if (cancelled) return
        setZones(list)
        // If the current zone isn't in the new list, drop it.
        setForm((prev) => {
          if (prev.zoneId && !list.some((z) => String(z.zoneId) === String(prev.zoneId))) {
            return { ...prev, zoneId: '' }
          }
          return prev
        })
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingZones(false))
    return () => { cancelled = true }
  }, [form.mapId, map?.floorId])

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const nodesForMap = useMemo(() => {
    if (map && String(map.mapId) === String(form.mapId)) return map.nodes ?? []
    return []
  }, [map, form.mapId])

  const addNode = (nodeId) => {
    const node = nodesForMap.find((n) => String(n.nodeId) === String(nodeId))
    if (!node || (!node.shelfId && !node.shelfName)) {
      toast.warning('Điểm này không thuộc kệ hàng nào. Vui lòng chọn node có gắn kệ!')
      return
    }
    setForm((prev) => ({ ...prev, nodeIds: [...prev.nodeIds, Number(nodeId)] }))
  }

  const autoGenerateNodesForZone = () => {
    if (!form.zoneId) {
      toast.warning('Vui lòng chọn Zone trước để tự động thêm!')
      return
    }
    const zoneNodes = nodesForMap.filter(n => 
      String(n.zoneId) === String(form.zoneId) && (n.shelfId || n.shelfName)
    )
    if (zoneNodes.length === 0) {
      toast.warning('Không tìm thấy node nào thuộc Zone này có gắn kệ.')
      return
    }
    const newNodeIds = zoneNodes.map(n => Number(n.nodeId))
    setForm(prev => {
      const existing = new Set(prev.nodeIds)
      const toAdd = newNodeIds.filter(id => !existing.has(id))
      return { ...prev, nodeIds: [...prev.nodeIds, ...toAdd] }
    })
    toast.success(`Đã tự động thêm ${zoneNodes.length} node có kệ trong Zone!`)
  }

  const removeNodeAt = (index) => {
    setForm((prev) => ({
      ...prev,
      nodeIds: prev.nodeIds.filter((_, i) => i !== index),
    }))
  }
  const moveNode = (index, delta) => {
    setForm((prev) => {
      const next = [...prev.nodeIds]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...prev, nodeIds: next }
    })
  }

  const validate = () => {
    if (!form.routeName.trim()) return 'Vui lòng nhận tên lộ trình.'
    if (!form.mapId) return 'Vui lòng chọn map.'
    if (!form.robotId) return 'Vui lòng chọn robot sở hữu.'
    if (!form.nodeIds.length) return 'Cần chọn ít nhất 1 node cho lộ trình.'
    return null
  }

  const submit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setSubmitting(true)
    const payload = {
      mapId: Number(form.mapId),
      robotId: Number(form.robotId),
      routeName: form.routeName.trim(),
      routeType: form.routeType,
      description: form.description.trim() || undefined,
      zoneId: form.zoneId ? Number(form.zoneId) : undefined,
      nodeIds: form.nodeIds,
    }
    try {
      const result = await createRoute(payload)
      window.dispatchEvent(new CustomEvent('robot:route-created', { detail: result }))
      onCreated?.(result)
    } catch (err) {
      setError(err?.message ?? 'Tạo lộ trình thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  // Build a label lookup once so each chip can show "A1-Start (id 3)".
  const nodeLabelById = useMemo(() => {
    const m = new Map()
    nodesForMap.forEach((n) => {
      let label = n.nodeName || ''
      if (!label || label.toLowerCase().startsWith('node ') || label.toLowerCase().startsWith('waypoint ')) {
        label = `Điểm đến ${n.nodeId}`
      }
      m.set(Number(n.nodeId), {
        label,
        type: n.nodeType ?? null,
        blocked: !!n.isBlocked,
      })
    })
    return m
  }, [nodesForMap])

  const selectedMap = map && String(map.mapId) === String(form.mapId) ? map : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-smb-on-surface-variant">
        Khớp với backend <span className="font-mono">POST /api/v1/routes</span> →
        DTO <span className="font-mono">RobotRouteCreateDto</span>.
      </p>

      <Field label="Tên lộ trình *">
        <input
          type="text"
          value={form.routeName}
          onChange={(e) => set({ routeName: e.target.value })}
          placeholder="vd. Tuần tra khu rau củ sáng"
          className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
        />
      </Field>

      <Field label="Sơ đồ mặt bằng hiện tại *">
        {selectedMap && (
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-600">
              Sơ đồ #{selectedMap.mapId}{selectedMap.mapName && selectedMap.mapName !== 'ROS2 SLAM Map' ? ` · ${selectedMap.mapName}` : ''}
            </p>
            <p className="mt-1 text-[11px] text-smb-on-surface-variant">
              {selectedMap.widthMeters}×{selectedMap.heightMeters} m ·{' '}
              {nodesForMap.length || selectedMap.nodeCount || 0} điểm khả dụng
            </p>
          </div>
        )}
        {!selectedMap && (
          <p className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
            Chưa có sơ đồ mặt bằng nào. Không thể tạo lộ trình.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-1 gap-3">
        <Field label="Zone (tùy chọn)">
          <Select
            value={form.zoneId}
            onChange={(v) => set({ zoneId: v })}
            disabled={!form.mapId || loadingZones}
            placeholder={
              !form.mapId
                ? 'Chọn map trước'
                : loadingZones
                  ? 'Đang tải zone…'
                  : '-- không gán --'
            }
            options={[
              { value: '', label: '-- không gán --' },
              ...zones.map((z) => ({
                value: z.zoneId,
                label: `#${z.zoneId} · ${z.zoneName}`,
              })),
            ]}
          />
        </Field>
      </div>

      <Field label="Robot sở hữu *">
        <Select
          value={form.robotId}
          onChange={(v) => set({ robotId: v })}
          placeholder={robots.length === 1 ? undefined : "-- chọn robot --"}
          options={robots.map((r) => ({
            value: r.robotId,
            label: `${r.robotName} · ${r.robotCode}`,
          }))}
        />
      </Field>

      {/* Node picker */}
      <Field label={`Node cho lộ trình (theo thứ tự) *`}>
        {nodesForMap.length === 0 ? (
          <p className="rounded border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-3 text-xs text-smb-on-surface-variant">
            {form.mapId
              ? 'Bản đồ này chưa có danh sách node. Tải map để hiện node chip picker.'
              : 'Chọn map trước.'}
          </p>
        ) : (
          <>
            <div className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] text-smb-on-surface-variant">
                  Click để thêm vào thứ tự
                </p>
                <button
                  type="button"
                  onClick={autoGenerateNodesForZone}
                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  <Icon name="auto_awesome" className="text-[12px]" />
                  Tự động thêm Kệ trong Zone
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nodesForMap.map((n) => {
                  const info = nodeLabelById.get(Number(n.nodeId))
                  return (
                    <button
                      key={n.nodeId}
                      type="button"
                      onClick={() => addNode(n.nodeId)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-smb-outline-variant bg-smb-surface-container-lowest px-2.5 py-1 text-[11px] font-medium text-smb-on-surface hover:border-smb-primary-container hover:bg-smb-active-bg shadow-sm transition-all active:scale-95"
                    >
                      <Icon name="add_location" className="text-[14px] text-smb-primary" />
                      <span className="max-w-[140px] truncate">{info.label}</span>
                      <span className="rounded bg-smb-surface-container-highest px-1.5 py-0.5 font-mono text-[9px] text-smb-on-surface-variant">#{n.nodeId}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {form.nodeIds.length > 0 && (
              <div className="mt-4 rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest overflow-hidden shadow-sm">
                <div className="bg-smb-surface-container-low px-4 py-2.5 border-b border-smb-outline-variant flex items-center justify-between">
                  <p className="text-xs font-semibold text-smb-on-surface">
                    Thứ tự di chuyển
                  </p>
                  <span className="rounded-full bg-smb-primary/10 text-smb-primary px-2 py-0.5 text-[10px] font-bold">
                    {form.nodeIds.length} điểm
                  </span>
                </div>
                <div className="p-4 pt-5 pb-6">
                  <div className="relative border-l-2 border-smb-primary-container/30 ml-3 space-y-5">
                    {form.nodeIds.map((id, idx) => {
                      const info = nodeLabelById.get(id)
                      const isLast = idx === form.nodeIds.length - 1
                      return (
                        <div key={`${id}-${idx}`} className="relative pl-6 flex items-center justify-between group">
                          {/* Timeline dot */}
                          <div className="absolute -left-[9px] flex size-4 items-center justify-center rounded-full bg-smb-surface-container-lowest border-2 border-smb-primary-container ring-4 ring-smb-surface-container-lowest shadow-sm">
                            <div className="size-1.5 rounded-full bg-smb-primary-container"></div>
                          </div>

                          <div className="flex items-center gap-3 min-w-0 flex-1 bg-smb-surface-container-lowest group-hover:bg-smb-surface-container-low rounded-lg p-2 -my-2 transition-colors border border-transparent group-hover:border-smb-outline-variant/40">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-smb-primary/10 text-[11px] font-bold text-smb-primary shadow-sm">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                              <Icon name="location_on" className="text-[18px] text-smb-on-surface-variant shrink-0" />
                              <span className="font-semibold text-smb-on-surface text-sm truncate max-w-[200px]">
                                {info?.label ?? `Điểm đến ${id}`}
                              </span>
                              <span className="rounded bg-smb-surface-container-highest px-1.5 py-0.5 text-[10px] font-mono text-smb-on-surface-variant shrink-0 shadow-sm border border-smb-outline-variant/30">
                                #{id}
                              </span>
                              {info?.type && !info.label.includes(info.type) && (
                                <span className="rounded-full bg-smb-surface-container-high px-2 py-0.5 text-[10px] text-smb-on-surface-variant shrink-0 border border-smb-outline-variant/50">
                                  {info.type}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2">
                            <button
                              type="button"
                              onClick={() => moveNode(idx, -1)}
                              disabled={idx === 0}
                              className="flex size-7 items-center justify-center rounded-lg text-smb-on-surface-variant hover:bg-smb-surface-container-high hover:text-smb-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              title="Di chuyển lên"
                            >
                              <Icon name="arrow_upward" className="text-[16px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveNode(idx, 1)}
                              disabled={isLast}
                              className="flex size-7 items-center justify-center rounded-lg text-smb-on-surface-variant hover:bg-smb-surface-container-high hover:text-smb-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              title="Di chuyển xuống"
                            >
                              <Icon name="arrow_downward" className="text-[16px]" />
                            </button>
                            <div className="w-px h-4 bg-smb-outline-variant/40 mx-0.5"></div>
                            <button
                              type="button"
                              onClick={() => removeNodeAt(idx)}
                              className="flex size-7 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 transition-colors"
                              title="Xóa khỏi lộ trình"
                            >
                              <Icon name="delete" className="text-[16px]" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Field>

      {/* Link to Map Editor / Shelf Management */}
      <div className="flex justify-end -mt-1 mb-3">
        <button
          type="button"
          onClick={() => window.open('/shelf-management', '_blank')}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-smb-primary hover:text-smb-primary-container transition-colors"
        >
          <Icon name="tune" className="text-[14px]" />
          Thiết lập Kệ & Node
        </button>
      </div>

      <Field label="Mô tả (tùy chọn)">
        <input
          type="text"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="vd. Quét kệ 5-12 mỗi sáng"
          className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
        />
      </Field>

      {error && (
        <div className="rounded border border-smb-error bg-smb-error-container/40 px-3 py-2 text-xs text-smb-on-error-container">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary hover:bg-smb-primary-container/90 disabled:opacity-60"
      >
        <Icon name="add_road" className="text-[18px]" />
        {submitting ? 'Đang tạo…' : 'Tạo lộ trình'}
      </button>

      <details className="text-[11px] text-smb-on-surface-variant">
        <summary className="cursor-pointer">Xem payload JSON sẽ gửi đi</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-smb-surface-container-highest p-2 text-[10px] leading-snug text-smb-on-surface">
{JSON.stringify(
  {
    mapId: form.mapId ? Number(form.mapId) : undefined,
    robotId: form.robotId ? Number(form.robotId) : undefined,
    routeName: form.routeName.trim() || '<empty>',
    routeType: form.routeType,
    description: form.description.trim() || undefined,
    zoneId: form.zoneId ? Number(form.zoneId) : undefined,
    nodeIds: form.nodeIds,
  },
  null,
  2
)}
        </pre>
      </details>
    </div>
  )
}

/* --- Shared controls --- */

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-smb-on-surface-variant">{label}</span>
      {children}
    </label>
  )
}

function Select({ value, onChange, options, placeholder, disabled = false }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 disabled:opacity-60"
    >
      {placeholder !== undefined && value === '' && (
        <option value="" disabled>{placeholder}</option>
      )}
      {placeholder !== undefined && value !== '' && (
        <option value="">-- bỏ chọn --</option>
      )}
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  )
}

export default RobotAssignmentPanel
