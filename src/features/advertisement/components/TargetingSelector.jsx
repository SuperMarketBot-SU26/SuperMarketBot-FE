/**
 * TargetingSelector — lets admin pick ≥1 targeting type per campaign.
 *
 * BE contract (server is source of truth):
 *   - GET /api/v1/ad-campaigns/{id}             → CampaignResponseDto { routeIds[], semanticObjectId }
 *   - GET /api/v1/ad-campaigns/{id}/routes     → CampaignRoutesResponseDto { routes[] }
 *   - GET /api/v1/ad-campaigns/{id}/zones      → { zones[], zoneCount, totalZoneCharge }
 *   - GET /api/v1/ad-campaigns/{id}/shelves    → { shelves[], shelfCount, totalShelfCharge }
 *   - POST /api/v1/ad-campaigns/{id}/shelves   → { shelfIds: [...] }
 *   - PUT /api/v1/ad-campaigns/{id}            → UpdateCampaignRequestDto
 *   - POST /api/v1/ad-campaigns/{id}/zones     → { zoneIds: [...] }
 *   - Activate validates: routeCount > 0 OR zoneCount > 0 OR shelfCount > 0
 *
 * Route = "toàn bộ siêu thị" — chỉ cần 1 toggle đơn giản.
 * Zones, Shelves hỗ trợ multi-select.
 */

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import Button from '../../../components/ui/Button'
import client from '../../../api/client'
import {
  getCampaignZones,
  assignCampaignZones,
  getCampaignShelves,
  assignCampaignShelves,
} from '../api/adCampaignApi'

const ENDPOINT_CAMPAIGN = '/api/v1/ad-campaigns'

const TABS = [
  { key: 'route',  label: 'Tuyến Đường', icon: 'route' },
  { key: 'shelf',  label: 'Kệ Hàng',     icon: 'inventory_2' },
  { key: 'zone',   label: 'Khu Vực',    icon: 'grid_view' },
]

const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')

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
  const [activeTab, setActiveTab] = useState('route')
  const [shelves,   setShelves]   = useState([])
  const [zones,     setZones]     = useState([])
  const [allRoutes, setAllRoutes] = useState([])    // all routes on map
  const [loading,   setLoading]   = useState(false)

  // Live server state
  const [assignedZones,     setAssignedZones]     = useState([])
  const [assignedShelves,   setAssignedShelves]   = useState([])
  const [assignedRoutes,    setAssignedRoutes]    = useState([]) // [{ robotRouteId, routePriceCharged }]

  // Working selections
  const [pickedZoneIds,   setPickedZoneIds]   = useState([])
  const [pickedShelfIds,   setPickedShelfIds]   = useState([])
  const [pickedRouteIds,   setPickedRouteIds]   = useState([])   // selected route ids (empty = none, length > 0 = all routes)

  // Per-tab state
  const [savingTab, setSavingTab] = useState(null)
  const [tabError,  setTabError]  = useState(null)
  const [tabNotice, setTabNotice]  = useState(null)

  // Sync route selection from initialRouteIds
  useEffect(() => {
    setPickedRouteIds(initialRouteIds ?? [])
  }, [initialRouteIds])

  const loadData = useCallback(async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      // Get all routes from map for the "all routes" selection
      const mapRes = await client.get('/api/v1/maps/latest', { params: { floorId: 1 } })
      const mapId = mapRes.data?.mapId
      const routesRes = mapId
        ? await client.get('/api/v1/routes', { params: { mapId } })
        : { data: [] }
      const routeList = (routesRes.data ?? []).map((r) => r.robotRouteId ?? r.routeId ?? r.id)
      setAllRoutes(routeList)

      const [zonesRes, shelfRes, campaignRoutesRes] = await Promise.all([
        getCampaignZones(campaignId),
        getCampaignShelves(campaignId),
        client.get(`${ENDPOINT_CAMPAIGN}/${campaignId}/routes`),
      ])

      // Shelf picker (all shelves)
      const shelfPickerRes = await client.get('/api/v1/shelves')
      const shelfItems = (shelfPickerRes.data ?? [])
        .map((s) => ({ value: s.shelfId, label: s.label ?? s.shelfName ?? s.name ?? `Kệ #${s.shelfId}` }))
      setShelves(shelfItems)

      // Server truth
      setAssignedZones(zonesRes?.zones ?? [])
      setAssignedShelves(shelfRes?.shelves ?? [])
      setAssignedRoutes(campaignRoutesRes?.routes ?? [])

      // Build zone list
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

      setPickedZoneIds((zonesRes?.zones ?? []).map((z) => z.zoneId))
      setPickedShelfIds((shelfRes?.shelves ?? []).map((s) => s.shelfId))
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { loadData() }, [loadData])

  const notifyChange = useCallback((patch) => {
    onTargetingChange?.({
      semanticObjectId: pickedShelfIds.length > 0 ? pickedShelfIds[0] : null,
      routeIds:         pickedRouteIds,
      zoneIds:          pickedZoneIds,
      shelfIds:         pickedShelfIds,
      ...patch,
    })
  }, [pickedShelfIds, pickedRouteIds, pickedZoneIds, onTargetingChange])

  useImperativeHandle(ref, () => ({
    getTargeting() {
      return {
        semanticObjectId: pickedShelfIds.length > 0 ? pickedShelfIds[0] : null,
        routeIds:         pickedRouteIds,
        zoneIds:          pickedZoneIds,
        shelfIds:         pickedShelfIds,
      }
    },
  }), [pickedShelfIds, pickedRouteIds, pickedZoneIds])

  // ── Handlers ─────────────────────────────────────────────────────────
  const toggleShelf = (shelfId) => {
    const next = pickedShelfIds.includes(shelfId)
      ? pickedShelfIds.filter((s) => s !== shelfId)
      : [...pickedShelfIds, shelfId]
    setPickedShelfIds(next)
    setTabError(null); setTabNotice(null)
    notifyChange({ shelfIds: next })
  }

  const toggleZone = (zoneId) => {
    const next = pickedZoneIds.includes(zoneId)
      ? pickedZoneIds.filter((z) => z !== zoneId)
      : [...pickedZoneIds, zoneId]
    setPickedZoneIds(next)
    setTabError(null); setTabNotice(null)
    notifyChange({ zoneIds: next })
  }

  const toggleRoute = () => {
    if (pickedRouteIds.length > 0) {
      // Uncheck = remove all
      setPickedRouteIds([])
      notifyChange({ routeIds: [] })
    } else {
      // Check = select all routes
      setPickedRouteIds([...allRoutes])
      notifyChange({ routeIds: [...allRoutes] })
    }
    setTabError(null); setTabNotice(null)
  }

  const selectAllZones   = () => { const a = zones.map((z) => z.id);    setPickedZoneIds(a);   notifyChange({ zoneIds: a }) }
  const clearZones      = () => { setPickedZoneIds([]);                  notifyChange({ zoneIds: [] }) }
  const selectAllShelves = () => { const a = shelves.map((s) => s.value); setPickedShelfIds(a); notifyChange({ shelfIds: a }) }
  const clearShelves    = () => { setPickedShelfIds([]);                 notifyChange({ shelfIds: [] }) }

  // ── Save handlers ────────────────────────────────────────────────────
  const handleSaveZones = async () => {
    if (!campaignId) return
    setSavingTab('zone'); setTabError(null); setTabNotice(null)
    try {
      const res = await assignCampaignZones(campaignId, pickedZoneIds)
      const returned = res?.zones ?? []
      setAssignedZones(returned)
      setPickedZoneIds(returned.map((z) => z.zoneId))
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
      setTabNotice(`Đã gán ${res?.zoneCount ?? returned.length} khu vực. Phí: ${formatVND(charged)} đ.`)
    } catch (err) {
      setTabError(err?.response?.data?.error || err.message || 'Không thể gán khu vực.')
    } finally {
      setSavingTab(null)
    }
  }

  const handleSaveShelves = async () => {
    if (!campaignId) return
    setSavingTab('shelf'); setTabError(null); setTabNotice(null)
    try {
      const res = await assignCampaignShelves(campaignId, pickedShelfIds)
      const returned = res?.shelves ?? []
      setAssignedShelves(returned)
      setPickedShelfIds(returned.map((s) => s.shelfId))
      const charged = res?.totalShelfCharge ?? 0
      const count = res?.shelfCount ?? returned.length
      setTabNotice(count > 0
        ? `Đã gán ${count} kệ hàng. Phí: ${formatVND(charged)} đ.`
        : 'Đã gỡ tất cả kệ khỏi chiến dịch.')
    } catch (err) {
      setTabError(err?.response?.data?.error || err.message || 'Không thể gán kệ hàng.')
    } finally {
      setSavingTab(null)
    }
  }

  // ── Counts ────────────────────────────────────────────────────────────
  const shelfCount = pickedShelfIds.length
  const zoneCount  = pickedZoneIds.length
  const totalCount = (routeSelected ? 1 : 0) + shelfCount + zoneCount

  // ── Dirty checks ──────────────────────────────────────────────────────
  const isZonesDirty = JSON.stringify([...pickedZoneIds].sort())
    !== JSON.stringify([...assignedZones.map((z) => z.zoneId)].sort())
  const isShelvesDirty = JSON.stringify([...pickedShelfIds].sort())
    !== JSON.stringify([...assignedShelves.map((s) => s.shelfId)].sort())
  const isRouteDirty = routeSelected !== (assignedRoutes.length > 0)

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
            Chọn tối thiểu 1 loại: Tuyến Đường, Kệ, hoặc Khu Vực để kích hoạt
          </p>
        </div>
      </div>

      {/* Validation hint */}
      {totalCount === 0 && !disabled && (
        <div className="mb-4 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3">
          <span className="material-symbols-outlined mt-0.5 text-[16px] text-amber-600">warning</span>
          <p className="text-xs text-amber-700">
            Chiến dịch chưa có đối tượng nhắm đích. Cần chọn ít nhất 1 loại trước khi kích hoạt.
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
          const count = tab.key === 'route' ? pickedRouteIds.length
                      : tab.key === 'shelf' ? shelfCount
                      : zoneCount
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

      {/* Feedback */}
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
      <div className="min-h-30">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-smb-on-surface-variant">progress_activity</span>
            <span className="ml-2 text-sm text-smb-on-surface-variant">Đang tải...</span>
          </div>
        )}

        {/* Route tab — hiển thị từng tuyến để chọn */}
        {!loading && activeTab === 'route' && (
          allRoutes.length === 0
            ? <p className="py-8 text-center text-sm text-smb-on-surface-variant">Không có tuyến đường nào trên bản đồ</p>
            : <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-smb-on-surface-variant">
                    Đã chọn {pickedRouteIds.length} / {allRoutes.length} tuyến
                    {assignedRoutes.length > 0 && (
                      <span className="ml-2 text-smb-on-surface-variant">
                        · phí hiện tại {formatVND(assignedRoutes.reduce((acc, r) => acc + (r.routePriceCharged ?? 0), 0))} đ
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setPickedRouteIds([...allRoutes]); notifyChange({ routeIds: [...allRoutes] }) }}
                      disabled={disabled || pickedRouteIds.length === allRoutes.length}
                      className="text-xs text-smb-primary hover:underline disabled:opacity-40">Chọn tất cả</button>
                    <button type="button" onClick={() => { setPickedRouteIds([]); notifyChange({ routeIds: [] }) }}
                      disabled={disabled || pickedRouteIds.length === 0}
                      className="text-xs text-smb-error hover:underline disabled:opacity-40">Bỏ chọn</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {allRoutes.map((routeId) => {
                    const isPicked = pickedRouteIds.includes(routeId)
                    return (
                      <button key={routeId} type="button"
                        onClick={() => !disabled && (() => {
                          const next = isPicked
                            ? pickedRouteIds.filter((r) => r !== routeId)
                            : [...pickedRouteIds, routeId]
                          setPickedRouteIds(next)
                          notifyChange({ routeIds: next })
                        })()}
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
                        <span className="truncate">Tuyến #{routeId}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-smb-on-surface-variant">
                  Phí = PriceRoute × số tuyến MỚI được gán.
                </p>
              </>
        )}

        {/* Shelf tab */}
        {!loading && activeTab === 'shelf' && (
          shelves.length === 0
            ? <p className="py-4 text-center text-sm text-smb-on-surface-variant">Không có kệ hàng nào trên bản đồ</p>
            : <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-smb-on-surface-variant">
                    Đã chọn {shelfCount} / {shelves.length} kệ hàng
                    {assignedShelves.length > 0 && (
                      <span className="ml-2 text-smb-on-surface-variant">
                        · phí hiện tại {formatVND(assignedShelves.reduce((acc, sh) => acc + (sh.shelfPriceCharged ?? 0), 0))} đ
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAllShelves} disabled={disabled || shelfCount === shelves.length}
                      className="text-xs text-smb-primary hover:underline disabled:opacity-40">Chọn tất cả</button>
                    <button type="button" onClick={clearShelves} disabled={disabled || shelfCount === 0}
                      className="text-xs text-smb-error hover:underline disabled:opacity-40">Bỏ chọn</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {shelves.map((shelf) => {
                    const isPicked = pickedShelfIds.includes(shelf.value)
                    return (
                      <button key={shelf.value} type="button"
                        onClick={() => !disabled && toggleShelf(shelf.value)}
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
                        <span className="truncate">{shelf.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-smb-on-surface-variant">
                  Phí = PriceShelf × số kệ MỚI được gán (kệ đã có không charge lại).
                </p>
                {!disabled && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="primary"
                      icon="save"
                      onClick={handleSaveShelves}
                      disabled={!isShelvesDirty || savingTab === 'shelf'}
                      loading={savingTab === 'shelf'}
                    >
                      Lưu chọn kệ ({shelfCount})
                    </Button>
                  </div>
                )}
              </>
        )}

        {/* Zone tab */}
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
      </div>

      {/* Summary footer */}
      {totalCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 rounded border border-smb-outline-variant bg-smb-surface-container p-3">
          <span className="text-xs font-medium text-smb-on-surface-variant">Đã chọn:</span>
          {pickedRouteIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs text-smb-primary-container">
              <span className="material-symbols-outlined text-[12px]">route</span>{pickedRouteIds.length} Tuyến
            </span>
          )}
          {shelfCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs text-smb-primary-container">
              <span className="material-symbols-outlined text-[12px]">inventory_2</span>{shelfCount} Kệ
            </span>
          )}
          {zoneCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs text-smb-primary-container">
              <span className="material-symbols-outlined text-[12px]">grid_view</span>{zoneCount} Khu Vực
            </span>
          )}
        </div>
      )}
    </div>
  )
})

export default TargetingSelector
