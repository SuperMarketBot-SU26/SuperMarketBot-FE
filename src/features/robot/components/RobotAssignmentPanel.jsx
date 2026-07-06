import React, { useEffect, useMemo, useState } from 'react'
import { statusPalette } from '../utils/robotHelpers'
import {
  getRoute,
  createRoute,
} from '../api/robotRoutesApi'
import { getMaps, getZones } from '../api/mapsApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const ROUTE_TYPES = [
  { value: 'patrol',   label: 'Patrol (tuần tra)' },
  { value: 'restock',  label: 'Restock (nhập hàng)' },
  { value: 'delivery', label: 'Delivery (giao hàng)' },
  { value: 'custom',   label: 'Custom (tùy chỉnh)' },
]

/**
 * RobotAssignmentPanel
 * Sidebar for the Giám Sát Robot page. Tabbed view:
 *   • Tab 1 — "Gán lộ trình"   : route-centric. Lists every route in the
 *                                 system; each route card lets you pick
 *                                 which robots run it (multi-select).
 *                                 Sub-form: "Tạo mới" matching the backend
 *                                 RobotRouteCreateDto contract (dropdowns for
 *                                 Map/Zone; chip-based ordered node picker).
 *   • Tab 2 — "Robot"          : list of robots, click to select.
 */
export function RobotAssignmentPanel({
  robots = [],
  poses = {},
  // { [routeId]: robotCode[] }
  assignmentsByRoute = {},
  routes = [],
  map = null,
  selectedRobotCode = null,
  getAssignedRoute,
  onSelectRobot,
  onAssignRobot,
  onUnassignRobot,
  onPreviewRoute,
  onRouteCreated,
}) {
  const [tab, setTab] = useState('assign') // land on the action page by default

  // Switch to the "Robot" tab automatically the first time a robot gets picked
  // from the map (so the operator sees context for which one they clicked).
  useEffect(() => {
    if (selectedRobotCode) setTab('robots')
  }, [selectedRobotCode])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
      <Tabs value={tab} onChange={setTab} />
      {tab === 'assign'
        ? <AssignTab
            robots={robots}
            assignmentsByRoute={assignmentsByRoute}
            routes={routes}
            map={map}
            onAssignRobot={onAssignRobot}
            onUnassignRobot={onUnassignRobot}
            onPreviewRoute={onPreviewRoute}
            onRouteCreated={onRouteCreated}
          />
        : <RobotsTab
            robots={robots}
            poses={poses}
            assignmentsByRoute={assignmentsByRoute}
            routes={routes}
            selectedRobotCode={selectedRobotCode}
            getAssignedRoute={getAssignedRoute}
            onSelectRobot={onSelectRobot}
          />
      }
    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  Tabs                                                                */
/* -------------------------------------------------------------------- */

function Tabs({ value, onChange }) {
  const items = [
    { id: 'assign', label: 'Gán lộ trình', icon: 'route' },
    { id: 'robots', label: 'Robot',     icon: 'smart_toy' },
  ]
  return (
    <div className="flex border-b border-smb-outline-variant bg-smb-surface-container-low">
      {items.map((it) => {
        const active = value === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              active
                ? 'border-b-2 border-smb-primary-container text-smb-primary-container'
                : 'border-b-2 border-transparent text-smb-on-surface-variant hover:text-smb-on-surface'
            }`}
          >
            <Icon name={it.icon} className="text-[16px]" />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  Tab 1 — Robot list                                                  */
/* -------------------------------------------------------------------- */

function RobotsTab({ robots, poses, assignmentsByRoute, routes, selectedRobotCode, getAssignedRoute, onSelectRobot }) {
  const summary = useMemo(() => {
    const acc = { Moving: 0, Idle: 0, Interacting: 0, Offline_Charging: 0, Power_Off: 0 }
    robots.forEach((r) => { acc[r.status] = (acc[r.status] ?? 0) + 1 })
    return acc
  }, [robots])

  // Count how many routes a robot is on, for a small badge.
  const routesPerRobot = useMemo(() => {
    const out = new Map()
    for (const [routeId, codes] of Object.entries(assignmentsByRoute)) {
      for (const code of codes) {
        if (!out.has(code)) out.set(code, [])
        out.get(code).push(Number(routeId))
      }
    }
    return out
  }, [assignmentsByRoute])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="p-4">
        <h3 className="text-sm font-semibold text-smb-on-surface">Danh sách Robot</h3>
        <p className="text-xs text-smb-on-surface-variant">
          {robots.length} robot đang hoạt động
        </p>

        {!!robots.length && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(summary).map(([status, count]) => {
              if (!count) return null
              const p = statusPalette(status)
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${p.bg} ${p.text}`}
                >
                  <span className={`size-1.5 rounded-full ${p.dot}`} />
                  {count} {labelForStatus(status)}
                </span>
              )
            })}
          </div>
        )}
      </header>

      {!robots.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-6 text-center text-smb-on-surface-variant">
          <Icon name="smart_toy" className="text-3xl" />
          <p className="text-xs">Chưa có robot nào trong hệ thống.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-smb-outline-variant overflow-y-auto">
          {robots.map((r) => {
            const pose = poses[r.robotCode]
            const p = statusPalette(r.status)
            const isSel = selectedRobotCode === r.robotCode
            const assignedRoute = getAssignedRoute?.(r.robotCode)
            const assignedCount = routesPerRobot.get(r.robotCode)?.length ?? 0
            return (
              <li key={r.robotId}>
                <button
                  type="button"
                  onClick={() => onSelectRobot?.(r)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    isSel ? 'bg-smb-active-bg' : 'hover:bg-smb-surface-container-low'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${p.dot} text-smb-on-primary`}>
                      <Icon name="smart_toy" className="text-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-smb-on-surface">{r.robotName}</p>
                      <p className="truncate text-xs text-smb-on-surface-variant">
                        {labelForStatus(r.status)} · {r.mode}
                      </p>
                      {assignedRoute ? (
                        <p className="mt-0.5 truncate text-[11px] text-smb-primary-container">
                          ▸ {assignedRoute.routeName}
                          {assignedCount > 1 && (
                            <span className="ml-1 text-smb-on-surface-variant">
                              (+{assignedCount - 1} khác)
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="mt-0.5 truncate text-[11px] italic text-smb-on-surface-variant">
                          Chưa gán lộ trình
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-smb-on-surface">
                      {r.batteryPct}%
                    </p>
                    <p className="text-[10px] text-smb-on-surface-variant tabular-nums">
                      {pose ? `(${(pose.x ?? 0).toFixed(1)}, ${(pose.y ?? 0).toFixed(1)})` : '—'}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- */
/*  Tab 2 — Assign route (route-centric)                                */
/* -------------------------------------------------------------------- */

function AssignTab({
  robots, assignmentsByRoute, routes, map,
  onAssignRobot, onUnassignRobot, onPreviewRoute, onRouteCreated,
}) {
  const [mode, setMode] = useState('list') // 'list' | 'new'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-smb-outline-variant p-4">
        <h3 className="text-sm font-semibold text-smb-on-surface">Gán lộ trình</h3>
        <p className="mt-1 text-xs text-smb-on-surface-variant">
          Quản lý lộ trình cố định của robot và phân công robot chạy lộ trình đó.
        </p>
      </header>

      <div className="flex border-b border-smb-outline-variant">
        <SubTab active={mode === 'list'} onClick={() => setMode('list')}>
          Tất cả lộ trình ({routes.length})
        </SubTab>
        <SubTab active={mode === 'new'} onClick={() => setMode('new')}>
          Tạo lộ trình mới
        </SubTab>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'list' ? (
          <RouteList
            routes={routes}
            robots={robots}
            assignmentsByRoute={assignmentsByRoute}
            onAssignRobot={onAssignRobot}
            onUnassignRobot={onUnassignRobot}
            onPreviewRoute={onPreviewRoute}
          />
        ) : (
          <NewRouteForm
            robots={robots}
            map={map}
            onCreated={() => {
              setMode('list')
              onRouteCreated?.()
            }}
          />
        )}
      </div>
    </div>
  )
}

function SubTab({ active, onClick, children }) {
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

/* --- Route list (route-centric) ------------------------------------- */

function RouteList({
  routes, robots, assignmentsByRoute,
  onAssignRobot, onUnassignRobot, onPreviewRoute,
}) {
  if (!routes.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-smb-on-surface-variant">
        <Icon name="route" className="text-3xl" />
        <p className="text-sm">Chưa có lộ trình nào trong hệ thống.</p>
        <p className="text-xs">Mở tab "Tạo lộ trình mới" để bắt đầu.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {routes.map((r) => {
        const assignedCodes = assignmentsByRoute[r.robotRouteId] ?? []
        const assignedSet = new Set(assignedCodes)
        const isOwner = r.robotId
        return (
          <li
            key={r.robotRouteId}
            className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-3 pb-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-smb-on-surface">{r.routeName}</p>
                <p className="mt-0.5 text-[11px] text-smb-on-surface-variant">
                  Map #{r.mapId} · {r.zoneName ?? 'Chưa gán khu vực'} · {r.waypointCount} điểm dừng
                </p>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-smb-on-surface-variant">
                    {r.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-smb-secondary-container px-2 py-0.5 text-[10px] font-medium text-smb-on-secondary-container">
                  {r.routeType}
                </span>
                <span className="text-[10px] text-smb-on-surface-variant">
                  {assignedCodes.length}/{robots.length} robot
                </span>
              </div>
            </div>

            {/* Owner (who created the route) */}
            <div className="border-t border-smb-outline-variant px-3 py-1.5 text-[11px] text-smb-on-surface-variant">
              Tạo bởi robot <span className="font-mono">#{isOwner ?? '—'}</span>
            </div>

            {/* Assigned-robot chips */}
            {assignedCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-smb-outline-variant px-3 py-2">
                {assignedCodes.map((code) => {
                  const robot = robots.find((x) => x.robotCode === code)
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 rounded-full bg-smb-active-bg px-2 py-0.5 text-[11px] font-medium text-smb-on-surface"
                    >
                      <Icon name="smart_toy" className="text-[12px]" />
                      {robot?.robotName ?? code}
                      <button
                        type="button"
                        onClick={() => onUnassignRobot?.(r.robotRouteId, code)}
                        className="-mr-1 ml-1 flex h-4 w-4 items-center justify-center rounded-full text-smb-on-surface-variant hover:bg-smb-error-container hover:text-smb-on-error-container"
                        aria-label={`Bỏ gán ${code}`}
                      >
                        <Icon name="close" className="text-[12px]" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Action row */}
            <div className="flex gap-2 border-t border-smb-outline-variant px-3 py-2">
              <button
                type="button"
                onClick={async () => {
                  const detail = await getRoute(r.robotRouteId)
                  onPreviewRoute?.(detail)
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded border border-smb-outline-variant px-2 py-1.5 text-xs font-medium text-smb-on-surface-variant hover:bg-smb-surface-container-lowest"
              >
                <Icon name="visibility" className="text-[14px]" /> Xem trước
              </button>
              <details className="flex-[1.4]">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded bg-smb-primary-container px-2 py-1.5 text-xs font-medium text-smb-on-primary hover:bg-smb-primary-container/90">
                  <Icon name="group_add" className="text-[14px]" /> Gán robot
                </summary>
                <RobotMultiSelect
                  robots={robots}
                  assignedSet={assignedSet}
                  onToggle={(code) => {
                    if (assignedSet.has(code)) onUnassignRobot?.(r.robotRouteId, code)
                    else onAssignRobot?.(r.robotRouteId, code)
                  }}
                />
              </details>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function RobotMultiSelect({ robots, assignedSet, onToggle }) {
  return (
    <div className="mt-2 max-h-44 overflow-y-auto rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-1.5">
      {!robots.length && (
        <p className="px-2 py-1 text-xs text-smb-on-surface-variant">
          Chưa có robot nào.
        </p>
      )}
      {robots.map((r) => {
        const checked = assignedSet.has(r.robotCode)
        const p = statusPalette(r.status)
        return (
          <label
            key={r.robotId}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-smb-surface-container-low"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(r.robotCode)}
              className="size-3.5 accent-smb-primary-container"
            />
            <span className={`size-2 rounded-full ${p.dot}`} />
            <span className="flex-1 truncate text-smb-on-surface">{r.robotName}</span>
            <span className="shrink-0 text-[10px] tabular-nums text-smb-on-surface-variant">
              {r.batteryPct}%
            </span>
          </label>
        )
      })}
    </div>
  )
}

/* --- New route form (matches RobotRouteCreateDto) ------------------- */

function NewRouteForm({ robots, map, onCreated }) {
  // RobotRouteCreateDto: { mapId, robotId, routeName, routeType?, description?, zoneId?, nodeIds: number[] }
  const [form, setForm] = useState({
    routeName: '',
    routeType: 'patrol',
    description: '',
    robotId: '',
    mapId: '',
    zoneId: '',
    nodeIds: [], // ordered array of numbers
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [maps, setMaps] = useState([])
  const [zones, setZones] = useState([])
  const [loadingMaps, setLoadingMaps] = useState(false)
  const [loadingZones, setLoadingZones] = useState(false)

  // Load maps once on mount; default the selection to the loaded map.
  useEffect(() => {
    let cancelled = false
    setLoadingMaps(true)
    getMaps()
      .then((list) => {
        if (cancelled) return
        setMaps(list)
        // Default to the loaded map if it exists in the list, else first entry.
        const preferred = map?.mapId
          ? list.find((m) => m.mapId === map.mapId) ?? list[0]
          : list[0]
        setForm((prev) => (prev.mapId ? prev : { ...prev, mapId: preferred?.mapId ?? '' }))
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingMaps(false))
    return () => { cancelled = true }
  }, [map?.mapId])

  // When mapId changes, reload zones.
  useEffect(() => {
    if (!form.mapId) {
      setZones([])
      setForm((prev) => (prev.zoneId ? { ...prev, zoneId: '' } : prev))
      return
    }
    let cancelled = false
    setLoadingZones(true)
    getZones({ mapId: Number(form.mapId) })
      .then((list) => {
        if (cancelled) return
        setZones(list)
        // If the current zone isn't in the new list, drop it.
        setForm((prev) => {
          if (prev.zoneId && !list.some((z) => String(z.zoneId) === String(prev.zoneId))) {
            return { ...prev, zoneId: '' }
          }
          return prev
        })
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingZones(false))
    return () => { cancelled = true }
  }, [form.mapId])

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const nodesForMap = useMemo(() => {
    if (map && String(map.mapId) === String(form.mapId)) return map.nodes ?? []
    return []
  }, [map, form.mapId])

  const addNode = (nodeId) => {
    setForm((prev) => ({ ...prev, nodeIds: [...prev.nodeIds, Number(nodeId)] }))
  }
  const removeNodeAt = (index) => {
    setForm((prev) => ({
      ...prev,
      nodeIds: prev.nodeIds.filter((_, i) => i !== index),
    }))
  }
  const moveNode = (index, delta) => {
    setForm((prev) => {
      const next = [...prev.nodeIds]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...prev, nodeIds: next }
    })
  }

  const validate = () => {
    if (!form.routeName.trim()) return 'Vui lòng nhập tên lộ trình.'
    if (!form.mapId) return 'Vui lòng chọn map.'
    if (!form.robotId) return 'Vui lòng chọn robot sở hữu.'
    if (!form.nodeIds.length) return 'Cần chọn ít nhất 1 node cho lộ trình.'
    return null
  }

  const submit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setSubmitting(true)
    const payload = {
      mapId: Number(form.mapId),
      robotId: Number(form.robotId),
      routeName: form.routeName.trim(),
      routeType: form.routeType,
      description: form.description.trim() || undefined,
      zoneId: form.zoneId ? Number(form.zoneId) : undefined,
      nodeIds: form.nodeIds,
    }
    try {
      const result = await createRoute(payload)
      window.dispatchEvent(new CustomEvent('robot:route-created', { detail: result }))
      onCreated?.(result)
    } catch (err) {
      setError(err?.message ?? 'Tạo lộ trình thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  // Build a label lookup once so each chip can show "A1-Start (id 3)".
  const nodeLabelById = useMemo(() => {
    const m = new Map()
    nodesForMap.forEach((n) => {
      m.set(Number(n.nodeId), {
        label: n.nodeName || `Node ${n.nodeId}`,
        type: n.nodeType ?? null,
        blocked: !!n.isBlocked,
      })
    })
    return m
  }, [nodesForMap])

  const selectedMap = maps.find((m) => String(m.mapId) === String(form.mapId))

  return (
    <div className="space-y-4">
      <p className="text-xs text-smb-on-surface-variant">
        Khớp với backend <span className="font-mono">POST /api/v1/routes</span> →
        DTO <span className="font-mono">RobotRouteCreateDto</span>.
      </p>

      <Field label="Tên lộ trình *">
        <input
          type="text"
          value={form.routeName}
          onChange={(e) => set({ routeName: e.target.value })}
          placeholder="vd. Tuần tra khu rau củ sáng"
          className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
        />
      </Field>

      <Field label={`Map${form.mapId ? '' : ' *'}`}>
        <Select
          value={form.mapId}
          onChange={(v) => set({ mapId: v })}
          disabled={loadingMaps}
          placeholder={loadingMaps ? 'Đang tải map…' : '-- chọn map --'}
          options={maps.map((m) => ({
            value: m.mapId,
            label: `#${m.mapId} · ${m.mapName}${m.nodeCount != null ? ` · ${m.nodeCount} node` : ''}`,
          }))}
        />
        {selectedMap && (
          <p className="mt-1 text-[11px] text-smb-on-surface-variant">
            {selectedMap.widthMeters}×{selectedMap.heightMeters} m ·{' '}
            {nodesForMap.length || selectedMap.nodeCount || 0} node khả dụng
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Zone (tùy chọn)">
          <Select
            value={form.zoneId}
            onChange={(v) => set({ zoneId: v })}
            disabled={!form.mapId || loadingZones}
            placeholder={
              !form.mapId
                ? 'Chọn map trước'
                : loadingZones
                  ? 'Đang tải zone…'
                  : '-- không gán --'
            }
            options={[
              { value: '', label: '-- không gán --' },
              ...zones.map((z) => ({
                value: z.zoneId,
                label: `#${z.zoneId} · ${z.zoneName}`,
              })),
            ]}
          />
        </Field>
        <Field label="Loại lộ trình *">
          <Select
            value={form.routeType}
            onChange={(v) => set({ routeType: v })}
            options={ROUTE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </Field>
      </div>

      <Field label="Robot sở hữu *">
        <Select
          value={form.robotId}
          onChange={(v) => set({ robotId: v })}
          placeholder="-- chọn robot --"
          options={robots.map((r) => ({
            value: r.robotId,
            label: `${r.robotName} · ${r.robotCode}`,
          }))}
        />
      </Field>

      {/* Node picker */}
      <Field label={`Node cho lộ trình (theo thứ tự) *`}>
        {nodesForMap.length === 0 ? (
          <p className="rounded border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-3 text-xs text-smb-on-surface-variant">
            {form.mapId
              ? 'Bản đồ này chưa có danh sách node. Tải map để hiện node chip picker.'
              : 'Chọn map trước.'}
          </p>
        ) : (
          <>
            <div className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-2">
              <p className="mb-1.5 text-[11px] text-smb-on-surface-variant">
                Click để thêm vào thứ tự
              </p>
              <div className="flex flex-wrap gap-1.5">
                {nodesForMap.map((n) => {
                  const info = nodeLabelById.get(Number(n.nodeId))
                  return (
                    <button
                      key={n.nodeId}
                      type="button"
                      onClick={() => addNode(n.nodeId)}
                      className="inline-flex items-center gap-1 rounded-full border border-smb-outline-variant bg-smb-surface-container-low px-2 py-0.5 text-[11px] font-medium text-smb-on-surface hover:border-smb-primary-container hover:bg-smb-active-bg"
                    >
                      <Icon name="add_location" className="text-[12px]" />
                      {info.label} <span className="font-mono text-[10px] text-smb-on-surface-variant">#{n.nodeId}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {form.nodeIds.length > 0 && (
              <div className="mt-2 rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-2">
                <p className="mb-1.5 text-[11px] text-smb-on-surface-variant">
                  Thứ tự di chuyển ({form.nodeIds.length} điểm dừng)
                </p>
                <ol className="flex flex-wrap gap-1.5">
                  {form.nodeIds.map((id, idx) => {
                    const info = nodeLabelById.get(id)
                    return (
                      <li
                        key={`${id}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container px-2 py-0.5 text-[11px] font-medium text-smb-on-primary"
                      >
                        <span className="font-mono text-[10px] opacity-80">{idx + 1}.</span>
                        {info?.label ?? `Node ${id}`}
                        <button
                          type="button"
                          onClick={() => moveNode(idx, -1)}
                          disabled={idx === 0}
                          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-smb-on-primary/20 disabled:opacity-30"
                          aria-label="Lên"
                          title="Lên"
                        >
                          <Icon name="arrow_upward" className="text-[12px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveNode(idx, 1)}
                          disabled={idx === form.nodeIds.length - 1}
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-smb-on-primary/20 disabled:opacity-30"
                          aria-label="Xuống"
                          title="Xuống"
                        >
                          <Icon name="arrow_downward" className="text-[12px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNodeAt(idx)}
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-smb-on-primary/20"
                          aria-label="Xóa"
                          title="Xóa"
                        >
                          <Icon name="close" className="text-[12px]" />
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </>
        )}
      </Field>

      <Field label="Mô tả (tùy chọn)">
        <input
          type="text"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="vd. Quét kệ 5-12 mỗi sáng"
          className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
        />
      </Field>

      {error && (
        <div className="rounded border border-smb-error bg-smb-error-container/40 px-3 py-2 text-xs text-smb-on-error-container">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary hover:bg-smb-primary-container/90 disabled:opacity-60"
      >
        <Icon name="add_road" className="text-[18px]" />
        {submitting ? 'Đang tạo…' : 'Tạo lộ trình'}
      </button>

      <details className="text-[11px] text-smb-on-surface-variant">
        <summary className="cursor-pointer">Xem payload JSON sẽ gửi đi</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-smb-surface-container-highest p-2 text-[10px] leading-snug text-smb-on-surface">
{JSON.stringify(
  {
    mapId: form.mapId ? Number(form.mapId) : undefined,
    robotId: form.robotId ? Number(form.robotId) : undefined,
    routeName: form.routeName.trim() || '<empty>',
    routeType: form.routeType,
    description: form.description.trim() || undefined,
    zoneId: form.zoneId ? Number(form.zoneId) : undefined,
    nodeIds: form.nodeIds,
  },
  null,
  2
)}
        </pre>
      </details>
    </div>
  )
}

/* --- Shared controls --- */

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-smb-on-surface-variant">{label}</span>
      {children}
    </label>
  )
}

function Select({ value, onChange, options, placeholder, disabled = false }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 disabled:opacity-60"
    >
      {placeholder !== undefined && value === '' && (
        <option value="" disabled>{placeholder}</option>
      )}
      {placeholder !== undefined && value !== '' && (
        <option value="">-- bỏ chọn --</option>
      )}
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  )
}

function labelForStatus(s) {
  switch (s) {
    case 'Moving': return 'đang di chuyển'
    case 'Idle': return 'rảnh'
    case 'Interacting': return 'đang tương tác'
    case 'Offline_Charging': return 'sạc / ngoại tuyến'
    case 'Power_Off': return 'đã tắt nguồn'
    default: return s
  }
}

export default RobotAssignmentPanel