import React, { useEffect, useMemo, useState } from 'react'
import { getRoute } from '../api/robotRoutesApi'
import { planRoute } from '../api/navigationApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * RouteAssignmentPanel
 * - Lists existing routes and lets the operator preview them on the map.
 * - Plans a brand-new route by entering start / end node IDs (calls BE Dijkstra).
 *
 * Props:
 *   robot             RobotDto | null            currently-selected robot
 *   routes            RobotRouteListDto[]
 *   onPreviewRoute    (routeDetail) => void      tells FleetMap to draw the polyline
 *
 * Route assignment (assigning a robot to a route) is NOT supported here — the
 * BE has no `POST /v1/routes/{id}/assign` endpoint. When it lands, reintroduce
 * an "Gán cho robot" button.
 */
export function RouteAssignmentPanel({
  robot = null,
  routes = [],
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
        startNodeId: Number(startNode),
        endNodeId: Number(endNode),
      })
      setPlanResult(result)
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
                Chưa có lộ trình được gán
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

function RouteLibrary({ routes, onPreview }) {
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
        return (
          <li
            key={r.robotRouteId}
            className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-smb-on-surface">
                  {r.routeName}
                </p>
                <p className="mt-0.5 text-xs text-smb-on-surface-variant">
                  {r.zoneName ?? 'Toàn bộ bản đồ'} · {r.waypointCount} điểm dừng
                </p>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-smb-on-surface-variant">
                    {r.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-smb-secondary-container px-2 py-0.5 text-[10px] font-medium text-smb-on-secondary-container">
                {r.routeType}
              </span>
            </div>
            <div className="mt-3 flex">
              <button
                type="button"
                onClick={() => onPreview(r.robotRouteId)}
                className="flex w-full items-center justify-center gap-1 rounded border border-smb-outline-variant px-2 py-1.5 text-xs font-medium text-smb-on-surface-variant hover:bg-smb-surface-container-lowest"
              >
                <Icon name="visibility" className="text-[14px]" /> Xem trước trên bản đồ
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
        Nhập ID của node bắt đầu và node kết thúc. Hệ thống sẽ gọi{' '}
        <span className="font-mono">POST /api/Navigation/route</span> để BE tính Dijkstra.
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
            Khoảng cách ước tính:{' '}
            <span className="font-semibold tabular-nums">
              {(planResult.totalDistance ?? 0).toFixed(2)} m
            </span>
          </p>
          {Array.isArray(planResult.nodes) && planResult.nodes.length > 0 && (
            <div className="mt-2">
              <p className="text-smb-on-surface-variant">Các node đi qua:</p>
              <ol className="mt-1 flex flex-wrap gap-1.5">
                {planResult.nodes.map((n, idx) => (
                  <li
                    key={`${n.nodeId}-${idx}`}
                    className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container px-2 py-0.5 text-[11px] font-medium text-smb-on-primary"
                  >
                    <span className="font-mono text-[10px] opacity-80">{idx + 1}.</span>
                    Node #{n.nodeId}
                    <span className="font-mono text-[10px] opacity-80">
                      ({(n.x ?? 0).toFixed(1)}, {(n.y ?? 0).toFixed(1)})
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
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