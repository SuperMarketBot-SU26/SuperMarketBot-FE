import React, { useCallback, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import {
  FleetMap,
  RobotAssignmentPanel,
  FleetStatsHeader,
} from '../features/robot'
import {
  useRobotFleet,
  useMapAndRoutes,
  useAssignments,
} from '../features/robot/hooks'
import { mockAssignments } from '../features/robot/utils/mockData'

/**
 * Robot Monitoring — "Giám Sát Robot" page.
 * Layout (lg+):
 *   ┌───────────────────────────────────────────────────┐
 *   │ KPI strip                                         │
 *   ├──────────────────────────────────────┬────────────┤
 *   │  Indoor FleetMap (3/4 width)         │ Assignment │
 *   │  pan/zoom, nodes, edges, shelves,    │ (1/4)      │
 *   │  live robot markers                  │ scrollable │
 *   │                                      │  · robots  │
 *   │                                      │  · routes  │
 *   └──────────────────────────────────────┴────────────┘
 */
export function RobotMonitoring() {
  const { robots, poses, loading: robotsLoading, tick } = useRobotFleet({ pollMs: 5000 })
  const { map, routes, loading: mapLoading, refresh: refreshRoutes } = useMapAndRoutes({ mapId: 1 })
  const {
    assignments,
    assignRobot,
    unassignRobot,
    getAssignedRoute,
  } = useAssignments(mockAssignments)

  // Serialise the Set<robotCode> into a plain array for downstream components
  // (Sets don't round-trip well through props / JSON.stringify / devtools).
  const assignmentsByRoute = useMemo(() => {
    const out = {}
    for (const [routeId, set] of Object.entries(assignments)) {
      out[routeId] = Array.from(set)
    }
    return out
  }, [assignments])

  const getAssignedRouteForRobot = useCallback(
    (robotCode) => getAssignedRoute(robotCode, routes),
    [getAssignedRoute, routes]
  )

  const [selectedRobotCode, setSelectedRobotCode] = useState(null)
  const [previewedRoute, setPreviewedRoute] = useState(null)

  const handleSelectRobot = useCallback((robot) => {
    setSelectedRobotCode(robot.robotCode)
    setPreviewedRoute(null)
  }, [])

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Giám Sát Robot" />

      <div className="pl-[260px]">
        <Navbar
          title="Giám Sát Robot Theo Thời Gian Thực"
          subtitle="Theo dõi đội robot, vị trí trên bản đồ và gán lộ trình di chuyển"
        />

        <main className="flex flex-col gap-4 px-6 py-6">
          <FleetStatsHeader robots={robots} />

          {mapLoading || robotsLoading ? (
            <div className="flex h-[600px] items-center justify-center rounded-lg border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant">
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                <p className="text-sm">Đang tải bản đồ và danh sách robot…</p>
              </div>
            </div>
          ) : (
            // 12-col grid: map = 9 (3/4), panel = 3 (1/4)
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[minmax(640px,calc(100vh-220px))]">
              <div className="lg:col-span-9">
                <FleetMap
                  map={map}
                  robots={robots}
                  robotPoses={poses}
                  selectedRoute={previewedRoute}
                  selectedRobotCode={selectedRobotCode}
                  onRobotClick={handleSelectRobot}
                  tick={tick}
                />
              </div>
              <div className="lg:col-span-3">
                <RobotAssignmentPanel
                  robots={robots}
                  poses={poses}
                  assignmentsByRoute={assignmentsByRoute}
                  routes={routes}
                  map={map}
                  selectedRobotCode={selectedRobotCode}
                  getAssignedRoute={getAssignedRouteForRobot}
                  onSelectRobot={handleSelectRobot}
                  onAssignRobot={assignRobot}
                  onUnassignRobot={unassignRobot}
                  onPreviewRoute={(detail) => setPreviewedRoute(detail)}
                  onRouteCreated={refreshRoutes}
                />
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-smb-on-surface-variant">
            Dữ liệu đang hiển thị từ placeholder. Khi backend sẵn sàng, bật cờ{' '}
            <span className="font-mono">USE_MOCK = false</span> trong các file trong{' '}
            <span className="font-mono">src/features/robot/api</span> để chuyển sang gọi API thật.
          </p>
        </main>
      </div>
    </div>
  )
}

export default RobotMonitoring