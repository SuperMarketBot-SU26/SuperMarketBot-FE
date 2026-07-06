import React, { useEffect, useMemo, useState } from 'react'
import { getRoute } from '../api/robotRoutesApi'
import { planRoute } from '../api/navigationApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * RouteAssignmentPanel
 * - Lists existing routes
 * - Lets the operator pick a route for the currently-selected robot
 * - Lets the operator plan a brand-new route by entering a start/end node id
 *
 * Props:
 *   robot             RobotDto | null            currently-selected robot
 *   routes            RobotRouteListDto[]
 *   assignments       Record<robotCode, routeId>
 *   onAssign          (robotCode, routeId) => void
 *   onPreviewRoute    (routeDetail) => void      tells FleetMap to draw the polyline
 */
export function RouteAssignmentPanel({
  robot = null,
  routes = [],
  assignments = {},
  onAssign,
  onPreviewRoute,
}) {
  const [mode, setMode] = useState('list') // 'list' | 'new'
  const [startNode, setStartNode] = useState('')
  const [endNode, setEndNode] = useState('')
  const [planning, setPlanning] = useState(false)
  const [planResult, setPlanResult] = useState(null)
  const [planError, setPlanError] = useState(null)

  const routeById = useMemo(() => {
    const m = new Map()
    routes.forEach((r) => m.set(r.robotRouteId, r))
    return m
  }, [routes])

  const currentRouteId = robot ? assignments[robot.robotCode] : null
  const currentRoute = currentRouteId ? routeById.get(currentRouteId) : null

  // Reset when the target robot changes
  useEffect(() => {
    setMode('list')
    setStartNode('')
    setEndNode('')
    setPlanResult(null)
    setPlanError(null)
  }, [robot?.robotCode])

  const handlePreview = async (routeId) => {
    const detail = await getRoute(routeId)
    onPreviewRoute?.(detail)
  }

  const handleSelectRoute = (routeId) => {
    if (!robot) return
    onAssign?.(robot.robotCode, routeId)
  }

  const handlePlanRoute = async () => {
    if (!startNode || !endNode) {
      setPlanError('Vui lòng nhập cả node bắt đầu và node kết thúc.')
      return
    }
    setPlanning(true)
    setPlanError(null)
    setPlanResult(null)
    try {
      const result = await planRoute({
        mapId: 1,
        robotId: robot?.robotId ?? 1,
        startNodeId: Number(startNode),
        endNodeId: Number(endNode),
      })
      setPlanResult(result)
      // Note: thiết bị thật sẽ POST /Navigation/route để Dijkstra chạy lại phía BE.
      // Hiện tại placeholders tạm thời trả về mock — khi BE wiring xong hàm sẽ tự dùng API thật.
    } catch (err) {
      setPlanError(err?.message ?? 'Tính route thất bại.')
    } finally {
      setPlanning(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
      <header className="border-b border-smb-outline-variant p-4">
        <h3 className="text-sm font-semibold text-smb-on-surface">
          Gán lộ trình cho Robot
        </h3>
        {robot ? (
          <div className="mt-2 flex items-center gap-2 rounded bg-smb-active-bg px-3 py-2">
            <Icon name="smart_toy" className="text-[18px] text-smb-primary-container" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-smb-on-surface">
                {robot.robotName}
              </p>
              <p className="truncate text-xs text-smb-on-surface-variant">
                {currentRoute ? currentRoute.routeName : 'Chưa có lộ trình được gán'}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs italic text-smb-on-surface-variant">
            Chọn một robot trong danh sách bên trái để bắt đầu.
          </p>
        )}
      </header>

      {robot && (
        <>
          <div className="flex border-b border-smb-outline-variant">
            <TabButton active={mode === 'list'} onClick={() => setMode('list')}>
              Chọn từ thư viện
            </TabButton>
            <TabButton active={mode === 'new'} onClick={() => setMode('new')}>
              Tạo mới
            </TabButton>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {mode === 'list' ? (
              <RouteLibrary
                routes={routes}
                currentRouteId={currentRouteId}
                onSelect={handleSelectRoute}
                onPreview={handlePreview}
              />
            ) : (
              <NewRouteForm
                startNode={startNode}
                endNode={endNode}
                setStartNode={setStartNode}
                setEndNode={setEndNode}
                planning={planning}
                planResult={planResult}
                planError={planError}
                onPlan={handlePlanRoute}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'border-b-2 border-smb-primary-container text-smb-primary-container'
          : 'border-b-2 border-transparent text-smb-on-surface-variant hover:text-smb-on-surface'
      }`}
    >
      {children}
    </button>
  )
}

function RouteLibrary({ routes, currentRouteId, onSelect, onPreview }) {
  if (!routes.length) {
    return (
      <p className="py-8 text-center text-sm text-smb-on-surface-variant">
        Chưa có lộ trình nào. Tạo mới để bắt đầu.
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {routes.map((r) => {
        const isCurrent = r.robotRouteId === currentRouteId
        return (
          <li
            key={r.robotRouteId}
            className={`rounded-lg border p-3 transition-colors ${
              isCurrent
                ? 'border-smb-primary-container bg-smb-active-bg'
                : 'border-smb-outline-variant bg-smb-surface-container-low'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-smb-on-surface">
                  {r.routeName}
                </p>
                <p className="mt-0.5 text-xs text-smb-on-surface-variant">
                  {r.zoneName ?? 'Toàn bộ bản đồ'} · {r.waypointCount} điểm dừng
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-smb-on-surface-variant">
                  {r.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-smb-secondary-container px-2 py-0.5 text-[10px] font-medium text-smb-on-secondary-container">
                {r.routeType}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onPreview(r.robotRouteId)}
                className="flex flex-1 items-center justify-center gap-1 rounded border border-smb-outline-variant px-2 py-1.5 text-xs font-medium text-smb-on-surface-variant hover:bg-smb-surface-container-low"
              >
                <Icon name="visibility" className="text-[14px]" /> Xem trước
              </button>
              <button
                type="button"
                onClick={() => onSelect(r.robotRouteId)}
                disabled={isCurrent}
                className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'cursor-not-allowed bg-smb-surface-container-high text-smb-on-surface-variant'
                    : 'bg-smb-primary-container text-smb-on-primary hover:bg-smb-primary-container/90'
                }`}
              >
                <Icon name="check" className="text-[14px]" />
                {isCurrent ? 'Đang gán' : 'Gán cho robot'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function NewRouteForm({
  startNode, endNode, setStartNode, setEndNode,
  planning, planResult, planError, onPlan,
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-smb-on-surface-variant">
        Nhập ID của node bắt đầu và node kết thúc. Hệ thống sẽ gọi <span className="font-mono">POST /api/Navigation/route</span> để BE tính Dijkstra (hiện đang trả mock).
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Node bắt đầu" value={startNode} onChange={setStartNode} placeholder="vd. 1" />
        <Field label="Node kết thúc" value={endNode} onChange={setEndNode} placeholder="vd. 13" />
      </div>

      <button
        type="button"
        onClick={onPlan}
        disabled={planning}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary hover:bg-smb-primary-container/90 disabled:opacity-60"
      >
        <Icon name="alt_route" className="text-[18px]" />
        {planning ? 'Đang tính…' : 'Tính đường đi'}
      </button>

      {planError && (
        <div className="rounded border border-smb-error bg-smb-error-container/40 px-3 py-2 text-xs text-smb-on-error-container">
          {planError}
        </div>
      )}

      {planResult && (
        <div className="rounded border border-smb-outline-variant bg-smb-surface-container-low p-3 text-xs">
          <p className="font-semibold text-smb-on-surface">Đường đi mẫu</p>
          <p className="mt-1 text-smb-on-surface-variant">
            Khoảng cách ước tính: <span className="font-semibold tabular-nums">{planResult.distance} m</span>
          </p>
          <p className="text-smb-on-surface-variant">
            Thời gian di chuyển: <span className="font-semibold tabular-nums">~{planResult.estimatedSeconds} s</span>
          </p>
          <p className="mt-2 italic text-smb-on-surface-variant">
            * Kết quả thật sẽ trả polyline tọa độ để vẽ lên bản đồ (đang chờ BE wiring).
          </p>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-smb-on-surface-variant">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
      />
    </label>
  )
}

export default RouteAssignmentPanel
