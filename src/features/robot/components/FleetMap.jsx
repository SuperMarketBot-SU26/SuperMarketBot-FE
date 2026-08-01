import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  EdgesLayer,
  NodesLayer,
  RouteLayer,
  SemanticObjectsLayer,
} from './MapLayers'
import { FloorplanLayer } from './Floorplan'
import { ThreeDSupermarketMap } from './ThreeDSupermarketMap'
import { statusPalette, clampZoom } from '../utils/robotHelpers'
import { ROUTE_TYPE_META } from './RobotAssignmentPanel'
import logoUrl from '../../../assets/logo.png'

const STATUS_HEX = {
  Power_Off:         '#64748b',
  Idle:              '#6366f1',
  Moving:            '#22c55e',
  Interacting:       '#a855f7',
  Offline_Charging:  '#f59e0b',
  Unknown:           '#94a3b8',
}

const ROBOT_LOGO_HALF = 14
const ROBOT_ARROW_OFFSET = 24
const ROBOT_ARROW_HALF_W = 6
const ROBOT_ARROW_HALF_H = 8
const ROBOT_RING_R = 20

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function FleetMap({
  map,
  robots = [],
  robotPoses = {},
  routeTypes = [],
  selectedRoute = null,
  selectedNodeId = null,
  onNodeClick,
  focusedRobot = null,
  scale = 64,
  onClearSelection,
  onSelectRobot,
}) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [viewMode, setViewMode] = useState('3d_interactive') // '3d_interactive' | '3d' | 'slam'
  const [estopActive, setEstopActive] = useState(false)
  const [targetTransform, setTargetTransform] = useState({ x: 0, y: 0, zoom: 1 })
  const [currentTransform, setCurrentTransform] = useState({ x: 0, y: 0, zoom: 1 })
  const animFrameRef = useRef(null)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const [effSize, setEffSize] = useState({ widthMeters: 20, heightMeters: 15, widthPx: 20 * 64, heightPx: 15 * 64 })

  useEffect(() => {
    if (!map) return
    setEffSize({
      widthMeters: map.widthMeters || 20,
      heightMeters: map.heightMeters || 15,
      widthPx: (map.widthMeters || 20) * scale,
      heightPx: (map.heightMeters || 15) * scale,
    })
  }, [map?.mapId, scale, map?.widthMeters, map?.heightMeters])

  const svgW = effSize.widthPx
  const svgH = effSize.heightPx

  // Map ROS SLAM (Meters) -> Pixel canvas using Resolution & Origin
  const effScaleX = useCallback((xMeters) => {
    if (map?.resolution > 0 && map?.originX !== undefined) {
      return (xMeters - map.originX) / map.resolution
    }
    return xMeters * scale
  }, [map?.resolution, map?.originX, scale])

  const effScaleY = useCallback((yMeters) => {
    if (map?.resolution > 0 && map?.originY !== undefined) {
      return effSize.heightPx - ((yMeters - map.originY) / map.resolution)
    }
    return yMeters * scale
  }, [map?.resolution, map?.originY, effSize.heightPx, scale])

  const effScale = useCallback((val) => {
    return val * (effSize.widthMeters > 0 ? effSize.widthPx / effSize.widthMeters : scale)
  }, [effSize, scale])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e) => {
      e.preventDefault()
      if (!container) return

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = clampZoom(currentTransform.zoom * delta, 0.3, 4)

      const newX = mouseX - (mouseX - currentTransform.x) * (newZoom / currentTransform.zoom)
      const newY = mouseY - (mouseY - currentTransform.y) * (newZoom / currentTransform.zoom)

      setTargetTransform({ x: newX, y: newY, zoom: newZoom })
      setCurrentTransform({ x: newX, y: newY, zoom: newZoom })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [currentTransform])

  useEffect(() => {
    const animate = () => {
      setCurrentTransform((prev) => {
        const lerpFactor = 0.14
        const dx = targetTransform.x - prev.x
        const dy = targetTransform.y - prev.y
        const dz = targetTransform.zoom - prev.zoom

        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dz) < 0.001) {
          return targetTransform
        }

        return {
          x: prev.x + dx * lerpFactor,
          y: prev.y + dy * lerpFactor,
          zoom: prev.zoom + dz * lerpFactor,
        }
      })
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [targetTransform])

  useEffect(() => {
    if (!map || !containerRef.current) return
    const fitToView = () => {
      const rect = containerRef.current.getBoundingClientRect()
      const zoom = Math.min((rect.width - 80) / svgW, (rect.height - 80) / svgH, 4)
      const newTransform = {
        x: (rect.width - svgW * zoom) / 2,
        y: (rect.height - svgH * zoom) / 2,
        zoom,
      }
      setTargetTransform(newTransform)
      setCurrentTransform(newTransform)
    }

    fitToView()
    const ro = new ResizeObserver(fitToView)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [map?.mapId, svgW, svgH])

  const focusOnRobot = useCallback((robotCode) => {
    if (!containerRef.current) return
    const robot = robots.find((r) => r.robotCode === robotCode)
    if (!robot) return
    const pose = robotPoses[robotCode]
    if (!pose) return

    const rect = containerRef.current.getBoundingClientRect()
    const robotX = effScale(pose.x)
    const robotY = effScale(pose.y)
    const zoom = Math.max(currentTransform.zoom, 1.2)

    setTargetTransform({
      x: rect.width / 2 - robotX * zoom,
      y: rect.height / 2 - robotY * zoom,
      zoom,
    })
  }, [robots, robotPoses, scale, effSize, currentTransform.zoom])

  useEffect(() => {
    if (!focusedRobot) return
    focusOnRobot(focusedRobot)
  }, [focusedRobot])

  const handleRobotClick = useCallback((robot) => {
    onSelectRobot?.(robot)
    focusOnRobot(robot.robotCode)
  }, [onSelectRobot, focusOnRobot])

  const handleMouseDown = (e) => {
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTargetTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
    setCurrentTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleClick = (e) => {
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      onClearSelection?.()
    }
  }

  const zoomIn = () => {
    setTargetTransform((t) => ({ ...t, zoom: clampZoom(t.zoom * 1.2, 0.3, 4) }))
  }
  const zoomOut = () => {
    setTargetTransform((t) => ({ ...t, zoom: clampZoom(t.zoom / 1.2, 0.3, 4) }))
  }
  const fitView = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const zoom = Math.min((rect.width - 80) / svgW, (rect.height - 80) / svgH, 4)
    setTargetTransform({
      x: (rect.width - svgW * zoom) / 2,
      y: (rect.height - svgH * zoom) / 2,
      zoom,
    })
  }

  const nodesById = useMemo(() => {
    const m = new Map()
    map?.nodes?.forEach((n) => m.set(n.nodeId, n))
    return m
  }, [map])

  const routeTypeLegend = Object.fromEntries(
    routeTypes.map((t) => [t.value, { label: t.label, color: ROUTE_TYPE_META[t.value]?.color ?? ROUTE_TYPE_META.default.color }])
  )

  /* Stunning Isometric Empty State when no map data is loaded */
  if (!map) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest p-8 shadow-sm">
        {/* Holographic background grid graphic */}
        <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        
        <div className="z-10 flex max-w-md flex-col items-center text-center">
          <div className="relative flex size-20 items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-xl shadow-emerald-500/10 dark:text-emerald-400">
            <Icon name="map" className="text-4xl" />
            <span className="absolute -right-1 -top-1 flex size-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-4 rounded-full bg-emerald-500" />
            </span>
          </div>

          <h3 className="mt-5 text-lg font-bold tracking-tight text-smb-on-surface">
            Chưa Có Dữ Liệu Bản Đồ Siêu Thị
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-smb-on-surface-variant/80">
            Hệ thống chưa tải được sơ đồ mặt bằng indoor. Bạn có thể sử dụng công cụ Map Editor để tạo mới hoặc import file bản đồ từ ROS SLAM.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/robot-monitoring/map-editor')}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95"
            >
              <Icon name="edit_square" className="text-[18px]" />
              Chỉnh Sửa & Khởi Tạo Bản Đồ
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === '3d_interactive') {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-[#0b0f17] shadow-sm">
        {/* Live Stream Indicator Badge */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-slate-900/90 px-3.5 py-1.5 backdrop-blur-md shadow-md">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-purple-500" />
            </span>
            <span className="text-xs font-semibold text-white">3D WebGL Live Telemetry (Three.js)</span>
            <span className="text-[10px] text-purple-300">| {robots.length} Robot</span>
          </div>
        </div>

        {/* Floating Control HUD Toolbar */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 p-1 backdrop-blur-md shadow-md">
            <button
              type="button"
              onClick={() => setViewMode('3d_interactive')}
              className="flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs"
            >
              <Icon name="3d_rotation" className="text-[16px]" />
              <span>🧊 3D Interactive (360°)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Icon name="view_in_ar" className="text-[16px]" />
              <span>🎨 Sơ Đồ 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slam')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Icon name="grid_view" className="text-[16px]" />
              <span>📐 LiDAR SLAM</span>
            </button>
          </div>
        </div>

        <ThreeDSupermarketMap
          map={map}
          robots={robots}
          robotPoses={robotPoses}
          selectedNodeId={selectedNodeId}
          onNodeClick={onNodeClick}
        />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-low shadow-sm">
      {/* Live Stream Indicator Badge & Map Selector */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-smb-surface-container-lowest/90 px-3.5 py-1.5 backdrop-blur-md shadow-md">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-smb-on-surface">Live Telemetry</span>
          <span className="text-[10px] text-smb-on-surface-variant/70">| {robots.length} Robot</span>
        </div>

        {/* Map Selector Dropdown */}
        <div className="flex items-center rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest/90 px-3 py-1 backdrop-blur-md shadow-md">
          <Icon name="map" className="text-[16px] text-smb-primary mr-1.5" />
          <select
            value={map?.mapId || 1}
            className="bg-transparent text-xs font-bold text-smb-on-surface outline-none cursor-pointer"
            onChange={() => {}}
          >
            <option value={1}>🗺️ Map Tầng 1 - SuperMarketRealSlamMap</option>
            <option value={2}>🗺️ Map Tầng 2 - Kho Hàng & Khu Phụ</option>
          </select>
        </div>
      </div>

      {/* Floating Telemetry & Control HUD Toolbar */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        {/* Emergency Stop Toggle */}
        <button
          type="button"
          onClick={() => setEstopActive((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 ${
            estopActive
              ? 'animate-pulse border-rose-600 bg-rose-600 text-white shadow-rose-600/30'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400'
          }`}
          title="Dừng khẩn cấp toàn bộ đội hình robot"
        >
          <Icon name="warning" className="text-[18px]" />
          <span>{estopActive} E-STOP</span>
        </button>

        {/* Map View Mode Toggle (3D Interactive vs 3D Flat vs SLAM LiDAR) */}
        <div className="flex items-center rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest/90 p-1 backdrop-blur-md shadow-md">
          <button
            type="button"
            onClick={() => setViewMode('3d_interactive')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              viewMode === '3d_interactive'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
            }`}
            title="Bản đồ 3D Interactive Three.js xoay 360 độ"
          >
            <Icon name="3d_rotation" className="text-[16px]" />
            <span>🧊 3D Interactive (360°)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              viewMode === '3d'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
            }`}
            title="Chế độ Sơ đồ Mặt Bằng Siêu Thị 4K"
          >
            <Icon name="view_in_ar" className="text-[16px]" />
            <span>🎨 Sơ Đồ 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('slam')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              viewMode === 'slam'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
            }`}
            title="Chế độ Bản đồ SLAM LiDAR Kỹ thuật"
          >
            <Icon name="grid_view" className="text-[16px]" />
            <span>📐 LiDAR SLAM</span>
          </button>
        </div>

        {/* Map View Controls */}
        <div className="flex items-center rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest/90 p-1 backdrop-blur-md shadow-md">
          <button onClick={zoomIn} className="flex size-8 items-center justify-center rounded-lg text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface" title="Phóng to">
            <Icon name="add" className="text-[18px]" />
          </button>
          <button onClick={zoomOut} className="flex size-8 items-center justify-center rounded-lg text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface" title="Thu nhỏ">
            <Icon name="remove" className="text-[18px]" />
          </button>
          <button onClick={fitView} className="flex size-8 items-center justify-center rounded-lg text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface" title="Vừa khung">
            <Icon name="fit_screen" className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* Map Viewport Container */}
      <div
        ref={containerRef}
        className="h-full w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
      >
        <svg width="100%" height="100%" style={{ userSelect: 'none' }}>
          <g transform={`translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.zoom})`}>
            <rect
              x={0} y={0}
              width={effSize.widthPx} height={effSize.heightPx}
              fill="transparent"
            />
            <FloorplanLayer map={map} scale={scale} viewMode={viewMode} onEffectiveSize={setEffSize} />
            <SemanticObjectsLayer objects={map.semanticObjects} metersToPx={effScale} />
            <EdgesLayer nodes={map.nodes} edges={map.edges} metersToPx={effScale} />
            {selectedRoute && (
              <RouteLayer
                route={selectedRoute}
                nodesById={nodesById}
                metersToPx={effScale}
              />
            )}
            <NodesLayer
              nodes={map.nodes || []}
              metersToPx={effScale}
              effScaleX={effScaleX}
              effScaleY={effScaleY}
              onNodeClick={onNodeClick}
              selectedNodeId={selectedNodeId}
            />

            {/* Robots Markers */}
            {robots.map((r) => {
              const pose = robotPoses[r.robotCode]
              if (!pose) return null
              const x = effScale(pose.x)
              const y = effScale(pose.y)
              const isFocused = focusedRobot === r.robotCode
              const statusHex = STATUS_HEX[r.status] ?? STATUS_HEX.Unknown

              return (
                <g
                  key={r.robotId}
                  transform={`translate(${x}, ${y}) rotate(${(pose.headingDeg ?? 0).toFixed(2)})`}
                  onClick={(e) => { handleRobotClick(r); e.stopPropagation() }}
                  className="cursor-pointer"
                >
                  <circle
                    r={ROBOT_RING_R}
                    fill={isFocused ? '#22c55e' : '#3b82f6'}
                    fillOpacity={isFocused ? 0.25 : 0.12}
                    stroke={isFocused ? '#22c55e' : 'transparent'}
                    strokeWidth={isFocused ? 2.5 : 0}
                    className={isFocused ? 'smb-pulse-ring' : ''}
                  />

                  <circle r={ROBOT_LOGO_HALF + 2} fill={statusHex} fillOpacity={0.25} />

                  <image
                    href={logoUrl}
                    x={-ROBOT_LOGO_HALF}
                    y={-ROBOT_LOGO_HALF}
                    width={ROBOT_LOGO_HALF * 2}
                    height={ROBOT_LOGO_HALF * 2}
                    preserveAspectRatio="xMidYMid meet"
                  />

                  <polygon
                    points={`0,${-ROBOT_ARROW_OFFSET} ${-ROBOT_ARROW_HALF_W},${-ROBOT_ARROW_OFFSET + ROBOT_ARROW_HALF_H} ${ROBOT_ARROW_HALF_W},${-ROBOT_ARROW_OFFSET + ROBOT_ARROW_HALF_H}`}
                    fill={statusHex}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Map Legend Panel */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-2">
        <div className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest/90 p-3 text-xs backdrop-blur-md shadow-lg">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-smb-on-surface">Trạng thái Robot</p>
          {Object.entries({
            'Đang di chuyển': 'Moving',
            'Đang rảnh': 'Idle',
            'Đang tương tác': 'Interacting',
            'Sạc / ngoại tuyến': 'Offline_Charging',
            'Tắt nguồn': 'Power_Off',
          }).map(([label, status]) => {
            const p = statusPalette(status)
            return (
              <div key={status} className="flex items-center gap-2 py-0.5">
                <span className={`size-2.5 rounded-full ${p.dot}`} />
                <span className="text-[11px] font-medium text-smb-on-surface-variant">{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default FleetMap
