/**
 * TargetingSelector — lets admin pick ≥1 targeting type per campaign.
 *
 * BE contract (server is source of truth — zones & shelves fetched live):
 *   - GET /api/v1/ad-campaigns/{id}             → CampaignResponseDto { routeIds[], semanticObjectId }
 *   - GET /api/v1/ad-campaigns/{id}/routes     → CampaignRoutesResponseDto { routes[] }
 *   - GET /api/v1/ad-campaigns/{id}/zones      → { zones[], zoneCount, totalZoneCharge }
 *     zones[] = { zoneId, zoneName, floorId, floorName, zonePriceCharged, purchasedAt }
 *   - GET /api/v1/ad-campaigns/{id}/shelves    → { shelves[], shelfCount, totalShelfCharge }
 *     shelves[] = { semanticObjectId, label, shelfPriceCharged, purchasedAt }
 *   - PUT /api/v1/ad-campaigns/{id}            → UpdateCampaignRequestDto (semanticObjectId + zoneIds + routeIds)
 *   - POST /api/v1/ad-campaigns/{id}/zones     → { zoneIds } (charge new zones only)
 *   - POST /api/v1/ad-campaigns/{id}/shelves   → { semanticObjectIds: [id] } (exactly 1)
 *   - Activate validates: routeCount > 0 OR zoneCount > 0 OR hasShelf
 *
 * Save model: each tab has its OWN "Lưu chọn" button that calls the
 * dedicated POST endpoint, returns the updated payload, then bubbles
 * the new assignment up via onTargetingChange() so parent can re-render.
 * (PUT /campaigns stays available as a fallback for batch edits.)
 *
 * Shelves are SINGULAR per BE schema — selecting a new shelf replaces the old one.
 *
 * Only Inactive / Paused campaigns accept POST /zones and POST /shelves.
 * When status === 'Active', all tabs become read-only.
 */

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import client from '../../../api/client'
import {
  getCampaignZones,
  assignCampaignZones,
  getCampaignShelf,
  assignCampaignShelf,
} from '../api/adCampaignApi'

const ENDPOINT_CAMPAIGN = '/api/v1/ad-campaigns'
const ENDPOINT_ROUTES   = '/api/v1/routes'

const TABS = [
  { key: 'shelf',  label: 'Kệ Hàng',     icon: 'inventory_2', single: true  },
  { key: 'zone',   label: 'Khu Vực',    icon: 'grid_view',   single: false },
  { key: 'route',  label: 'Tuyến Đường', icon: 'route',      single: false },
]

const formatVND = (val) =>
  Number(val ?? 0).toLocaleString('vi-VN')

function normalizeRoutes(routes) {
  return (routes ?? []).map((r) => ({
    id:       r.robotRouteId,
    name:     r.routeName ?? `Tuyến #${r.robotRouteId}`,
    zoneId:   r.zoneId,
    zoneName: r.zoneName,
  }))
}

export const TargetingSelector = forwardRef(function TargetingSelector(
  {
    campaignId,
    initialRouteIds,
    initialSemanticObjectId,
    disabled = false,
    onTargetingChange,
  },
  ref
) {
  const [activeTab, setActiveTab] = useState('shelf')
  const [shelves,   setShelves]   = useState([])
  const [allRoutes, setAllRoutes] = useState([])
  const [zones,    setZones]     = useState([])
  const [loading,  setLoading]    = useState(false)

  // Live server state (single source of truth after load)
  const [assignedZones, setAssignedZones] = useState([])    // raw from BE
  const [assignedShelf, setAssignedShelf] = useState(null)  // object or null

  // Working selections — user is editing these, not yet saved
  const [pickedZoneIds, setPickedZoneIds] = useState([])
  const [pickedShelfId, setPickedShelfId] = useState(null)
  const [pickedRouteIds, setPickedRouteIds] = useState(initialRouteIds ?? [])

  // Per-tab pending state for the dedicated "Lưu chọn" buttons
  const [savingTab, setSavingTab]     = useState(null)
  const [tabError, setTabError]       = useState(null)
  const [tabNotice, setTabNotice]     = useState(null)

  useEffect(() => {
    setPickedRouteIds(initialRouteIds ?? [])
  }, [initialRouteIds])

  // Load shelves + all routes, then fetch server-truth for zones/shelf/routes
  const loadData = useCallback(async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      // Discover latest mapId for /routes filter
      const mapRes = await client.get('/api/v1/maps/latest', { params: { floorId: 1 } })
      const mapId = mapRes.data?.mapId

      const [shelfPickerRes, routeRes, zonesRes, shelfRes, campaignRoutesRes] = await Promise.all([
        client.get('/api/v1/semantic-objects', { params: { pageNumber: 1, pageSize: 500 } }),
        mapId
          ? client.get(ENDPOINT_ROUTES, { params: { mapId } })
          : Promise.resolve({ data: [] }),
        getCampaignZones(campaignId),
        getCampaignShelf(campaignId),
        client.get(`${ENDPOINT_CAMPAIGN}/${campaignId}/routes`),
      ])

      // Shelf PICKER (all shelves on the map — independent of assigned)
      const shelfItems = (shelfPickerRes.data?.items ?? shelfPickerRes.data ?? [])
        .filter((s) => s.objectType?.toLowerCase() === 'shelf')
        .map((s) => ({ value: s.objectId, label: s.objectName ?? `Kệ #${s.objectId}` }))
      setShelves(shelfItems)

      // Routes
      const routeList = normalizeRoutes(routeRes.data ?? [])
      setAllRoutes(routeList)

      // Server-truth: zones & shelf
      setAssignedZones(zonesRes?.zones ?? [])
      setAssignedShelf(shelfRes?.shelves?.[0] ?? null)

      // Build available zone list (unique by zoneId, name + floor info)
      const seen = new Map()
      for (const z of zonesRes?.zones ?? []) {
        if (!seen.has(z.zoneId)) {
          seen.set(z.zoneId, {
            id: z.zoneId,
            name: z.zoneName ?? `Zone #${z.zoneId}`,
            floorId: z.floorId,
            floorName: z.floorName,
          })
        }
      }
      setZones(Array.from(seen.values()))

      // Initial working selection mirrors what's assigned
      setPickedZoneIds((zonesRes?.zones ?? []).map((z) => z.zoneId))
      setPickedShelfId(shelfRes?.shelves?.[0]?.semanticObjectId ?? null)

      // Routes: intersect with assigned
      if (campaignRoutesRes.data?.routes) {
        const assigned = new Set(campaignRoutesRes.data.routes.map((r) => r.robotRouteId))
        setPickedRouteIds(Array.from(assigned))
      }
    } catch {
      // Non-critical — degrade gracefully
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { loadData() }, [loadData])

  // Bubble changes to parent for save orchestration
  const notifyChange = useCallback((patch) => {
    onTargetingChange?.({
      semanticObjectId: pickedShelfId ?? initialSemanticObjectId ?? null,
      routeIds:         pickedRouteIds,
      zoneIds:          pickedZoneIds,
      ...patch,
    })
  }, [pickedShelfId, pickedRouteIds, pickedZoneIds, initialSemanticObjectId, onTargetingChange])

  useImperativeHandle(ref, () => ({
    getTargeting() {
      return {
        semanticObjectId: pickedShelfId,
        routeIds:         pickedRouteIds,
        zoneIds:          pickedZoneIds,
      }
    },
  }), [pickedShelfId, pickedRouteIds, pickedZoneIds])

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleShelfChange = (val) => {
    const id = val ? Number(val) : null
    setPickedShelfId(id)
    setTabError(null); setTabNotice(null)
    notifyChange({ semanticObjectId: id })
  }

  const toggleZone = (zoneId) => {
    const next = pickedZoneIds.includes(zoneId)
      ? pickedZoneIds.filter((z) => z !== zoneId)
      : [...pickedZoneIds, zoneId]
    setPickedZoneIds(next)
    setTabError(null); setTabNotice(null)
    notifyChange({ zoneIds: next })
  }

  const toggleRoute = (routeId) => {
    const next = pickedRouteIds.includes(routeId)
      ? pickedRouteIds.filter((r) => r !== routeId)
      : [...pickedRouteIds, routeId]
    setPickedRouteIds(next)
    setTabError(null); setTabNotice(null)
    notifyChange({ routeIds: next })
  }

  const selectAllZones  = () => { const a = zones.map((z) => z.id);      setPickedZoneIds(a); setTabError(null); setTabNotice(null); notifyChange({ zoneIds: a }) }
  const clearZones     = () => { setPickedZoneIds([]);                   setTabError(null); setTabNotice(null); notifyChange({ zoneIds: [] }) }
  const selectAllRoutes = () => { const a = allRoutes.map((r) => r.id);   setPickedRouteIds(a); setTabError(null); setTabNotice(null); notifyChange({ routeIds: a }) }
  const clearRoutes    = () => { setPickedRouteIds([]);                  setTabError(null); setTabNotice(null); notifyChange({ routeIds: [] }) }

  // ── Save handlers (per tab) ──────────────────────────────────────────
  const handleSaveZones = async () => {
    if (!campaignId) return
    setSavingTab('zone'); setTabError(null); setTabNotice(null)
    try {
      const res = await assignCampaignZones(campaignId, pickedZoneIds)
      const returned = res?.zones ?? []
      setAssignedZones(returned)
      setPickedZoneIds(returned.map((z) => z.zoneId))
      // rebuild picker list with newly seen zones
      setZones((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]))
        for (const z of returned) {
          if (!map.has(z.zoneId)) {
            map.set(z.zoneId, {
              id: z.zoneId,
              name: z.zoneName ?? `Zone #${z.zoneId}`,
              floorId: z.floorId,
              floorName: z.floorName,
            })
          }
        }
        return Array.from(map.values())
      })
      const charged = res?.totalZoneCharge ?? 0
      setTabNotice(
        `Đã gán ${res?.zoneCount ?? returned.length} khu vực. Phí phát sinh: ${formatVND(charged)} đ.`
      )
    } catch (err) {
      setTabError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Không thể gán khu vực.')
    } finally {
      setSavingTab(null)
    }
  }

  const handleSaveShelf = async () => {
    if (!campaignId) return
    if (!pickedShelfId) {
      setTabError('Vui lòng chọn một kệ hàng.')
      return
    }
    setSavingTab('shelf'); setTabError(null); setTabNotice(null)
    try {
      const res = await assignCampaignShelf(campaignId, pickedShelfId)
      const returned = res?.shelves?.[0] ?? null
      setAssignedShelf(returned)
      setPickedShelfId(returned?.semanticObjectId ?? null)
      const charged = res?.totalShelfCharge ?? 0
      setTabNotice(
        returned
          ? `Đã gán kệ "${returned.label ?? returned.semanticObjectId}". Phí: ${formatVND(charged)} đ.`
          : 'Đã gỡ kệ khỏi chiến dịch.'
      )
    } catch (err) {
      setTabError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Không thể gán kệ hàng.')
    } finally {
      setSavingTab(null)
    }
  }

  // ── Counts ────────────────────────────────────────────────────────────
  const shelfCount = pickedShelfId  ? 1 : 0
  const zoneCount  = pickedZoneIds.length
  const routeCount = pickedRouteIds.length
  const totalCount = shelfCount + zoneCount + routeCount

  // ── Derived "is this tab dirty?" ──────────────────────────────────────
  const isZonesDirty = JSON.stringify([...pickedZoneIds].sort())
    !== JSON.stringify([...assignedZones.map((z) => z.zoneId)].sort())
  const isShelfDirty = (pickedShelfId ?? null) !== (assignedShelf?.semanticObjectId ?? null)

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">my_location</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Nhắm Đích Chiến Dịch</h3>
          <p className="text-sm text-smb-on-surface-variant">
            Chọn tối thiểu 1 loại: Kệ, Khu Vực, hoặc Tuyến Đường để kích hoạt
          </p>
        </div>
      </div>

      {/* Validation hint */}
      {totalCount === 0 && !disabled && (
        <div className="mb-4 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3">
          <span className="material-symbols-outlined mt-0.5 text-[16px] text-amber-600">warning</span>
          <p className="text-xs text-amber-700">
            Chiến dịch chưa có đối tượng nhắm đích. Cần chọn ít nhất 1 Kệ / Khu Vực / Tuyến Đường trước khi kích hoạt.
          </p>
        </div>
      )}

      {disabled && (
        <div className="mb-4 flex items-start gap-2 rounded border border-smb-primary-container/30 bg-smb-primary-container/5 p-3">
          <span className="material-symbols-outlined mt-0.5 text-[16px] text-smb-primary-container">info</span>
          <p className="text-xs text-smb-primary-container">
            Chiến dịch đang <strong>Hoạt Động</strong>. Targeting đã khoá — chỉ xem.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container p-1">
        {TABS.map((tab) => {
          const count = tab.key === 'shelf' ? shelfCount
                      : tab.key === 'zone'  ? zoneCount
                      : routeCount
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => !disabled && setActiveTab(tab.key)}
              disabled={disabled}
              className={`
                flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium
                transition-colors duration-150
                ${activeTab === tab.key
                  ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
                  : 'text-smb-on-surface-variant hover:bg-smb-surface-container-lowest'}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span className={`
                  inline-flex size-5 min-w-5 items-center justify-center rounded-full text-[11px] font-bold
                  ${activeTab === tab.key
                    ? 'bg-smb-on-primary-container text-smb-primary-container'
                    : 'bg-smb-primary-container text-smb-on-primary-container'}
                `}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Per-tab feedback (error / notice) */}
      {tabError && (
        <div className="mb-3 flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <span className="material-symbols-outlined mt-0.5 text-[14px]">error</span>
          {tabError}
        </div>
      )}
      {tabNotice && (
        <div className="mb-3 flex items-start gap-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700">
          <span className="material-symbols-outlined mt-0.5 text-[14px]">check_circle</span>
          {tabNotice}
        </div>
      )}

      {/* Content */}
      <div className="min-h-[120px]">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-smb-on-surface-variant">progress_activity</span>
            <span className="ml-2 text-sm text-smb-on-surface-variant">Đang tải...</span>
          </div>
        )}

        {!loading && activeTab === 'shelf' && (
          shelves.length === 0
            ? <p className="py-4 text-center text-sm text-smb-on-surface-variant">Không có kệ hàng nào trên bản đồ</p>
            : <>
                <Select
                  label="Chọn Kệ Hàng"
                  placeholder="— Chọn một kệ hàng —"
                  options={shelves}
                  value={pickedShelfId ?? ''}
                  onChange={handleShelfChange}
                  disabled={disabled}
                  hint="Chỉ được chọn 1 kệ. Phí = PriceShelf của gói."
                />
                {assignedShelf && (
                  <p className="mt-2 text-xs text-smb-on-surface-variant">
                    Hiện đang gán: <strong>{assignedShelf.label ?? `Kệ #${assignedShelf.semanticObjectId}`}</strong>
                    {assignedShelf.shelfPriceCharged != null && (
                      <> · phí {formatVND(assignedShelf.shelfPriceCharged)} đ</>
                    )}
                  </p>
                )}
                {!disabled && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="primary"
                      icon="save"
                      onClick={handleSaveShelf}
                      disabled={!isShelfDirty || savingTab === 'shelf'}
                      loading={savingTab === 'shelf'}
                    >
                      Lưu chọn kệ
                    </Button>
                  </div>
                )}
              </>
        )}

        {!loading && activeTab === 'zone' && (
          zones.length === 0
            ? <p className="py-4 text-center text-sm text-smb-on-surface-variant">
                Chưa gán khu vực nào cho chiến dịch này.
              </p>
            : <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-smb-on-surface-variant">
                    Đã chọn {zoneCount} / {zones.length} khu vực
                    {assignedZones.length > 0 && (
                      <span className="ml-2 text-smb-on-surface-variant">
                        · phí hiện tại {formatVND(assignedZones.reduce((s, z) => s + (z.zonePriceCharged ?? 0), 0))} đ
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAllZones} disabled={disabled || zoneCount === zones.length}
                      className="text-xs text-smb-primary hover:underline disabled:opacity-40">Chọn tất cả</button>
                    <button type="button" onClick={clearZones} disabled={disabled || zoneCount === 0}
                      className="text-xs text-smb-error hover:underline disabled:opacity-40">Bỏ chọn</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {zones.map((zone) => {
                    const isPicked = pickedZoneIds.includes(zone.id)
                    return (
                      <button key={zone.id} type="button"
                        onClick={() => !disabled && toggleZone(zone.id)}
                        disabled={disabled}
                        className={`
                          flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left
                          transition-colors duration-100
                          ${isPicked
                            ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                            : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'}
                          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                        `}>
                        <span className={`
                          flex size-4 min-w-4 items-center justify-center rounded-sm border text-[10px] font-bold
                          ${isPicked
                            ? 'border-smb-on-primary-container bg-smb-on-primary-container text-smb-primary-container'
                            : 'border-smb-outline bg-smb-surface-container'}
                        `}>{isPicked && '✓'}</span>
                        <span className="truncate">
                          {zone.name}
                          {zone.floorName && (
                            <span className="ml-1 text-xs text-smb-on-surface-variant">· T{zone.floorName}</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-smb-on-surface-variant">
                  Phí = PriceZone × số khu vực MỚI được gán (khu vực đã có không charge lại).
                </p>
                {!disabled && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="primary"
                      icon="save"
                      onClick={handleSaveZones}
                      disabled={!isZonesDirty || savingTab === 'zone'}
                      loading={savingTab === 'zone'}
                    >
                      Lưu chọn khu vực
                    </Button>
                  </div>
                )}
              </>
        )}

        {!loading && activeTab === 'route' && (
          allRoutes.length === 0
            ? <p className="py-4 text-center text-sm text-smb-on-surface-variant">
                Không có tuyến đường nào. Vui lòng tạo tuyến đường trước.
              </p>
            : <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-smb-on-surface-variant">
                    Đã chọn {routeCount} / {allRoutes.length} tuyến đường
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAllRoutes} disabled={disabled || routeCount === allRoutes.length}
                      className="text-xs text-smb-primary hover:underline disabled:opacity-40">Chọn tất cả</button>
                    <button type="button" onClick={clearRoutes} disabled={disabled || routeCount === 0}
                      className="text-xs text-smb-error hover:underline disabled:opacity-40">Bỏ chọn</button>
                  </div>
                </div>
                <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {allRoutes.map((route) => {
                    const isPicked = pickedRouteIds.includes(route.id)
                    return (
                      <button key={route.id} type="button"
                        onClick={() => !disabled && toggleRoute(route.id)}
                        disabled={disabled}
                        className={`
                          flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left
                          transition-colors duration-100
                          ${isPicked
                            ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                            : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'}
                          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                        `}>
                        <span className={`
                          flex size-4 min-w-4 items-center justify-center rounded-sm border text-[10px] font-bold
                          ${isPicked
                            ? 'border-smb-on-primary-container bg-smb-on-primary-container text-smb-primary-container'
                            : 'border-smb-outline bg-smb-surface-container'}
                        `}>{isPicked && '✓'}</span>
                        <span className="truncate">{route.name}</span>
                        {route.zoneName && (
                          <span className="ml-auto text-xs text-smb-on-surface-variant">{route.zoneName}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-smb-on-surface-variant">
                  Phí = PriceRoute × số tuyến đường đã chọn.
                </p>
                <p className="mt-1 text-[11px] text-smb-on-surface-variant/70">
                  Lưu ý: tuyến đường được gán qua endpoint riêng; chọn tại đây rồi nhấn "Lưu Cập Nhật" trong form cha.
                </p>
              </>
        )}
      </div>

      {/* Summary footer */}
      {totalCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 rounded border border-smb-outline-variant bg-smb-surface-container p-3">
          <span className="text-xs font-medium text-smb-on-surface-variant">Đã chọn:</span>
          {shelfCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs text-smb-primary-container">
              <span className="material-symbols-outlined text-[12px]">inventory_2</span>1 Kệ
            </span>
          )}
          {zoneCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs text-smb-primary-container">
              <span className="material-symbols-outlined text-[12px]">grid_view</span>{zoneCount} Khu Vực
            </span>
          )}
          {routeCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs text-smb-primary-container">
              <span className="material-symbols-outlined text-[12px]">route</span>{routeCount} Tuyến
            </span>
          )}
        </div>
      )}
    </div>
  )
})

export default TargetingSelector