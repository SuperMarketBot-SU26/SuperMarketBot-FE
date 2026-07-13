import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import {
  EdgesLayer,
  NodesLayer,
  RouteLayer,
  SemanticObjectsLayer,
} from './MapLayers'
import { FloorplanLayer } from './Floorplan'
import { statusPalette, metersToPx, clampZoom, poseToPx } from '../utils/robotHelpers'
import { ROUTE_TYPE_META } from './RobotAssignmentPanel'

/**
 * Compact legend showing only the route types a user is likely to encounter.
 * Unknown routeType values won't appear here; their default blue polyline is
 * what `RouteLayer` falls back to.
 */
const routeTypeLegend = Object.fromEntries(
  ['patrol', 'delivery', 'ad', 'navigation', 'restock', 'custom']
    .map((t) => [t, ROUTE_TYPE_META[t]])
)

/**
 * FleetMap
 * - Renders the indoor floorplan with nodes / edges / semantic objects.
 * - Draggable to pan, wheel/scroll to zoom. Mimics Google Maps but indoors.
 * - Overlays live robot poses (auto-refreshed every 5s, configurable).
 * - Optionally overlays one selected route as a polyline.
 *
 * Props:
 *   map                 MapFloorplanDto | null
 *   robots              RobotDto[]                     (fleet list)
 *   robotPoses          Record<robotCode, RobotPoseDto>
 *   selectedRoute       RobotRouteDetailDto | null     (route polyline overlay)
 *   selectedRobotCode   string | null                  (highlight)
 *   onRobotClick        (robot) => void
 *   onNodeClick         (node) => void
 *   scale               number (px / meter, default 32)
 *   refreshIntervalMs   number (default 5000)
 *   tick                number (external refresh trigger; bumps when caller wants fresh pose)
 */
export function FleetMap({
  map,
  robots = [],
  robotPoses = {},
  selectedRoute = null,
  selectedRobotCode = null,
  onRobotClick,
  onNodeClick,
  scale = 32,
  refreshIntervalMs = 5000,
  tick = 0,
}) {
  const viewportRef = useRef(null)

  // Pan & zoom state — purely UI, no backend dependency
  const [{ tx, ty, z }, setView] = useState({ tx: 0, ty: 0, z: 1 })
  const dragRef = useRef(null)

  const onMouseDown = (e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseTx: tx, baseTy: ty }
  }
  const onMouseMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setView((v) => ({ ...v, tx: dragRef.current.baseTx + dx, ty: dragRef.current.baseTy + dy }))
  }
  const stopDrag = () => (dragRef.current = null)
  const onWheel = (e) => {
    e.preventDefault()
    const delta = -Math.sign(e.deltaY) * 0.1
    setView((v) => ({ ...v, z: clampZoom(v.z + delta) }))
  }

  // Reset view when the map changes
  useEffect(() => {
    setView({ tx: 0, ty: 0, z: 1 })
  }, [map?.mapId])

  // Center on selected robot whenever the selection changes
  useEffect(() => {
    if (!selectedRobotCode || !viewportRef.current) return
    const pose = robotPoses[selectedRobotCode]
    if (!pose) return
    const { x, y } = poseToPx(pose, scale)
    const rect = viewportRef.current.getBoundingClientRect()
    setView((v) => ({
      ...v,
      tx: rect.width / 2 - x * v.z - 100,
      ty: rect.height / 2 - y * v.z - 100,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRobotCode, tick])

  // Local timer placeholder — when backend SignalR/MQTT bridge arrives, swap
  // this for a real subscription. The `tick` counter still gives callers a
  // way to force a re-render.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (refreshIntervalMs <= 0) return undefined
    const t = setInterval(() => forceTick((n) => n + 1), refreshIntervalMs)
    return () => clearInterval(t)
  }, [refreshIntervalMs])

  const onFit = useCallback(() => setView({ tx: 0, ty: 0, z: 1 }), [])

  const nodesById = useMemo(() => {
    const m = new Map()
    map?.nodes?.forEach((n) => m.set(n.nodeId, n))
    return m
  }, [map])

  if (!map) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-smb-surface-container-low text-smb-on-surface-variant">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl">map</span>
          <p className="text-sm">Chưa có dữ liệu bản đồ.</p>
        </div>
      </div>
    )
  }

  const svgW = metersToPx(map.widthMeters, scale)
  const svgH = metersToPx(map.heightMeters, scale)

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-low">
      {/* Map controls (Google-Maps–style floating panel) */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1 rounded-lg bg-smb-surface-container-lowest p-1 shadow-md">
        <button
          type="button"
          onClick={() => setView((v) => ({ ...v, z: clampZoom(v.z + 0.2) }))}
          className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container"
          title="Phóng to"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
        <button
          type="button"
          onClick={() => setView((v) => ({ ...v, z: clampZoom(v.z - 0.2) }))}
          className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container"
          title="Thu nhỏ"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <button
          type="button"
          onClick={onFit}
          className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container"
          title="Vừa khung"
        >
          <span className="material-symbols-outlined">fit_screen</span>
        </button>
      </div>

      {/* Live indicator (purely cosmetic until real WebSocket lands) */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-smb-surface-container-lowest/95 px-3 py-1.5 text-xs font-medium text-smb-on-surface shadow-sm">
        <span className="size-2 rounded-full bg-smb-success animate-pulse" />
        Đang theo dõi trực tiếp
      </div>

      {/* Map viewport */}
      <div
        ref={viewportRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onWheel={onWheel}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${-tx / z} ${-ty / z} ${svgW / z} ${svgH / z}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ userSelect: 'none' }}
        >
          <FloorplanLayer map={map} metersToPx={(m) => metersToPx(m, scale)} />
          <SemanticObjectsLayer objects={map.semanticObjects} metersToPx={(m) => metersToPx(m, scale)} />
          <EdgesLayer nodes={map.nodes} edges={map.edges} metersToPx={(m) => metersToPx(m, scale)} />
          <RouteLayer route={selectedRoute} nodesById={nodesById} metersToPx={(m) => metersToPx(m, scale)} />
          <NodesLayer nodes={map.nodes} metersToPx={(m) => metersToPx(m, scale)} onNodeClick={onNodeClick} />

          {/* Robots */}
          {robots.map((r) => {
            const pose = robotPoses[r.robotCode]
            if (!pose) return null
            const { x, y } = poseToPx(pose, scale)
            const palette = statusPalette(r.status)
            const isSel = selectedRobotCode === r.robotCode
            return (
              <g
                key={r.robotId}
                transform={`translate(${x}, ${y}) rotate(${(pose.headingDeg ?? 0).toFixed(2)})`}
                onClick={() => onRobotClick?.(r)}
                className="cursor-pointer"
              >
                {isSel && (
                  <circle r={20} fill="#264191" fillOpacity={0.12} />
                )}
                <circle r={10} fill={palette.dot} stroke="#ffffff" strokeWidth={3} />
                {/* heading triangle */}
                <polygon
                  points="0,-14 -5,-6 5,-6"
                  fill={palette.dot}
                  stroke="#ffffff" strokeWidth={1}
                />
                <text
                  y={-18}
                  textAnchor="middle"
                  className="select-none fill-smb-on-surface"
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  {r.robotCode} · {r.batteryPct}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-2">
        <div className="rounded-lg bg-smb-surface-container-lowest/95 p-3 text-xs shadow-md">
          <p className="mb-2 font-semibold text-smb-on-surface">Trạng thái Robot</p>
          {Object.entries({
            'Đang di chuyển': 'Moving',
            'Đang rảnh': 'Idle',
            'Đang tương tác': 'Interacting',
            'Sạc / ngoại tuyến': 'Offline_Charging',
            'Đã tắt nguồn': 'Power_Off',
          }).map(([label, status]) => {
            const p = statusPalette(status)
            return (
              <div key={status} className="flex items-center gap-2 py-0.5">
                <span className={`size-2.5 rounded-full ${p.dot}`} />
                <span className="text-smb-on-surface-variant">{label}</span>
              </div>
            )
          })}
        </div>

        <div className="rounded-lg bg-smb-surface-container-lowest/95 p-3 text-xs shadow-md">
          <p className="mb-2 font-semibold text-smb-on-surface">Loại Lộ Trình</p>
          {Object.entries(routeTypeLegend).map(([type, meta]) => (
            <div key={type} className="flex items-center gap-2 py-0.5">
              <svg width="18" height="6">
                <line
                  x1="0" y1="3" x2="18" y2="3"
                  stroke={meta.color}
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-smb-on-surface-variant">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FleetMap
