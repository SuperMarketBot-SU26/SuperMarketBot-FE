import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import {
  EdgesLayer,
  NodesLayer,
  RouteLayer,
  SemanticObjectsLayer,
} from './MapLayers'
import { FloorplanLayer } from './Floorplan'
import { statusPalette, clampZoom } from '../utils/robotHelpers'
import { ROUTE_TYPE_META } from './RobotAssignmentPanel'

const routeTypeLegend = Object.fromEntries(
  ['patrol', 'delivery', 'ad', 'navigation', 'restock', 'custom']
    .map((t) => [t, ROUTE_TYPE_META[t]])
)

/**
 * FleetMap — simple indoor map with nodes, edges, robots, and routes.
 * Features smooth lerp animation when focusing on robots.
 */
export function FleetMap({
  map,
  robots = [],
  robotPoses = {},
  selectedRoute = null,
  selectedRobotCode = null,
  onRobotClick,
  onNodeClick,
  scale = 64,
  tick = 0,
}) {
  const containerRef = useRef(null)
  const [focusedRobot, setFocusedRobot] = useState(selectedRobotCode)
  const [targetTransform, setTargetTransform] = useState({ x: 0, y: 0, zoom: 1 })
  const [currentTransform, setCurrentTransform] = useState({ x: 0, y: 0, zoom: 1 })
  const animFrameRef = useRef(null)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  // Effective map dimensions. Defaults to the BE values; FloorplanLayer will
  // update these once it loads the floorplan image so its rendered box matches
  // its natural pixel size. All other layers (nodes, edges, semantic objects,
  // routes, robots) read from these so node positions always line up with the
  // visible image.
  const [effSize, setEffSize] = useState({ widthMeters: 20, heightMeters: 15, widthPx: 20 * 64, heightPx: 15 * 64 })

  // Reset to BE values whenever the map changes (new map loaded).
  useEffect(() => {
    if (!map) return
    setEffSize({
      widthMeters: map.widthMeters || 20,
      heightMeters: map.heightMeters || 15,
      widthPx: (map.widthMeters || 20) * scale,
      heightPx: (map.heightMeters || 15) * scale,
    })
  }, [map?.mapId, scale, map?.widthMeters, map?.heightMeters])

  // svgW/svgH are the actual rendered size of the floorplan (in pixels),
  // matching exactly what FloorplanLayer draws — not just `widthMeters * scale`.
  const svgW = effSize.widthPx
  const svgH = effSize.heightPx

  // Pixels-per-meter derived from the rendered size. When the image is loaded
  // this matches its natural aspect exactly; when it isn't, it falls back to
  // the BE values at the default scale. Using this single conversion function
  // everywhere guarantees nodes/edges/routes land on the same pixel positions
  // as the floorplan image — no aspect-ratio mismatch.
  const pxPerMeter = effSize.widthMeters > 0 ? effSize.widthPx / effSize.widthMeters : scale
  const effScale = (m) => m * pxPerMeter

  // Wheel zoom - use native event with passive: false to prevent page scroll
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

  // Lerp animation loop
  useEffect(() => {
    const animate = () => {
      setCurrentTransform((prev) => {
        const lerpFactor = 0.12 // Smoothness factor (0-1, lower = smoother)
        const dx = targetTransform.x - prev.x
        const dy = targetTransform.y - prev.y
        const dz = targetTransform.zoom - prev.zoom

        // Stop animating when close enough
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
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [targetTransform])

  // Fit map to viewport on load
  useEffect(() => {
    if (!map || !containerRef.current) return

    const fitToView = () => {
      const rect = containerRef.current.getBoundingClientRect()
      const zoom = Math.min(
        (rect.width - 80) / svgW,
        (rect.height - 80) / svgH,
        4
      )
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

  // Focus on robot function
  const focusOnRobot = useCallback((robotCode) => {
    if (!containerRef.current) return

    const robot = robots.find((r) => r.robotCode === robotCode)
    if (!robot) return

    const pose = robotPoses[robotCode]
    if (!pose) return

    const rect = containerRef.current.getBoundingClientRect()
    const robotX = effScale(pose.x)
    const robotY = effScale(pose.y)
    const zoom = currentTransform.zoom

    // Origin (0,0) is the floorplan's top-left — same convention as the editor and
    // the DB. Centre the robot in the viewport by offsetting from its world position.
    setTargetTransform({
      x: rect.width / 2 - robotX * zoom,
      y: rect.height / 2 - robotY * zoom,
      zoom,
    })
  }, [robots, robotPoses, scale, effSize, currentTransform.zoom])

  // Focus on robot when selectedRobotCode changes (from robot list/panel click)
  useEffect(() => {
    if (!selectedRobotCode) return
    setFocusedRobot(selectedRobotCode)
    focusOnRobot(selectedRobotCode)
  }, [selectedRobotCode])

  // Handle robot click on map
  const handleRobotClick = useCallback((robot) => {
    setFocusedRobot(robot.robotCode)
    onRobotClick?.(robot)
    focusOnRobot(robot.robotCode)
  }, [onRobotClick, focusOnRobot])

  // Mouse handlers for panning
  const handleMouseDown = (e) => {
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }

    // Stop any in-progress animation and start dragging
    setTargetTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
    setCurrentTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  // Zoom buttons
  const zoomIn = () => {
    setTargetTransform((t) => ({ ...t, zoom: clampZoom(t.zoom * 1.2, 0.3, 4) }))
    setCurrentTransform((t) => ({ ...t, zoom: clampZoom(t.zoom * 1.2, 0.3, 4) }))
  }
  const zoomOut = () => {
    setTargetTransform((t) => ({ ...t, zoom: clampZoom(t.zoom / 1.2, 0.3, 4) }))
    setCurrentTransform((t) => ({ ...t, zoom: clampZoom(t.zoom / 1.2, 0.3, 4) }))
  }
  const fitView = () => {
    if (!containerRef.current) return
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

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-low">
      {/* Controls */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1 rounded-lg bg-smb-surface-container-lowest p-1 shadow-md">
        <button onClick={zoomIn} className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container" title="Phóng to">
          <span className="material-symbols-outlined">add</span>
        </button>
        <button onClick={zoomOut} className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container" title="Thu nhỏ">
          <span className="material-symbols-outlined">remove</span>
        </button>
        <button onClick={fitView} className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container" title="Vừa khung">
          <span className="material-symbols-outlined">fit_screen</span>
        </button>
      </div>

      {/* Live indicator */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-smb-surface-container-lowest/95 px-3 py-1.5 text-xs font-medium text-smb-on-surface shadow-sm">
        <span className="size-2 rounded-full bg-smb-success animate-pulse" />
        Đang theo dõi trực tiếp
      </div>

      {/* Map viewport */}
      <div
        ref={containerRef}
        className="h-full w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
      >
        <svg width="100%" height="100%" style={{ userSelect: 'none' }}>
          <g transform={`translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.zoom})`}>
            <FloorplanLayer map={map} scale={scale} onEffectiveSize={setEffSize} />
            <SemanticObjectsLayer objects={map.semanticObjects} metersToPx={effScale} />
            <EdgesLayer nodes={map.nodes} edges={map.edges} metersToPx={effScale} />
            <RouteLayer route={selectedRoute} nodesById={nodesById} metersToPx={effScale} />
            <NodesLayer nodes={map.nodes} metersToPx={effScale} onNodeClick={onNodeClick} />

            {/* Robots */}
            {robots.map((r) => {
              const pose = robotPoses[r.robotCode]
              if (!pose) return null
              const x = effScale(pose.x)
              const y = effScale(pose.y)
              const palette = statusPalette(r.status)
              const isFocused = focusedRobot === r.robotCode

              return (
                <g
                  key={r.robotId}
                  transform={`translate(${x}, ${y}) rotate(${(pose.headingDeg ?? 0).toFixed(2)})`}
                  onClick={() => handleRobotClick(r)}
                  className="cursor-pointer"
                >
                  {/* Selection ring */}
                  {isFocused && <circle r={18} fill="#264191" fillOpacity={0.15} />}

                  {/* Robot body */}
                  <circle r={10} fill={palette.dot} stroke="#ffffff" strokeWidth={2.5} />

                  {/* Direction indicator */}
                  <polygon points="0,-14 -4,-7 4,-7" fill={palette.dot} stroke="#ffffff" strokeWidth={1} />
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
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
                <line x1="0" y1="3" x2="18" y2="3" stroke={meta.color} strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" />
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
