import { useCallback, useState } from 'react'
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
  const { robots, poses, loading: robotsLoading } = useRobotFleet({ pollMs: 5000 })
  const { map, routes, loading: mapLoading, refresh: refreshRoutes } = useMapAndRoutes({ floorId: 1 })

  const [selectedRobotCode, setSelectedRobotCode] = useState(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const handleSelectRobot = useCallback((robot) => {
    setSelectedRobotCode(robot.robotCode)
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

        <main className="flex flex-1 flex-col overflow-hidden px-6 py-6 gap-4">
          <FleetStatsHeader robots={robots} />

          {/* Main area: map + sidebar panel */}

          {mapLoading || robotsLoading ? (
            <div className="flex flex-1 gap-4 min-h-0">
              <div className="flex-1 min-h-0">
                <MapSkeleton />
              </div>
              <div className="w-80 shrink-0">
                <PanelSkeleton />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
              {/* Map — takes all available height */}
              <div className="flex-1 min-h-0 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest overflow-hidden">
                <FleetMap />
              </div>
              {/* Sidebar panel — fixed width, internal scroll */}
              <div className="w-80 shrink-0 flex flex-col min-h-0 overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
                <RobotAssignmentPanel
                  robots={robots}
                  poses={poses}
                  routes={routes}
                  map={map}
                  selectedRobotCode={selectedRobotCode}
                  onSelectRobot={handleSelectRobot}
                  onRouteCreated={refreshRoutes}
                />
              </div>
            </div>
          )}

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
