import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '../features/robot/hooks'

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
 *
 * All data is loaded live from the backend (`/api/Robots`, `/api/v1/maps/latest`,
 * `/api/v1/routes`). Route↔robot assignment is currently read-only because the
 * BE has no `POST /routes/{id}/assign` endpoint — only the route listing,
 * detail preview, and route creation are wired up.
 */
export function RobotMonitoring() {
  const navigate = useNavigate()
  const { robots, poses, loading: robotsLoading, tick } = useRobotFleet({ pollMs: 5000 })
  const { map, routes, loading: mapLoading, refresh: refreshRoutes } = useMapAndRoutes({ floorId: 1 })

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

        <main className="flex flex-col gap-6 px-6 py-6">
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
              className="flex items-center gap-2 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-4 py-2 text-xs font-semibold text-smb-on-surface-variant hover:border-smb-primary-container hover:text-smb-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">edit_square</span>
              Chỉnh sửa Bản đồ
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

export default RobotMonitoring