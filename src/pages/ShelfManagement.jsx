import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { toast } from 'react-toastify'
import Sidebar from '../components/Sidebar'
import { ConfirmModal } from '../components/ConfirmModal'
import { SlotManager } from '../features/robot/components/SlotManager'
import {
  getZones, createZone, updateZone, deleteZone,
  getFloors, createFloor,
} from '../features/robot/api/zonesApi'
import {
  getAisles, createAisle, updateAisle, deleteAisle,
} from '../features/robot/api/aislesApi'
import {
  getShelves, createShelf, updateShelf, deleteShelf,
} from '../features/robot/api/shelvesApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/* ========================================================================== */
/*  Sub-components                                                            */
/* ========================================================================== */

/** Inline form for creating/editing an entity (Zone, Aisle, Shelf) */
function InlineForm({ fields, initial, onSubmit, onCancel, submitLabel = 'Lưu' }) {
  const [values, setValues] = useState(initial || {})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setValues(initial || {}) }, [initial])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(values)
      if (!initial) setValues({})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-smb-outline-variant/60 bg-smb-surface-container-low/50 p-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant/80">
            {f.label} {f.required && <span className="text-red-500">*</span>}
          </label>
          {f.type === 'number' ? (
            <input
              type="number"
              min={f.min ?? 0}
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-smb-primary"
            />
          ) : (
            <input
              type="text"
              required={f.required}
              minLength={f.minLength}
              placeholder={f.placeholder}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-smb-primary"
            />
          )}
        </div>
      ))}
      <div className="flex gap-1.5 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-smb-primary px-3 py-1.5 text-xs font-semibold text-smb-on-primary transition-all hover:bg-smb-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? <Icon name="progress_activity" className="animate-spin text-sm" /> : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-smb-on-surface-variant hover:bg-smb-surface-container">
            Huỷ
          </button>
        )}
      </div>
    </form>
  )
}

/** Stat card used in the header */
function StatCard({ icon, label, value, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest px-4 py-3">
      <div className={`flex size-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon name={icon} className="text-[20px]" />
      </div>
      <div>
        <p className="text-lg font-bold text-smb-on-surface">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant/70">{label}</p>
      </div>
    </div>
  )
}

/* ========================================================================== */
/*  Main Page Component                                                       */
/* ========================================================================== */

export default function ShelfManagement() {
  // ─── Data State ──────────────────────────────────────────────────
  const [floors, setFloors] = useState([])
  const [activeFloorId, setActiveFloorId] = useState(null)
  const [zones, setZones] = useState([])
  const [aisles, setAisles] = useState([])
  const [shelves, setShelves] = useState([])

  // ─── Selection State ─────────────────────────────────────────────
  const [selectedZone, setSelectedZone] = useState(null)
  const [selectedAisle, setSelectedAisle] = useState(null)
  const [selectedShelf, setSelectedShelf] = useState(null)
  const [expandedAisles, setExpandedAisles] = useState({})

  // ─── UI State ────────────────────────────────────────────────────
  const [loadingZones, setLoadingZones] = useState(false)
  const [loadingAisles, setLoadingAisles] = useState(false)
  const [loadingShelves, setLoadingShelves] = useState(false)
  const [floorsLoaded, setFloorsLoaded] = useState(false)

  // ─── Forms ───────────────────────────────────────────────────────
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [editingZone, setEditingZone] = useState(null)
  const [showAisleForm, setShowAisleForm] = useState(false)
  const [editingAisle, setEditingAisle] = useState(null)
  const [showShelfForm, setShowShelfForm] = useState(false)
  const [editingShelf, setEditingShelf] = useState(null)

  // ─── Delete Confirmations ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null) // { type: 'zone'|'aisle'|'shelf', id, name }

  // ─── Stats ───────────────────────────────────────────────────────
  const totalAisles = aisles.length
  const totalShelves = shelves.length

  // ─── Data Fetching ───────────────────────────────────────────────
  const fetchFloors = useCallback(async () => {
    try {
      const data = await getFloors()
      setFloors(data)
      if (data.length > 0 && !activeFloorId) {
        // Find the original floor 1 (the one with zones) or fallback to the first
        const mainFloor = data.find(f => f.floorNumber === 1 && f.zoneCount > 0) || data[0]
        setActiveFloorId(mainFloor.floorId)
      }
    } finally {
      setFloorsLoaded(true)
    }
  }, [activeFloorId])

  const fetchZones = useCallback(async () => {
    if (!activeFloorId) return
    setLoadingZones(true)
    try {
      const data = await getZones({ floorId: activeFloorId })
      setZones(data)
    } finally {
      setLoadingZones(false)
    }
  }, [activeFloorId])

  const fetchAisles = useCallback(async () => {
    if (!selectedZone) { setAisles([]); setShelves([]); return }
    setLoadingAisles(true)
    try {
      const data = await getAisles({ zoneId: selectedZone.zoneId })
      setAisles(data)
    } finally {
      setLoadingAisles(false)
    }
  }, [selectedZone])

  const fetchShelves = useCallback(async (aisleId) => {
    if (!aisleId) { setShelves([]); return }
    setLoadingShelves(true)
    try {
      const data = await getShelves({ aisleId })
      setShelves(data)
    } finally {
      setLoadingShelves(false)
    }
  }, [])

  useEffect(() => { fetchFloors() }, [fetchFloors])
  useEffect(() => { fetchZones() }, [fetchZones])
  useEffect(() => { fetchAisles() }, [fetchAisles])
  useEffect(() => {
    if (selectedAisle) fetchShelves(selectedAisle.aisleId)
    else setShelves([])
  }, [selectedAisle, fetchShelves])

  // Auto-create floor 1 if none exists (one-shot guard)
  const floorCreatedRef = useRef(false)
  useEffect(() => {
    if (floorsLoaded && floors.length === 0 && activeFloorId === null && !floorCreatedRef.current) {
      floorCreatedRef.current = true
      createFloor({ floorNumber: 1 })
        .then(() => fetchFloors())
        .catch(() => { floorCreatedRef.current = false })
    }
  }, [floorsLoaded, floors, activeFloorId, fetchFloors])

  // ─── CRUD Handlers ───────────────────────────────────────────────
  const handleCreateZone = async (values) => {
    if (!values.zoneName?.trim() || values.zoneName.trim().length < 2) {
      toast.error('Tên khu vực phải có ít nhất 2 ký tự.'); return
    }
    await createZone({ floorId: activeFloorId, zoneName: values.zoneName.trim(), description: values.description?.trim() || '' })
    toast.success('Đã tạo khu vực mới!')
    setShowZoneForm(false)
    await fetchZones()
  }

  const handleUpdateZone = async (values) => {
    if (!values.zoneName?.trim() || values.zoneName.trim().length < 2) {
      toast.error('Tên khu vực phải có ít nhất 2 ký tự.'); return
    }
    await updateZone(editingZone.zoneId, { zoneName: values.zoneName.trim(), description: values.description?.trim() || '' })
    toast.success('Đã cập nhật khu vực!')
    setEditingZone(null)
    await fetchZones()
  }

  const handleCreateAisle = async (values) => {
    if (!values.aisleCode?.trim()) { toast.error('Mã dãy kệ không được để trống.'); return }
    await createAisle({ zoneId: selectedZone.zoneId, aisleCode: values.aisleCode.trim(), aisleName: values.aisleName?.trim() || '' })
    toast.success('Đã tạo dãy kệ mới!')
    setShowAisleForm(false)
    await fetchAisles()
  }

  const handleUpdateAisle = async (values) => {
    if (!values.aisleCode?.trim()) { toast.error('Mã dãy kệ không được để trống.'); return }
    await updateAisle(editingAisle.aisleId, { aisleCode: values.aisleCode.trim(), aisleName: values.aisleName?.trim() || '' })
    toast.success('Đã cập nhật dãy kệ!')
    setEditingAisle(null)
    await fetchAisles()
  }

  const handleCreateShelf = async (values) => {
    if (!values.shelfName?.trim()) { toast.error('Tên kệ không được để trống.'); return }
    await createShelf({
      aisleId: selectedAisle.aisleId,
      shelfLabel: values.shelfName.trim(),
      levelNumber: 1,
      slotCount: Number(values.slotCount) || 4,
    })
    toast.success('Đã tạo kệ hàng mới!')
    setShowShelfForm(false)
    await fetchShelves(selectedAisle.aisleId)
  }

  const handleUpdateShelf = async (values) => {
    if (!values.shelfName?.trim()) { toast.error('Tên kệ không được để trống.'); return }
    await updateShelf(editingShelf.shelfId, {
      shelfLabel: values.shelfName.trim(),
    })
    toast.success('Đã cập nhật kệ hàng!')
    setEditingShelf(null)
    await fetchShelves(selectedAisle.aisleId)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'zone') {
        await deleteZone(deleteTarget.id)
        if (selectedZone?.zoneId === deleteTarget.id) {
          setSelectedZone(null); setSelectedAisle(null); setSelectedShelf(null)
          setAisles([]); setShelves([])
        }
        await fetchZones()
      } else if (deleteTarget.type === 'aisle') {
        await deleteAisle(deleteTarget.id)
        if (selectedAisle?.aisleId === deleteTarget.id) {
          setSelectedAisle(null); setSelectedShelf(null); setShelves([])
        }
        await fetchAisles()
      } else if (deleteTarget.type === 'shelf') {
        await deleteShelf(deleteTarget.id)
        if (selectedShelf?.shelfId === deleteTarget.id) setSelectedShelf(null)
        await fetchShelves(selectedAisle?.aisleId)
      }
      toast.success(`Đã xóa ${deleteTarget.name}!`)
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Không thể xóa. Vui lòng thử lại.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const toggleAisle = (aisleId) => {
    setExpandedAisles((p) => ({ ...p, [aisleId]: !p[aisleId] }))
  }

  const selectAisleAndLoadShelves = (aisle) => {
    setSelectedAisle(aisle)
    setSelectedShelf(null)
    setExpandedAisles((p) => ({ ...p, [aisle.aisleId]: true }))
  }

  // ─── Delete confirmation messages ────────────────────────────────
  const deleteMessages = {
    zone: 'Xóa khu vực này? Tất cả dãy kệ, kệ hàng và ô chứa bên trong sẽ bị xóa theo.',
    aisle: 'Xóa dãy kệ này? Tất cả kệ hàng và ô chứa bên trong sẽ bị xóa theo.',
    shelf: 'Xóa kệ hàng này? Tất cả ô chứa và sản phẩm đã gán sẽ bị gỡ.',
  }


  return (
    <div className="flex min-h-screen bg-smb-surface">
      <Sidebar />
      <main className="ml-[260px] flex-1 overflow-auto">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="border-b border-smb-outline-variant/50 bg-smb-surface-container-lowest px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-smb-on-surface">Quản Lý Kệ Hàng</h1>
              <p className="mt-0.5 text-xs text-smb-on-surface-variant">
                Quản lý phân vùng, dãy kệ, tầng kệ và gán sản phẩm lên kệ siêu thị
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon="map" label="Khu vực (Zone)" value={zones.length} color="emerald" />
            <StatCard icon="view_column" label="Dãy kệ (Aisle)" value={totalAisles} color="blue" />
            <StatCard icon="shelves" label="Kệ hàng (Shelf)" value={totalShelves} color="amber" />
            <StatCard icon="grid_view" label="Đang chọn" value={selectedShelf ? selectedShelf.shelfName : '—'} color="purple" />
          </div>
        </div>

        {/* ─── 3-Column Layout ────────────────────────────────── */}
        <div className="flex gap-0 divide-x divide-smb-outline-variant/40" style={{ minHeight: 'calc(100vh - 180px)' }}>

          {/* ─── Column 1: Zones ──────────────────────────────── */}
          <div className="w-[280px] shrink-0 overflow-y-auto bg-smb-surface-container-lowest/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-smb-on-surface-variant">
                <Icon name="map" className="mr-1 align-middle text-sm" />Khu Vực
              </h2>
              <button
                type="button"
                onClick={() => { setShowZoneForm(true); setEditingZone(null) }}
                className="flex items-center gap-1 rounded-lg bg-smb-primary/10 px-2 py-1 text-[10px] font-semibold text-smb-primary transition-all hover:bg-smb-primary/20"
              >
                <Icon name="add" className="text-sm" /> Thêm
              </button>
            </div>

            {/* Zone Create Form */}
            {showZoneForm && !editingZone && (
              <div className="mb-3">
                <InlineForm
                  fields={[
                    { key: 'zoneName', label: 'Tên khu vực', required: true, minLength: 2, placeholder: 'VD: Khu Đồ Khô' },
                    { key: 'description', label: 'Mô tả', placeholder: 'Mô tả ngắn (tuỳ chọn)' },
                  ]}
                  onSubmit={handleCreateZone}
                  onCancel={() => setShowZoneForm(false)}
                  submitLabel="Tạo Zone"
                />
              </div>
            )}

            {/* Zone List */}
            {loadingZones ? (
              <div className="flex justify-center py-8">
                <Icon name="progress_activity" className="animate-spin text-2xl text-smb-on-surface-variant" />
              </div>
            ) : zones.length === 0 ? (
              <div className="rounded-lg border border-dashed border-smb-outline-variant py-8 text-center text-xs text-smb-on-surface-variant">
                Chưa có khu vực nào.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {zones.map((zone) => (
                  <li key={zone.zoneId}>
                    {editingZone?.zoneId === zone.zoneId ? (
                      <InlineForm
                        fields={[
                          { key: 'zoneName', label: 'Tên khu vực', required: true, minLength: 2 },
                          { key: 'description', label: 'Mô tả' },
                        ]}
                        initial={{ zoneName: zone.zoneName, description: zone.description }}
                        onSubmit={handleUpdateZone}
                        onCancel={() => setEditingZone(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedZone(zone)
                          setSelectedAisle(null); setSelectedShelf(null)
                          setShelves([])
                        }}
                        className={`group relative flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-all ${
                          selectedZone?.zoneId === zone.zoneId
                            ? 'bg-smb-primary/10 shadow-xs'
                            : 'hover:bg-smb-surface-container-low'
                        }`}
                      >
                        {selectedZone?.zoneId === zone.zoneId && (
                          <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-smb-primary" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-semibold ${
                            selectedZone?.zoneId === zone.zoneId ? 'text-smb-primary' : 'text-smb-on-surface'
                          }`}>
                            {zone.zoneName || `Zone #${zone.zoneId}`}
                          </p>
                          {zone.description && (
                            <p className="mt-0.5 truncate text-[10px] text-smb-on-surface-variant/70">{zone.description}</p>
                          )}
                        </div>
                        {/* Action buttons (visible on hover) */}
                        <div className="ml-2 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setEditingZone(zone); setShowZoneForm(false) }}
                            className="rounded p-1 text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-primary"
                          >
                            <Icon name="edit" className="text-[14px]" />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'zone', id: zone.zoneId, name: zone.zoneName }) }}
                            className="rounded p-1 text-smb-on-surface-variant hover:bg-smb-error-container hover:text-smb-on-error-container"
                          >
                            <Icon name="delete" className="text-[14px]" />
                          </span>
                        </div>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ─── Column 2: Aisles & Shelves ───────────────────── */}
          <div className="w-[320px] shrink-0 overflow-y-auto bg-smb-surface-container-lowest/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-smb-on-surface-variant">
                <Icon name="view_column" className="mr-1 align-middle text-sm" />
                {selectedZone ? selectedZone.zoneName : 'Dãy Kệ & Kệ Hàng'}
              </h2>
              {selectedZone && (
                <button
                  type="button"
                  onClick={() => { setShowAisleForm(true); setEditingAisle(null) }}
                  className="flex items-center gap-1 rounded-lg bg-smb-primary/10 px-2 py-1 text-[10px] font-semibold text-smb-primary transition-all hover:bg-smb-primary/20"
                >
                  <Icon name="add" className="text-sm" /> Thêm Dãy
                </button>
              )}
            </div>

            {!selectedZone ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Icon name="touch_app" className="mb-2 text-4xl text-smb-outline/50" />
                <p className="text-xs text-smb-on-surface-variant">Chọn một khu vực ở cột bên trái</p>
              </div>
            ) : (
              <>
                {/* Aisle Create Form */}
                {showAisleForm && !editingAisle && (
                  <div className="mb-3">
                    <InlineForm
                      fields={[
                        { key: 'aisleCode', label: 'Mã dãy kệ', required: true, placeholder: 'VD: A01' },
                        { key: 'aisleName', label: 'Tên dãy kệ', placeholder: 'VD: Dãy Mì Gói' },
                      ]}
                      onSubmit={handleCreateAisle}
                      onCancel={() => setShowAisleForm(false)}
                      submitLabel="Tạo Dãy Kệ"
                    />
                  </div>
                )}

                {loadingAisles ? (
                  <div className="flex justify-center py-8">
                    <Icon name="progress_activity" className="animate-spin text-2xl text-smb-on-surface-variant" />
                  </div>
                ) : aisles.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-smb-outline-variant py-8 text-center text-xs text-smb-on-surface-variant">
                    Khu vực này chưa có dãy kệ nào.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {aisles.map((aisle) => {
                      const isExpanded = expandedAisles[aisle.aisleId]
                      const isSelected = selectedAisle?.aisleId === aisle.aisleId

                      return (
                        <li key={aisle.aisleId} className="rounded-xl border border-smb-outline-variant/40 bg-smb-surface-container-lowest transition-all">
                          {editingAisle?.aisleId === aisle.aisleId ? (
                            <div className="p-3">
                              <InlineForm
                                fields={[
                                  { key: 'aisleCode', label: 'Mã dãy kệ', required: true },
                                  { key: 'aisleName', label: 'Tên dãy kệ' },
                                ]}
                                initial={{ aisleCode: aisle.aisleCode, aisleName: aisle.aisleName }}
                                onSubmit={handleUpdateAisle}
                                onCancel={() => setEditingAisle(null)}
                              />
                            </div>
                          ) : (
                            <>
                              {/* Aisle Header */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    toggleAisle(aisle.aisleId)
                                  } else {
                                    selectAisleAndLoadShelves(aisle)
                                  }
                                }}
                                className={`group flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                                  isSelected ? 'bg-smb-primary/5' : 'hover:bg-smb-surface-container-low/50'
                                }`}
                              >
                                <Icon
                                  name={isExpanded ? 'expand_more' : 'chevron_right'}
                                  className="text-[16px] text-smb-on-surface-variant"
                                />
                                <div className="min-w-0 flex-1">
                                  <span className={`text-xs font-bold ${isSelected ? 'text-smb-primary' : 'text-smb-on-surface'}`}>
                                    {aisle.aisleCode}
                                  </span>
                                  {aisle.aisleName && (
                                    <span className="ml-1.5 text-[10px] text-smb-on-surface-variant">{aisle.aisleName}</span>
                                  )}
                                </div>
                                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); setEditingAisle(aisle); setShowAisleForm(false) }}
                                    className="rounded p-0.5 hover:bg-smb-surface-container hover:text-smb-primary"
                                  >
                                    <Icon name="edit" className="text-[13px]" />
                                  </span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'aisle', id: aisle.aisleId, name: aisle.aisleCode }) }}
                                    className="rounded p-0.5 hover:bg-smb-error-container hover:text-smb-on-error-container"
                                  >
                                    <Icon name="delete" className="text-[13px]" />
                                  </span>
                                </div>
                              </button>

                              {/* Shelves inside Aisle */}
                              {isExpanded && isSelected && (
                                <div className="border-t border-smb-outline-variant/30 px-3 pb-3 pt-2">
                                  {/* Shelf Create Form */}
                                  {showShelfForm && !editingShelf && (
                                    <div className="mb-2">
                                      <InlineForm
                                        fields={[
                                          { key: 'shelfName', label: 'Tên kệ', required: true, placeholder: 'VD: Kệ 1' },
                                          { key: 'slotCount', label: 'Số ô chứa', type: 'number', min: 1, placeholder: '4' },
                                        ]}
                                        onSubmit={handleCreateShelf}
                                        onCancel={() => setShowShelfForm(false)}
                                        submitLabel="Tạo Kệ"
                                      />
                                    </div>
                                  )}

                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant/60">Kệ hàng</span>
                                    <button
                                      type="button"
                                      onClick={() => { setShowShelfForm(true); setEditingShelf(null) }}
                                      className="flex items-center gap-0.5 text-[10px] font-semibold text-smb-primary hover:underline"
                                    >
                                      <Icon name="add" className="text-[12px]" /> Thêm Kệ
                                    </button>
                                  </div>

                                  {loadingShelves ? (
                                    <div className="flex justify-center py-4">
                                      <Icon name="progress_activity" className="animate-spin text-lg text-smb-on-surface-variant" />
                                    </div>
                                  ) : shelves.length === 0 ? (
                                    <p className="py-3 text-center text-[10px] text-smb-on-surface-variant/60">Chưa có kệ nào.</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {shelves.map((shelf) => (
                                        <li key={shelf.shelfId}>
                                          {editingShelf?.shelfId === shelf.shelfId ? (
                                            <InlineForm
                                              fields={[
                                                { key: 'shelfName', label: 'Tên kệ', required: true }
                                              ]}
                                              initial={{ shelfName: shelf.shelfName }}
                                              onSubmit={handleUpdateShelf}
                                              onCancel={() => setEditingShelf(null)}
                                            />
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedShelf(shelf)}
                                              className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all ${
                                                selectedShelf?.shelfId === shelf.shelfId
                                                  ? 'bg-smb-primary/10 ring-1 ring-smb-primary/30'
                                                  : 'hover:bg-smb-surface-container-low'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Icon name="shelves" className={`text-[15px] ${selectedShelf?.shelfId === shelf.shelfId ? 'text-smb-primary' : 'text-smb-on-surface-variant'}`} />
                                                <span className={`text-xs font-semibold ${
                                                  selectedShelf?.shelfId === shelf.shelfId ? 'text-smb-primary' : 'text-smb-on-surface'
                                                }`}>
                                                  {shelf.shelfName || 'Không tên'}
                                                </span>
                                              </div>
                                              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                <span
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={(e) => { e.stopPropagation(); setEditingShelf(shelf); setShowShelfForm(false) }}
                                                  className="rounded p-0.5 hover:bg-smb-surface-container hover:text-smb-primary"
                                                >
                                                  <Icon name="edit" className="text-[13px]" />
                                                </span>
                                                <span
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'shelf', id: shelf.shelfId, name: shelf.shelfName }) }}
                                                  className="rounded p-0.5 hover:bg-smb-error-container hover:text-smb-on-error-container"
                                                >
                                                  <Icon name="delete" className="text-[13px]" />
                                                </span>
                                              </div>
                                            </button>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* ─── Column 3: Slots & Products ───────────────────── */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-smb-on-surface-variant">
                <Icon name="grid_view" className="mr-1 align-middle text-sm" />
                {selectedShelf ? `Ô chứa — ${selectedShelf.shelfName}` : 'Ô Chứa & Sản Phẩm'}
              </h2>
            </div>

            {!selectedShelf ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icon name="shelves" className="mb-3 text-5xl text-smb-outline/40" />
                <p className="text-sm font-medium text-smb-on-surface-variant/70">Chọn một kệ hàng để xem chi tiết</p>
                <p className="mt-1 text-[10px] text-smb-on-surface-variant/50">
                  Khu vực → Dãy kệ → Kệ hàng → Ô chứa & Sản phẩm
                </p>
              </div>
            ) : (
              <SlotManager shelfId={selectedShelf.shelfId} shelfName={selectedShelf.shelfName} />
            )}
          </div>
        </div>

        {/* ─── Delete Confirmation Modal ──────────────────────── */}
        {deleteTarget && (
          <ConfirmModal
            message={deleteMessages[deleteTarget.type]}
            confirmText="Xóa"
            confirmVariant="danger"
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </main>
    </div>
  )
}
