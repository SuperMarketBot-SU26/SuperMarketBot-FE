import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { toast } from 'react-toastify'
import { statusPalette } from '../utils/robotHelpers'
import { getRobot, getRobotPose, simulateLowBattery, resetBattery } from '../api/robotApi'
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

  // ─── Quản lý Kết Nối Robot (Agent Server & Rosbridge WebSocket) Dùng Chung ───
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
  const getAgentApiUrl = useCallback((urlStr) => {
    try {
      const url = new URL((urlStr || 'ws://snake.local:9090').replace('ws://', 'http://'))
      return `http://${url.hostname}:5000/api/robot`
    } catch {
      return 'http://192.168.0.100:5000/api/robot'
    }
  }, [])

  // Định kỳ kiểm tra trạng thái Agent Server trên Robot (ngay cả khi ở Tab Nhiệm Vụ)
  const checkAgentStatus = useCallback(async () => {
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
  }, [getAgentApiUrl, rosWsUrl])

  useEffect(() => {
    checkAgentStatus()
    const timer = setInterval(checkAgentStatus, 4000)
    return () => clearInterval(timer)
  }, [checkAgentStatus])

  // Khởi động ROS 2 OS (SLAM hoặc AMCL)
  const handleStartOS = async (mode) => {
    setBootLoading(mode)
    const apiUrl = getAgentApiUrl(rosWsUrl)
    try {
      if (mode === 'amcl') {
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
        // Tự động kết nối WebSocket điều khiển khi kích hoạt dẫn đường
        setTimeout(() => {
          connectWs(rosWsUrl, false)
        }, 1200)
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
      // Ngắt kết nối WebSocket điều khiển khi dừng dẫn đường
      if (window._rosInstance) {
        try { window._rosInstance.close() } catch {}
        window._rosInstance = null
      }
      setWsConnected(false)
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

  // Hàm kết nối WebSocket Rosbridge
  const connectWs = useCallback((targetUrl, showToastMsg = true) => {
    if (window._rosInstance && window._rosInstance.readyState === WebSocket.OPEN) {
      setWsConnected(true)
      return
    }

    const url = targetUrl || rosWsUrl
    setWsConnecting(true)
    localStorage.setItem('globalSetting_rosWsUrl', url)

    try {
      const ws = new WebSocket(url)
      ws.onopen = () => {
        setWsConnected(true)
        setWsConnecting(false)
        window._rosInstance = ws
        try {
          ws.send(JSON.stringify({
            op: 'advertise',
            topic: '/cmd_vel',
            type: 'geometry_msgs/msg/Twist'
          }))
        } catch {}
        if (showToastMsg) toast.success(`Đã kết nối thành công tới ${url}`)
      }
      ws.onerror = () => {
        setWsConnected(false)
        setWsConnecting(false)
        window._rosInstance = null
        if (showToastMsg) toast.error(`Không thể kết nối tới ${url}`)
      }
      ws.onclose = () => {
        setWsConnected(false)
        setWsConnecting(false)
        window._rosInstance = null
      }
    } catch (e) {
      setWsConnected(false)
      setWsConnecting(false)
      window._rosInstance = null
      if (showToastMsg) toast.error(`Lỗi WebSocket: ${e.message}`)
    }
  }, [rosWsUrl])

  // Tự động kết nối WebSocket mặc định khi component load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!wsConnected && !wsConnecting && !window._rosInstance) {
        connectWs(rosWsUrl, false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [rosWsUrl, connectWs])

  // Quản lý nút bấm bật/tắt thủ công WebSocket
  const handleToggleWs = () => {
    if (wsConnected) {
      if (window._rosInstance) {
        try { window._rosInstance.close() } catch {}
        window._rosInstance = null
      }
      setWsConnected(false)
      toast.info('Đã ngắt kết nối cổng WebSocket.')
      return
    }
    connectWs(rosWsUrl, true)
  }

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
            robots.map((r) => {
              const isCurrent = r.robotCode === activeRobotCode
              const effectiveStatus = (isCurrent && agentStatus === 'running')
                ? (agentMode === 'amcl' ? 'Online · Dẫn Đường' : 'Online · Quét Map')
                : r.status
              return (
                <option key={r.robotCode} value={r.robotCode}>
                  {r.robotName || r.robotCode} · {effectiveStatus} · {r.batteryPct ?? '?'}%
                </option>
              )
            })
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
            agentStatus={agentStatus}
            agentMode={agentMode}
            bootLoading={bootLoading}
            onStartOS={handleStartOS}
            wsConnected={wsConnected}
          />
        ) : (
          <RobotsTab
            robots={robots}
            poses={poses}
            selectedRobotCode={activeRobotCode}
            selectedRobotObj={selectedRobotObj}
            onSelectRobot={onSelectRobot}
            onMissionDispatched={onMissionDispatched}
            map={map}
            rosWsUrl={rosWsUrl}
            setRosWsUrl={setRosWsUrl}
            wsConnected={wsConnected}
            setWsConnected={setWsConnected}
            wsConnecting={wsConnecting}
            setWsConnecting={setWsConnecting}
            showWsConfig={showWsConfig}
            setShowWsConfig={setShowWsConfig}
            agentStatus={agentStatus}
            setAgentStatus={setAgentStatus}
            agentMode={agentMode}
            setAgentMode={setAgentMode}
            bootLoading={bootLoading}
            setBootLoading={setBootLoading}
            handleStartOS={handleStartOS}
            handleStopOS={handleStopOS}
            handleSaveMap={handleSaveMap}
            handleToggleWs={handleToggleWs}
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
  estimateAdDuration,
} from '../api/navigationApi'
import { getShelves } from '../api/shelvesApi'
import { getZones } from '../api/zonesApi'

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatHumanDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 giây'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m} phút`
  return `${m}p ${s}s`
}

// Status badge colours
const STATUS_OK  = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
const STATUS_ERR = 'bg-rose-500/10 text-rose-600 border-rose-500/20'

function StatusBadge({ msg, onDismiss }) {
  if (!msg) return null
  return (
    <div className={`relative flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${msg.type === 'success' ? STATUS_OK : STATUS_ERR}`}>
      <span className="mt-0.5 shrink-0">{msg.type === 'success' ? '✅' : '❌'}</span>
      <span className="flex-1 leading-snug">{msg.text}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors shrink-0"
          title="Đóng thông báo"
        >
          <Icon name="close" className="text-[14px]" />
        </button>
      )}
    </div>
  )
}

function WaypointList({ waypoints, onDismiss }) {
  const [expanded, setExpanded] = useState(false)
  if (!waypoints?.length) return null

  const visibleWaypoints = expanded ? waypoints : waypoints.slice(0, 5)
  const remaining = waypoints.length - 5

  return (
    <div className="mt-3 rounded-xl border border-smb-outline-variant bg-smb-surface-container p-3 space-y-1.5 relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-smb-on-surface-variant">
          {waypoints.length} điểm đến được tính toán
        </p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors shrink-0"
            title="Đóng danh sách điểm đến"
          >
            <Icon name="close" className="text-[14px]" />
          </button>
        )}
      </div>
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

function AutonomousTab({
  robots = [],
  routes = [],
  map,
  selectedRobotCode,
  onSelectRobot,
  onMissionDispatched,
  agentStatus,
  agentMode,
  bootLoading,
  onStartOS,
  wsConnected,
}) {
  const selectedRobot = selectedRobotCode || ''

  const selectedRobotObj = useMemo(() => {
    return robots.find((r) => r.robotCode === selectedRobot || (selectedRobot === 'RB0001' && r.robotCode === 'RB001') || (selectedRobot === 'RB001' && r.robotCode === 'RB0001'))
  }, [robots, selectedRobot])

  // Robot được coi là online nếu Agent Server đang chạy hoặc WebSocket đã kết nối hoặc backend báo Online
  const isAgentActive = agentStatus === 'running' || wsConnected
  const isRobotOffline = !isAgentActive && (!selectedRobotObj || selectedRobotObj.status === 'Offline' || selectedRobotObj.status === 'Power_Off')

  const [shelves, setShelves] = useState([])
  const [selectedShelfIds, setSelectedShelfIds] = useState([])
  const [patrolDwell, setPatrolDwell] = useState(3.0) // thời gian lia camera tại mỗi kệ (giây)
  const [zones, setZones] = useState([])

  const reloadShelvesAndZones = useCallback(() => {
    getShelves().then(data => {
      const list = Array.isArray(data) ? data : []
      setShelves(list)
      const valid = list.filter(s => s.nodeId != null)
      setSelectedAdShelfIds(prev => prev && prev.length ? prev : valid.map(s => s.shelfId))
      setSelectedShelfIds(prev => prev && prev.length ? prev : valid.map(s => s.shelfId))
    }).catch(() => {})

    getZones({ floorId: map?.floorId || 1 })
      .then(data => setZones(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [map?.floorId])

  useEffect(() => {
    reloadShelvesAndZones()

    const handleUpdate = () => {
      reloadShelvesAndZones()
    }
    const handleMessage = (event) => {
      if (event.data?.type === 'MAP_LAYOUT_UPDATED') {
        reloadShelvesAndZones()
      }
    }

    window.addEventListener('mapLayoutUpdated', handleUpdate)
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('mapLayoutUpdated', handleUpdate)
      window.removeEventListener('message', handleMessage)
    }
  }, [reloadShelvesAndZones])

  const validShelves = useMemo(() => shelves.filter(s => s.nodeId != null), [shelves])

  const zonesWithShelves = useMemo(() => {
    const defaultZoneConfigs = [
      {
        zoneId: 1,
        defaultName: 'Khu Đồ Ăn Vặt & Nước Giải Khát',
        label: 'Khu vực 1',
        icon: 'cookie',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        activeHeader: 'from-amber-500/15 via-orange-500/10 to-transparent border-amber-300',
        shelfIds: [1, 2],
      },
      {
        zoneId: 2,
        defaultName: 'Khu Thực Phẩm Tươi Sống & Đóng Gói',
        label: 'Khu vực 2',
        icon: 'restaurant',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        activeHeader: 'from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-300',
        shelfIds: [3, 4],
      },
      {
        zoneId: 3,
        defaultName: 'Khu Gia Vị & Đồ Gia Dụng',
        label: 'Khu vực 3',
        icon: 'soup_kitchen',
        badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
        activeHeader: 'from-purple-500/15 via-indigo-500/10 to-transparent border-purple-300',
        shelfIds: [5, 6],
      },
    ]

    return defaultZoneConfigs.map((cfg) => {
      const matched = zones.find((z) => z.zoneId === cfg.zoneId)
      const zoneName = matched?.zoneName || cfg.defaultName
      const zoneDesc = matched?.description || ''

      const memberShelves = validShelves.filter((s) => {
        if (cfg.shelfIds.includes(s.shelfId)) return true
        if (s.zoneId === cfg.zoneId) return true
        if (s.aisleCode === 'A01' && cfg.zoneId === 1) return true
        if (s.aisleCode === 'B01' && cfg.zoneId === 2) return true
        if (s.aisleCode === 'C01' && cfg.zoneId === 3) return true
        return false
      })

      return {
        ...cfg,
        zoneName,
        zoneDesc,
        shelves: memberShelves,
      }
    })
  }, [zones, validShelves])

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
  const isAdRunning = Boolean(
    missionState &&
    missionState.flowType === 'ad' &&
    !['COMPLETED', 'CANCELLED', 'FAILED', 'ESTOP'].includes(missionState.status)
  )

  const [dispatching, setDispatching] = useState(false)
  const [cancellingAd, setCancellingAd] = useState(false)
  const [adEstimate, setAdEstimate] = useState(null)
  const [isEstimatingAd, setIsEstimatingAd] = useState(false)
  const [liveAdCountdown, setLiveAdCountdown] = useState({ remaining: 0, total: 0, percent: 0, currentShelfRemaining: 0 })

  useEffect(() => {
    if (!selectedRobot) {
      setMissionState(null)
      return
    }
    const poll = async () => {
      try {
        const state = await getRobotMissionState(selectedRobot)
        setMissionState(state)
        // Tự động dọn sạch kết quả phát lệnh khi phiên đã hoàn thành, bị hủy hoặc kết thúc
        if (state && ['COMPLETED', 'CANCELLED', 'FAILED', 'IDLE', 'ESTOP'].includes(String(state.status).toUpperCase())) {
          setAdMsg((prev) => (prev?.type === 'success' ? null : prev))
          setAdWaypoints(null)
          setPatrolMsg((prev) => (prev?.type === 'success' ? null : prev))
          setPatrolWaypoints(null)
        }
      } catch {
        setMissionState(null)
      }
    }
    poll()
    const id = setInterval(poll, isAdRunning ? 2000 : 5000)
    return () => clearInterval(id)
  }, [selectedRobot, isAdRunning])

  // Dự tính thời lượng phiên trước khi phát lệnh (tự động theo chiến dịch thực tế trên kệ)
  useEffect(() => {
    let cancelled = false
    if (adMode === 'shelf' && selectedAdShelfIds.length === 0) {
      setAdEstimate(null)
      return
    }
    const fetchEstimate = async () => {
      setIsEstimatingAd(true)
      try {
        const res = await estimateAdDuration({
          floorId: map?.floorId || 1,
          shelfIds: adMode === 'shelf' ? selectedAdShelfIds : [],
          adMode,
          durationMinutes: adDuration ? Number(adDuration) : null,
        })
        if (!cancelled) setAdEstimate(res)
      } catch {
        if (!cancelled) setAdEstimate(null)
      } finally {
        if (!cancelled) setIsEstimatingAd(false)
      }
    }
    const t = setTimeout(fetchEstimate, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [adMode, selectedAdShelfIds, adDuration, map?.floorId])

  const hasAutoCancelledAdRef = useRef(false)

  const handleCancelAd = useCallback(async (reason = 'Admin stopped ad session') => {
    if (!selectedRobot) return
    setCancellingAd(true)
    try {
      await cancelRobotNavigation(selectedRobot, reason)
      toast.info('Đã gửi lệnh dừng phiên quảng cáo!')
      const state = await getRobotMissionState(selectedRobot)
      setMissionState(state)
    } catch (e) {
      toast.error(e?.message || 'Không thể hủy phiên quảng cáo')
    } finally {
      setCancellingAd(false)
    }
  }, [selectedRobot])

  // Bộ đếm ngược thời gian phiên quảng cáo trực tiếp (giảm từng giây)
  useEffect(() => {
    if (!isAdRunning || !missionState) {
      hasAutoCancelledAdRef.current = false
      setLiveAdCountdown({ remaining: 0, total: 0, percent: 0, currentShelfRemaining: 0 })
      return
    }

    const updateTimer = () => {
      const totalSec = missionState.estimatedDurationSeconds ||
        (missionState.isFreeRoam
          ? (missionState.durationMinutes ? missionState.durationMinutes * 60 : 120)
          : ((missionState.waypoints?.reduce((sum, w) => sum + (w.dwellTimeSeconds || 20), 0) || 0) + (missionState.waypoints?.length || 0) * 12)) || 120

      const startedMs = missionState.startedAtUtc ? new Date(missionState.startedAtUtc).getTime() : Date.now()
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000))
      const remaining = Math.max(0, totalSec - elapsedSec)
      const percent = Math.min(100, Math.max(0, Math.round((elapsedSec / Math.max(totalSec, 1)) * 100)))

      const currentWp = missionState.waypoints?.[missionState.currentWaypointIndex ?? 0]
      const shelfDwell = currentWp?.dwellTimeSeconds || 20
      const currentShelfRemaining = Math.max(0, Math.min(shelfDwell, remaining))

      setLiveAdCountdown({
        remaining,
        total: totalSec,
        percent,
        currentShelfRemaining,
      })

      // Khi hết giờ, tự động dừng phiên quảng cáo để robot quay về trạng thái sẵn sàng
      if (remaining <= 0 && isAdRunning) {
        if (!hasAutoCancelledAdRef.current) {
          hasAutoCancelledAdRef.current = true
          toast.info('Thời lượng quảng cáo đã hết! Đang tự động kết thúc phiên...')
          handleCancelAd('Ad session duration timer completed')
        }
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isAdRunning, missionState, handleCancelAd])


  const handleDispatch = async (flowType, extra = {}) => {
    setDispatching(true)
    const clear = () => {
      if (flowType === 'ad')      { setAdMsg(null); setAdWaypoints(null) }
      if (flowType === 'patrol')  { setPatrolMsg(null); setPatrolWaypoints(null) }
    }
    clear()

    // 1. Kiểm tra trạng thái kết nối của robot
    if (isRobotOffline) {
      const err = `Robot ${selectedRobot || ''} hiện chưa kích hoạt dẫn đường! Vui lòng bấm [Kích Hoạt Dẫn Đường] trước khi phát lệnh.`
      toast.error(err, { autoClose: 5000 })
      if (flowType === 'ad')      setAdMsg({ type: 'error', text: `❌ ${err}` })
      if (flowType === 'patrol')  setPatrolMsg({ type: 'error', text: `❌ ${err}` })
      setDispatching(false)
      return
    }

    try {
      const payload = {
        robotCode: selectedRobot,
        flowType,
        ...extra,
      }

      // 2. Kiểm tra tính sẵn sàng (Readiness check) từ Backend cho tất cả các flow
      const check = await getRobotOperationReadiness({
        robotCode: selectedRobot,
        flowType,
        robotRouteId: payload.robotRouteId || null,
      }).catch(() => null)

      if (check) {
        setReadiness(check)
        // Khi robot vận hành qua ROS 2 / Agent Server, bỏ qua các lỗi liên quan đến tablet offline
        const relevantErrors = (check.errors || []).filter(e => 
          !e.includes('Android Robot chưa online') && 
          !e.includes('Trình phát quảng cáo Android Robot') && 
          !e.includes('Camera Android Robot')
        )
        if (!check.ready && (!isAgentActive ? check.errors?.length > 0 : relevantErrors.length > 0)) {
          const errDetail = (isAgentActive ? relevantErrors : check.errors)?.join(' • ') || 'Robot chưa sẵn sàng nhận lệnh.'
          toast.error(errDetail, { autoClose: 5000 })
          throw new Error(errDetail)
        }
      }

      const data = await dispatchAutonomous(payload)
      const msg = `✅ ${data.message || `Đã phát lệnh ${flowType}!`}`
      toast.success(msg)
      if (flowType === 'ad')      { setAdMsg({ type: 'success', text: msg });      setAdWaypoints(data.waypoints) }
      if (flowType === 'patrol')  { setPatrolMsg({ type: 'success', text: msg });  setPatrolWaypoints(data.waypoints) }
      
      // Tự động ẩn thông báo sau 45s để không chiếm diện tích màn hình
      setTimeout(() => {
        if (flowType === 'ad') {
          setAdMsg((prev) => (prev?.type === 'success' ? null : prev))
          setAdWaypoints(null)
        }
        if (flowType === 'patrol') {
          setPatrolMsg((prev) => (prev?.type === 'success' ? null : prev))
          setPatrolWaypoints(null)
        }
      }, 45000)

      if (onMissionDispatched) {
        onMissionDispatched({
          ...data,
          flowType,
          status: 'NAVIGATING',
          currentWaypointIndex: 0,
          dispatchedAt: Date.now(),
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
      {/* Robot Active Status Banner — HIỆN KHI AGENT SERVER ĐANG CHẠY */}
      {isAgentActive && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-950 dark:text-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Icon name="smart_toy" className="text-[18px]" />
              </span>
              <div>
                <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300 block uppercase tracking-wide">
                  Hệ Thống Robot: Đang Hoạt Động [{agentMode === 'amcl' ? 'Dẫn Đường' : 'Quét Map'}]
                </span>
                <p className="text-[11px] font-semibold text-emerald-800/90 dark:text-emerald-400/90 mt-0.5">
                  Robot đã sẵn sàng tiếp nhận nhiệm vụ Tuần tra hoặc Quảng cáo.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-2xs shrink-0">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SẴN SÀNG
            </span>
          </div>
        </div>
      )}

      {/* Robot Offline Alert Banner — CHỈ HIỆN KHI CHƯA KÍCH HOẠT DẪN ĐƯỜNG */}
      {isRobotOffline && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3.5 text-amber-950 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs shrink-0 mt-0.5">
              <Icon name="link_off" className="text-[18px]" />
            </span>
            <div className="flex-1">
              <span className="font-extrabold text-xs text-amber-900 block uppercase tracking-wide">
                Robot {selectedRobot} Chưa Bật Chế Độ Dẫn Đường
              </span>
              <p className="text-[11px] font-semibold text-amber-800/90 mt-1 leading-relaxed">
                Hệ thống tự hành ROS 2 trên Robot chưa chạy. Hãy bấm nút dưới đây để kích hoạt trước khi phát lệnh:
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStartOS && onStartOS('amcl')}
                  disabled={bootLoading !== null}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 px-3 text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <span>🧭</span>
                  <span>{bootLoading === 'amcl' ? 'Đang kích hoạt...' : 'Kích Hoạt Dẫn Đường Ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

          {/* 🔴 CARD ĐẾM NGƯỢC THỜI GIAN THỰC KHI PHIÊN QUẢNG CÁO ĐANG CHẠY */}
          {isAdRunning && (
            <div className="mb-4 rounded-2xl border-2 border-orange-500 bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-orange-600/20 p-4 shadow-md backdrop-blur-xs">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex size-3 rounded-full bg-orange-600"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-orange-950">
                    Đang Phát Quảng Cáo ({missionState.isFreeRoam || missionState.adMode === 'freeroam' ? 'Tự Do' : 'Theo Kệ'})
                  </span>
                </div>
                <span className="rounded-md border border-orange-400/40 bg-orange-600/10 px-2 py-0.5 text-[10px] font-black text-orange-900">
                  Robot: {selectedRobot}
                </span>
              </div>

              {/* Big Digital Countdown Clock */}
              <div className="my-2.5 flex flex-col items-center justify-center rounded-xl bg-neutral-900 py-3 px-4 text-white shadow-inner border border-neutral-800">
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                  Thời Gian Phiên Còn Lại
                </span>
                <span className="font-mono text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  {formatTime(liveAdCountdown.remaining)}
                </span>
                <div className="mt-1 text-[11px] font-semibold text-neutral-400">
                  {liveAdCountdown.remaining > 0
                    ? `Đã chạy ~${formatHumanDuration(liveAdCountdown.total - liveAdCountdown.remaining)} / Tổng ~${formatHumanDuration(liveAdCountdown.total)}`
                    : 'Đang hoàn tất vòng phát quảng cáo...'}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-orange-950">
                  <span>Tiến độ phiên</span>
                  <span>{liveAdCountdown.percent}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-orange-200/90 border border-orange-300">
                  <div
                    className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${liveAdCountdown.percent}%` }}
                  />
                </div>
              </div>

              {/* Per-shelf details when running shelf mode */}
              {missionState.adMode !== 'freeroam' && !missionState.isFreeRoam && (
                <div className="mb-3 rounded-xl border border-orange-300 bg-white/95 p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                    <span className="flex items-center gap-1.5 text-orange-700">
                      <Icon name="shelves" className="text-[16px]" />
                      Kệ hiện tại:
                    </span>
                    <span className="font-extrabold text-neutral-900">
                      {missionState.waypoints?.[missionState.currentWaypointIndex ?? 0]?.shelfName || `Kệ #${(missionState.currentWaypointIndex ?? 0) + 1}`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-600">
                    <span>Tiến độ mốc:</span>
                    <span className="font-semibold text-orange-950">
                      Kệ {(missionState.currentWaypointIndex ?? 0) + 1} / {missionState.waypointCount || missionState.waypoints?.length || 1}
                    </span>
                  </div>
                  {liveAdCountdown.currentShelfRemaining > 0 && (
                    <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                      ⏱ Dừng phát tại kệ: còn ~{liveAdCountdown.currentShelfRemaining}s
                    </div>
                  )}
                </div>
              )}

              {/* Cancel Button */}
              <button
                type="button"
                disabled={cancellingAd}
                onClick={handleCancelAd}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:from-rose-700 hover:to-red-700 active:scale-98 disabled:opacity-50"
              >
                {cancellingAd ? (
                  <Icon name="progress_activity" className="animate-spin text-[16px]" />
                ) : (
                  <Icon name="stop_circle" className="text-[16px]" />
                )}
                Dừng / Hủy Phiên Quảng Cáo
              </button>
            </div>
          )}

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
              Tự Do (Toàn Shop)
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
              <Icon name="grid_view" className="text-[15px]" />
              Theo Khu Vực & Kệ
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
                    placeholder="1 vòng (~2 phút)"
                    value={adDuration}
                    onChange={(e) => setAdDuration(e.target.value)}
                    className="w-full rounded-xl border-2 border-orange-300 bg-white py-2 pl-3 pr-12 text-xs font-extrabold text-neutral-900 outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm"
                  />
                  <span className="absolute right-3 text-xs font-bold text-orange-900 pointer-events-none">
                    phút
                  </span>
                </div>
                <span className="mt-1 text-xs font-semibold text-neutral-800">Robot đi liên tục không dừng, phát quảng cáo toàn siêu thị (12s/sản phẩm). Trống = đi 1 vòng.</span>
              </div>

              {/* Live Preview Duration for Free Roam */}
              {adEstimate && (
                <div className="mb-3 rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60 p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon name="timer" className="text-orange-600 text-[17px]" />
                      <span className="text-xs font-black text-orange-950">
                        Thời lượng phiên:
                      </span>
                    </div>
                    <span className="rounded-md bg-orange-600 px-2 py-0.5 text-xs font-black text-white">
                      ~{formatHumanDuration(adEstimate.totalEstimatedSeconds)}
                    </span>
                  </div>
                </div>
              )}

              <div className="mb-3 flex gap-2">
                <button
                  disabled={dispatching}
                  onClick={() => handleDispatch('ad', {
                    dwellTimeSeconds: 0,
                    isLooping: true,
                    durationMinutes: adDuration ? Number(adDuration) : undefined,
                    floorId: map?.floorId || 1,
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
              {/* Header: Label & Quick Preset Filter */}
              <div className="mb-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                    <Icon name="storefront" className="text-[16px] text-orange-700" />
                    Khu vực & Kệ (Đã chọn: {selectedAdShelfIds.length}/{validShelves.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedAdShelfIds.length === validShelves.length) setSelectedAdShelfIds([])
                      else setSelectedAdShelfIds(validShelves.map(s => s.shelfId))
                    }}
                    className="text-xs font-extrabold text-orange-700 hover:text-orange-900 hover:underline"
                  >
                    {selectedAdShelfIds.length === validShelves.length ? 'Bỏ chọn hết' : 'Chọn tất cả 6 kệ'}
                  </button>
                </div>

                {/* Quick Presets Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedAdShelfIds(validShelves.map(s => s.shelfId))}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all border ${
                      selectedAdShelfIds.length === validShelves.length && validShelves.length > 0
                        ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-orange-50 hover:border-orange-300'
                    }`}
                  >
                    Toàn bộ siêu thị
                  </button>

                  {zonesWithShelves.map((z) => {
                    const memberIds = z.shelves.map((s) => s.shelfId)
                    const countInZone = memberIds.filter((id) => selectedAdShelfIds.includes(id)).length
                    const isAllInZone = memberIds.length > 0 && countInZone === memberIds.length
                    const isPartial = countInZone > 0 && countInZone < memberIds.length

                    return (
                      <button
                        key={`quick-zone-${z.zoneId}`}
                        type="button"
                        onClick={() => {
                          if (isAllInZone) {
                            setSelectedAdShelfIds((prev) => prev.filter((id) => !memberIds.includes(id)))
                          } else {
                            setSelectedAdShelfIds((prev) => [...new Set([...prev, ...memberIds])])
                          }
                        }}
                        className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all border ${
                          isAllInZone
                            ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                            : isPartial
                              ? 'bg-amber-100 text-amber-950 border-amber-400 font-extrabold'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon name={z.icon} className="text-[13px]" />
                        <span>Khu {z.zoneId} (Kệ {memberIds.join('-')})</span>
                        {countInZone > 0 && (
                          <span className={`ml-0.5 rounded px-1 text-[9px] font-black ${
                            isAllInZone ? 'bg-orange-800 text-white' : 'bg-amber-300 text-amber-950'
                          }`}>
                            {countInZone}/{memberIds.length}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Grouped Zone Cards */}
              <div className="mb-3 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {zonesWithShelves.map((z) => {
                  const memberIds = z.shelves.map((s) => s.shelfId)
                  const selectedInZone = memberIds.filter((id) => selectedAdShelfIds.includes(id))
                  const allSelected = memberIds.length > 0 && selectedInZone.length === memberIds.length
                  const someSelected = selectedInZone.length > 0 && !allSelected

                  const toggleZone = () => {
                    if (allSelected) {
                      setSelectedAdShelfIds((prev) => prev.filter((id) => !memberIds.includes(id)))
                    } else {
                      setSelectedAdShelfIds((prev) => [...new Set([...prev, ...memberIds])])
                    }
                  }

                  const selectOnlyThisZone = (e) => {
                    e.stopPropagation()
                    setSelectedAdShelfIds(memberIds)
                  }

                  return (
                    <div
                      key={`zone-card-${z.zoneId}`}
                      className={`rounded-xl border-2 transition-all overflow-hidden ${
                        allSelected
                          ? 'border-orange-500 bg-orange-50/60 shadow-xs'
                          : someSelected
                            ? 'border-amber-400 bg-amber-50/40 shadow-2xs'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      {/* Zone Header with Master Checkbox */}
                      <div
                        onClick={toggleZone}
                        className="flex cursor-pointer items-center justify-between gap-2 border-b border-neutral-200/80 bg-neutral-50/90 px-3 py-2 hover:bg-neutral-100/90 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected
                            }}
                            onChange={toggleZone}
                            onClick={(e) => e.stopPropagation()}
                            className="size-4 rounded accent-orange-600 cursor-pointer shrink-0"
                          />
                          <span className={`flex size-6 items-center justify-center rounded-md text-white shrink-0 ${
                            z.zoneId === 1 ? 'bg-amber-600' : z.zoneId === 2 ? 'bg-emerald-600' : 'bg-purple-600'
                          }`}>
                            <Icon name={z.icon} className="text-[15px]" />
                          </span>
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-neutral-900 block truncate">
                              {z.label}: {z.zoneName}
                            </span>
                            {z.zoneDesc && (
                              <p className="text-[10px] text-neutral-500 truncate">{z.zoneDesc}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black border ${
                            allSelected
                              ? 'bg-orange-600 text-white border-orange-600'
                              : someSelected
                                ? 'bg-amber-200 text-amber-950 border-amber-300'
                                : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                          }`}>
                            {selectedInZone.length}/{memberIds.length} kệ
                          </span>
                          <button
                            type="button"
                            onClick={selectOnlyThisZone}
                            title={`Chỉ chạy các kệ trong ${z.label}`}
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold text-orange-700 hover:bg-orange-100/80 transition-colors"
                          >
                            Chỉ khu này
                          </button>
                        </div>
                      </div>

                      {/* Member Shelves List */}
                      <div className="p-1.5 space-y-1 bg-white/70">
                        {z.shelves.map((shelf) => {
                          const isShelfSelected = selectedAdShelfIds.includes(shelf.shelfId)
                          return (
                            <label
                              key={`shelf-opt-${shelf.shelfId}`}
                              className={`flex cursor-pointer items-center justify-between rounded-lg p-2 transition-all ${
                                isShelfSelected
                                  ? 'bg-orange-100/90 border border-orange-300 shadow-2xs text-neutral-900'
                                  : 'hover:bg-neutral-100 border border-transparent text-neutral-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isShelfSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedAdShelfIds((prev) => [...prev, shelf.shelfId])
                                    else setSelectedAdShelfIds((prev) => prev.filter((id) => id !== shelf.shelfId))
                                  }}
                                  className="size-4 rounded accent-orange-600 cursor-pointer shrink-0"
                                />
                                <Icon name="shelves" className="text-[17px] text-orange-700 shrink-0" />
                                <div className="min-w-0 text-xs">
                                  <span className="font-bold text-neutral-900">{shelf.shelfName}</span>
                                  {shelf.aisleName && (
                                    <span className="ml-1.5 text-[11px] font-semibold text-neutral-500">
                                      ({shelf.aisleCode || shelf.aisleName})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-neutral-400 shrink-0 font-mono">
                                Node #{shelf.nodeId}
                              </span>
                            </label>
                          )
                        })}
                        {z.shelves.length === 0 && (
                          <div className="p-2 text-center text-xs font-semibold text-neutral-400">
                            Chưa có kệ nào được gán tọa độ trong khu vực này.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tự động dự tính thời lượng theo chiến dịch & sản phẩm trên kệ */}
              {adEstimate && adEstimate.shelfCount > 0 && (
                <div className="mb-3 rounded-xl border-2 border-orange-400 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/70 p-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon name="timer" className="text-orange-600 text-[18px]" />
                      <span className="text-xs font-black uppercase tracking-wide text-orange-950">
                        Thời lượng phiên dự kiến:
                      </span>
                    </div>
                    <span className="rounded-lg bg-orange-600 px-2.5 py-0.5 text-xs font-black text-white shadow-xs">
                      ~{formatHumanDuration(adEstimate.totalEstimatedSeconds)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold text-orange-900 leading-snug">
                    Tự động tính: <strong>{adEstimate.shelfCount} kệ</strong> · <strong>{adEstimate.totalProductCount} sản phẩm</strong> tài trợ (15s/sản phẩm + dừng tối thiểu 20s/kệ + thời gian di chuyển).
                  </p>
                  {adEstimate.shelves?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {adEstimate.shelves.map((s) => (
                        <span key={s.shelfId} className="rounded-md border border-orange-300 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-orange-950 shadow-2xs">
                          {s.shelfName}: {s.productCount} SP ({s.dwellSeconds}s)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Note giải thích tự động tính thời gian theo playlist & AdCampaignZone */}
              <div className="mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs text-neutral-900 shadow-xs">
                <div className="flex items-start gap-2">
                  <Icon name="info" className="mt-0.5 text-[18px] text-amber-800 shrink-0" />
                  <div className="space-y-1">
                    <p className="leading-relaxed font-semibold">
                      Robot sẽ lần lượt đến các kệ đã chọn, tự động đọc và chiếu <strong className="font-extrabold text-orange-900 underline decoration-orange-400">tất cả chiến dịch quảng cáo</strong> gán cho Khu vực (AdCampaignZone) và Kệ (AdCampaignShelf) theo thứ tự ưu tiên điểm gói (VIP &gt; Nâng cao &gt; Cơ bản).
                    </p>
                    <p className="text-[11px] text-amber-950 font-medium">
                      💡 Bạn có thể chọn toàn bộ khu vực (2 kệ) hoặc chỉ 1 kệ đơn lẻ tùy nhu cầu phát sóng.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  disabled={dispatching || selectedAdShelfIds.length === 0}
                  onClick={() => {
                    const targetNodeIds = validShelves
                      .filter((s) => selectedAdShelfIds.includes(s.shelfId) && s.nodeId)
                      .map((s) => s.nodeId)
                    handleDispatch('ad', {
                      nodeIds: targetNodeIds,
                      shelfIds: selectedAdShelfIds,
                      floorId: map?.floorId || 1,
                    })
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:from-orange-700 hover:to-amber-700 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="play_arrow" className="text-[16px]" />}
                  Bắt Đầu Quảng Cáo ({selectedAdShelfIds.length} kệ đã chọn)
                </button>
              </div>
            </>
          )}

          <StatusBadge msg={adMsg} onDismiss={() => setAdMsg(null)} />
          <WaypointList waypoints={adWaypoints} onDismiss={() => setAdWaypoints(null)} />
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

          {/* Sweep / Dwell Duration Selector */}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-500/10 px-3 py-2 border border-blue-500/20">
            <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Icon name="timer" className="text-[14px] text-blue-600" />
              Thời gian lia camera tại mỗi kệ:
            </span>
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

          {/* Header: Label & Quick Preset Filter */}
          <div className="mb-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                <Icon name="storefront" className="text-[16px] text-blue-700" />
                Khu vực & Kệ Tuần Tra (Đã chọn: {selectedShelfIds.length}/{validShelves.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedShelfIds.length === validShelves.length) setSelectedShelfIds([])
                  else setSelectedShelfIds(validShelves.map(s => s.shelfId))
                }}
                className="text-xs font-extrabold text-blue-700 hover:text-blue-900 hover:underline"
              >
                {selectedShelfIds.length === validShelves.length ? 'Bỏ chọn hết' : 'Chọn tất cả 6 kệ'}
              </button>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setSelectedShelfIds(validShelves.map(s => s.shelfId))}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all border ${
                  selectedShelfIds.length === validShelves.length && validShelves.length > 0
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                Toàn bộ siêu thị
              </button>

              {zonesWithShelves.map((z) => {
                const memberIds = z.shelves.map((s) => s.shelfId)
                const countInZone = memberIds.filter((id) => selectedShelfIds.includes(id)).length
                const isAllInZone = memberIds.length > 0 && countInZone === memberIds.length
                const isPartial = countInZone > 0 && countInZone < memberIds.length

                return (
                  <button
                    key={`patrol-quick-zone-${z.zoneId}`}
                    type="button"
                    onClick={() => {
                      if (isAllInZone) {
                        setSelectedShelfIds((prev) => prev.filter((id) => !memberIds.includes(id)))
                      } else {
                        setSelectedShelfIds((prev) => [...new Set([...prev, ...memberIds])])
                      }
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all border ${
                      isAllInZone
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : isPartial
                          ? 'bg-blue-100 text-blue-950 border-blue-400 font-extrabold'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon name={z.icon} className="text-[13px]" />
                    <span>Khu {z.zoneId} (Kệ {memberIds.join('-')})</span>
                    {countInZone > 0 && (
                      <span className={`ml-0.5 rounded px-1 text-[9px] font-black ${
                        isAllInZone ? 'bg-blue-800 text-white' : 'bg-blue-300 text-blue-950'
                      }`}>
                        {countInZone}/{memberIds.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Grouped Zone Cards for Patrol */}
          <div className="mb-3 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {zonesWithShelves.map((z) => {
              const memberIds = z.shelves.map((s) => s.shelfId)
              const selectedInZone = memberIds.filter((id) => selectedShelfIds.includes(id))
              const allSelected = memberIds.length > 0 && selectedInZone.length === memberIds.length
              const someSelected = selectedInZone.length > 0 && !allSelected

              const toggleZone = () => {
                if (allSelected) {
                  setSelectedShelfIds((prev) => prev.filter((id) => !memberIds.includes(id)))
                } else {
                  setSelectedShelfIds((prev) => [...new Set([...prev, ...memberIds])])
                }
              }

              const selectOnlyThisZone = (e) => {
                e.stopPropagation()
                setSelectedShelfIds(memberIds)
              }

              return (
                <div
                  key={`patrol-zone-card-${z.zoneId}`}
                  className={`rounded-xl border-2 transition-all overflow-hidden ${
                    allSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                      : someSelected
                        ? 'border-indigo-400 bg-indigo-50/40 shadow-2xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  {/* Zone Header with Master Checkbox */}
                  <div
                    onClick={toggleZone}
                    className="flex cursor-pointer items-center justify-between gap-2 border-b border-neutral-200/80 bg-neutral-50/90 px-3 py-2 hover:bg-neutral-100/90 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected
                        }}
                        onChange={toggleZone}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 rounded accent-blue-600 cursor-pointer shrink-0"
                      />
                      <span className={`flex size-6 items-center justify-center rounded-md text-white shrink-0 ${
                        z.zoneId === 1 ? 'bg-amber-600' : z.zoneId === 2 ? 'bg-emerald-600' : 'bg-purple-600'
                      }`}>
                        <Icon name={z.icon} className="text-[15px]" />
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-neutral-900 block truncate">
                          {z.label}: {z.zoneName}
                        </span>
                        {z.zoneDesc && (
                          <p className="text-[10px] text-neutral-500 truncate">{z.zoneDesc}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black border ${
                        allSelected
                          ? 'bg-blue-600 text-white border-blue-700'
                          : someSelected
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}>
                        {selectedInZone.length}/{memberIds.length} kệ
                      </span>
                      <button
                        type="button"
                        onClick={selectOnlyThisZone}
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100/60 transition-colors"
                        title="Chỉ chọn các kệ trong khu này"
                      >
                        Chỉ khu này
                      </button>
                    </div>
                  </div>

                  {/* Shelves in Zone */}
                  <div className="p-2 space-y-1.5 bg-white/80">
                    {z.shelves.map((shelf) => {
                      const isChecked = selectedShelfIds.includes(shelf.shelfId)
                      return (
                        <label
                          key={`patrol-shelf-${shelf.shelfId}`}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                            isChecked
                              ? 'border-blue-400 bg-blue-50/80 font-bold text-neutral-900 shadow-2xs'
                              : 'border-neutral-200/80 bg-white text-neutral-600 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedShelfIds((prev) => prev.filter((id) => id !== shelf.shelfId))
                                } else {
                                  setSelectedShelfIds((prev) => [...prev, shelf.shelfId])
                                }
                              }}
                              className="size-3.5 rounded accent-blue-600 cursor-pointer shrink-0"
                            />
                            <Icon name="shelves" className={`text-[16px] shrink-0 ${isChecked ? 'text-blue-600' : 'text-neutral-400'}`} />
                            <div className="min-w-0 truncate">
                              <span className="truncate">{shelf.shelfName}</span>
                              {shelf.aisleCode && (
                                <span className="ml-1 text-[10px] font-normal text-neutral-500">
                                  ({shelf.aisleCode})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                            <span className="rounded bg-neutral-100 px-1 py-0.2 text-neutral-500">
                              Node #{shelf.nodeId ?? '?'}
                            </span>
                            <span className="rounded bg-blue-500/10 px-1 py-0.2 font-bold text-blue-600">
                              WP #{shelf.shelfId}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info banner */}
          <div className="mb-3 rounded-xl border-2 border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-950 shadow-xs">
            <div className="flex items-start gap-2">
              <Icon name="info" className="mt-0.5 text-[18px] text-blue-700 shrink-0" />
              <div className="space-y-1">
                <p className="leading-relaxed font-semibold">
                  Robot sẽ lần lượt di chuyển tới các kệ đã chọn, dừng lại lia camera {patrolDwell}s để <strong className="font-extrabold text-blue-900">Gemini AI phân tích mật độ hàng hóa & phát hiện ô trống OOS</strong>.
                </p>
                <p className="text-[11px] text-blue-900 font-medium">
                  💡 Khi phát hiện hết hàng hoặc cần bổ sung, hệ thống sẽ tự động tạo nhiệm vụ cho nhân viên trong tab Quản Lý Tuần Tra.
                </p>
              </div>
            </div>
          </div>

          {/* Dispatch Button */}
          <div className="mb-3 flex gap-2">
            <button
              disabled={dispatching || selectedShelfIds.length === 0}
              onClick={() => {
                const targetNodeIds = validShelves
                  .filter((s) => selectedShelfIds.includes(s.shelfId) && s.nodeId)
                  .map((s) => s.nodeId)
                handleDispatch('patrol', {
                  nodeIds: targetNodeIds,
                  shelfIds: selectedShelfIds,
                  floorId: map?.floorId || 1,
                  dwellTimeSeconds: Number(patrolDwell) || 3
                })
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {dispatching ? <Icon name="progress_activity" className="animate-spin text-[16px]" /> : <Icon name="search" className="text-[16px]" />}
              Bắt Đầu Tuần Tra ({selectedShelfIds.length} kệ đã chọn)
            </button>
          </div>

          <StatusBadge msg={patrolMsg} onDismiss={() => setPatrolMsg(null)} />
          <WaypointList waypoints={patrolWaypoints} onDismiss={() => setPatrolWaypoints(null)} />
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

function RobotsTab({
  robots = [],
  poses = {},
  selectedRobotCode,
  selectedRobotObj: propRobotObj,
  onSelectRobot,
  onMissionDispatched,
  map,
  rosWsUrl,
  setRosWsUrl,
  wsConnected,
  setWsConnected,
  wsConnecting,
  setWsConnecting,
  showWsConfig,
  setShowWsConfig,
  agentStatus,
  setAgentStatus,
  agentMode,
  setAgentMode,
  bootLoading,
  setBootLoading,
  handleStartOS,
  handleStopOS,
  handleSaveMap,
  handleToggleWs,
}) {
  const [detailRobotCode, setDetailRobotCode] = useState(null)
  const [ctrlLoading, setCtrlLoading] = useState(false)
  const [ctrlMsg, setCtrlMsg] = useState(null)
  const [activeKey, setActiveKey] = useState(null)
  const [teleopSpeed, setTeleopSpeed] = useState(70)
  const [teleopTurnSpeed, setTeleopTurnSpeed] = useState(70)
  const [showWsConfigDirect, setShowWsConfigDirect] = useState(false)

  // Quản lý kết nối WebSocket trực tiếp đến ESP32 (:81) chuẩn từ WebManager
  const [espIp, setEspIp] = useState(() => {
    const saved = localStorage.getItem('smb_robot_ip')
    if (saved && saved.includes('.')) return saved
    return '192.168.4.1'
  })
  const [espWsConnected, setEspWsConnected] = useState(false)
  const [espWsConnecting, setEspWsConnecting] = useState(false)
  const espWsRef = useRef(null)

  // Phân giải Node ID cho Trạm Sạc (Dock) và Vị Trí Gốc (Cashier / Thu Ngân) từ active map
  const dockNodeId = map?.nodes?.find(n => n.nodeRole === 'dock' || n.nodeType === 'dock' || n.nodeId === 8)?.nodeId || 8
  const homeNodeId = map?.nodes?.find(n => n.nodeRole === 'cashier' || n.nodeType === 'checkout' || n.nodeId === 7)?.nodeId || 7

  const selectedRobot = selectedRobotCode || (robots[0]?.robotCode ?? '')
  const selectedRobotObj = robots.find(
    (r) => r.robotCode === selectedRobot ||
      (selectedRobot === 'RB001' && r.robotCode === 'RB0001') ||
      (selectedRobot === 'RB0001' && r.robotCode === 'RB001')
  )

  // Đồng bộ IP từ backend khi robot có IP mới
  useEffect(() => {
    if (selectedRobotObj?.ipAddress && selectedRobotObj.ipAddress !== '0.0.0.0' && selectedRobotObj.ipAddress.includes('.')) {
      setEspIp(selectedRobotObj.ipAddress)
      localStorage.setItem('smb_robot_ip', selectedRobotObj.ipAddress)
    }
  }, [selectedRobotObj?.ipAddress])

  // Hàm kết nối/ngắt kết nối WebSocket cổng 81 của ESP32
  const toggleEspWs = useCallback(() => {
    if (espWsConnected) {
      if (espWsRef.current) {
        espWsRef.current.close()
        espWsRef.current = null
      }
      setEspWsConnected(false)
      toast.info('Đã ngắt kết nối WebSocket cổng 81 của ESP32.')
      return
    }

    setEspWsConnecting(true)
    try {
      const ws = new WebSocket(`ws://${espIp}:81`)
      ws.onopen = () => {
        espWsRef.current = ws
        setEspWsConnected(true)
        setEspWsConnecting(false)
        localStorage.setItem('smb_robot_ip', espIp)
        toast.success(`Đã kết nối trực tiếp ESP32 ws://${espIp}:81 (< 5ms)`)
      }
      ws.onclose = () => {
        espWsRef.current = null
        setEspWsConnected(false)
        setEspWsConnecting(false)
      }
      ws.onerror = () => {
        espWsRef.current = null
        setEspWsConnected(false)
        setEspWsConnecting(false)
        toast.warn(`Không kết nối được ws://${espIp}:81 (Tự động chuyển tiếp qua ROS 2 / Cloud Relay)`)
      }
    } catch (e) {
      setEspWsConnecting(false)
      setEspWsConnected(false)
      toast.warn(`Lỗi mở WebSocket ESP32: ${e.message}`)
    }
  }, [espIp, espWsConnected])

  // Tự động kết nối WebSocket cổng 81 của ESP32 nếu có IP hợp lệ và chưa kết nối
  useEffect(() => {
    if (!espIp || !espIp.includes('.') || espIp === '0.0.0.0' || espWsConnected || espWsConnecting || espWsRef.current) return
    try {
      const ws = new WebSocket(`ws://${espIp}:81`)
      let isOpened = false
      ws.onopen = () => {
        isOpened = true
        espWsRef.current = ws
        setEspWsConnected(true)
        setEspWsConnecting(false)
      }
      ws.onerror = () => {
        if (!isOpened) {
          espWsRef.current = null
          setEspWsConnected(false)
          setEspWsConnecting(false)
        }
      }
      ws.onclose = () => {
        espWsRef.current = null
        setEspWsConnected(false)
        setEspWsConnecting(false)
      }
    } catch {}
  }, [espIp, espWsConnected, espWsConnecting])

  // ─── Điều Khiển Lái Tay Trực Tiếp (Đa Kênh: WS 81 + ROS 2 :9090 /cmd_vel + Cloud Relay) ───
  const [controlType, setControlType] = useState('joystick') // 'joystick' | 'dpad'
  const joystickZoneRef = useRef(null)
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })
  const [joyCoords, setJoyCoords] = useState({ x: 0, y: 0 })
  const joyDragRef = useRef(false)
  const lastJxRef = useRef(0)
  const lastJyRef = useRef(0)
  const lastJoySendRef = useRef(0)
  const joyIntervalRef = useRef(null)

  const moveIntervalRef = useRef(null)
  const isMovingRef = useRef(false)
  const teleopSpeedRef = useRef(70)
  const teleopTurnSpeedRef = useRef(70)
  teleopSpeedRef.current = teleopSpeed
  teleopTurnSpeedRef.current = teleopTurnSpeed
  const activeKeysRef = useRef(new Set())

  // Bộ quản lý timeout dừng để triệt tiêu hoàn toàn hiện tượng dực dực do ghost stopping
  const stopTimeoutsRef = useRef([])
  const clearStopTimeouts = useCallback(() => {
    stopTimeoutsRef.current.forEach(t => clearTimeout(t))
    stopTimeoutsRef.current = []
  }, [])

  // Gửi lệnh điều khiển đa kênh:
  // 1. Nếu WebSocket ESP32 :81 mở -> Gửi { t: 'joy', x, y, s: 0 } (< 5ms)
  // 2. Nếu ROS 2 :9090 (Rosbridge) mở -> Gửi geometry_msgs/msg/Twist tới /cmd_vel chuẩn REP-103
  // 3. Nếu cả 2 chưa mở -> Dự phòng gửi qua Cloud Relay (Tablet)
  const sendRawCommand = useCallback((x, y, strafe = 0) => {
    if (!selectedRobot) return

    let sent = false

    // Kênh 1: Direct ESP32 WebSocket Cổng 81
    if (espWsRef.current && espWsRef.current.readyState === WebSocket.OPEN) {
      try {
        espWsRef.current.send(JSON.stringify({ t: 'joy', x, y, s: strafe }))
        sent = true
      } catch (err) {
        console.warn('ESP32 WS direct send error:', err)
      }
    }

    // Kênh 2: Rosbridge WebSocket Cổng 9090 (/cmd_vel trên Raspberry Pi / Micro-ROS)
    if (window._rosInstance && window._rosInstance.readyState === WebSocket.OPEN) {
      try {
        const maxLin = 0.20 * (teleopSpeedRef.current / 100)
        const maxAng = 2.00 * (teleopTurnSpeedRef.current / 100)
        // Chuẩn ROS 2 REP-103: rẽ trái CCW là angZ dương (+), rẽ phải CW là angZ âm (-)
        const linX = Number(((y / 100) * maxLin).toFixed(4))
        const angZ = Number((-(x / 100) * maxAng).toFixed(4))

        const rosCmd = {
          op: 'publish',
          topic: '/cmd_vel',
          type: 'geometry_msgs/msg/Twist',
          msg: {
            linear: { x: linX, y: 0.0, z: 0.0 },
            angular: { x: 0.0, y: 0.0, z: angZ }
          }
        }
        window._rosInstance.send(JSON.stringify(rosCmd))
        sent = true
      } catch (err) {
        console.warn('ROS 2 cmd_vel send error:', err)
      }
    }

    // Kênh 3: Dự phòng qua Cloud Relay
    if (!sent) {
      const payloadStr = JSON.stringify({ t: 'joy', x, y, s: strafe })
      publishRobotCommand({
        robotCode: selectedRobot,
        command: 'MANUAL_TELEOP',
        payload: payloadStr,
        commandType: 'MANUAL_TELEOP',
        payloadJson: payloadStr,
      }).catch(() => {})
    }
  }, [selectedRobot])

  const sendAuxCommand = useCallback((type, extra = {}) => {
    if (!selectedRobot) return
    const payloadObj = { t: type, ...extra }
    if (espWsRef.current && espWsRef.current.readyState === WebSocket.OPEN) {
      try {
        espWsRef.current.send(JSON.stringify(payloadObj))
        return
      } catch {}
    }
    const payloadStr = JSON.stringify(payloadObj)
    publishRobotCommand({
      robotCode: selectedRobot,
      command: 'MANUAL_TELEOP',
      payload: payloadStr,
      commandType: 'MANUAL_TELEOP',
      payloadJson: payloadStr,
    }).catch(() => {})
  }, [selectedRobot])

  // Cập nhật Slider Tốc Độ Chạy Thẳng (gửi { t: 'spd', v })
  const handleSpeedChange = useCallback((val) => {
    const num = Number(val)
    setTeleopSpeed(num)
    teleopSpeedRef.current = num
    sendAuxCommand('spd', { v: num })
  }, [sendAuxCommand])

  // Cập nhật Slider Lực Xoay Hướng (gửi { t: 'spdRotate', v })
  const handleTurnSpeedChange = useCallback((val) => {
    const num = Number(val)
    setTeleopTurnSpeed(num)
    teleopTurnSpeedRef.current = num
    sendAuxCommand('spdRotate', { v: num })
  }, [sendAuxCommand])

  // Tự động kích hoạt MODE_MANUAL (mode: 0) và đồng bộ tốc độ khi chọn robot
  useEffect(() => {
    if (!selectedRobot) return
    sendAuxCommand('mode', { m: 0 })
    sendAuxCommand('spd', { v: teleopSpeedRef.current })
    sendAuxCommand('spdRotate', { v: teleopTurnSpeedRef.current })
  }, [selectedRobot, sendAuxCommand])

  // ─── Logic Joystick Cần Tròn 360° (Thuần mượt mà, triệt tiêu jitter) ───
  const handleJoyMove = useCallback((clientX, clientY) => {
    if (!joystickZoneRef.current) return
    clearStopTimeouts()
    const r = joystickZoneRef.current.getBoundingClientRect()
    const R = Math.max(24, Math.min(r.width, r.height) / 2 - 12)
    let ox = clientX - r.left - r.width / 2
    let oy = clientY - r.top - r.height / 2
    const dist = Math.sqrt(ox * ox + oy * oy)
    if (dist > R) {
      ox = (ox * R) / dist
      oy = (oy * R) / dist
    }
    const jx = Math.round((ox / R) * 100)
    const jy = Math.round((-oy / R) * 100) // Kéo lên là tiến (+), kéo xuống là lùi (-)
    lastJxRef.current = jx
    lastJyRef.current = jy
    setKnobPos({ x: ox, y: oy })
    setJoyCoords({ x: jx, y: jy })

    const now = Date.now()
    if (now - lastJoySendRef.current >= 80) {
      lastJoySendRef.current = now
      sendRawCommand(jx, jy, 0)
    }
  }, [clearStopTimeouts, sendRawCommand])

  const handleJoyStart = useCallback((clientX, clientY) => {
    joyDragRef.current = true
    clearStopTimeouts()
    // Đảm bảo robot ở mode 0 (MODE_MANUAL)
    sendAuxCommand('mode', { m: 0 })

    if (joyIntervalRef.current) clearInterval(joyIntervalRef.current)
    joyIntervalRef.current = setInterval(() => {
      if (joyDragRef.current) {
        sendRawCommand(lastJxRef.current, lastJyRef.current, 0)
      }
    }, 100)

    handleJoyMove(clientX, clientY)
  }, [clearStopTimeouts, sendAuxCommand, handleJoyMove, sendRawCommand])

  const handleJoyEnd = useCallback(() => {
    if (!joyDragRef.current) return
    joyDragRef.current = false
    if (joyIntervalRef.current) {
      clearInterval(joyIntervalRef.current)
      joyIntervalRef.current = null
    }
    lastJxRef.current = 0
    lastJyRef.current = 0
    setKnobPos({ x: 0, y: 0 })
    setJoyCoords({ x: 0, y: 0 })

    clearStopTimeouts()
    sendRawCommand(0, 0, 0)
    const t = setTimeout(() => {
      if (!joyDragRef.current && !isMovingRef.current) {
        sendRawCommand(0, 0, 0)
      }
    }, 80)
    stopTimeoutsRef.current.push(t)
  }, [clearStopTimeouts, sendRawCommand])

  // Lắng nghe sự kiện di chuyển & nhả chuột/touch toàn window cho Joystick
  useEffect(() => {
    const onMouseMove = (e) => {
      if (joyDragRef.current) handleJoyMove(e.clientX, e.clientY)
    }
    const onMouseUp = () => {
      if (joyDragRef.current) handleJoyEnd()
    }
    const onTouchMove = (e) => {
      if (joyDragRef.current && e.touches[0]) {
        e.preventDefault()
        handleJoyMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const onTouchEnd = () => {
      if (joyDragRef.current) handleJoyEnd()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [handleJoyMove, handleJoyEnd])

  // ─── Logic D-Pad Nút Bấm & Bàn Phím ───
  const startManualDrive = useCallback((direction, x, y) => {
    if (!selectedRobot) return
    clearStopTimeouts()
    setActiveKey(direction)
    isMovingRef.current = true

    // Đảm bảo robot ở mode 0 (MODE_MANUAL)
    sendAuxCommand('mode', { m: 0 })

    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current)
    }

    // Gửi ngay lập tức
    sendRawCommand(x, y, 0)

    // Lặp gửi lại mỗi 100ms (10Hz chuẩn không nghẽn mạng)
    moveIntervalRef.current = setInterval(() => {
      if (isMovingRef.current) {
        sendRawCommand(x, y, 0)
      }
    }, 100)
  }, [selectedRobot, clearStopTimeouts, sendAuxCommand, sendRawCommand])

  const stopManualDrive = useCallback(() => {
    if (!selectedRobot) return
    setActiveKey(null)
    isMovingRef.current = false
    activeKeysRef.current.clear()

    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current)
      moveIntervalRef.current = null
    }

    clearStopTimeouts()

    // Gửi lệnh dừng dứt khoát ngay lập tức
    sendRawCommand(0, 0, 0)

    // Xác nhận dừng lần 2 sau 80ms nếu robot vẫn đang dừng
    const t = setTimeout(() => {
      if (!isMovingRef.current && !joyDragRef.current) {
        sendRawCommand(0, 0, 0)
      }
    }, 80)
    stopTimeoutsRef.current.push(t)
  }, [selectedRobot, clearStopTimeouts, sendRawCommand])

  // Hàm xoay snap 90 độ hỗ trợ cả ESP32 lẫn ROS 2
  const handleSnapRotate = useCallback((deg) => {
    if (!selectedRobot) return
    if (espWsRef.current && espWsRef.current.readyState === WebSocket.OPEN) {
      sendAuxCommand('snap90', { deg })
      return
    }
    if (window._rosInstance && window._rosInstance.readyState === WebSocket.OPEN) {
      const angZ = deg > 0 ? -1.5 : 1.5
      const durationMs = 1050
      const rosTurn = {
        op: 'publish',
        topic: '/cmd_vel',
        type: 'geometry_msgs/msg/Twist',
        msg: {
          linear: { x: 0.0, y: 0.0, z: 0.0 },
          angular: { x: 0.0, y: 0.0, z: angZ }
        }
      }
      window._rosInstance.send(JSON.stringify(rosTurn))
      const intv = setInterval(() => {
        if (window._rosInstance && window._rosInstance.readyState === WebSocket.OPEN) {
          window._rosInstance.send(JSON.stringify(rosTurn))
        }
      }, 100)
      setTimeout(() => {
        clearInterval(intv)
        if (window._rosInstance && window._rosInstance.readyState === WebSocket.OPEN) {
          window._rosInstance.send(JSON.stringify({
            op: 'publish',
            topic: '/cmd_vel',
            type: 'geometry_msgs/msg/Twist',
            msg: {
              linear: { x: 0.0, y: 0.0, z: 0.0 },
              angular: { x: 0.0, y: 0.0, z: 0.0 }
            }
          }))
        }
      }, durationMs)
      return
    }
    sendAuxCommand('snap90', { deg })
  }, [selectedRobot, sendAuxCommand])

  // Hàm chuyển đổi hướng D-Pad thành vector chuẩn -100..100
  const handleDriveDir = useCallback((dir) => {
    let x = 0, y = 0
    switch (dir) {
      case 'forward':   y = 100; break
      case 'backward':  y = -100; break
      case 'turnLeft':  x = -100; break
      case 'turnRight': x = 100; break
      default: break
    }
    startManualDrive(dir, x, y)
  }, [startManualDrive])

  // Lắng nghe bàn phím (W, A, S, D, Mũi tên, Space)
  useEffect(() => {
    const updateKeyboardDrive = () => {
      const keys = activeKeysRef.current
      if (keys.size === 0) {
        stopManualDrive()
        return
      }

      let y = 0, x = 0
      if (keys.has('w') || keys.has('arrowup')) y += 100
      if (keys.has('s') || keys.has('arrowdown')) y -= 100
      if (keys.has('a') || keys.has('arrowleft')) x -= 100
      if (keys.has('d') || keys.has('arrowright')) x += 100

      if (x === 0 && y === 0) {
        stopManualDrive()
      } else {
        if (x !== 0 && y !== 0) {
          x = Math.round(x * 0.7)
          y = Math.round(y * 0.7)
        }
        let dirLabel = 'combo'
        if (y > 0 && x === 0) dirLabel = 'forward'
        else if (y < 0 && x === 0) dirLabel = 'backward'
        else if (x < 0 && y === 0) dirLabel = 'turnLeft'
        else if (x > 0 && y === 0) dirLabel = 'turnRight'

        startManualDrive(dirLabel, x, y)
      }
    }

    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return

      const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 's', 'S', 'a', 'A', 'd', 'D']
      if (validKeys.includes(e.key)) {
        e.preventDefault()
        if (e.repeat) return
        activeKeysRef.current.add(e.key.toLowerCase())
        updateKeyboardDrive()
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        activeKeysRef.current.clear()
        stopManualDrive()
      }
    }

    const handleKeyUp = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return
      const k = e.key.toLowerCase()
      if (activeKeysRef.current.has(k)) {
        activeKeysRef.current.delete(k)
        updateKeyboardDrive()
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
  }, [startManualDrive, stopManualDrive])

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
          dispatchedAt: Date.now(),
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

  const handleSimulateLowBattery = async () => {
    if (!selectedRobot) return
    if (!window.confirm(`Bạn có chắc muốn kích hoạt cảnh báo PIN YẾU (<15%) cho Robot ${selectedRobot}?\n\nRobot sẽ tự động hủy nhiệm vụ, khóa toàn màn hình cảnh báo, thông báo đến App nhân viên và tự quay về Trạm Sạc.`)) return
    setCtrlLoading(true)
    setCtrlMsg(null)
    try {
      const data = await simulateLowBattery(selectedRobot, {
        batteryPct: 12,
        autoReturn: true,
        reason: 'Pin robot < 15% kích hoạt khóa màn hình, cảnh báo nhân viên và tự động về trạm sạc'
      })
      const msg = `⚠️ Báo động Pin yếu: Robot ${selectedRobot} (12%)! Đang tự động quay về trạm sạc #${data?.dockNodeId ?? 'Dock'} và gửi cảnh báo đến nhân viên.`
      setCtrlMsg({ type: 'warning', text: msg })
      toast.warning(msg, { autoClose: 7000 })
      if (onMissionDispatched) {
        onMissionDispatched({
          robotCode: selectedRobot,
          flowType: 'battery',
          status: 'LOW_BATTERY_RETURN',
          currentWaypointIndex: 0,
          dispatchedAt: Date.now(),
        })
      }
    } catch (e) {
      const err = `❌ Lỗi kích hoạt cảnh báo pin yếu: ${e?.response?.data?.message || e?.message}`
      setCtrlMsg({ type: 'error', text: err })
      toast.error(err)
    } finally {
      setCtrlLoading(false)
    }
  }

  const handleResetBattery = async () => {
    if (!selectedRobot) return
    setCtrlLoading(true)
    setCtrlMsg(null)
    try {
      await resetBattery(selectedRobot)
      const msg = `⚡ [KHÔI PHỤC PIN] Robot ${selectedRobot} đã phục hồi 100% pin. Đã mở khóa màn hình tablet!`
      setCtrlMsg({ type: 'success', text: msg })
      toast.success(msg)
    } catch (e) {
      const err = `❌ Lỗi khôi phục pin: ${e?.response?.data?.message || e?.message}`
      setCtrlMsg({ type: 'error', text: err })
      toast.error(err)
    } finally {
      setCtrlLoading(false)
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
                onClick={() => handleReturn(dockNodeId, 'trạm sạc')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="ev_station" className="text-[16px]" />
                Về trạm sạc
              </button>
              <button
                type="button"
                disabled={ctrlLoading || !selectedRobot}
                onClick={() => handleReturn(homeNodeId, 'vị trí xuất phát')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Icon name="flag" className="text-[16px]" />
                Về vị trí xuất phát
              </button>
            </div>

            {/* ── Quy Trình An Toàn Năng Lượng: Báo Động Pin Yếu & Khôi Phục Pin ── */}
            <div className="pt-2 border-t border-smb-outline-variant/60 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <Icon name="battery_alert" className="text-[14px]" />
                  Quy Trình An Toàn Năng Lượng (Pin &lt; 15%)
                </span>
                <span className="text-[9px] text-smb-on-surface-variant font-normal">Auto Dock + Cảnh Báo Staff</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={ctrlLoading || !selectedRobot}
                  onClick={handleSimulateLowBattery}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 py-2.5 px-2 text-[11px] font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  title="Kích hoạt báo động pin robot tụt xuống 12%: Màn hình Android khóa cứng, phát âm thanh cảnh báo, thông báo Staff và tự quay về trạm sạc"
                >
                  <Icon name="battery_alert" className="text-[16px] animate-bounce" />
                  🪫 Báo Động Pin Yếu (&lt;15%)
                </button>
                <button
                  type="button"
                  disabled={ctrlLoading || !selectedRobot}
                  onClick={handleResetBattery}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 py-2.5 px-2 text-[11px] font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  title="Khôi phục pin robot về 100%, trạng thái Idle và mở khóa màn hình tablet"
                >
                  <Icon name="battery_charging_full" className="text-[16px]" />
                  ⚡ Khôi Phục Pin 100%
                </button>
              </div>
            </div>

            <StatusBadge msg={ctrlMsg} />
          </div>
        </div>

          {/* ── 2. ĐIỀU KHIỂN LÁI TAY ROBOT (HỆ VI SAI 2WD + 2 BÁNH TRƯỚC CASTER) ── */}
          <div className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container p-3 space-y-3">
            {/* Header: Tiêu đề + Trạng thái kết nối (WS 81 vs Cloud MQTT) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon name="sports_esports" className="text-[18px] text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-smb-on-surface">
                  Lái tay vi sai (2WD + Caster)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {espWsConnected ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-2xs animate-pulse">
                    <span className="size-1.5 rounded-full bg-emerald-500"></span>
                    WS :81 (&lt;5ms)
                  </span>
                ) : wsConnected ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-cyan-500"></span>
                    ROS 2 :9090
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20" title="Lệnh được gửi qua Backend SignalR -> Android Tablet -> ESP32 cổng 81">
                    <span className="size-1.5 rounded-full bg-indigo-500"></span>
                    Cloud Relay (Tablet)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowWsConfigDirect((prev) => !prev)}
                  className="p-1 rounded-md text-smb-on-surface-variant hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                  title="Cấu hình kết nối WebSocket :81 trực tiếp tới Robot"
                >
                  <Icon name="settings_ethernet" className="text-[16px]" />
                </button>
              </div>
            </div>

            {/* Cấu hình IP ESP32 WebSocket Cổng 81 (Ẩn/Hiện) */}
            {showWsConfigDirect && (
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-2.5 space-y-2 text-xs smb-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                    <Icon name="router" className="text-[15px]" />
                    Kết nối trực tiếp ESP32 (Port 81)
                  </span>
                  <span className="text-[10px] text-smb-on-surface-variant">Không qua ROS 2</span>
                </div>
                <p className="text-[10px] text-smb-on-surface-variant leading-relaxed">
                  Khi máy tính kết nối chung mạng Wi-Fi với robot hoặc vào Wi-Fi AP của robot (192.168.4.1), mở kết nối này để phản hồi lái tay tức thì không có độ trễ:
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={espIp}
                    onChange={(e) => setEspIp(e.target.value)}
                    placeholder="192.168.4.1"
                    className="flex-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-2.5 py-1.5 text-xs font-mono font-semibold text-smb-on-surface focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={espWsConnecting}
                    onClick={toggleEspWs}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 ${
                      espWsConnected
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {espWsConnecting ? 'Đang kết nối...' : espWsConnected ? 'Ngắt :81' : 'Kết Nối :81'}
                  </button>
                </div>
              </div>
            )}

            {/* ── 2 Sliders Tốc Độ (Tiến/Lùi & Xoay Hướng) ── */}
            <div className="space-y-2 bg-smb-surface-container-lowest/60 p-2.5 rounded-xl border border-smb-outline-variant/50">
              {/* Slider 1: Tốc độ di chuyển thẳng */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[11px] font-semibold text-smb-on-surface flex items-center gap-1">
                    <Icon name="speed" className="text-[14px] text-indigo-500" />
                    Tốc độ chạy thẳng (spd):
                  </span>
                  <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {teleopSpeed}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={teleopSpeed}
                  onChange={(e) => handleSpeedChange(e.target.value)}
                  className="w-full h-1.5 bg-smb-outline-variant/60 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Slider 2: Lực xoay hướng */}
              <div className="space-y-1 pt-1 border-t border-smb-outline-variant/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[11px] font-semibold text-smb-on-surface flex items-center gap-1">
                    <Icon name="sync" className="text-[14px] text-teal-500" />
                    Lực xoay hướng (spdRotate):
                  </span>
                  <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    {teleopTurnSpeed}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={teleopTurnSpeed}
                  onChange={(e) => handleTurnSpeedChange(e.target.value)}
                  className="w-full h-1.5 bg-smb-outline-variant/60 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>
            </div>

            {/* ── Chuyển đổi giữa [Cần Joystick 360°] và [Phím D-Pad Chữ Thập] ── */}
            <div className="flex items-center justify-center gap-1 bg-smb-surface-container-lowest p-1 rounded-xl border border-smb-outline-variant/40">
              <button
                type="button"
                onClick={() => setControlType('joystick')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  controlType === 'joystick'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-smb-on-surface-variant hover:text-smb-on-surface'
                }`}
              >
                <Icon name="radio_button_checked" className="text-[15px]" />
                Cần Joystick 360°
              </button>
              <button
                type="button"
                onClick={() => setControlType('dpad')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  controlType === 'dpad'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-smb-on-surface-variant hover:text-smb-on-surface'
                }`}
              >
                <Icon name="gamepad" className="text-[15px]" />
                Phím D-Pad
              </button>
            </div>

            {/* ── GIAO DIỆN 1: CẦN JOYSTICK TRÒN 360° (CHUẨN 192.168.4.1) ── */}
            {controlType === 'joystick' ? (
              <div className="flex flex-col items-center justify-center py-2 select-none">
                <div
                  ref={joystickZoneRef}
                  onMouseDown={(e) => handleJoyStart(e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    if (e.touches[0]) handleJoyStart(e.touches[0].clientX, e.touches[0].clientY)
                  }}
                  className="relative size-44 rounded-full border-2 border-teal-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-inner flex items-center justify-center cursor-crosshair touch-none"
                  style={{
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(45,212,191,0.1)'
                  }}
                >
                  {/* Trục tâm và radar tròn */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-teal-500/20 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-teal-500/20 -translate-x-1/2 pointer-events-none" />
                  <div className="absolute size-24 rounded-full border border-teal-500/20 pointer-events-none" />
                  <div className="absolute size-10 rounded-full border border-teal-500/30 pointer-events-none" />

                  {/* Núm Joystick kéo thả 360° */}
                  <div
                    style={{
                      transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                      transition: joyDragRef.current ? 'none' : 'transform 0.12s ease-out'
                    }}
                    className="size-13 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/50 border-2 border-white pointer-events-none flex items-center justify-center"
                  >
                    <div className="size-3.5 rounded-full bg-white/80 shadow-xs" />
                  </div>
                </div>

                {/* Tọa độ X/Y thời gian thực và nút Stop khẩn */}
                <div className="flex items-center gap-3 mt-2.5 font-mono text-[11px] text-smb-on-surface-variant font-bold">
                  <span className={joyCoords.x !== 0 ? 'text-teal-400' : ''}>X: {joyCoords.x}%</span>
                  <span className="text-white/20">|</span>
                  <span className={joyCoords.y !== 0 ? 'text-indigo-400' : ''}>Y: {joyCoords.y}%</span>
                  <button
                    type="button"
                    onClick={handleJoyEnd}
                    className="px-2.5 py-0.5 rounded-md text-[10px] bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white font-bold ml-1 transition-all"
                  >
                    Dừng
                  </button>
                </div>
              </div>
            ) : (
              /* ── GIAO DIỆN 2: BẢNG PHÍM D-PAD CHỮ THẬP ── */
              <div className="flex flex-col items-center justify-center pt-1 pb-1">
                <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
                  {/* Hàng 1: [Trống] - [Tiến (W)] - [Trống] */}
                  <div />
                  <button
                    type="button"
                    disabled={!selectedRobot}
                    onMouseDown={() => handleDriveDir('forward')}
                    onMouseUp={stopManualDrive}
                    onMouseLeave={stopManualDrive}
                    onTouchStart={(e) => { e.preventDefault(); handleDriveDir('forward') }}
                    onTouchEnd={stopManualDrive}
                    onTouchCancel={stopManualDrive}
                    className={`flex h-13 flex-col items-center justify-center rounded-2xl transition-all shadow-sm active:scale-90 ${
                      activeKey === 'forward'
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                        : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-indigo-500/15 hover:text-indigo-600 border border-smb-outline-variant'
                    }`}
                    title="Tiến lên (Phím W hoặc Mũi tên Lên)"
                  >
                    <Icon name="arrow_upward" className="text-[22px] pointer-events-none select-none" />
                    <span className="text-[9px] font-bold pointer-events-none select-none">Tiến (W)</span>
                  </button>
                  <div />

                  {/* Hàng 2: [Rẽ Trái (A)] - [DỪNG (Space)] - [Rẽ Phải (D)] */}
                  <button
                    type="button"
                    disabled={!selectedRobot}
                    onMouseDown={() => handleDriveDir('turnLeft')}
                    onMouseUp={stopManualDrive}
                    onMouseLeave={stopManualDrive}
                    onTouchStart={(e) => { e.preventDefault(); handleDriveDir('turnLeft') }}
                    onTouchEnd={stopManualDrive}
                    onTouchCancel={stopManualDrive}
                    className={`flex h-13 flex-col items-center justify-center rounded-2xl transition-all shadow-sm active:scale-90 ${
                      activeKey === 'turnLeft'
                        ? 'bg-teal-600 text-white ring-2 ring-teal-400'
                        : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-teal-500/15 hover:text-teal-600 border border-smb-outline-variant'
                    }`}
                    title="Rẽ Trái (Phím A hoặc Mũi tên Trái)"
                  >
                    <Icon name="arrow_back" className="text-[22px] pointer-events-none select-none" />
                    <span className="text-[9px] font-bold pointer-events-none select-none">Trái (A)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedRobot}
                    onClick={stopManualDrive}
                    className="flex h-13 flex-col items-center justify-center rounded-2xl bg-rose-600/15 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all font-bold shadow-sm active:scale-90"
                    title="Dừng khẩn cấp (Phím Space)"
                  >
                    <Icon name="stop" className="text-[20px] pointer-events-none select-none" />
                    <span className="text-[10px] font-black tracking-wider pointer-events-none select-none">DỪNG</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedRobot}
                    onMouseDown={() => handleDriveDir('turnRight')}
                    onMouseUp={stopManualDrive}
                    onMouseLeave={stopManualDrive}
                    onTouchStart={(e) => { e.preventDefault(); handleDriveDir('turnRight') }}
                    onTouchEnd={stopManualDrive}
                    onTouchCancel={stopManualDrive}
                    className={`flex h-13 flex-col items-center justify-center rounded-2xl transition-all shadow-sm active:scale-90 ${
                      activeKey === 'turnRight'
                        ? 'bg-teal-600 text-white ring-2 ring-teal-400'
                        : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-teal-500/15 hover:text-teal-600 border border-smb-outline-variant'
                    }`}
                    title="Rẽ Phải (Phím D hoặc Mũi tên Phải)"
                  >
                    <Icon name="arrow_forward" className="text-[22px] pointer-events-none select-none" />
                    <span className="text-[9px] font-bold pointer-events-none select-none">Phải (D)</span>
                  </button>

                  {/* Hàng 3: [Trống] - [Lùi (S)] - [Trống] */}
                  <div />
                  <button
                    type="button"
                    disabled={!selectedRobot}
                    onMouseDown={() => handleDriveDir('backward')}
                    onMouseUp={stopManualDrive}
                    onMouseLeave={stopManualDrive}
                    onTouchStart={(e) => { e.preventDefault(); handleDriveDir('backward') }}
                    onTouchEnd={stopManualDrive}
                    onTouchCancel={stopManualDrive}
                    className={`flex h-13 flex-col items-center justify-center rounded-2xl transition-all shadow-sm active:scale-90 ${
                      activeKey === 'backward'
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                        : 'bg-smb-surface-container-lowest text-smb-on-surface hover:bg-indigo-500/15 hover:text-indigo-600 border border-smb-outline-variant'
                    }`}
                    title="Lùi lại (Phím S hoặc Mũi tên Xuống)"
                  >
                    <Icon name="arrow_downward" className="text-[22px] pointer-events-none select-none" />
                    <span className="text-[9px] font-bold pointer-events-none select-none">Lùi (S)</span>
                  </button>
                  <div />
                </div>
              </div>
            )}

            {/* Cụm Tiện Ích: Quay 90° & Reset Odom & EStop */}
            <div className="grid grid-cols-3 gap-1.5 w-full pt-2 border-t border-smb-outline-variant/40">
              <button
                type="button"
                disabled={!selectedRobot}
                onClick={() => handleSnapRotate(-90)}
                className="py-1.5 px-1 text-[10px] font-semibold rounded-lg bg-smb-surface-container-high hover:bg-smb-surface-container-highest text-smb-on-surface-variant border border-smb-outline-variant/60 text-center transition-all active:scale-95"
                title="Xoay vi sai -90 độ"
              >
                ↺ -90°
              </button>
              <button
                type="button"
                disabled={!selectedRobot}
                onClick={() => handleSnapRotate(90)}
                className="py-1.5 px-1 text-[10px] font-semibold rounded-lg bg-smb-surface-container-high hover:bg-smb-surface-container-highest text-smb-on-surface-variant border border-smb-outline-variant/60 text-center transition-all active:scale-95"
                title="Xoay vi sai +90 độ"
              >
                ↻ +90°
              </button>
              <button
                type="button"
                disabled={!selectedRobot}
                onClick={() => sendAuxCommand('odomReset')}
                className="py-1.5 px-1 text-[10px] font-semibold rounded-lg bg-smb-surface-container-high hover:bg-smb-surface-container-highest text-smb-on-surface-variant border border-smb-outline-variant/60 text-center transition-all active:scale-95"
                title="Đặt lại Odometer về 0"
              >
                🎯 Reset Odom
              </button>
            </div>

            {/* Mẹo phím tắt */}
            <div className="rounded-lg bg-smb-surface-container-lowest/80 p-2 text-center text-[10px] text-smb-on-surface-variant leading-relaxed border border-smb-outline-variant/40">
              💡 <b>Phím tắt:</b> <b>W/S</b> (Tiến/Lùi), <b>A/D</b> (Rẽ Trái/Phải), <b>Space</b> (Dừng xe). Hoặc kéo <b>Cần Joystick</b> để lái tự do 360°.
            </div>
          </div>
      </div>

      <RobotDetailModal robotCode={detailRobotCode} onClose={() => setDetailRobotCode(null)} />
    </>
  )
}


export default RobotAssignmentPanel
