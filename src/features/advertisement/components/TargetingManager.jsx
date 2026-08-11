import React, { useEffect, useMemo, useState } from 'react'
import {
  getCampaignRoutes,
  getCampaignZones,
  getCampaignShelf,
  assignCampaignRoutes,
  assignCampaignZones,
  assignCampaignShelf,
  getTargetingContext,
} from '../api/adCampaignApi'
import { getZonesByFloor } from '../api/targetingApi'
import { getErrorMessage } from '../../../api/client'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')

/**
 * TargetingManager — Tab "Targeting" trong detail/update page.
 *
 * Hiển thị 3 card (Routes/Zones/Shelf) với danh sách đã gán + nút Mua thêm.
 * Mỗi card có modal chọn multi (route/zone) hoặc single (shelf).
 *
 * Chỉ enable editing khi status IN ['Inactive', 'Paused'].
 */
export function TargetingManager({ campaignId, status, priceRoute, priceZone, priceShelf, onChanged }) {
  const canEdit = ['Inactive', 'Paused'].includes(status)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Server state
  const [routes, setRoutes] = useState([])
  const [zones, setZones] = useState([])
  const [shelf, setShelf] = useState(null)
  // floorId for /targeting-context picker
  const floorId = 1

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, z, s] = await Promise.all([
        getCampaignRoutes(campaignId),
        getCampaignZones(campaignId),
        getCampaignShelf(campaignId),
      ])
      setRoutes(r?.routes ?? [])
      setZones(z?.zones ?? [])
      setShelf(s?.shelves?.[0] ?? null)
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải targeting.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [campaignId])

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!canEdit && (
        <div className="flex items-start gap-2 rounded-lg border border-smb-primary-container/30 bg-smb-primary-container/5 p-3 text-xs text-smb-primary-container">
          <Icon name="info" className="mt-0.5 text-[16px]" />
          Campaign đang <strong>{status}</strong>. Targeting đã khoá — chỉ xem.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <RoutesCard
          routes={routes}
          loading={loading}
          pricePerItem={priceRoute}
          canEdit={canEdit}
          campaignId={campaignId}
          floorId={floorId}
          assignedIds={routes.map((r) => r.robotRouteId)}
          onSaved={fetchAll}
        />
        <ZonesCard
          zones={zones}
          loading={loading}
          pricePerItem={priceZone}
          canEdit={canEdit}
          campaignId={campaignId}
          assignedIds={zones.map((z) => z.zoneId)}
          onSaved={fetchAll}
        />
        <ShelfCard
          shelf={shelf}
          loading={loading}
          pricePerItem={priceShelf}
          canEdit={canEdit}
          campaignId={campaignId}
          onSaved={fetchAll}
        />
      </div>
    </div>
  )
}

// ─── Reusable card shell ─────────────────────────────────────────────────
function Card({ icon, title, count, children, footer, actionLabel, onAction, canEdit, color = 'green' }) {
  const colorMap = {
    green: 'bg-green-100 text-green-700',
    blue:  'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  return (
    <div className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex size-8 items-center justify-center rounded-lg ${colorMap[color]}`}>
            <Icon name={icon} className="text-[18px]" />
          </span>
          <h3 className="font-semibold text-smb-on-surface">{title}</h3>
          {count > 0 && (
            <span className="rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs font-bold text-smb-primary-container">
              {count}
            </span>
          )}
        </div>
        {canEdit && onAction && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-md bg-smb-primary-container/10 px-2 py-1 text-xs font-medium text-smb-primary-container hover:bg-smb-primary-container/20"
          >
            <Icon name="add" className="text-[14px]" />
            {actionLabel}
          </button>
        )}
      </header>
      {children}
      {footer && (
        <footer className="mt-3 rounded-md bg-smb-primary-container/5 px-3 py-2 text-xs text-smb-on-surface-variant">
          {footer}
        </footer>
      )}
    </div>
  )
}

// ─── Routes card ──────────────────────────────────────────────────────────
function RoutesCard({ routes, loading, pricePerItem, canEdit, campaignId, floorId, assignedIds, onSaved }) {
  const [open, setOpen] = useState(false)
  return (
    <Card
      icon="route"
      title="Tuyến Đường"
      count={routes.length}
      color="blue"
      actionLabel="Mua thêm"
      canEdit={canEdit}
      onAction={() => setOpen(true)}
      footer={<>Phí mỗi route: <strong className="text-smb-on-surface">{formatVND(pricePerItem)} đ</strong></>}
    >
      {loading ? <Skeleton /> : routes.length === 0 ? <Empty /> : (
        <ul className="space-y-1.5">
          {routes.map((r) => (
            <li key={r.robotRouteId} className="flex items-center gap-2 rounded-md border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm">
              <Icon name="route" className="text-[16px] text-smb-primary-container" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-smb-on-surface">{r.routeName ?? `Tuyến #${r.robotRouteId}`}</p>
                {r.zoneName && <p className="text-xs text-smb-on-surface-variant">Zone: {r.zoneName}</p>}
              </div>
              <span className="text-xs tabular-nums text-smb-on-surface-variant">
                {formatVND(r.routePriceCharged ?? pricePerItem)} đ
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <MultiSelectModal
          title="Chọn tuyến đường"
          icon="route"
          fetchItems={() => getTargetingContext(campaignId, floorId).then((d) => d?.routes ?? [])}
          normalize={(raw) => ({
            id: raw.robotRouteId ?? raw.routeId ?? raw.id,
            label: raw.routeName ?? raw.name ?? `Tuyến #${raw.robotRouteId ?? raw.id}`,
            subLabel: raw.zoneName ?? '',
          })}
          assignedIds={assignedIds}
          pricePerItem={pricePerItem}
          onSubmit={async (ids) => {
            try {
              await assignCampaignRoutes(campaignId, ids)
              onSaved?.()
              setOpen(false)
            } catch (e) {
              // Re-throw để MultiSelectModal hiển thị lỗi và KHÔNG đóng modal
              throw e
            }
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  )
}

// ─── Zones card ───────────────────────────────────────────────────────────
function ZonesCard({ zones, loading, pricePerItem, canEdit, assignedIds, onSaved, campaignId }) {
  const [open, setOpen] = useState(false)
  return (
    <Card
      icon="grid_view"
      title="Khu Vực"
      count={zones.length}
      color="green"
      actionLabel="Mua thêm"
      canEdit={canEdit}
      onAction={() => setOpen(true)}
      footer={<>Phí mỗi zone: <strong className="text-smb-on-surface">{formatVND(pricePerItem)} đ</strong></>}
    >
      {loading ? <Skeleton /> : zones.length === 0 ? <Empty /> : (
        <ul className="space-y-1.5">
          {zones.map((z) => (
            <li key={z.zoneId} className="flex items-center gap-2 rounded-md border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm">
              <Icon name="grid_view" className="text-[16px] text-smb-primary-container" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-smb-on-surface">{z.zoneName ?? `Zone #${z.zoneId}`}</p>
                {z.floorName && <p className="text-xs text-smb-on-surface-variant">Tầng {z.floorName}</p>}
              </div>
              <span className="text-xs tabular-nums text-smb-on-surface-variant">
                {formatVND(z.zonePriceCharged ?? pricePerItem)} đ
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <MultiSelectModal
          title="Chọn khu vực"
          icon="grid_view"
          fetchItems={() => getZonesByFloor(1)}
          normalize={(raw) => ({
            id: raw.zoneId ?? raw.id,
            label: raw.zoneName ?? raw.name ?? `Khu vực #${raw.zoneId ?? raw.id}`,
            subLabel: raw.floorName ?? raw.floorNumber ? `Tầng ${raw.floorName ?? raw.floorNumber}` : '',
          })}
          assignedIds={assignedIds}
          pricePerItem={pricePerItem}
          onSubmit={async (ids) => {
            try {
              await assignCampaignZones(campaignId, ids)
              onSaved?.()
              setOpen(false)
            } catch (e) {
              // Re-throw để MultiSelectModal hiển thị lỗi (không đóng modal khi fail)
              throw e
            }
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  )
}

// ─── Shelf card (single) ──────────────────────────────────────────────────
function ShelfCard({ shelf, loading, pricePerItem, canEdit, campaignId, onSaved }) {
  const [open, setOpen] = useState(false)
  return (
    <Card
      icon="inventory_2"
      title="Kệ Hàng"
      count={shelf ? 1 : 0}
      color="amber"
      actionLabel="Chọn kệ"
      canEdit={canEdit}
      onAction={() => setOpen(true)}
      footer={<>Phí: <strong className="text-smb-on-surface">{formatVND(pricePerItem)} đ</strong></>}
    >
      {loading ? <Skeleton /> : !shelf ? <Empty label="Chưa chọn kệ" /> : (
        <div className="rounded-md border border-smb-primary-container/40 bg-smb-primary-container/5 p-3">
          <div className="flex items-center gap-2">
            <Icon name="inventory_2" className="text-[20px] text-smb-primary-container" />
            <span className="font-semibold text-smb-on-surface">{shelf.label ?? `Kệ #${shelf.semanticObjectId}`}</span>
          </div>
          {shelf.floorName && (
            <p className="mt-1 text-xs text-smb-on-surface-variant">Tầng {shelf.floorName}</p>
          )}
          <p className="mt-1 text-xs tabular-nums text-smb-on-surface-variant">
            Phí: {formatVND(shelf.shelfPriceCharged ?? pricePerItem)} đ
          </p>
        </div>
      )}
      {open && (
        <ShelfSelectModal
          campaignId={campaignId}
          currentId={shelf?.semanticObjectId ?? null}
          onSubmit={async (id) => {
            try {
              await assignCampaignShelf(campaignId, id)
              onSaved?.()
              setOpen(false)
            } catch (e) {
              throw e
            }
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  )
}

function Skeleton() {
  return (
    <div className="space-y-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-smb-surface-container" />
      ))}
    </div>
  )
}

function Empty({ label = 'Chưa có' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-smb-outline-variant bg-smb-surface-container-low py-6 text-xs text-smb-on-surface-variant">
      <Icon name="inbox" className="mb-1 text-[20px]" />
      {label}
    </div>
  )
}

// ─── Multi-select modal ───────────────────────────────────────────────────
function MultiSelectModal({
  title, icon, fetchItems, normalize, assignedIds, pricePerItem, onSubmit, onClose,
}) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.resolve(fetchItems())
      .then((rawList) => {
        if (cancelled) return
        const list = Array.isArray(rawList) ? rawList.map(normalize) : []
        setItems(list)
        // Pre-select chỉ những items hiện đang assigned
        setSelected(list.filter((it) => assignedIds.includes(it.id)).map((it) => it.id))
      })
      .catch((e) => { if (!cancelled) setErr(getErrorMessage(e, 'Không tải được danh sách.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (id) => {
    setSelected((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  const handleSubmit = async () => {
    setSubmitting(true); setErr(null)
    try {
      await onSubmit(selected)
      // Đóng modal khi parent KHÔNG throw (parent tự setOpen(false) trong success path)
    } catch (e) {
      setErr(getErrorMessage(e, 'Lưu thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  const total = selected.length * pricePerItem
  const added = selected.filter((id) => !assignedIds.includes(id)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl">
        <header className="flex items-center justify-between border-b border-smb-outline-variant px-6 py-4">
          <h2 className="font-semibold text-smb-on-surface">
            <Icon name={icon} className="mr-1 text-[18px] text-smb-primary-container" />
            {title}
          </h2>
          <button onClick={onClose} className="text-smb-on-surface-variant hover:text-smb-on-surface">
            <Icon name="close" className="text-[20px]" />
          </button>
        </header>

        <div className="flex-1 space-y-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-smb-on-surface-variant">
              <Icon name="progress_activity" className="mr-2 animate-spin text-[16px]" /> Đang tải...
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-smb-on-surface-variant">Không có mục nào.</p>
          ) : items.map((it) => {
            const picked = selected.includes(it.id)
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggle(it.id)}
                className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  picked ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                         : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'
                }`}
              >
                <span className={`flex size-4 min-w-4 items-center justify-center rounded border text-[10px] font-bold ${
                  picked ? 'border-smb-on-primary-container bg-smb-on-primary-container text-smb-primary-container'
                         : 'border-smb-outline bg-smb-surface-container'
                }`}>{picked && '✓'}</span>
                <span className="flex-1 truncate">{it.label}</span>
                {it.subLabel && <span className="text-xs text-smb-on-surface-variant">· {it.subLabel}</span>}
              </button>
            )
          })}
        </div>

        <footer className="space-y-2 border-t border-smb-outline-variant bg-smb-surface-container px-6 py-3">
          {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div>}
          <div className="flex items-center justify-between text-xs">
            <span className="text-smb-on-surface-variant">
              Đã chọn: <strong>{selected.length}</strong> · Mới thêm: <strong>{added}</strong>
            </span>
            <span className="tabular-nums font-semibold text-smb-primary-container">
              +{formatVND(total)} đ
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border border-smb-outline-variant px-3 py-1.5 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container-lowest">
              Huỷ
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="inline-flex items-center gap-1 rounded-lg bg-smb-primary-container px-3 py-1.5 text-sm font-medium text-smb-on-primary-container shadow-sm hover:opacity-90 disabled:opacity-50">
              {submitting && <Icon name="progress_activity" className="animate-spin text-[14px]" />}
              {submitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

// ─── Shelf single-select modal ────────────────────────────────────────────
function ShelfSelectModal({ campaignId, currentId, onSubmit, onClose }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [picked, setPicked] = useState(currentId)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTargetingContext(campaignId, 1)
      .then((data) => {
        if (cancelled) return
        setItems(data?.shelves ?? [])
      })
      .catch((e) => { if (!cancelled) setErr(getErrorMessage(e, 'Không tải được danh sách kệ.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [campaignId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => (it.label || it.objectName || '').toLowerCase().includes(q))
  }, [items, query])

  const handleSubmit = async () => {
    if (!picked) {
      setErr('Vui lòng chọn 1 kệ.')
      return
    }
    setSubmitting(true); setErr(null)
    try {
      await onSubmit(picked)
    } catch (e) {
      setErr(getErrorMessage(e, 'Lưu thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl">
        <header className="flex items-center justify-between border-b border-smb-outline-variant px-6 py-4">
          <h2 className="font-semibold text-smb-on-surface">
            <Icon name="inventory_2" className="mr-1 text-[18px] text-smb-primary-container" />
            Chọn kệ hàng (single)
          </h2>
          <button onClick={onClose} className="text-smb-on-surface-variant hover:text-smb-on-surface">
            <Icon name="close" className="text-[20px]" />
          </button>
        </header>

        <div className="space-y-3 px-6 py-4">
          <input
            type="text"
            placeholder="Tìm kiếm kệ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm focus:border-smb-primary-container focus:outline-none"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-smb-on-surface-variant">
                <Icon name="progress_activity" className="mr-2 animate-spin text-[16px]" /> Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-smb-on-surface-variant">Không có kệ nào.</p>
            ) : filtered.map((it) => {
              const isPicked = picked === (it.objectId ?? it.semanticObjectId)
              const id = it.objectId ?? it.semanticObjectId
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPicked(isPicked ? null : id)}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    isPicked ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                             : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'
                  }`}
                >
                  <Icon name={isPicked ? 'radio_button_checked' : 'radio_button_unchecked'}
                        className="text-[18px] text-smb-primary-container" />
                  <span className="flex-1 truncate">{it.label ?? it.objectName ?? `Kệ #${id}`}</span>
                  {it.floorName && <span className="text-xs text-smb-on-surface-variant">· Tầng {it.floorName}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <footer className="space-y-2 border-t border-smb-outline-variant bg-smb-surface-container px-6 py-3">
          {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border border-smb-outline-variant px-3 py-1.5 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container-lowest">
              Huỷ
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting || !picked}
              className="inline-flex items-center gap-1 rounded-lg bg-smb-primary-container px-3 py-1.5 text-sm font-medium text-smb-on-primary-container shadow-sm hover:opacity-90 disabled:opacity-50">
              {submitting && <Icon name="progress_activity" className="animate-spin text-[14px]" />}
              {submitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default TargetingManager