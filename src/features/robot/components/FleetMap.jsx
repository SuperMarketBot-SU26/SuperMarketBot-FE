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
import { SlamCanvas, SlamMinimap } from './SlamCanvas'
import { statusPalette, clampZoom } from '../utils/robotHelpers'
import { useRosConnection } from '../hooks/useRosConnection'
import { ROUTE_TYPE_META } from './RobotAssignmentPanel'
import logoUrl from '../../../assets/logo.png'
import { syncMap, uploadFloorplanImage } from '../api/mapsApi'


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
  isEditing = false,
  onToggleEdit,
  onMapSaved,
  robotIp = '192.168.0.105',
  foxglovePort = 8765,
  enableRosBridge = false,
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

  // ROS Bridge Connection State
  const {
    isConnected: rosConnected,
    connectionState: rosConnectionState,
    rosMapData,
    robotPose: rosRobotPose,
    laserScan,
    reconnect: rosReconnect,
  } = useRosConnection({
    robotIp,
    port: foxglovePort,
    autoConnect: enableRosBridge && viewMode === 'slam',
    subscribeTopics: ['/map', '/odom', '/scan', '/tf'],
  })

  // Update ROS auto-connect when SLAM mode changes
  useEffect(() => {
    if (enableRosBridge && viewMode === 'slam') {
      rosReconnect();
    }
  }, [viewMode, enableRosBridge, rosReconnect])


  const [drawMode, setDrawMode] = useState('none')
  const [localNodes, setLocalNodes] = useState([])
  const [localEdges, setLocalEdges] = useState([])
  const [tempEdge, setTempEdge] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeEditNodeId, setActiveEditNodeId] = useState(null)
  const [showAllLabels, setShowAllLabels] = useState(false)
  const [history, setHistory] = useState([])
  const slamFileRef = useRef(null)

  useEffect(() => {
    if (isEditing && map) {
      setLocalNodes(map.nodes || [])
      setLocalEdges(map.edges || [])
      setDrawMode('none')
      setActiveEditNodeId(null)
      if (viewMode === '3d_interactive') {
        setViewMode('slam')
      }
    }
  }, [isEditing, map, viewMode])

  // Map Metadata & Coordinate Math Helpers
  const mapResolution = map?.resolution || 0.05;
  const mapOriginX = map?.originX || 0;
  const mapOriginY = map?.originY || 0;

  const [effSize, setEffSize] = useState({ widthMeters: 20, heightMeters: 15, widthPx: 400, heightPx: 300 })

  const pxToMetersX = useCallback((px) => {
    return mapOriginX + (px * mapResolution);
  }, [mapOriginX, mapResolution])

  const pxToMetersY = useCallback((py) => {
    const imgHeightPixels = effSize.heightPx;
    if (imgHeightPixels <= 0) return mapOriginY;
    const ros_grid_y = (imgHeightPixels - 1) - py;
    return mapOriginY + (ros_grid_y * mapResolution);
  }, [mapOriginY, mapResolution, effSize.heightPx])


  useEffect(() => {
    if (!map) return
    const res = map.resolution || 0.05;
    setEffSize({
      widthMeters: map.widthMeters || 20,
      heightMeters: map.heightMeters || 15,
      widthPx: Math.round((map.widthMeters || 20) / res),
      heightPx: Math.round((map.heightMeters || 15) / res),
    })
  }, [map?.mapId, map?.resolution, map?.widthMeters, map?.heightMeters])

  const svgW = effSize.widthPx
  const svgH = effSize.heightPx

  // Map ROS SLAM (Meters) -> Pixel canvas using Resolution & Origin
  const effScaleX = useCallback((ros_x) => {
    return (ros_x - mapOriginX) / mapResolution;
  }, [mapOriginX, mapResolution])

  const effScaleY = useCallback((ros_y) => {
    const imgHeightPixels = effSize.heightPx;
    if (imgHeightPixels <= 0) return 0;
    const ros_grid_y = (ros_y - mapOriginY) / mapResolution;
    return (imgHeightPixels - 1) - ros_grid_y;
  }, [mapOriginY, mapResolution, effSize.heightPx])

  const effScale = useCallback((val) => {
    return val / mapResolution;
  }, [mapResolution])

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
    const robotX = effScaleX(pose.x)
    const robotY = effScaleY(pose.y)
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
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const canvasX = (mouseX - currentTransform.x) / currentTransform.zoom
    const canvasY = (mouseY - currentTransform.y) / currentTransform.zoom

    if (isEditing && drawMode === 'add_edge' && tempEdge) {
      setTempEdge({ ...tempEdge, mouseX: canvasX, mouseY: canvasY })
    }

    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }

    if (isEditing && drawMode === 'none' && activeEditNodeId) {
      const nodeObj = localNodes.find(n => n.nodeId === activeEditNodeId)
      if (nodeObj) {
        const dxCanvas = dx / currentTransform.zoom
        const dyCanvas = dy / currentTransform.zoom
        const curPxX = effScaleX(nodeObj.xCoord) + dxCanvas
        const curPxY = effScaleY(nodeObj.yCoord) + dyCanvas
        setLocalNodes(prev => prev.map(n => n.nodeId === activeEditNodeId ? {
          ...n,
          xCoord: pxToMetersX(curPxX),
          yCoord: pxToMetersY(curPxY)
        } : n))
      }
      return
    }

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
      if (isEditing) {
        if (drawMode === 'add_node' && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const canvasX = ((e.clientX - rect.left) - currentTransform.x) / currentTransform.zoom
          const canvasY = ((e.clientY - rect.top) - currentTransform.y) / currentTransform.zoom
          
          pushHistory()
          const newNode = {
            nodeId: 'temp_' + Date.now(),
            nodeName: 'Node mới',
            xCoord: pxToMetersX(canvasX),
            yCoord: pxToMetersY(canvasY),
            nodeType: 'Corridor',
            isBlocked: false
          }
          setLocalNodes(prev => [...prev, newNode])
        } else if (drawMode === 'none') {
          setActiveEditNodeId(null)
        }
      } else {
        onClearSelection?.()
      }
    }
  }


  const handleNodeClickEdit = (n) => {
    if (!isEditing) {
      onNodeClick?.(n)
      return
    }
    if (drawMode === 'none') {
      setActiveEditNodeId(n.nodeId)
    } else if (drawMode === 'add_edge') {
      if (!tempEdge) {
        setTempEdge({ sourceId: n.nodeId, mouseX: effScaleX(n.xCoord), mouseY: effScaleY(n.yCoord) })
      } else {
        if (tempEdge.sourceId !== n.nodeId) {
          const exists = localEdges.find(e => 
            (e.fromNodeId === tempEdge.sourceId && e.toNodeId === n.nodeId) ||
            (e.toNodeId === tempEdge.sourceId && e.fromNodeId === n.nodeId && e.isBidirectional)
          )
          if (!exists) {
            pushHistory()
            setLocalEdges(prev => [...prev, {
              edgeId: 'temp_' + Date.now(),
              fromNodeId: tempEdge.sourceId,
              toNodeId: n.nodeId,
              isBidirectional: true
            }])
          }
        }
        setTempEdge(null)
      }
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


  const handleSaveDb = async () => {
    if (!map) return
    if (!window.confirm('Ban co chac muon luu ban do vao Database?')) return
    
    setSaving(true)
    try {

      let tempNodeCounter = -1;
      const idMapping = new Map();

      const nodesPayload = localNodes.map(n => {
        let finalId = Number(n.nodeId);
        if (typeof n.nodeId === 'string' && n.nodeId.startsWith('temp_')) {
          finalId = tempNodeCounter--;
        }
        idMapping.set(n.nodeId, finalId);

        return {
          nodeId: finalId,
          nodeName: n.nodeName || n.name || `Node ${n.nodeId}`,
          xCoord: Number(Number(n.xCoord).toFixed(2)),
          yCoord: Number(Number(n.yCoord).toFixed(2)),
          nodeType: n.nodeType || 'Corridor',
          nodeRole: n.nodeRole || null,
          isBlocked: n.isBlocked || false
        }
      });

      let tempEdgeCounter = -1;
      const edgesPayload = localEdges.map(e => {
        let finalEdgeId = Number(e.edgeId);
        if (typeof e.edgeId === 'string' && e.edgeId.startsWith('temp_')) {
          finalEdgeId = tempEdgeCounter--;
        }

        const a = localNodes.find(n => n.nodeId === e.fromNodeId)
        const b = localNodes.find(n => n.nodeId === e.toNodeId)
        const dist = (a && b) ? Math.sqrt(Math.pow(a.xCoord - b.xCoord, 2) + Math.pow(a.yCoord - b.yCoord, 2)) : 0
        
        return {
          edgeId: finalEdgeId,
          fromNodeId: idMapping.get(e.fromNodeId) ?? -1,
          toNodeId: idMapping.get(e.toNodeId) ?? -1,
          distance: dist,
          isBidirectional: e.isBidirectional
        }
      });

      const payload = {
        floorId: 1,
        mapName: map.mapName || 'Floor 1 Map',
        widthMeters: map.widthMeters || 20,
        heightMeters: map.heightMeters || 15,
        resolution: map.resolution || 0.05,
        originX: map.originX || 0,
        originY: map.originY || 0,
        originYaw: map.originYaw || 0,
        nodes: nodesPayload,
        edges: edgesPayload,
        semanticObjects: map.semanticObjects || []
      }
      
      const res = await syncMap(payload)
      alert(res.message || 'Luu DB thanh cong!')
      onMapSaved?.()
    } catch (err) {
      console.error("Sync Error Payload:", err.response?.data)
      const detail = JSON.stringify(err.response?.data, null, 2) || err.message
      alert('Lưu DB thất bại: ' + detail)
    } finally {
      setSaving(false)
    }
  }

  const pushHistory = () => {
    setHistory(prev => [...prev.slice(-20), { nodes: [...localNodes], edges: [...localEdges] }])
  }

  const undo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setLocalNodes(last.nodes)
    setLocalEdges(last.edges)
    setHistory(prev => prev.slice(0, -1))
    setActiveEditNodeId(null)
  }

  const deleteEdgesOfNode = (nodeId) => {
    pushHistory()
    setLocalEdges(prev => prev.filter(e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId))
  }

  const deleteActiveNode = () => {
    pushHistory()
    setLocalNodes(prev => prev.filter(n => n.nodeId !== activeEditNodeId))
    setLocalEdges(prev => prev.filter(e => e.fromNodeId !== activeEditNodeId && e.toNodeId !== activeEditNodeId))
    setActiveEditNodeId(null)
  }

  const handleUploadSlam = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !map?.mapId) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await uploadFloorplanImage(map.mapId, formData)
      alert('Upload ảnh SLAM thành công!')
      onMapSaved?.()
    } catch (err) {
      alert('Upload thất bại: ' + err.message)
    }
  }

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
          selectedNodeId={isEditing ? activeEditNodeId : selectedNodeId}
          onNodeClick={isEditing ? handleNodeClickEdit : onNodeClick}
          onToggleEdit={onToggleEdit}
          enableRosBridge={enableRosBridge}
          rosMapData={rosMapData}
          rosRobotPose={rosRobotPose}
          laserScan={laserScan}
        />
      </div>
    )
  }

  // SLAM 2D Mode - Real-time ROS 2 Bridge View
  if (viewMode === 'slam') {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-[#0b0f17] shadow-sm">
        {/* SLAM Header */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/90 px-3.5 py-1.5 backdrop-blur-md shadow-md">
            <span className="relative flex size-2.5">
              {rosConnected ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
              )}
            </span>
            <span className="text-xs font-semibold text-white">
              {rosConnected ? 'ROS Bridge Connected' : rosConnectionState === 'reconnecting' ? 'Reconnecting...' : 'ROS Bridge Offline'}
            </span>
            <span className="text-[10px] text-emerald-300/70">
              ws://{robotIp}:{foxglovePort}
            </span>
          </div>

          {rosMapData && (
            <div className="rounded-full border border-blue-500/30 bg-slate-900/90 px-3 py-1 backdrop-blur-md shadow-md">
              <span className="text-xs font-semibold text-blue-400">
                🗺️ {rosMapData.info?.width}x{rosMapData.info?.height} @ {((rosMapData.info?.resolution || 0.05) * 100).toFixed(1)}cm
              </span>
            </div>
          )}

          {laserScan && (
            <div className="rounded-full border border-red-500/30 bg-slate-900/90 px-3 py-1 backdrop-blur-md shadow-md">
              <span className="text-xs font-semibold text-red-400">
                📡 {laserScan.pointCount || 0} pts
              </span>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 p-1 backdrop-blur-md shadow-md">
            <button
              type="button"
              onClick={() => setViewMode('3d_interactive')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Icon name="3d_rotation" className="text-[16px]" />
              <span>🧊 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Icon name="view_in_ar" className="text-[16px]" />
              <span>🎨 3D Flat</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slam')}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs"
            >
              <Icon name="grid_view" className="text-[16px]" />
              <span>📐 LiDAR SLAM</span>
            </button>
          </div>
        </div>

        {/* SLAM Canvas - Full viewport */}
        <div className="absolute inset-0">
          <SlamCanvas
            rosMapData={rosMapData}
            robotPose={rosRobotPose}
            laserScan={laserScan}
            scale={64}
            showLaserPoints={true}
            showRobot={true}
            showGrid={true}
          />
        </div>

        {/* Robot Telemetry HUD - Bottom Left */}
        {rosRobotPose && (
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-3 backdrop-blur-md shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">
                Robot Pose (ROS)
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-[9px] text-slate-500 uppercase">X (m)</div>
                  <div className="text-sm font-mono font-bold text-white">
                    {rosRobotPose.position?.x?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-slate-500 uppercase">Y (m)</div>
                  <div className="text-sm font-mono font-bold text-white">
                    {rosRobotPose.position?.y?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-slate-500 uppercase">Yaw (°)</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    {rosRobotPose.orientation?.yawDeg?.toFixed(1) || '0.0'}°
                  </div>
                </div>
              </div>
            </div>

            {/* Mini SLAM Map */}
            <SlamMinimap
              rosMapData={rosMapData}
              robotPose={rosRobotPose}
              laserScan={laserScan}
              size={150}
            />
          </div>
        )}

        {/* Connection Controls - Bottom Right */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
          {!rosConnected && (
            <button
              type="button"
              onClick={rosReconnect}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all hover:bg-emerald-500 active:scale-95"
            >
              <Icon name="sync" className="text-[16px]" />
              Kết Nối ROS
            </button>
          )}

          <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-2 backdrop-blur-md shadow-md">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">
                IP: <span className="font-mono text-white">{robotIp}</span>
              </span>
              <span className="text-slate-600">:</span>
              <span className="font-mono text-white">{foxglovePort}</span>
            </div>
          </div>
        </div>

        {/* SLAM Instructions */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1.5 backdrop-blur-md shadow-md">
            <span className="text-[10px] text-slate-400">
              <span className="text-emerald-400">●</span> Kết nối thành công với ROS 2 | 
              <span className="text-blue-400"> 🗺️</span> Bản đồ SLAM | 
              <span className="text-red-400"> 📡</span> YDLIDAR | 
              <span className="text-white"> 🤖</span> Vị trí Robot
            </span>
          </div>
        </div>
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
        style={{ cursor: isEditing && drawMode === 'add_node' ? 'crosshair' : isEditing && drawMode === 'add_edge' ? 'pointer' : isDragging.current ? 'grabbing' : 'grab' }}
      >
        <svg width="100%" height="100%" style={{ userSelect: 'none' }}>
          <g transform={`translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.zoom})`}>
            <rect
              x={0} y={0}
              width={effSize.widthPx} height={effSize.heightPx}
              fill="transparent"
            />
            <FloorplanLayer map={map} scale={scale} viewMode={viewMode} onEffectiveSize={setEffSize} />
            <SemanticObjectsLayer objects={map.semanticObjects} effScaleX={effScaleX} effScaleY={effScaleY} />
            <EdgesLayer nodes={isEditing ? localNodes : map.nodes} edges={isEditing ? localEdges : map.edges} effScaleX={effScaleX} effScaleY={effScaleY} />
            {selectedRoute && (
              <RouteLayer
                route={selectedRoute}
                nodesById={nodesById}
                effScaleX={effScaleX}
                effScaleY={effScaleY}
              />
            )}
            <NodesLayer
              nodes={isEditing ? localNodes : (map.nodes || [])}
              metersToPx={effScale}
              effScaleX={effScaleX}
              effScaleY={effScaleY}
              onNodeClick={isEditing ? handleNodeClickEdit : onNodeClick}
              selectedNodeId={isEditing ? activeEditNodeId : selectedNodeId}
              showAllLabels={showAllLabels}
            />


            {isEditing && tempEdge && drawMode === 'add_edge' && (
              <line
                x1={effScaleX(localNodes.find(n => n.nodeId === tempEdge.sourceId)?.xCoord)}
                y1={effScaleY(localNodes.find(n => n.nodeId === tempEdge.sourceId)?.yCoord)}
                x2={tempEdge.mouseX}
                y2={tempEdge.mouseY}
                stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4"
                pointerEvents="none"
              />
            )}

            {/* Robots Markers */}
            {robots.map((r) => {
              const pose = robotPoses[r.robotCode]
              if (!pose) return null
              const x = effScaleX(pose.x)
              const y = effScaleY(pose.y)
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

      
      {/* Edit Toolbar Overlay — Premium Full-Feature Panel */}
      {isEditing && (
        <div className="absolute top-16 left-4 z-30 flex flex-col gap-2 w-64 max-h-[calc(100%-6rem)] overflow-y-auto scrollbar-thin">
          {/* Header + Stats */}
          <div className="rounded-xl border border-purple-500/40 bg-slate-900/95 p-3.5 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icon name="edit_square" className="text-[16px] text-purple-400" />
                Chỉnh Sửa Bản Đồ
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">{localNodes.length} nodes</span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">{localEdges.length} edges</span>
              </div>
            </div>

            {/* Show all labels toggle */}
            <label className="flex items-center gap-2 cursor-pointer group mb-1">
              <input
                type="checkbox"
                checked={showAllLabels}
                onChange={(e) => setShowAllLabels(e.target.checked)}
                className="accent-purple-500 size-3.5"
              />
              <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Hiện tên tất cả Node</span>
            </label>
          </div>

          {/* Drawing Tools */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 backdrop-blur-md shadow-lg space-y-1.5">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Công Cụ Vẽ</h4>
            <button
              onClick={() => { setDrawMode('none'); setTempEdge(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${drawMode === 'none' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Icon name="near_me" className="text-[16px]" />
              <div className="text-left"><div>Con Trỏ</div><div className="text-[9px] opacity-60 font-normal">Chọn & kéo thả node</div></div>
            </button>
            <button
              onClick={() => { setDrawMode('add_node'); setTempEdge(null); setActiveEditNodeId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${drawMode === 'add_node' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Icon name="add_circle" className="text-[16px]" />
              <div className="text-left"><div>Thêm Node</div><div className="text-[9px] opacity-60 font-normal">Click trên bản đồ để đặt</div></div>
            </button>
            <button
              onClick={() => { setDrawMode('add_edge'); setTempEdge(null); setActiveEditNodeId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${drawMode === 'add_edge' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Icon name="timeline" className="text-[16px]" />
              <div className="text-left"><div>Nối Cạnh</div><div className="text-[9px] opacity-60 font-normal">Click 2 node để nối</div></div>
            </button>
          </div>

          {/* Selected Node Properties */}
          {activeEditNodeId && drawMode === 'none' && (() => {
            const activeNode = localNodes.find(n => n.nodeId === activeEditNodeId)
            if (!activeNode) return null
            const connectedEdges = localEdges.filter(e => e.fromNodeId === activeEditNodeId || e.toNodeId === activeEditNodeId)
            return (
              <div className="rounded-xl border border-emerald-500/30 bg-slate-900/95 p-3 backdrop-blur-md shadow-lg space-y-2">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="info" className="text-[14px]" /> Thuộc Tính Node
                </h4>
                {/* Node ID */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">ID</span>
                  <span className="text-[10px] font-mono text-slate-400">{activeNode.nodeId}</span>
                </div>
                {/* Node Name */}
                <div>
                  <label className="text-[10px] text-slate-500 mb-0.5 block">Tên Node</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all"
                    value={activeNode.nodeName || ''}
                    onChange={(e) => setLocalNodes(prev => prev.map(n => n.nodeId === activeEditNodeId ? { ...n, nodeName: e.target.value } : n))}
                    placeholder="Nhập tên node"
                  />
                </div>
                {/* Node Type */}
                <div>
                  <label className="text-[10px] text-slate-500 mb-0.5 block">Loại Node</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none transition-all"
                    value={activeNode.nodeType || 'Corridor'}
                    onChange={(e) => setLocalNodes(prev => prev.map(n => n.nodeId === activeEditNodeId ? { ...n, nodeType: e.target.value } : n))}
                  >
                    <option value="Corridor">🚶 Hành lang</option>
                    <option value="CHECKOUT">🛒 Quầy Thu Ngân</option>
                    <option value="DOCK">🔋 Trạm Sạc</option>
                    <option value="REST">🚻 Nhà Vệ Sinh</option>
                    <option value="Entrance">🚪 Lối vào</option>
                    <option value="Shelf">📦 Kệ hàng</option>
                  </select>
                </div>
                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-0.5 block">X (m)</label>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-300">{activeNode.xCoord?.toFixed(3)}</div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-0.5 block">Y (m)</label>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-300">{activeNode.yCoord?.toFixed(3)}</div>
                  </div>
                </div>
                {/* isBlocked */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeNode.isBlocked || false}
                    onChange={(e) => setLocalNodes(prev => prev.map(n => n.nodeId === activeEditNodeId ? { ...n, isBlocked: e.target.checked } : n))}
                    className="accent-rose-500 size-3.5"
                  />
                  <span className="text-[11px] text-slate-400">🚫 Chặn node (isBlocked)</span>
                </label>
                {/* Connected edges info */}
                <div className="text-[10px] text-slate-500">{connectedEdges.length} cạnh kết nối</div>
                {/* Action buttons */}
                <div className="flex gap-1.5 pt-1">
                  <button onClick={deleteActiveNode} className="flex-1 flex justify-center items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                    <Icon name="delete" className="text-[14px]" /> Xóa Node
                  </button>
                  {connectedEdges.length > 0 && (
                    <button onClick={() => deleteEdgesOfNode(activeEditNodeId)} className="flex-1 flex justify-center items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white transition-all">
                      <Icon name="link_off" className="text-[14px]" /> Xóa Cạnh
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Actions Panel */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 backdrop-blur-md shadow-lg space-y-2">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hành Động</h4>
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="undo" className="text-[16px]" /> Hoàn tác
              {history.length > 0 && <span className="ml-auto text-[9px] text-slate-500">({history.length})</span>}
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveDb}
                disabled={saving}
                className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
              >
                <Icon name="save" className="text-[15px]" /> {saving ? 'Đang lưu...' : 'Lưu DB'}
              </button>
              <button
                onClick={() => slamFileRef.current?.click()}
                className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                <Icon name="upload" className="text-[15px]" /> Ảnh SLAM
              </button>
            </div>
            <input ref={slamFileRef} type="file" accept="image/*,.pgm,.yaml" className="hidden" onChange={handleUploadSlam} />
          </div>
        </div>
      )}

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
