import { useEffect, useMemo, useState } from 'react'
import { statusPalette } from '../utils/robotHelpers'
import {
  getRoute,
  createRoute,
} from '../api/robotRoutesApi'
import { getRobot, getRobotPose } from '../api/robotApi'
import { getRouteTypes as fetchRouteTypes } from '../api/routeTypesApi'
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
          />
        ) : tab === 'autonomous' ? (
          <AutonomousTab robots={robots} routes={routes} map={map} />
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
} from '../api/navigationApi'
import { getAdminProducts } from '../../product/api/adminProductApi'

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
  if (!waypoints?.length) return null
  return (
    <div className="mt-3 rounded-xl border border-smb-outline-variant bg-smb-surface-container p-3 space-y-1.5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-smb-on-surface-variant">
        {waypoints.length} waypoint được tính toán
      </p>
      {waypoints.slice(0, 5).map((wp, i) => (
        <div key={wp.nodeId ?? i} className="flex items-center gap-2 text-[11px] text-smb-on-surface">
          <span className="flex size-5 items-center justify-center rounded-full bg-smb-primary/10 text-[10px] font-bold text-smb-primary">
            {i + 1}
          </span>
          <span className="flex-1 font-medium">
            {wp.nodeName || `Node #${wp.nodeId}`}
          </span>
          {wp.dwellTimeSeconds && (
            <span className="rounded bg-smb-surface-container-lowest px-1.5 py-0.5 text-[10px] text-smb-on-surface-variant">
              ⏱ {wp.dwellTimeSeconds}s
            </span>
          )}
          <span className="text-[10px] font-mono text-smb-on-surface-variant">
            ({typeof wp.xCoord === 'number' ? wp.xCoord.toFixed(1) : '?'},
             {typeof wp.yCoord === 'number' ? wp.yCoord.toFixed(1) : '?'})
          </span>
        </div>
      ))}
      {waypoints.length > 5 && (
        <p className="text-center text-[10px] text-smb-on-surface-variant">
          +{waypoints.length - 5} waypoint nữa…
        </p>
      )}
    </div>
  )
}

function AutonomousTab({ robots = [], routes = [] }) {
  const [selectedRobot, setSelectedRobot] = useState('')
  const [selectedAdRoute, setSelectedAdRoute] = useState('')
  const [selectedPatrolRoute, setSelectedPatrolRoute] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')

  const [adMsg, setAdMsg]         = useState(null)
  const [adWaypoints, setAdWaypoints] = useState(null)
  const [patrolMsg, setPatrolMsg] = useState(null)
  const [patrolWaypoints, setPatrolWaypoints] = useState(null)
  const [guideMsg, setGuideMsg]   = useState(null)
  const [guideWaypoints, setGuideWaypoints] = useState(null)
  const [estopMsg, setEstopMsg]   = useState(null)
  const [readiness, setReadiness] = useState(null)

  const [dispatching, setDispatching] = useState(false)
  const [products, setProducts] = useState([])

  // Auto-select the first robot when the list first loads
  useEffect(() => {
    if (robots.length > 0 && !selectedRobot) {
      setSelectedRobot(robots[0].robotCode)
    }
  }, [robots, selectedRobot])

  // Load zones + products once on mount
  useEffect(() => {
    getAdminProducts({ pageSize: 50 }).then((p) => setProducts(Array.isArray(p) ? p : p?.items ?? [])).catch(() => {})
  }, [])

  const selectedRobotId = robots.find((robot) => robot.robotCode === selectedRobot)?.robotId
  const adRoutes = routes.filter((route) =>
    route.robotId === selectedRobotId && String(route.routeType || '').startsWith('ad_'))
  const patrolRoutes = routes.filter((route) =>
    route.robotId === selectedRobotId && route.routeType === 'patrol')

  const activeAdRoute = adRoutes.some((route) => String(route.robotRouteId) === selectedAdRoute)
    ? selectedAdRoute
    : adRoutes[0] ? String(adRoutes[0].robotRouteId) : ''
  const activePatrolRoute = patrolRoutes.some((route) => String(route.robotRouteId) === selectedPatrolRoute)
    ? selectedPatrolRoute
    : patrolRoutes[0] ? String(patrolRoutes[0].robotRouteId) : ''

  const handleDispatch = async (flowType, extra = {}) => {
    setDispatching(true)
    const clear = () => {
      if (flowType === 'ad')      { setAdMsg(null); setAdWaypoints(null) }
      if (flowType === 'patrol')  { setPatrolMsg(null); setPatrolWaypoints(null) }
      if (flowType === 'guide')   { setGuideMsg(null); setGuideWaypoints(null) }
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
      if (flowType === 'guide')   { setGuideMsg({ type: 'success', text: msg });   setGuideWaypoints(data.waypoints) }

    } catch (e) {
      const err = `❌ ${e?.response?.data?.detail || e?.response?.data?.title || e?.response?.data?.message || e?.message || 'Lỗi phát lệnh'}`
      if (flowType === 'ad')      setAdMsg({ type: 'error', text: err })
      if (flowType === 'patrol')  setPatrolMsg({ type: 'error', text: err })
      if (flowType === 'guide')   setGuideMsg({ type: 'error', text: err })
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

  const productOptions = [
    { value: '', label: '— Chọn sản phẩm —' },
    ...products.map((p) => ({ value: String(p.productId), label: p.productName || `#${p.productId}` })),
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
            <option value="">Đang tải robot…</option>
          ) : (
            robots.map((r) => (
              <option key={r.robotCode} value={r.robotCode}>
                {r.robotName || r.robotCode} · {r.status} · {r.batteryPct ?? '?'}%
              </option>
            ))
          )}
        </select>
      </div>

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
                <p className="text-[10px] text-orange-600/70">Robot phát nhạc/video khi dừng tại kệ</p>
              </div>
            </div>
            <span className="rounded-full bg-orange-500/20 px-2.5 py-1 text-[10px] font-bold text-orange-700">Linh hoạt</span>
          </div>

          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-orange-700/70">
            Lộ trình quảng cáo đã cấu hình
          </label>
          <select
            value={activeAdRoute}
            onChange={(e) => setSelectedAdRoute(e.target.value)}
            className="mb-3 w-full rounded-xl border border-orange-500/40 bg-smb-surface-container-lowest px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none focus:border-orange-500"
          >
            <option value="">— Chọn route quảng cáo —</option>
            {adRoutes.map((route) => (
              <option key={route.robotRouteId} value={route.robotRouteId}>
                {route.routeName} · {route.waypointCount} điểm
              </option>
            ))}
          </select>

          <button
            disabled={dispatching || !activeAdRoute}
            onClick={() => handleDispatch('ad', { robotRouteId: Number(activeAdRoute) })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:from-orange-700 hover:to-orange-600 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="play_arrow" className="text-[16px]" />}
            Phát lệnh quảng cáo
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
              </div>
            </div>
            <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-bold text-blue-700">AI Vision</span>
          </div>

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

          <StatusBadge msg={patrolMsg} />
          <WaypointList waypoints={patrolWaypoints} />
        </div>

        {/* Flow 3: Dẫn Đường */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-50/30 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15">
                <Icon name="near_me" className="text-[18px] text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">Flow Dẫn Đường Khách</p>
                <p className="text-[10px] text-emerald-600/70">Robot dẫn khách từ vị trí hiện tại đến kệ hàng</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Tự động</span>
          </div>

          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">
            Sản phẩm đích
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="mb-3 w-full rounded-xl border border-emerald-500/40 bg-smb-surface-container-lowest px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none focus:border-emerald-500"
          >
            {productOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            disabled={dispatching || !selectedProductId}
            onClick={() => handleDispatch('guide', { productId: parseInt(selectedProductId, 10) })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-emerald-600 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="near_me" className="text-[16px]" />}
            Phát lệnh dẫn đường
          </button>

          <StatusBadge msg={guideMsg} />
          <WaypointList waypoints={guideWaypoints} />
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
  onPreviewRoute, onRouteCreated,
}) {
  const [mode, setMode] = useState('list') // 'list' | 'new'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-smb-outline-variant p-4">
        <h3 className="text-sm font-semibold text-smb-on-surface">Gán lộ trình</h3>
        <p className="mt-1 text-xs text-smb-on-surface-variant">
          Quản lý lộ trình trên active map của ROS Bridge.
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

function RouteList({ routes, onPreviewRoute }) {
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
            <div className="flex items-start justify-between gap-3 p-3 pb-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-smb-on-surface">{r.routeName}</p>
                <p className="mt-0.5 text-[11px] text-smb-on-surface-variant">
                  Map #{r.mapId} · {r.zoneName ?? 'Chưa gán khu vực'} · {r.waypointCount} điểm dừng
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
            <div className="border-t border-smb-outline-variant px-3 py-1.5 text-[11px] text-smb-on-surface-variant">
              Tạo bởi robot <span className="font-mono">#{isOwner ?? '—'}</span>
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
    robotId: '',
    mapId: map?.mapId ?? '',
    zoneId: '',
    nodeIds: [], // ordered array of numbers
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [zones, setZones] = useState([])
  const [routeTypes, setRouteTypes] = useState([])
  const [loadingZones, setLoadingZones] = useState(false)

  // Load route types from BE; dropdown will be empty if the endpoint fails.
  useEffect(() => {
    let cancelled = false
    fetchRouteTypes()
      .then((list) => {
        if (cancelled) return
        if (Array.isArray(list) && list.length) {
          setRouteTypes(list.map((t) => ({ value: t.value, label: t.label })))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

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
    setForm((prev) => ({ ...prev, nodeIds: [...prev.nodeIds, Number(nodeId)] }))
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
      m.set(Number(n.nodeId), {
        label: n.nodeName || `Node ${n.nodeId}`,
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

      <Field label="ROS map đang hoạt động *">
        {selectedMap && (
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-600">
              #{selectedMap.mapId} · {selectedMap.mapName}
            </p>
            <p className="mt-1 text-[11px] text-smb-on-surface-variant">
              {selectedMap.widthMeters}×{selectedMap.heightMeters} m ·{' '}
              {nodesForMap.length || selectedMap.nodeCount || 0} node khả dụng
            </p>
          </div>
        )}
        {!selectedMap && (
          <p className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
            Chưa có active map cho ROS Bridge. Không thể tạo lộ trình.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
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
        <Field label="Loại lộ trình *">
          <Select
            value={form.routeType}
            onChange={(v) => set({ routeType: v })}
            options={routeTypes.map((t) => ({ value: t.value, label: t.label }))}
          />
        </Field>
      </div>

      <Field label="Robot sở hữu *">
        <Select
          value={form.robotId}
          onChange={(v) => set({ robotId: v })}
          placeholder="-- chọn robot --"
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
              <p className="mb-1.5 text-[11px] text-smb-on-surface-variant">
                Click để thêm vào thứ tự
              </p>
              <div className="flex flex-wrap gap-1.5">
                {nodesForMap.map((n) => {
                  const info = nodeLabelById.get(Number(n.nodeId))
                  return (
                    <button
                      key={n.nodeId}
                      type="button"
                      onClick={() => addNode(n.nodeId)}
                      className="inline-flex items-center gap-1 rounded-full border border-smb-outline-variant bg-smb-surface-container-low px-2 py-0.5 text-[11px] font-medium text-smb-on-surface hover:border-smb-primary-container hover:bg-smb-active-bg"
                    >
                      <Icon name="add_location" className="text-[12px]" />
                      {info.label} <span className="font-mono text-[10px] text-smb-on-surface-variant">#{n.nodeId}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {form.nodeIds.length > 0 && (
              <div className="mt-2 rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-2">
                <p className="mb-1.5 text-[11px] text-smb-on-surface-variant">
                  Thứ tự di chuyển ({form.nodeIds.length} điểm dừng)
                </p>
                <ol className="flex flex-wrap gap-1.5">
                  {form.nodeIds.map((id, idx) => {
                    const info = nodeLabelById.get(id)
                    return (
                      <li
                        key={`${id}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container px-2 py-0.5 text-[11px] font-medium text-smb-on-primary"
                      >
                        <span className="font-mono text-[10px] opacity-80">{idx + 1}.</span>
                        {info?.label ?? `Node ${id}`}
                        <button
                          type="button"
                          onClick={() => moveNode(idx, -1)}
                          disabled={idx === 0}
                          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-smb-on-primary/20 disabled:opacity-30"
                          aria-label="Lên"
                          title="Lên"
                        >
                          <Icon name="arrow_upward" className="text-[12px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveNode(idx, 1)}
                          disabled={idx === form.nodeIds.length - 1}
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-smb-on-primary/20 disabled:opacity-30"
                          aria-label="Xuống"
                          title="Xuống"
                        >
                          <Icon name="arrow_downward" className="text-[12px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNodeAt(idx)}
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-smb-on-primary/20"
                          aria-label="Xóa"
                          title="Xóa"
                        >
                          <Icon name="close" className="text-[12px]" />
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </>
        )}
      </Field>

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
