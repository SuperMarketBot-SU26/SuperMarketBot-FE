/**
 * ZoneHierarchyPanel
 *
 * Displays the full 4-tier hierarchy:
 *   Floor → Zone → Aisle → Shelf → [mapped Node]
 *
 * Fetches from GET /api/v1/zones/hierarchy.
 * Allows admin to:
 *   - See which aisle is linked to which map waypoint (mappedNodeId, xCoord, yCoord)
 *   - Trigger "Setup Default Zones" for a floor
 *   - Click an aisle → sets selectedAisleId (parent can open the semantic-object editor)
 *
 * Props:
 *   floorId       — floor to load hierarchy for
 *   mapNodes      — array of map nodes from the current map (for aisle→node assignment UI)
 *   onSelectAisle — (aisle) => void — fires when an aisle row is clicked
 *   onMapNodeLink — (aisleId, nodeId) => void — fires when admin picks a node for an aisle
 */

import React, { useEffect, useState, useCallback } from 'react'
import { getZoneHierarchy, setupDefaultZones } from '../api/zonesApi'
import { toast } from 'react-toastify'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function Spinner({ size = 16 }) {
  return <Icon name="progress_activity" className={`animate-spin text-[${size}px]`} />
}

// ── Node assignment dropdown (shown when an aisle row is expanded) ─────────────
function NodePicker({ aisle, mapNodes = [], onAssign }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(aisle.mappedNodeId ?? null)
  const [saving, setSaving] = useState(false)

  const handleAssign = async (nodeId) => {
    setSaving(true)
    try {
      await onAssign(aisle.aisleId, nodeId)
      setSelected(nodeId)
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-smb-outline-variant/60 bg-smb-surface-container p-2.5">
      <p className="mb-1.5 text-[10px] font-semibold text-smb-on-surface-variant uppercase tracking-wider">
        Gán Kệ {aisle.aisleCode} → Waypoint trên bản đồ:
      </p>
      {saving ? (
        <span className="flex items-center gap-1.5 text-xs text-smb-on-surface-variant">
          <Spinner size={14} /> Đang gán…
        </span>
      ) : selected != null ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-smb-on-surface">
            {aisle.mappedNodeName
              ? `Node #${selected} — ${aisle.mappedNodeName}`
              : `Node #${selected} — (${aisle.xCoord?.toFixed(1) ?? '?'}, ${aisle.yCoord?.toFixed(1) ?? '?'})m`}
          </span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-2 py-0.5 text-[10px] font-semibold text-smb-on-surface-variant hover:bg-smb-surface-container"
          >
            {open ? 'Đóng' : 'Đổi'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-smb-primary/50 bg-smb-primary/5 px-3 py-1.5 text-xs font-semibold text-smb-primary hover:bg-smb-primary/10"
        >
          <Icon name="add_location_alt" className="text-[14px]" />
          Chọn Node trên bản đồ
        </button>
      )}
      {open && (
        <div className="mt-1.5 max-h-32 overflow-y-auto space-y-0.5">
          {mapNodes.length === 0 ? (
            <p className="text-[10px] text-smb-on-surface-variant">Không có node nào trên bản đồ.</p>
          ) : (
            mapNodes.map((n) => (
              <button
                key={n.nodeId}
                onClick={() => handleAssign(n.nodeId)}
                className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors ${
                  n.nodeId === selected
                    ? 'bg-smb-primary/20 font-semibold text-smb-primary'
                    : 'hover:bg-smb-surface-container text-smb-on-surface'
                }`}
              >
                <span>Node #{n.nodeId} — {n.nodeName || n.nodeType || 'waypoint'}</span>
                <span className="text-[10px] text-smb-on-surface-variant">
                  ({typeof n.xCoord === 'number' ? n.xCoord.toFixed(1) : '?'},
                  {typeof n.yCoord === 'number' ? n.yCoord.toFixed(1) : '?'})
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Shelf mini-row ────────────────────────────────────────────────────────────
function ShelfRow({ shelf }) {
  return (
    <div className="flex items-center gap-1.5 rounded border border-smb-outline-variant/30 bg-smb-surface-container-lowest px-2 py-1 text-[10px]">
      <Icon name="inventory_2" className="text-[12px] text-smb-on-surface-variant" />
      <span className="font-medium text-smb-on-surface">{shelf.shelfName || shelf.label || `Shelf #${shelf.shelfId}`}</span>
      {shelf.levelCount && <span className="text-smb-on-surface-variant">({shelf.levelCount}tầng)</span>}
    </div>
  )
}

// ── Aisle row ────────────────────────────────────────────────────────────────
function AisleRow({ aisle, mapNodes, onSelectAisle, onMapNodeLink }) {
  const [expanded, setExpanded] = useState(false)
  const linked = aisle.mappedNodeId != null

  return (
    <div className="rounded-lg border border-smb-outline-variant/40 bg-smb-surface-container-lowest">
      {/* Header */}
      <button
        onClick={() => { setExpanded((e) => !e); onSelectAisle?.(aisle) }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-smb-surface-container"
      >
        <Icon
          name={expanded ? 'expand_more' : 'chevron_right'}
          className="text-[16px] text-smb-on-surface-variant shrink-0"
        />
        <Icon name="view_column" className="text-[14px] text-smb-primary shrink-0" />
        <span className="flex-1 font-semibold text-smb-on-surface">{aisle.aisleCode}</span>
        {aisle.aisleName && (
          <span className="text-[10px] text-smb-on-surface-variant">{aisle.aisleName}</span>
        )}
        {linked ? (
          <span className="flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
            <Icon name="check_circle" className="text-[10px]" />
            #{aisle.mappedNodeId}
          </span>
        ) : (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
            Chưa gán node
          </span>
        )}
      </button>

      {/* Expanded: shelves + node picker */}
      {expanded && (
        <div className="border-t border-smb-outline-variant/40 px-3 pb-2.5 pt-1.5">
          {aisle.xCoord != null && aisle.yCoord != null && (
            <p className="mb-1.5 text-[10px] text-smb-on-surface-variant">
              Tọa độ: ({aisle.xCoord.toFixed(1)}m, {aisle.yCoord.toFixed(1)}m)
            </p>
          )}
          {aisle.mappedNodeName && (
            <p className="mb-1.5 text-[10px] font-semibold text-smb-primary">
              → Node: {aisle.mappedNodeName}
            </p>
          )}
          {aisle.shelves?.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {aisle.shelves.map((s) => (
                <ShelfRow key={s.shelfId} shelf={s} />
              ))}
            </div>
          )}
          <NodePicker
            aisle={aisle}
            mapNodes={mapNodes}
            onAssign={onMapNodeLink}
          />
        </div>
      )}
    </div>
  )
}

// ── Zone row ─────────────────────────────────────────────────────────────────
function ZoneRow({ zone, mapNodes, onSelectAisle, onMapNodeLink }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-smb-outline-variant/60 bg-smb-surface-container">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors hover:bg-smb-surface-container-lowest"
      >
        <Icon
          name={expanded ? 'expand_more' : 'chevron_right'}
          className="text-[16px] text-smb-primary shrink-0"
        />
        <Icon name="grid_view" className="text-[14px] text-smb-primary shrink-0" />
        <span className="flex-1 text-smb-on-surface">{zone.zoneName}</span>
        <span className="text-[10px] font-normal text-smb-on-surface-variant">
          {zone.aisles?.length ?? 0} kệ
        </span>
      </button>
      {expanded && (
        <div className="border-t border-smb-outline-variant/40 px-3 pb-2.5 pt-1.5 space-y-1.5">
          {zone.aisles?.map((a) => (
            <AisleRow
              key={a.aisleId}
              aisle={a}
              mapNodes={mapNodes}
              onSelectAisle={onSelectAisle}
              onMapNodeLink={onMapNodeLink}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────
export function ZoneHierarchyPanel({
  floorId = 1,
  mapNodes = [],
  onSelectAisle,
  onMapNodeLink,
}) {
  const [hierarchy, setHierarchy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getZoneHierarchy({ floorId })
      setHierarchy(data)
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Không tải được cây phân cấp')
    } finally {
      setLoading(false)
    }
  }, [floorId])

  useEffect(() => { load() }, [load])

  const handleSeed = async () => {
    if (!window.confirm(`Tạo 4 Zone mặc định cho Tầng ${floorId}?`)) return
    setSeeding(true)
    try {
      await setupDefaultZones({ floorId })
      await load()
      toast.success('Đã tạo 4 Zone mặc định')
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Lỗi tạo zone mặc định')
      toast.error('Lỗi tạo zone mặc định')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-smb-outline-variant/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon name="account_tree" className="text-[18px] text-smb-primary" />
          <h3 className="text-sm font-bold text-smb-on-surface">Cây Phân Cấp Siêu Thị</h3>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          title="Tạo 4 Zone mặc định: Đồ Khô, Sữa, Hóa Mỹ Phẩm, Khuyến Mãi"
          className="flex items-center gap-1 rounded border border-smb-primary/40 bg-smb-primary/10 px-2.5 py-1 text-[10px] font-semibold text-smb-primary hover:bg-smb-primary/20 disabled:opacity-50"
        >
          {seeding ? <Spinner size={12} /> : <Icon name="auto_awesome" className="text-[12px]" />}
          Tạo 4 Zone
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-smb-on-surface-variant">
            <Spinner size={20} />
            <span className="ml-2">Đang tải cây phân cấp…</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <Icon name="error" className="mr-1 inline text-[14px]" />
            {error}
            <button onClick={load} className="ml-2 font-semibold underline">Thử lại</button>
          </div>
        ) : hierarchy?.zones?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-smb-outline-variant py-8 text-center text-xs text-smb-on-surface-variant">
            <Icon name="account_tree" className="mx-auto mb-1 block text-[24px]" />
            Chưa có Zone nào cho tầng này.
            <br />
            <button onClick={handleSeed} className="mt-2 font-semibold text-smb-primary underline">
              Tạo 4 Zone mặc định
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-smb-on-surface-variant uppercase tracking-wider">
              Tầng {hierarchy.floorId} · {hierarchy.zones?.length ?? 0} Zone
            </p>
            {hierarchy.zones?.map((z) => (
              <ZoneRow
                key={z.zoneId}
                zone={z}
                mapNodes={mapNodes}
                onSelectAisle={onSelectAisle}
                onMapNodeLink={onMapNodeLink}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
