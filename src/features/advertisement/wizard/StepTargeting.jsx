import React, { useEffect, useMemo, useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { getPackages } from '../api/adPackageApi'
import {
  getRoutesByFloor,
  getZonesByFloor,
  getShelvesByFloor,
  normalizeRoute,
  normalizeShelf,
  normalizeZone,
} from '../api/targetingApi'

const TABS = [
  { key: 'route',  label: 'Tuyến Đường', icon: 'route',        multi: true  },
  { key: 'zone',   label: 'Khu Vực',     icon: 'grid_view',    multi: true  },
  { key: 'shelf',  label: 'Kệ Hàng',     icon: 'inventory_2',  multi: false },
]

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')

// ─── Hook fetch lookup theo floorId ───────────────────────────────────
function useTargetingLookups(floorId) {
  const [routes, setRoutes] = useState([])
  const [zones, setZones] = useState([])
  const [shelves, setShelves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.allSettled([
      getRoutesByFloor(floorId),
      getZonesByFloor(floorId),
      getShelvesByFloor(floorId),
    ]).then(([routesRes, zonesRes, shelvesRes]) => {
      if (cancelled) return
      const routeList  = routesRes.status  === 'fulfilled' ? routesRes.value.map(normalizeRoute)  : []
      const zoneList   = zonesRes.status   === 'fulfilled' ? zonesRes.value.map(normalizeZone)    : []
      const shelfList  = shelvesRes.status === 'fulfilled' ? shelvesRes.value.map(normalizeShelf)  : []
      setRoutes(routeList)
      setZones(zoneList)
      setShelves(shelfList)

      const errors = []
      if (routesRes.status  === 'rejected') errors.push(`tuyến đường: ${routesRes.reason?.message  ?? '—'}`)
      if (zonesRes.status   === 'rejected') errors.push(`khu vực: ${zonesRes.reason?.message   ?? '—'}`)
      if (shelvesRes.status === 'rejected') errors.push(`kệ hàng: ${shelvesRes.reason?.message ?? '—'}`)
      if (errors.length === 3) {
        setError('Không thể tải dữ liệu targeting. Vui lòng thử lại.')
      } else if (errors.length) {
        setError(`Một số nguồn lỗi: ${errors.join('; ')}`)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [floorId])

  return { routes, zones, shelves, loading, error }
}

// ─── Multi-select panel (Route + Zone) ────────────────────────────────
function MultiPanel({ title, icon, items, selectedIds, onToggle, searchPlaceholder, pricePerItem }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => (it.name || '').toLowerCase().includes(q))
  }, [items, query])

  const selectedItems = items.filter((it) => selectedIds.includes(it.id))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Available */}
      <div className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name={icon} className="text-[18px] text-smb-primary-container" />
          <h4 className="text-sm font-semibold text-smb-on-surface">{title}</h4>
          <span className="ml-auto text-xs text-smb-on-surface-variant">{filtered.length} mục</span>
        </div>
        <Input
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon="search"
        />
        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="py-4 text-center text-xs text-smb-on-surface-variant">Không có kết quả.</p>
          )}
          {filtered.map((item) => {
            const picked = selectedIds.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`
                  flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors
                  ${picked
                    ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                    : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'}
                `}
              >
                <span
                  className={`
                    flex size-4 min-w-4 items-center justify-center rounded border text-[10px] font-bold
                    ${picked
                      ? 'border-smb-on-primary-container bg-smb-on-primary-container text-smb-primary-container'
                      : 'border-smb-outline bg-smb-surface-container'}
                  `}
                >
                  {picked && '✓'}
                </span>
                <span className="flex-1 truncate">{item.name}</span>
                {item.zoneName && (
                  <span className="text-xs text-smb-on-surface-variant">· {item.zoneName}</span>
                )}
                {item.waypointCount !== undefined && (
                  <span className="text-xs text-smb-on-surface-variant">· {item.waypointCount} wp</span>
                )}
                {item.floorNumber !== undefined && (
                  <span className="text-xs text-smb-on-surface-variant">· T{item.floorNumber}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected + pricing */}
      <div className="flex flex-col rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="check_circle" className="text-[18px] text-smb-primary-container" />
          <h4 className="text-sm font-semibold text-smb-on-surface">Đã chọn ({selectedItems.length})</h4>
        </div>
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {selectedItems.length === 0 && (
            <p className="py-4 text-center text-xs text-smb-on-surface-variant">Chưa chọn mục nào.</p>
          )}
          {selectedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm"
            >
              <Icon name={icon} className="text-[16px] text-smb-primary-container" />
              <span className="flex-1 truncate text-smb-on-surface">{item.name}</span>
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                className="text-smb-on-surface-variant hover:text-smb-error"
                aria-label={`Bỏ chọn ${item.name}`}
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md bg-smb-primary-container/5 px-3 py-2 text-xs text-smb-on-surface-variant">
          Phí ước tính: <strong className="text-smb-on-surface">{selectedItems.length}</strong> ×{' '}
          <strong className="text-smb-on-surface">{formatVND(pricePerItem)} đ</strong> ={' '}
          <strong className="text-smb-primary-container">
            {formatVND(selectedItems.length * pricePerItem)} đ
          </strong>
        </div>
      </div>
    </div>
  )
}

// ─── Single-select panel (Shelf) ──────────────────────────────────────
function ShelfPanel({ shelves, selectedId, onSelect, priceShelf }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return shelves
    return shelves.filter((s) => (s.label || '').toLowerCase().includes(q))
  }, [shelves, query])

  const selected = shelves.find((s) => s.id === selectedId)

  return (
    <div className="space-y-4">
      <Input
        label="Chọn Kệ Hàng (chỉ 1)"
        placeholder="Tìm kiếm kệ hàng theo tên..."
        icon="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
          <h4 className="mb-2 text-sm font-semibold text-smb-on-surface">Danh sách kệ ({filtered.length})</h4>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-xs text-smb-on-surface-variant">Không có kệ nào.</p>
            )}
            {filtered.map((s) => {
              const picked = s.id === selectedId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(picked ? null : s.id)}
                  className={`
                    flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors
                    ${picked
                      ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-on-primary-container'
                      : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-outline'}
                  `}
                >
                  <Icon
                    name={picked ? 'radio_button_checked' : 'radio_button_unchecked'}
                    className="text-[18px] text-smb-primary-container"
                  />
                  <span className="flex-1 truncate">{s.label}</span>
                  {s.floorNumber !== undefined && (
                    <span className="text-xs text-smb-on-surface-variant">· T{s.floorNumber}</span>
                  )}
                  {s.x !== undefined && s.y !== undefined && (
                    <span className="text-xs text-smb-on-surface-variant">· ({s.x},{s.y})</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
          <h4 className="mb-2 text-sm font-semibold text-smb-on-surface">Đã chọn</h4>
          {selected ? (
            <div className="rounded-lg border border-smb-primary-container/40 bg-smb-primary-container/5 p-4">
              <div className="flex items-center gap-2">
                <Icon name="inventory_2" className="text-[22px] text-smb-primary-container" />
                <span className="font-semibold text-smb-on-surface">{selected.label}</span>
              </div>
              <p className="mt-2 text-xs text-smb-on-surface-variant">
                Tầng {selected.floorNumber ?? '—'} · Vị trí ({selected.x ?? '—'}, {selected.y ?? '—'})
              </p>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-smb-error hover:underline"
              >
                <Icon name="close" className="text-[14px]" /> Bỏ chọn
              </button>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center py-4 text-center text-xs text-smb-on-surface-variant">
              Chưa chọn kệ nào.
            </p>
          )}
          <div className="mt-3 rounded-md bg-smb-primary-container/5 px-3 py-2 text-xs text-smb-on-surface-variant">
            {selected
              ? <>Phí ước tính: 1 × <strong>{formatVND(priceShelf)} đ</strong> ={' '}
                  <strong className="text-smb-primary-container">{formatVND(priceShelf)} đ</strong></>
              : 'Không tính phí shelf vì chưa chọn.'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Step 2 ──────────────────────────────────────────────────────
export function StepTargeting({ state, floorId, onChange, hasAnyTargeting, onBack, onNext }) {
  const [activeTab, setActiveTab] = useState('route')
  const [packages, setPackages] = useState([])
  const { routes, zones, shelves, loading, error } = useTargetingLookups(floorId)

  // Lấy giá từ package đã chọn
  useEffect(() => {
    if (!state.basics.packageId) {
      setPackages([])
      return
    }
    getPackages().then((data) => {
      const list = Array.isArray(data) ? data : data?.items ?? []
      setPackages(list)
    }).catch(() => setPackages([]))
  }, [state.basics.packageId])

  const selectedPkg = useMemo(
    () => packages.find((p) => p.packageId === state.basics.packageId),
    [packages, state.basics.packageId]
  )
  const priceRoute = selectedPkg?.priceRoute ?? 0
  const priceZone  = selectedPkg?.priceZone  ?? 0
  const priceShelf = selectedPkg?.priceShelf ?? 0

  // Toggle handlers
  const toggleRoute = (id) => {
    const next = state.targeting.routeIds.includes(id)
      ? state.targeting.routeIds.filter((x) => x !== id)
      : [...state.targeting.routeIds, id]
    onChange({ routeIds: next })
  }
  const toggleZone = (id) => {
    const next = state.targeting.zoneIds.includes(id)
      ? state.targeting.zoneIds.filter((x) => x !== id)
      : [...state.targeting.zoneIds, id]
    onChange({ zoneIds: next })
  }
  // Shelf là SINGLE → chọn cái mới auto replace
  const selectShelf = (id) => {
    onChange({ semanticObjectId: id === state.targeting.semanticObjectId ? null : id })
  }

  const counts = {
    route: state.targeting.routeIds.length,
    zone:  state.targeting.zoneIds.length,
    shelf: state.targeting.semanticObjectId !== null ? 1 : 0,
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-smb-on-surface">Bước 2 · Targeting</h2>
        <p className="mt-1 text-sm text-smb-on-surface-variant">
          Chọn ít nhất <strong>1</strong> loại: tuyến đường, khu vực hoặc kệ hàng. Phí ước tính dựa trên gói đã chọn.
        </p>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <Icon name="error" className="mt-0.5 text-[16px]" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
                  : 'text-smb-on-surface-variant hover:bg-smb-surface-container'}
              `}
            >
              <Icon name={tab.icon} className="text-[18px]" />
              {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  className={`
                    inline-flex size-5 min-w-5 items-center justify-center rounded-full text-[11px] font-bold
                    ${isActive
                      ? 'bg-smb-on-primary-container text-smb-primary-container'
                      : 'bg-smb-primary-container text-smb-on-primary-container'}
                  `}
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl border border-smb-outline-variant bg-smb-surface-container-low" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'route' && (
            <MultiPanel
              title="Chọn tuyến đường"
              icon="route"
              items={routes}
              selectedIds={state.targeting.routeIds}
              onToggle={toggleRoute}
              searchPlaceholder="Tìm tuyến theo tên..."
              pricePerItem={priceRoute}
            />
          )}
          {activeTab === 'zone' && (
            <MultiPanel
              title="Chọn khu vực"
              icon="grid_view"
              items={zones}
              selectedIds={state.targeting.zoneIds}
              onToggle={toggleZone}
              searchPlaceholder="Tìm khu vực theo tên..."
              pricePerItem={priceZone}
            />
          )}
          {activeTab === 'shelf' && (
            <ShelfPanel
              shelves={shelves}
              selectedId={state.targeting.semanticObjectId}
              onSelect={selectShelf}
              priceShelf={priceShelf}
            />
          )}
        </>
      )}

      {!hasAnyTargeting && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Icon name="warning" className="mt-0.5 text-[16px]" />
          <span>
            Vui lòng chọn ít nhất <strong>1 loại targeting</strong> (Route / Zone / Shelf) trước khi tiếp tục.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="secondary" icon="arrow_back" onClick={onBack}>
          ← Quay Lại
        </Button>
        <Button
          variant="primary"
          icon="arrow_forward"
          onClick={onNext}
          disabled={!hasAnyTargeting}
        >
          Tiếp Tục →
        </Button>
      </div>
    </section>
  )
}

export default StepTargeting
