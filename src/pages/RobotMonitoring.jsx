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
              onClick={() => navigate('/robot-monitoring/map-editor')}
              className="flex items-center gap-2 rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest px-4 py-2.5 text-xs font-bold text-smb-on-surface shadow-xs transition-all hover:border-smb-primary hover:bg-smb-surface-container hover:text-smb-primary active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">edit_square</span>
              Chỉnh Sửa Bản Đồ Robot (Map Editor)
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