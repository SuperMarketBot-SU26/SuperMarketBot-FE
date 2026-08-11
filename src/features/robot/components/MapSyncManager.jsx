/**
 * MapSyncManager
 *
 * Handles the "Save to Server" workflow from the map editor canvas:
 *   1. Shows a diff preview (created/updated/deleted counts) before sending.
 *   2. Calls POST /api/v1/maps/sync with the full canvas state.
 *   3. Displays result (success with stats, or error message).
 *
 * Usage:
 *   <MapSyncManager
 *     mapId={currentMapId}
 *     canvasState={{ nodes, edges, semanticObjects }}
 *     floorId={1}
 *     mapName="Bản đồ Tầng 1"
 *     onSaved={(result) => { ... }}
 *   />
 */

import React, { useState, useCallback } from 'react'
import { syncMap, setActiveMap } from '../api/mapsApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function formatCount(n) {
  return n > 0 ? `+${n}` : String(n)
}

function DiffRow({ label, icon, created, updated, deleted }) {
  const total = created + updated + deleted
  if (total === 0) return null
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon name={icon} className="text-[16px] text-smb-on-surface-variant" />
      <span className="flex-1 font-medium text-smb-on-surface">{label}</span>
      <span className="w-14 text-right font-mono text-[11px]">
        {deleted > 0 && <span className="text-rose-600">{deleted} del </span>}
        {updated > 0 && <span className="text-amber-600">{updated} upd </span>}
        {created > 0 && <span className="text-emerald-600">{created} new</span>}
      </span>
    </div>
  )
}

export function MapSyncPreview({ canvasState, mapName }) {
  const { nodes = [], edges = [], semanticObjects = [] } = canvasState ?? {}
  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4 space-y-2">
      <h4 className="text-xs font-bold text-smb-on-surface">
        <Icon name="fact_check" className="mr-1.5 inline text-[14px] text-smb-primary" />
        Xác nhận đồng bộ: <span className="font-normal text-smb-on-surface-variant">{mapName}</span>
      </h4>
      <div className="text-[10px] text-smb-on-surface-variant">
        {nodes.length} node · {edges.length} edge · {semanticObjects.length} kệ hàng
      </div>
      <DiffRow label="Node" icon="circle" created={nodes.filter((n) => n.isNew).length} updated={nodes.filter((n) => !n.isNew && n._dirty).length} deleted={nodes.filter((n) => n._deleted).length} />
      <DiffRow label="Edge" icon="timeline" created={edges.filter((e) => e.isNew).length} updated={edges.filter((e) => !e.isNew && e._dirty).length} deleted={edges.filter((e) => e._deleted).length} />
      <DiffRow label="Kệ hàng" icon="inventory_2" created={semanticObjects.filter((s) => s.isNew).length} updated={semanticObjects.filter((s) => !s.isNew && s._dirty).length} deleted={semanticObjects.filter((s) => s._deleted).length} />
    </div>
  )
}

export function MapSyncButton({ mapId, canvasState, floorId, mapName, onSaved, variant = 'primary', children }) {
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState(null) // null | { success, data, error }
  const [setActive, setSetActive] = useState(false)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setResult(null)
    try {
      const { nodes, edges, semanticObjects } = canvasState ?? {}
      // Strip internal _dirty/_deleted flags before sending
      const cleanNodes = (nodes ?? []).filter((n) => !n._deleted).map(({ isNew, _dirty, ...rest }) => rest)
      const cleanEdges = (edges ?? []).filter((e) => !e._deleted).map(({ isNew, _dirty, ...rest }) => rest)
      const cleanObjects = (semanticObjects ?? []).filter((s) => !s._deleted).map(({ isNew, _dirty, ...rest }) => rest)

      const data = await syncMap({
        floorId,
        mapName: mapName || `Bản đồ Tầng ${floorId}`,
        widthMeters: canvasState?.widthMeters ?? 20,
        heightMeters: canvasState?.heightMeters ?? 20,
        nodes: cleanNodes,
        edges: cleanEdges,
        semanticObjects: cleanObjects,
      })
      setResult({ success: true, data })

      if (setActive && data?.mapId) {
        try {
          await setActiveMap(data.mapId)
        } catch {
          // non-fatal — map was saved even if set-active failed
        }
      }
      onSaved?.(data)
    } catch (err) {
      setResult({
        success: false,
        error: err?.response?.data?.message || err?.message || 'Lỗi đồng bộ bản đồ',
      })
    } finally {
      setSyncing(false)
    }
  }, [canvasState, floorId, mapName, onSaved, setActive])

  const btnClass = variant === 'primary'
    ? 'bg-smb-primary text-white hover:bg-smb-primary/90'
    : 'border border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:bg-smb-surface-container'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={syncing}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 ${btnClass}`}
      >
        {syncing ? (
          <Icon name="progress_activity" className="animate-spin text-[18px]" />
        ) : (
          <Icon name="cloud_upload" className="text-[18px]" />
        )}
        {children ?? 'Lưu lên Server'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-smb-outline-variant px-5 py-4">
              <div className="flex items-center gap-2">
                <Icon name="cloud_upload" className="text-[20px] text-smb-primary" />
                <h2 className="text-sm font-bold text-smb-on-surface">Đồng bộ Bản Đồ lên Server</h2>
              </div>
              <button
                onClick={() => { setOpen(false); setResult(null) }}
                className="rounded-lg p-1 text-smb-on-surface-variant hover:bg-smb-surface-container"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-4">
              {result == null ? (
                <>
                  <MapSyncPreview canvasState={canvasState} mapName={mapName} />
                  <label className="flex items-center gap-2 text-xs text-smb-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setActive}
                      onChange={(e) => setSetActive(e.target.checked)}
                      className="size-4 rounded accent-smb-primary"
                    />
                    Đặt làm bản đồ <strong>chính thức</strong> (Active) sau khi lưu
                  </label>
                </>
              ) : result.success ? (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 font-bold text-emerald-700">
                    <Icon name="check_circle" className="text-[20px]" />
                    Đồng bộ thành công!
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    {[
                      ['Node', result.data.nodesCreated + result.data.nodesUpdated],
                      ['Edge', result.data.edgesCreated + result.data.edgesUpdated],
                      ['Kệ', result.data.semanticObjectsCreated + result.data.semanticObjectsUpdated],
                    ].map(([label, n]) => (
                      <div key={label} className="rounded-lg bg-emerald-100 p-2">
                        <span className="block text-lg font-black text-emerald-700">{n}</span>
                        <span className="text-emerald-600">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-emerald-600">{result.data.message}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                  <div className="flex items-center gap-2 font-bold">
                    <Icon name="error" className="text-[18px]" />
                    Lỗi đồng bộ
                  </div>
                  <p className="mt-1">{result.error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-smb-outline-variant px-5 py-4">
              {result != null ? (
                <button
                  onClick={() => { setOpen(false); setResult(null) }}
                  className="rounded-xl bg-smb-surface-container px-4 py-2 text-xs font-bold text-smb-on-surface hover:bg-smb-surface-container-lowest"
                >
                  Đóng
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2 text-xs font-bold text-smb-on-surface-variant hover:bg-smb-surface-container"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 rounded-xl bg-smb-primary px-4 py-2 text-xs font-bold text-white hover:bg-smb-primary/90 disabled:opacity-50"
                  >
                    {syncing ? (
                      <Icon name="progress_activity" className="animate-spin text-[16px]" />
                    ) : (
                      <Icon name="cloud_upload" className="text-[16px]" />
                    )}
                    {syncing ? 'Đang lưu…' : 'Xác nhận Lưu'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
