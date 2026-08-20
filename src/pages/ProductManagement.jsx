import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { DataTable } from '../components/DataTable'
import { FormModal, FormField } from '../components/FormModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { TableActions } from '../components/TableActions'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  importAdminProducts,
  formatVND,
  statusLabel,
} from '../features/product'
import { getProducts as fetchPublicProducts, getProductTypes, getProductDetail, getHealthTags } from '../features/product/api/productApi'
import { buildImageUrl } from '../utils/cloudinary'

const STATUS_OPTIONS = [
  { value: 'Available', label: 'Còn hàng' },
  { value: 'OutOfStock', label: 'Hết hàng' },
  { value: 'Discontinued', label: 'Ngừng bán' },
  { value: 'Inactive', label: 'Tạm dừng' },
]

const EMPTY_FORM = {
  productTypeId: '',
  productName: '',
  unitPrice: '',
  promotionPrice: '',
  imageUrl: '',
  description: '',
  status: 'Available',
  substituteProductId: '',
  healthTagIds: [],
}

// ── Status Badge ────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Available: { label: 'Còn hàng', icon: 'check_circle', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    Active:    { label: 'Hoạt động', icon: 'check_circle', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    OutOfStock:{ label: 'Hết hàng',  icon: 'inventory_2', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    Discontinued:{label:'Ngừng bán', icon: 'block',        cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
    Inactive:  { label: 'Tạm dừng',  icon: 'pause_circle', cls: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20' },
  }
  const cfg = map[status] || map.Inactive
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

// ── Stats Card ──────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, loading }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border bg-smb-surface-container-lowest px-5 py-4 shadow-sm smb-lift transition-all ${accent}`}>
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent.replace('border-', 'bg-').replace('/60', '/10').replace('border-smb-outline-variant', 'bg-smb-surface-container')}`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-smb-on-surface-variant">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-6 w-16 rounded-lg smb-skeleton" />
        ) : (
          <p className="text-2xl font-bold tabular-nums text-smb-on-surface" style={{ fontFamily: 'var(--font-mono, monospace)' }}>{value}</p>
        )}
      </div>
    </div>
  )
}

// ── Robot Empty State ───────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center smb-fade-in">
      {/* Robot SVG illustration */}
      <div className="smb-float">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="22" width="36" height="30" rx="8" fill="currentColor" className="text-smb-surface-container" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3"/>
          <rect x="24" y="28" width="10" height="7" rx="3" fill="currentColor" className="text-smb-primary-container" opacity="0.6"/>
          <rect x="38" y="28" width="10" height="7" rx="3" fill="currentColor" className="text-smb-primary-container" opacity="0.6"/>
          <rect x="28" y="40" width="16" height="4" rx="2" fill="currentColor" className="text-smb-outline-variant"/>
          <rect x="31" y="14" width="10" height="10" rx="3" fill="currentColor" className="text-smb-surface-container-high"/>
          <line x1="36" y1="14" x2="36" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-smb-outline-variant"/>
          <circle cx="36" cy="8" r="3" fill="currentColor" className="text-smb-primary-container"/>
          <rect x="8" y="30" width="8" height="16" rx="4" fill="currentColor" className="text-smb-surface-container-high"/>
          <rect x="56" y="30" width="8" height="16" rx="4" fill="currentColor" className="text-smb-surface-container-high"/>
          <rect x="25" y="52" width="8" height="12" rx="4" fill="currentColor" className="text-smb-surface-container-high"/>
          <rect x="39" y="52" width="8" height="12" rx="4" fill="currentColor" className="text-smb-surface-container-high"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-smb-on-surface">{message}</p>
        <p className="mt-1 text-xs text-smb-on-surface-variant">Robot đang chờ dữ liệu từ hệ thống...</p>
      </div>
    </div>
  )
}

export function ProductManagement() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')

  // Create/Edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [substituteOptions, setSubstituteOptions] = useState([])
  const [substituteLoading, setSubstituteLoading] = useState(false)

  const [productTypes, setProductTypes] = useState([])
  const [productTypesLoading, setProductTypesLoading] = useState(false)

  const [healthTags, setHealthTags] = useState([])
  const [healthTagsLoading, setHealthTagsLoading] = useState(false)

  // Delete confirm state
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Import Excel state
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      await importAdminProducts(file)
      toast.success('Import sản phẩm thành công!')
      fetchProducts()
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Import sản phẩm thất bại.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getAdminProducts()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải danh sách sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProductTypes = useCallback(async () => {
    setProductTypesLoading(true)
    try {
      const list = await getProductTypes()
      setProductTypes(Array.isArray(list) ? list : [])
    } catch {
      setProductTypes([])
    } finally {
      setProductTypesLoading(false)
    }
  }, [])

  const loadHealthTags = useCallback(async () => {
    setHealthTagsLoading(true)
    try {
      const list = await getHealthTags()
      setHealthTags(Array.isArray(list) ? list : [])
    } catch {
      setHealthTags([])
    } finally {
      setHealthTagsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    loadProductTypes()
    loadHealthTags()
  }, [fetchProducts, loadProductTypes, loadHealthTags])

  const filtered = products.filter((p) => {
    const matchSearch =
      !search || p.productName.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === 'all' || p.status.toLowerCase() === statusFilter
    const matchType =
      !typeFilter || p.productTypeId === Number(typeFilter)
    return matchSearch && matchStatus && matchType
  })

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === 'Active' || p.status === 'Available').length,
    outofstock: products.filter((p) => p.status === 'OutOfStock').length,
    inactive: products.filter((p) => p.status === 'Inactive').length,
    discontinued: products.filter((p) => p.status === 'Discontinued').length,
  }

  const openCreate = async () => {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setFormError(null)
    setModalOpen(true)
    await Promise.all([loadSubstituteOptions(null), loadProductTypes(), loadHealthTags()])
  }

  const openEdit = async (product) => {
    setEditingProduct(product)
    setForm({
      productTypeId: product.productTypeId ?? '',
      productName: product.productName ?? '',
      unitPrice: product.unitPrice ?? '',
      promotionPrice: product.promotionPrice ?? '',
      imageUrl: product.imageUrl ?? '',
      description: product.description ?? '',
      status: product.status ?? 'Available',
      substituteProductId: product.substituteProductId ?? '',
      healthTagIds: [],
    })
    setImageFile(null)
    setFormError(null)
    setModalOpen(true)
    await Promise.all([loadSubstituteOptions(product.productId), loadProductTypes(), loadHealthTags()])

    try {
      const detail = await getProductDetail(product.productId)
      const ids = Array.isArray(detail?.healthTags)
        ? detail.healthTags.map((t) => t.healthTagId)
        : []
      setForm((prev) => ({ ...prev, healthTagIds: ids }))
    } catch {
      // Detail is optional — fall back to no tags rather than blocking edit.
    }
  }

  const loadSubstituteOptions = async (excludeProductId) => {
    setSubstituteLoading(true)
    try {
      const data = await fetchPublicProducts()
      const list = Array.isArray(data) ? data : []
      const options = list
        .filter((p) => p.productId !== excludeProductId)
        .map((p) => ({
          value: String(p.productId),
          label: p.productName,
        }))
      setSubstituteOptions(options)
    } catch {
      setSubstituteOptions([])
    } finally {
      setSubstituteLoading(false)
    }
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setFormError(null)
  }

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0] || null
    if (file) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!allowed.includes(file.type)) {
        setFormError('Chỉ chấp nhận file ảnh JPG, PNG, WebP, GIF.')
        e.target.value = ''
        return
      }
      const maxMB = 10
      if (file.size > maxMB * 1024 * 1024) {
        setFormError(`File quá lớn: ${(file.size / 1024 / 1024).toFixed(1)} MB. Tối đa ${maxMB} MB.`)
        e.target.value = ''
        return
      }
    }
    setFormError(null)
    setImageFile(file)
  }

  const handleSubmit = async () => {
    setFormError(null)

    if (!form.productName.trim()) {
      setFormError('Tên sản phẩm không được để trống.')
      return
    }
    const typeId = Number(form.productTypeId)
    if (!Number.isInteger(typeId) || typeId <= 0) {
      setFormError('ProductTypeId phải là số nguyên dương.')
      return
    }
    const unitPrice = Number(form.unitPrice)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setFormError('Giá bán phải là số không âm.')
      return
    }

    const payload = {
      productTypeId: typeId,
      productName: form.productName.trim(),
      unitPrice,
      promotionPrice: form.promotionPrice === '' ? null : Number(form.promotionPrice),
      imageUrl: form.imageUrl.trim() || null,
      description: form.description.trim() || null,
      status: form.status || 'Available',
      substituteProductId:
        form.substituteProductId === '' ? null : Number(form.substituteProductId),
      healthTagIds: Array.isArray(form.healthTagIds) ? form.healthTagIds : [],
    }

    setSubmitting(true)
    try {
      if (editingProduct) {
        await updateAdminProduct(editingProduct.productId, payload, imageFile)
        toast.success('Cập nhật sản phẩm thành công!')
      } else {
        await createAdminProduct(payload, imageFile)
        toast.success('Thêm sản phẩm thành công!')
      }
      await fetchProducts()
      closeModal()
    } catch (err) {
      // Cloudinary upload errors (from our fetch-based utility) are plain Error objects,
      // not Axios errors. The BE errors are still Axios-wrapped. Check both.
      const cloudinaryMsg = err?.message || ''
      const beMsg = err?.response?.data?.error || err?.response?.data?.message || ''
      const errorMsg = cloudinaryMsg || beMsg || err.message || 'Lưu sản phẩm thất bại.'
      setFormError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProduct) return
    setDeleting(true)
    try {
      await deleteAdminProduct(deletingProduct.productId)
      toast.success('Đã chuyển sản phẩm sang trạng thái Tạm Dừng.')
      await fetchProducts()
      setDeletingProduct(null)
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message || 'Xóa sản phẩm thất bại.'
      setFetchError(errorMsg)
      toast.error(errorMsg)
      setDeletingProduct(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(() => [
    {
      key: 'imageUrl',
      label: '',
      width: '56px',
      render: (val) => {
        const src = val ? buildImageUrl(val, { width: 96, height: 96, crop: 'fill', quality: 'auto', format: 'auto' }) : ''
        return src ? (
          <img
            src={src}
            alt="product"
            className="h-10 w-10 rounded-xl object-cover border border-smb-outline-variant/50 transition-transform duration-200 hover:scale-110"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/placeholder-needs-reupload.png'
            }}
          />
        ) : (
          <div className="h-10 w-10 rounded-xl bg-smb-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-base text-smb-on-surface-variant">
              image
            </span>
          </div>
        )
      },
    },
    {
      key: 'productName',
      label: 'Tên Sản Phẩm',
      render: (val) => (
        <span className="font-semibold text-smb-on-surface">{val}</span>
      ),
    },
    {
      key: 'unitPrice',
      label: 'Giá',
      align: 'right',
      render: (val) => (
        <span className="font-semibold tabular-nums text-smb-on-surface" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
          {formatVND(val)} <span className="text-smb-on-surface-variant font-normal">đ</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng Thái',
      align: 'center',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'productTypeId',
      label: 'Loại',
      align: 'center',
      render: (val) => {
        const type = productTypes.find((t) => t.productTypeId === val)
        return (
          <span className="inline-flex items-center rounded-lg bg-smb-surface-container px-2 py-0.5 text-xs font-medium text-smb-on-surface-variant">
            {type?.typeName || `#${val}`}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <TableActions
            actions={[
              { label: 'Sửa', icon: 'edit', onClick: () => openEdit(row) },
              {
                label: 'Xóa',
                icon: 'delete',
                danger: true,
                onClick: () => setDeletingProduct(row),
              },
            ]}
          />
        </div>
      ),
    },
  ], [productTypes])

  // ── Filter tab config ─────────────────────────────────────────
  const filterTabs = [
    { value: 'all',          label: 'Tất Cả',    icon: 'grid_view',    count: counts.all },
    { value: 'available',    label: 'Còn Hàng',  icon: 'check_circle', count: counts.active },
    { value: 'outofstock',   label: 'Hết Hàng',  icon: 'inventory_2',  count: counts.outofstock },
    { value: 'discontinued', label: 'Ngừng Bán', icon: 'block',        count: counts.discontinued },
    { value: 'inactive',     label: 'Tạm Dừng',  icon: 'pause_circle', count: counts.inactive },
  ]

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Sản Phẩm" />

      <div className="pl-[264px]">
        <Navbar
          title="Quản Lý Sản Phẩm"
          subtitle="Danh sách sản phẩm trong hệ thống SmartMarketBot"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-5">

            {/* ── Stats Cards ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon="inventory_2"  label="Tổng sản phẩm" value={counts.all}          accent="border-smb-outline-variant/60" loading={loading} />
              <StatCard icon="check_circle" label="Còn hàng"      value={counts.active}        accent="border-emerald-200/80 dark:border-emerald-500/20" loading={loading} />
              <StatCard icon="inventory_2"  label="Hết hàng"      value={counts.outofstock}    accent="border-amber-200/80 dark:border-amber-500/20" loading={loading} />
              <StatCard icon="block"        label="Ngừng bán"     value={counts.discontinued}  accent="border-rose-200/80 dark:border-rose-500/20" loading={loading} />
            </div>

            {/* ── Controls ──────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-smb-on-surface-variant">
                  search
                </span>
                <input
                  id="product-search"
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest pl-9 pr-4 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 transition-all"
                />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest px-4 py-2 text-sm text-smb-on-surface outline-none focus:border-smb-primary-container focus:ring-2 focus:ring-smb-primary-container/20 transition-all"
                >
                  <option value="">Tất cả Loại Sản Phẩm</option>
                  {productTypes.map((t) => (
                    <option key={t.productTypeId} value={t.productTypeId}>
                      {t.typeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  icon="upload"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? 'Đang Import...' : 'Import Excel'}
                </Button>
                <Button
                  variant="outline"
                  icon="refresh"
                  size="sm"
                  onClick={fetchProducts}
                  disabled={loading}
                >
                  Làm Mới
                </Button>
                <Button
                  variant="primary"
                  icon="add"
                  size="sm"
                  onClick={openCreate}
                >
                  Thêm Sản Phẩm
                </Button>
              </div>
            </div>

            {/* ── Filter Tabs ────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest p-1.5 shadow-sm">
              {filterTabs.map((tab) => {
                const active = statusFilter === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    id={`filter-tab-${tab.value}`}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-smb-primary text-white shadow-md shadow-smb-primary/20'
                        : 'text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                    {tab.label}
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums font-mono ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-smb-surface-container text-smb-on-surface-variant'
                    }`}>
                      {tab.count ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── Table ─────────────────────────────────────────── */}
            {loading ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl p-3" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="h-10 w-10 rounded-xl smb-skeleton flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-48 rounded smb-skeleton" />
                      <div className="h-3 w-32 rounded smb-skeleton" />
                    </div>
                    <div className="h-6 w-20 rounded-full smb-skeleton" />
                    <div className="h-6 w-24 rounded smb-skeleton" />
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200/60 bg-rose-50/50 py-12 gap-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                <div className="flex size-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
                  <span className="material-symbols-outlined text-2xl text-smb-error">error</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-smb-error">{fetchError}</p>
                  <p className="mt-1 text-xs text-smb-on-surface-variant">Kiểm tra kết nối và thử lại</p>
                </div>
                <Button variant="secondary" onClick={fetchProducts}>
                  Thử lại
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest shadow-sm">
                {filtered.length === 0 ? (
                  <EmptyState message={
                    search
                      ? `Không tìm thấy sản phẩm nào khớp với "${search}"`
                      : 'Chưa có sản phẩm nào trong danh mục này.'
                  } />
                ) : (
                  <DataTable
                    columns={columns}
                    data={filtered}
                    emptyMessage="Không tìm thấy sản phẩm nào."
                    onRowClick={(row) => navigate(`/products/${row.productId}`)}
                    rowClassName="cursor-pointer hover:bg-smb-surface-container transition-colors"
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────── */}
      {modalOpen && (
        <FormModal
          title={editingProduct ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
          onClose={closeModal}
          onSubmit={handleSubmit}
          footer={
            <>
              <Button variant="secondary" type="button" onClick={closeModal} disabled={submitting}>
                Hủy
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                {editingProduct ? 'Lưu Thay Đổi' : 'Tạo Sản Phẩm'}
              </Button>
            </>
          }
        >
          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400">
              <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
              <span>{formError}</span>
            </div>
          )}

          <FormField label="Tên Sản Phẩm" required>
            <Input
              placeholder="VD: Sữa tươi Vinamilk 1L"
              value={form.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              maxLength={200}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Loại sản phẩm" required>
              <Select
                placeholder={
                  productTypesLoading
                    ? 'Đang tải danh sách...'
                    : productTypes.length === 0
                      ? 'Chưa có loại sản phẩm nào'
                      : '-- chọn loại sản phẩm --'
                }
                value={form.productTypeId === '' ? '' : String(form.productTypeId)}
                onChange={(v) => handleChange('productTypeId', v)}
                disabled={productTypesLoading}
                options={productTypes.map((t) => ({
                  value: String(t.productTypeId),
                  label: t.typeName,
                }))}
              />
            </FormField>
            <FormField label="Giá Bán" required>
              <Input
                type="number"
                placeholder="0"
                value={form.unitPrice}
                onChange={(e) => handleChange('unitPrice', e.target.value)}
                min={0}
                step="0.01"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Giá Khuyến Mãi">
              <Input
                type="number"
                placeholder="(tuỳ chọn)"
                value={form.promotionPrice}
                onChange={(e) => handleChange('promotionPrice', e.target.value)}
                min={0}
                step="0.01"
              />
            </FormField>
            <FormField label="Sản Phẩm Thay Thế">
              <Select
                placeholder={
                  substituteLoading
                    ? 'Đang tải danh sách...'
                    : substituteOptions.length === 0
                      ? 'Không có sản phẩm khác'
                      : 'Chọn sản phẩm thay thế'
                }
                options={substituteOptions}
                value={form.substituteProductId === '' ? '' : String(form.substituteProductId)}
                onChange={(v) => handleChange('substituteProductId', v)}
                disabled={substituteLoading || substituteOptions.length === 0}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tải Ảnh Lên (JPG/PNG)">
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface hover:border-smb-primary-container transition-colors">
                  <span className="material-symbols-outlined text-base">upload</span>
                  <span>Chọn file</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
                {/* Live preview — local file blob (when picking) or Cloudinary URL.
                    buildImageUrl + onError → fallback placeholder. */}
                {(imageFile || form.imageUrl) && (
                  <div className="size-12 shrink-0 overflow-hidden rounded-md border border-smb-outline-variant bg-smb-surface-container">
                    <img
                      src={
                        imageFile
                          ? URL.createObjectURL(imageFile)
                          : buildImageUrl(form.imageUrl, {
                              width: 96,
                              height: 96,
                              crop: 'fill',
                              quality: 'auto',
                              format: 'auto',
                            })
                      }
                      alt="preview"
                      className="h-full w-full object-cover"
                      onLoad={(e) => {
                        // Revoke blob URL after image is loaded to free memory
                        const me = e.currentTarget
                        if (me.src.startsWith('blob:') && imageFile) {
                          // delay revoke so first paint completes
                          setTimeout(() => URL.revokeObjectURL(me.src), 5000)
                        }
                      }}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = '/placeholder-needs-reupload.png'
                      }}
                    />
                  </div>
                )}
                {imageFile ? (
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-smb-on-surface-variant">
                    <span className="material-symbols-outlined text-base text-emerald-600">image</span>
                    <span className="truncate">{imageFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="text-smb-on-surface-variant hover:text-smb-error transition-colors"
                      title="Bỏ chọn"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-smb-on-surface-variant">
                    {editingProduct?.imageUrl
                      ? 'Giữ ảnh hiện tại hoặc chọn file mới.'
                      : 'Chưa có ảnh.'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-smb-on-surface-variant">
                Upload lên Cloudinary khi lưu. Nếu không chọn file, URL bên phải sẽ được dùng.
              </p>
            </FormField>

            <FormField label="URL Hình Ảnh (fallback)">
              <Input
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                disabled={imageFile !== null}
              />
            </FormField>
          </div>

          <FormField label="Health Tags">
            {healthTagsLoading ? (
              <div className="flex flex-wrap gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-7 w-24 rounded-full smb-skeleton" />
                ))}
              </div>
            ) : healthTags.length === 0 ? (
              <p className="rounded-xl border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2.5 text-xs text-smb-on-surface-variant">
                Chưa có health tag nào trong hệ thống.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {healthTags.map((t) => {
                  const selected = form.healthTagIds.includes(t.healthTagId)
                  const typeBadge =
                    t.tagType === 'Allergen' ? 'Dị ứng'
                      : t.tagType === 'Diet'    ? 'Chế độ ăn'
                      : t.tagType === 'Nutrition' ? 'Dinh dưỡng'
                      : t.tagType || 'Khác'
                  return (
                    <button
                      key={t.healthTagId}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? form.healthTagIds.filter((id) => id !== t.healthTagId)
                          : [...form.healthTagIds, t.healthTagId]
                        handleChange('healthTagIds', next)
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                        selected
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-emerald-400 hover:bg-emerald-50'
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {selected ? 'check_circle' : 'add'}
                      </span>
                      {t.tagName}
                      <span className={`text-[10px] ${selected ? 'opacity-80' : 'text-smb-on-surface-variant'}`}>
                        · {typeBadge}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {form.healthTagIds.length > 0 && (
              <p className="mt-1.5 text-[11px] text-smb-on-surface-variant">
                Đã chọn <strong>{form.healthTagIds.length}</strong> tag · dùng để lọc sản phẩm an toàn và cảnh báo dị ứng.
              </p>
            )}
          </FormField>

          <FormField label="Trạng Thái">
            <Select
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(v) => handleChange('status', v)}
            />
          </FormField>

          <FormField label="Mô Tả">
            <textarea
              placeholder="Mô tả ngắn về sản phẩm..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest px-3.5 py-2.5 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 transition-all resize-none"
            />
          </FormField>
        </FormModal>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────── */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 smb-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-smb-surface-container-lowest shadow-2xl smb-slide-up">
            <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-4 text-center">
              {/* Animated warning icon */}
              <div className="relative flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
                <div className="absolute inset-0 rounded-full bg-amber-200/50 smb-pulse-ring dark:bg-amber-500/20" />
                <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400">
                  inventory_2
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-smb-on-surface">Tạm dừng sản phẩm?</h3>
                <p className="mt-2 text-sm text-smb-on-surface-variant leading-relaxed">
                  Sản phẩm <strong className="text-smb-on-surface">"{deletingProduct.productName}"</strong> sẽ được chuyển sang trạng thái <strong className="text-amber-600">Tạm Dừng</strong>. Dữ liệu vẫn được giữ nguyên.
                </p>
              </div>
              <div className="flex w-full items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
                <span className="material-symbols-outlined text-base">info</span>
                Đây là xóa mềm — sản phẩm có thể được khôi phục bằng cách chỉnh trạng thái.
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => !deleting && setDeletingProduct(null)}
                disabled={deleting}
              >
                Hủy
              </Button>
              <Button
                variant="warning"
                className="flex-1"
                onClick={handleDelete}
                loading={deleting}
              >
                Tạm Dừng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement
