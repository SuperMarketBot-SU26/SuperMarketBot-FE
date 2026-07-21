import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  formatVND,
  statusLabel,
} from '../features/product'
import { getProducts as fetchPublicProducts, getProductTypes, getProductDetail, getHealthTags } from '../features/product/api/productApi'

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

export function ProductManagement() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create/Edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null) // null = create mode
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [substituteOptions, setSubstituteOptions] = useState([])
  const [substituteLoading, setSubstituteLoading] = useState(false)

  // Product-type reference data: populated from /api/products/product-types so
  // the ProductTypeId field is a dropdown, not a free-form number.
  const [productTypes, setProductTypes] = useState([])
  const [productTypesLoading, setProductTypesLoading] = useState(false)

  // Health-tag reference data: populated from /api/products/health-tags. Tags
  // can be selected per-product and persisted as `healthTagIds` on the BE.
  const [healthTags, setHealthTags] = useState([])
  const [healthTagsLoading, setHealthTagsLoading] = useState(false)

  // Delete confirm state
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  // Load the product-type reference list once on mount. Keep as a separate
  // helper so openCreate / openEdit can re-trigger it on demand.
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

  // Health-tag reference list: same lifecycle as product types. Loaded once on
  // mount and refreshed when the modal opens.
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
    return matchSearch && matchStatus
  })

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === 'Active' || p.status === 'Available').length,
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
      // Default to []; we'll patch in the real list once /detail loads below.
      healthTagIds: [],
    })
    setImageFile(null)
    setFormError(null)
    setModalOpen(true)
    await Promise.all([loadSubstituteOptions(product.productId), loadProductTypes(), loadHealthTags()])

    // The list endpoint returns ProductDto which omits HealthTags. Fetch the
    // detail so we can pre-select the tags that are currently attached.
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

  /**
   * Fetch the full product list to populate the Substitute dropdown.
   * Excludes the product being edited so it can't substitute itself.
   */
  const loadSubstituteOptions = async (excludeProductId) => {
    setSubstituteLoading(true)
    try {
      const data = await fetchPublicProducts()
      const list = Array.isArray(data) ? data : []
      const options = list
        .filter((p) => p.productId !== excludeProductId)
        .map((p) => ({
          value: String(p.productId),
          label: `#${p.productId} — ${p.productName}`,
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
      const allowed = ['image/jpeg', 'image/jpg', 'image/png']
      if (!allowed.includes(file.type)) {
        setFormError('Chỉ chấp nhận file ảnh JPG/PNG.')
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
      } else {
        await createAdminProduct(payload, imageFile)
      }
      await fetchProducts()
      closeModal()
    } catch (err) {
      setFormError(err?.response?.data?.error || err.message || 'Lưu sản phẩm thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProduct) return
    setDeleting(true)
    try {
      await deleteAdminProduct(deletingProduct.productId)
      await fetchProducts()
      setDeletingProduct(null)
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Xóa sản phẩm thất bại.')
      setDeletingProduct(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'imageUrl',
      label: '',
      width: '56px',
      render: (val) => (
        val ? (
          <img
            src={val}
            alt="product"
            className="h-10 w-10 rounded-lg object-cover border border-smb-outline-variant"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-smb-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-base text-smb-on-surface-variant">
              image
            </span>
          </div>
        )
      ),
    },
    {
      key: 'productName',
      label: 'Tên Sản Phẩm',
      render: (val) => (
        <span className="font-medium text-smb-on-surface">{val}</span>
      ),
    },
    {
      key: 'unitPrice',
      label: 'Giá',
      align: 'right',
      render: (val) => (
        <span className="font-medium tabular-nums text-smb-on-surface">
          {formatVND(val)} đ
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng Thái',
      align: 'center',
      render: (val) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            val === 'Available' || val === 'Active'
              ? 'bg-green-100 text-green-700'
              : val === 'Inactive' || val === 'OutOfStock'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {statusLabel(val)}
        </span>
      ),
    },
    {
      key: 'productTypeId',
      label: 'Loại',
      align: 'center',
      render: (val) => (
        <span className="text-sm text-smb-on-surface-variant">#{val}</span>
      ),
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
  ]

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Sản Phẩm" />

      <div className="pl-[260px]">
        <Navbar
          title="Quản Lý Sản Phẩm"
          subtitle="Danh sách sản phẩm trong hệ thống SmartMarketBot"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl space-y-5">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-smb-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest pl-9 pr-4 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
              </div>

              <div className="flex items-center gap-2">
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

            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-1">
              {[
                { value: 'all', label: 'Tất Cả' },
                { value: 'active', label: 'Hoạt Động' },
                { value: 'inactive', label: 'Tạm Dừng' },
                { value: 'discontinued', label: 'Ngừng Bán' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`
                    flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all
                    ${statusFilter === opt.value
                      ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
                      : 'text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
                    }
                  `}
                >
                  {opt.label}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                      statusFilter === opt.value
                        ? 'bg-smb-on-primary-container/20'
                        : 'bg-smb-surface-container text-smb-on-surface-variant'
                    }`}
                  >
                    {counts[opt.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest py-16">
                <span className="material-symbols-outlined animate-spin text-2xl text-smb-on-surface-variant">
                  progress_activity
                </span>
                <span className="ml-2 text-sm text-smb-on-surface-variant">
                  Đang tải sản phẩm...
                </span>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12 gap-3">
                <span className="material-symbols-outlined text-4xl text-smb-error">
                  error
                </span>
                <p className="text-sm text-smb-error">{fetchError}</p>
                <Button variant="secondary" onClick={fetchProducts}>
                  Thử lại
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
                <DataTable
                  columns={columns}
                  data={filtered}
                  emptyMessage="Không tìm thấy sản phẩm nào."
                  onRowClick={(row) => navigate(`/products/${row.productId}`)}
                  rowClassName="cursor-pointer hover:bg-smb-surface-container transition-colors"
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create / Edit modal */}
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
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
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
            <FormField label="Loại sản phẩm (ProductType)" required>
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
                  label: `#${t.productTypeId} · ${t.typeName}${t.subcategoryId != null ? ` · sub #${t.subcategoryId}` : ''}`,
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
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface hover:border-smb-primary-container">
                  <span className="material-symbols-outlined text-base">upload</span>
                  <span>Chọn file</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
                {imageFile ? (
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-smb-on-surface-variant">
                    <span className="material-symbols-outlined text-base text-smb-primary-container">
                      image
                    </span>
                    <span className="truncate">{imageFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="text-smb-on-surface-variant hover:text-smb-error"
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
                File sẽ được upload lên Cloudinary khi lưu. Nếu không chọn file mới,
                giá trị URL bên phải sẽ được dùng.
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
              <p className="rounded border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-xs text-smb-on-surface-variant">
                Đang tải danh sách health tag…
              </p>
            ) : healthTags.length === 0 ? (
              <p className="rounded border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-xs text-smb-on-surface-variant">
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
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-smb-primary-container bg-smb-primary-container text-smb-on-primary'
                          : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface hover:border-smb-primary-container hover:bg-smb-active-bg'
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="material-symbols-outlined text-[14px]">
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
              <p className="mt-1 text-[11px] text-smb-on-surface-variant">
                Đã chọn {form.healthTagIds.length} tag · dùng để lọc sản phẩm an toàn
                cho hội viên và cảnh báo dị ứng.
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
              className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3.5 py-2.5 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
            />
          </FormField>
        </FormModal>
      )}

      {/* Delete confirm modal */}
      {deletingProduct && (
        <ConfirmModal
          message={`Bạn có chắc muốn xóa sản phẩm "${deletingProduct.productName}"? Sản phẩm sẽ được chuyển sang trạng thái Tạm Dừng.`}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeletingProduct(null)}
        />
      )}
    </div>
  )
}

export default ProductManagement
