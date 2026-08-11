import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import CommandPalette from '../components/CommandPalette'
import { MapSkeleton, PanelSkeleton } from '../components/ui/Skeleton'
import {
  FleetMap,
  RobotAssignmentPanel,
  FleetStatsHeader,
} from '../features/robot'
import {
  useRobotFleet,
  useMapAndRoutes,
} from '../features/robot/hooks'

export function RobotMonitoring() {
  const navigate = useNavigate()
  const { robots, poses, loading: robotsLoading, tick } = useRobotFleet({ pollMs: 5000 })
  const { map, routes, routeTypes, loading: mapLoading, refresh: refreshRoutes } = useMapAndRoutes({ floorId: 1 })

  const [selectedRobotCode, setSelectedRobotCode] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [previewedRoute, setPreviewedRoute] = useState(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isEditingMap, setIsEditingMap] = useState(false)
  const [robotIp, setRobotIp] = useState('192.168.69.226')
  const [enableRos, setEnableRos] = useState(false) // Tắt tạm - bật khi Pi 5 online

  const handleSelectRobot = useCallback((robot) => {
    setSelectedRobotCode(robot.robotCode)
    setSelectedNodeId(null)
    setPreviewedRoute(null)
  }, [])

  return (
    <div className="min-h-screen bg-smb-surface transition-colors duration-200">
      <Sidebar
        activeItem="Giám Sát Robot"
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <div className="pl-[260px]">
        <Navbar
          title="Giám Sát Robot Theo Thời Gian Thực"
          subtitle="Theo dõi vị trí đội robot, telemetry và gán lộ trình di chuyển tự động"
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex flex-col gap-6 px-6 py-6">
          <FleetStatsHeader robots={robots} />

          {/* ROS Bridge Settings */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEnableRos(!enableRos)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                enableRos 
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' 
                  : 'border-slate-600 bg-slate-700/50 text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-base">cable</span>
              ROS Bridge: {enableRos ? 'ON' : 'OFF'}
            </button>
            {enableRos && (
              <button
                onClick={() => {
                  const newIp = prompt('Nhập IP Pi 5 (ROS Bridge):', robotIp)
                  if (newIp && newIp.trim()) setRobotIp(newIp.trim())
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-700/50 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-600/50 transition-all"
              >
                <span className="material-symbols-outlined text-base">settings_ethernet</span>
                <span className="font-mono">{robotIp}:8765</span>
              </button>
            )}
          </div>

          {mapLoading || robotsLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[minmax(640px,calc(100vh-220px))]">
              <div className="lg:col-span-9">
                <MapSkeleton />
              </div>
              <div className="lg:col-span-3">
                <PanelSkeleton />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[minmax(640px,calc(100vh-220px))]">
              <div className="lg:col-span-9">
                <FleetMap
                  map={map}
                  robots={robots}
                  robotPoses={poses}
                  selectedRoute={previewedRoute}
                  onClearRoutePreview={() => setPreviewedRoute(null)}
                  routeTypes={routeTypes}
                  selectedRobotCode={selectedRobotCode}
                  onRobotClick={handleSelectRobot}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={(node) => setSelectedNodeId((prev) => (prev === node.nodeId ? null : node.nodeId))}
                  onClearSelection={() => { setSelectedRobotCode(null); setSelectedNodeId(null) }}
                  tick={tick}
                  isEditing={isEditingMap}
                  onToggleEdit={() => setIsEditingMap(!isEditingMap)}
                  onMapSaved={() => window.location.reload()}
                  robotIp={robotIp}
                  foxglovePort={8765}
                  enableRosBridge={enableRos}
                />
              </div>
              <div className="lg:col-span-3">
                <RobotAssignmentPanel
                  robots={robots}
                  poses={poses}
                  routes={routes}
                  map={map}
                  selectedRobotCode={selectedRobotCode}
                  onSelectRobot={handleSelectRobot}
                  onPreviewRoute={(detail) => setPreviewedRoute(detail)}
                  onRouteCreated={refreshRoutes}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setIsEditingMap(!isEditingMap)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-xs transition-all active:scale-95 ${
                isEditingMap 
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' 
                  : 'border-smb-outline-variant/60 bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-primary hover:text-smb-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">edit_square</span>
              {isEditingMap ? 'Tat Che Do Chinh Sua Ban Do' : 'Bat Che Do Chinh Sua Ban Do'}
            </button>
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  )
}

export default RobotMonitoring