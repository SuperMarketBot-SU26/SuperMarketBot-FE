/**
 * TargetingSelector — lets admin pick ≥1 targeting type per campaign.
 *
 * BE contract (no zoneIds in CampaignResponseDto — must derive):
 *   - GET /api/v1/campaigns/{id}             → CampaignResponseDto { routeIds[], semanticObjectId }
 *   - GET /api/v1/campaigns/{id}/routes     → CampaignRoutesResponseDto { routes[] }
 *   - GET /api/v1/routes?mapId=             → RobotRouteListDto[]  (zoneId, zoneName per route)
 *   - PUT /api/v1/campaigns/{id}            → UpdateCampaignRequestDto accepts semanticObjectId + zoneIds + routeIds
 *   - Activate validates: routeCount > 0 OR zoneCount > 0 OR hasShelf
 */

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import Select from '../../../components/ui/Select'
import client from '../../../api/client'

const ENDPOINT_CAMPAIGN = '/v1/ad-campaigns'
const ENDPOINT_ROUTES   = '/v1/routes'

const TABS = [
  { key: 'shelf',  label: 'Kệ Hàng',     icon: 'inventory_2', single: true  },
  { key: 'zone',   label: 'Khu Vực',    icon: 'grid_view',   single: false },
  { key: 'route',  label: 'Tuyến Đường', icon: 'route',      single: false },
]

function normalizeRoutes(routes) {
  return (routes ?? []).map((r) => ({
    id:       r.robotRouteId,
    name:     r.routeName ?? `Tuyến #${r.robotRouteId}`,
    zoneId:   r.zoneId,
    zoneName: r.zoneName,
  }))
}

function deriveZones(routes) {
  const seen = new Map()
  for (const r of routes ?? []) {
    if (r.zoneId == null) continue
    if (!seen.has(r.zoneId)) {
      seen.set(r.zoneId, r.zoneName ?? `Zone #${r.zoneId}`)
    }
  }
  return Array.from(seen, ([id, name]) => ({ id, name }))
}

export const TargetingSelector = forwardRef(function TargetingSelector(
  { campaignId, initialRouteIds, initialSemanticObjectId, disabled = false },
  ref
) {
  const [activeTab, setActiveTab] = useState('shelf')
  const [shelves,   setShelves]   = useState([])
  const [allRoutes, setAllRoutes] = useState([])   // all routes from /routes
  const [zones,    setZones]     = useState([])
  const [loading,  setLoading]    = useState(false)

  // Current selections — initialized from props, mutated by user
  const [selectedShelfId, setSelectedShelfId] = useState(initialSemanticObjectId ?? null)
  const [selectedZoneIds, setSelectedZoneIds] = useState([])
  const [selectedRouteIds, setSelectedRouteIds] = useState(initialRouteIds ?? [])

  useEffect(() => {
    setSelectedRouteIds(initialRouteIds ?? [])
  }, [initialRouteIds])

  // Load shelves + all routes, then derive zones + intersect with assigned routes.
// /routes requires mapId — fetch the latest map first to discover it.
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const mapRes = await client.get('/v1/maps/latest', { params: { floorId: 1 } })
      const mapId = mapRes.data?.mapId

      const [shelfRes, routeRes, campaignRoutesRes] = await Promise.all([
        client.get('/v1/semantic-objects', { params: { pageNumber: 1, pageSize: 500 } }),
        mapId
          ? client.get(ENDPOINT_ROUTES, { params: { mapId } })
          : Promise.resolve({ data: [] }),
        campaignId
          ? client.get(`${ENDPOINT_CAMPAIGN}/${campaignId}/routes`)
          : Promise.resolve({ data: null }),
      ])

      // Shelves (filter to objectType === 'shelf')
      const shelfItems = (shelfRes.data?.items ?? shelfRes.data ?? [])
        .filter((s) => s.objectType?.toLowerCase() === 'shelf')
        .map((s) => ({ value: s.objectId, label: s.objectName ?? `Kệ #${s.objectId}` }))
      setShelves(shelfItems)

      // All routes
      const routeList = normalizeRoutes(routeRes.data ?? [])
      setAllRoutes(routeList)
      setZones(deriveZones(routeList))

      // Intersect: only mark routes as selected if they're in campaign's assigned routes
      if (campaignRoutesRes.data?.routes) {
        const assigned = new Set(campaignRoutesRes.data.routes.map((r) => r.robotRouteId))
        setSelectedRouteIds(Array.from(assigned))

        // NOTE: BE exposes no endpoint to fetch assigned zones for a campaign
        // (zoneIds is not in CampaignResponseDto, no /campaigns/{id}/zones exists).
        // Zones therefore start empty on mount; user must re-pick them or rely on
        // routes covering them. If the user picked only routes, charge is
        // PricePackage + PriceRoute × count — no implicit zone charge.
      }
    } catch {
      // Non-critical — degrade gracefully
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { loadData() }, [loadData])

  useImperativeHandle(ref, () => ({
    getTargeting() {
      return {
        semanticObjectId: selectedShelfId,
        routeIds:         selectedRouteIds,
        zoneIds:          selectedZoneIds,
      }
    },
  }), [selectedShelfId, selectedRouteIds, selectedZoneIds])

  // Internal emit — values are exposed via getTargeting() from the ref
  // and consumed by the parent at save time. No callback prop needed.
  const emit = useCallback((_patch) => {
    // intentionally empty — ref-based pattern
  }, [selectedShelfId, selectedRouteIds, selectedZoneIds])

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleShelfChange = (val) => {
    const id = val ? Number(val) : null
    setSelectedShelfId(id)
    emit({ semanticObjectId: id })
  }

  const toggleZone = (zoneId) => {
    const next = selectedZoneIds.includes(zoneId)
      ? selectedZoneIds.filter((z) => z !== zoneId)
      : [...selectedZoneIds, zoneId]
    setSelectedZoneIds(next)
    emit({ zoneIds: next })
  }

  const toggleRoute = (routeId) => {
    const next = selectedRouteIds.includes(routeId)
      ? selectedRouteIds.filter((r) => r !== routeId)
      : [...selectedRouteIds, routeId]
    setSelectedRouteIds(next)
    emit({ routeIds: next })
  }

  const selectAllZones  = () => { const a = zones.map((z) => z.id);      setSelectedZoneIds(a);  emit({ zoneIds:  a }); }
  const clearZones     = () => { setSelectedZoneIds([]);                   emit({ zoneIds:  [] }); }
  const selectAllRoutes = () => { const a = allRoutes.map((r) => r.id);   setSelectedRouteIds(a); emit({ routeIds: a }); }
  const clearRoutes    = () => { setSelectedRouteIds([]);                  emit({ routeIds: [] }); }

  // ── Counts ────────────────────────────────────────────────────────────
  const shelfCount = selectedShelfId  ? 1 : 0
  const zoneCount  = selectedZoneIds.length
  const routeCount = selectedRouteIds.length
  const totalCount = shelfCount + zoneCount + routeCount

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
            : <Select
                label="Chọn Kệ Hàng"
                placeholder="— Chọn một kệ hàng —"
                options={shelves}
                value={selectedShelfId ?? ''}
                onChange={handleShelfChange}
                disabled={disabled}
                hint="Chỉ được chọn 1 kệ. Chi phí tính theo PriceShelf của gói."
              />
        )}

        {!loading && activeTab === 'zone' && (
          zones.length === 0
            ? <p className="py-4 text-center text-sm text-smb-on-surface-variant">
                Không có khu vực nào. Cần tạo tuyến đường có gán zone trước.
              </p>
            : <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-smb-on-surface-variant">
                    Đã chọn {zoneCount} / {zones.length} khu vực
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
                    const isSelected = selectedZoneIds.includes(zone.id)
                    return (
                      <button key={zone.id} type="button"
                        onClick={() => !disabled && toggleZone(zone.id)}
                        disabled={disabled}
                        className={`
                          flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left
                          transition-colors duration-100
                          ${isSelected
                            ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                            : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'}
                          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                        `}>
                        <span className={`
                          flex size-4 min-w-4 items-center justify-center rounded-sm border text-[10px] font-bold
                          ${isSelected
                            ? 'border-smb-on-primary-container bg-smb-on-primary-container text-smb-primary-container'
                            : 'border-smb-outline bg-smb-surface-container'}
                        `}>{isSelected && '✓'}</span>
                        <span className="truncate">{zone.name}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-smb-on-surface-variant">
                  Chi phí = PriceZone × số khu vực đã chọn.
                </p>
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
                    const isSelected = selectedRouteIds.includes(route.id)
                    return (
                      <button key={route.id} type="button"
                        onClick={() => !disabled && toggleRoute(route.id)}
                        disabled={disabled}
                        className={`
                          flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left
                          transition-colors duration-100
                          ${isSelected
                            ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                            : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'}
                          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                        `}>
                        <span className={`
                          flex size-4 min-w-4 items-center justify-center rounded-sm border text-[10px] font-bold
                          ${isSelected
                            ? 'border-smb-on-primary-container bg-smb-on-primary-container text-smb-primary-container'
                            : 'border-smb-outline bg-smb-surface-container'}
                        `}>{isSelected && '✓'}</span>
                        <span className="truncate">{route.name}</span>
                        {route.zoneName && (
                          <span className="ml-auto text-xs text-smb-on-surface-variant">{route.zoneName}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-smb-on-surface-variant">
                  Chi phí = PriceRoute × số tuyến đường đã chọn.
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
