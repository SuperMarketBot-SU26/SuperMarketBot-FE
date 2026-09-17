import { useCallback, useState, useMemo, useEffect } from 'react'
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
  useActiveMission,
} from '../features/robot/hooks'

export function RobotMonitoring() {
  const { robots, poses, loading: robotsLoading } = useRobotFleet({ pollMs: 3000 })
  const { map, routes, loading: mapLoading, refresh: refreshRoutes } = useMapAndRoutes({ floorId: 1 })

  const [selectedRobotCode, setSelectedRobotCode] = useState(null)
  const activeRobotCode = selectedRobotCode || robots?.[0]?.robotCode || 'RB0001'
  const selectedRobot = robots?.find((r) => r.robotCode === activeRobotCode)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const { missionState: fetchedMissionState } = useActiveMission(activeRobotCode, 3000)
  const [dispatchedMission, setDispatchedMission] = useState(null)

  // Tự động giải phóng trạng thái dispatchedMission khi nhiệm vụ kết thúc / robot trở về trạng thái rảnh
  useEffect(() => {
    if (!dispatchedMission) return

    const isFetchedTerminal =
      fetchedMissionState &&
      (fetchedMissionState.status === 'COMPLETED' ||
        fetchedMissionState.status === 'CANCELLED' ||
        fetchedMissionState.status === 'IDLE')

    const isRobotIdle =
      selectedRobot &&
      (selectedRobot.activeMissionStatus === 'COMPLETED' ||
        selectedRobot.activeMissionStatus === 'CANCELLED' ||
        (selectedRobot.status === 'IDLE' && selectedRobot.activeMissionStatus === null))

    const isHandoffTimedOut =
      dispatchedMission.dispatchedAt &&
      Date.now() - dispatchedMission.dispatchedAt > 8000 &&
      !fetchedMissionState

    if (isFetchedTerminal || isRobotIdle || isHandoffTimedOut) {
      setDispatchedMission(null)
    }
  }, [fetchedMissionState, selectedRobot, dispatchedMission])

  // Kết hợp trạng thái nhiệm vụ vừa phát từ Admin và trạng thái polling từ Robot
  const missionState = useMemo(() => {
    // 1. Nếu backend báo đã COMPLETED / CANCELLED / IDLE -> không còn nhiệm vụ hoạt động
    if (
      fetchedMissionState &&
      (fetchedMissionState.status === 'COMPLETED' ||
        fetchedMissionState.status === 'CANCELLED' ||
        fetchedMissionState.status === 'IDLE')
    ) {
      return null
    }

    // 2. Nếu backend đang có nhiệm vụ đang chạy (NAVIGATING / ARRIVED / PAUSED / DISPATCHED)
    if (fetchedMissionState) {
      return {
        ...fetchedMissionState,
        waypoints:
          fetchedMissionState.waypoints && fetchedMissionState.waypoints.length > 0
            ? fetchedMissionState.waypoints
            : dispatchedMission?.waypoints || [],
      }
    }

    // 3. Nếu vừa phát lệnh trong vòng 8s và backend chưa kịp phản hồi polling
    if (
      dispatchedMission &&
      (!dispatchedMission.dispatchedAt || Date.now() - dispatchedMission.dispatchedAt < 8000)
    ) {
      return dispatchedMission
    }

    return null
  }, [dispatchedMission, fetchedMissionState])

  const handleSelectRobot = useCallback((robot) => {
    setSelectedRobotCode(robot.robotCode)
    setDispatchedMission(null)
  }, [])

  return (
    <div className="h-screen bg-smb-surface flex overflow-hidden transition-colors duration-200">
      <Sidebar
        activeItem="Giám Sát Robot"
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <div className="pl-[260px] flex-1 flex flex-col h-screen min-h-0 overflow-hidden">
        <Navbar
          title="Giám Sát Robot Theo Thời Gian Thực"
          subtitle="Theo dõi vị trí đội robot, telemetry và gán lộ trình di chuyển tự động"
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 py-2.5 gap-2.5">
          <FleetStatsHeader robots={robots} compact={true} />

          {/* Main area: map + sidebar panel */}

          {mapLoading || robotsLoading ? (
            <div className="flex flex-1 gap-3 min-h-0">
              <div className="flex-1 min-h-0">
                <MapSkeleton />
              </div>
              <div className="w-[360px] shrink-0">
                <PanelSkeleton />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 gap-3 min-h-0 overflow-hidden">
              {/* Map — takes all available height */}
              <div className="flex-1 min-h-0 rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest overflow-hidden relative">
                <FleetMap
                  robots={robots}
                  poses={poses}
                  map={map}
                  missionState={missionState}
                  selectedRobotCode={activeRobotCode}
                  onMissionCancelled={() => setDispatchedMission(null)}
                />
              </div>
              {/* Sidebar panel — fixed width, internal scroll */}
              <div className="w-[360px] shrink-0 flex flex-col min-h-0 overflow-hidden rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest">
                <RobotAssignmentPanel
                  robots={robots}
                  poses={poses}
                  routes={routes}
                  map={map}
                  selectedRobotCode={activeRobotCode}
                  onSelectRobot={handleSelectRobot}
                  onRouteCreated={refreshRoutes}
                  onMissionDispatched={(data) => setDispatchedMission(data)}
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
