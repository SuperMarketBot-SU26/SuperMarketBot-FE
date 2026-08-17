/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { getProducts } from '../../product/api/productApi'
import { getErrorMessage } from '../../../api/client'
import { buildImageUrl } from '../../../utils/cloudinary'
import { uploadResource } from '../api/adResourcesApi'
import { toast } from 'react-toastify'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')

/**
 * Normalize ProductDto về shape { id, name, sku, price, imageUrl, status }.
 * Hỗ trợ cả public + admin variant.
 */
function normalizeProduct(p) {
  if (!p) return null
  const id = p.productId ?? p.id ?? p.ProductId
  if (id == null) return null
  return {
    id,
    name: p.productName ?? p.ProductName ?? p.name ?? `Sản phẩm #${id}`,
    sku: p.sku ?? p.SKU ?? '',
    price: Number(p.unitPrice ?? p.UnitPrice ?? 0),
    // buildImageUrl: handles Cloudinary URLs, legacy wwwroot/localhost (warns +
    // returns placeholder), and any other external URL (returns as-is).
    imageUrl: buildImageUrl(p.imageUrl ?? p.ImageUrl ?? null, {
      width: 96,
      height: 96,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    }),
    status: p.status ?? p.Status ?? null,
  }
}

export function StepProducts({ state, onChange, hasProducts, onBack, onNext, pendingFiles = [], onUploadFiles }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  // Load products (hiện tại lấy toàn bộ; BE chưa hỗ trợ filter theo brandId).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getProducts({ pageSize: 200 })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.items ?? data?.products ?? []
        const normalized = list.map(normalizeProduct).filter(Boolean)
        setProducts(normalized)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getErrorMessage(err, 'Không tải được danh sách sản phẩm.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const selectedIds = state.products?.productIds ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [products, query])

  const selectedItems = useMemo(
    () => products.filter((p) => selectedIds.includes(p.id)),
    [products, selectedIds]
  )

  const toggle = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    onChange({ productIds: next })
  }

  const clearAll = () => onChange({ productIds: [] })

  // ── Banner/Video upload (tuỳ chọn) ────────────────────────────────
  // Lưu file vào pendingFiles ở parent; upload thực sự diễn ra SAU khi tạo campaign (cần campaignId).
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const previews = files.map((file) => ({
      file,
      id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('video') ? 'Video' : 'Image',
      previewUrl: URL.createObjectURL(file),
    }))
    onUploadFiles?.([...pendingFiles, ...previews])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePending = (id) => {
    const item = pendingFiles.find((f) => f.id === id)
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
    onUploadFiles?.(pendingFiles.filter((f) => f.id !== id))
  }

  const formatBytes = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / 1024 / 1024
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
  }

  const totalValue = useMemo(
    () => selectedItems.reduce((sum, p) => sum + p.price, 0),
    [selectedItems]
  )

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-smb-on-surface">Bước 3 · Sản Phẩm Tài Trợ</h2>
        <p className="mt-1 text-sm text-smb-on-surface-variant">
          Chọn <strong>ít nhất 1</strong> sản phẩm để quảng cáo trong chiến dịch này. Sản phẩm tài trợ sẽ được
          ưu tiên hiển thị khi khách hàng tương tác với các khu vực/tuyến đường đã chọn.
        </p>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <Icon name="error" className="mt-0.5 text-[16px]" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Available */}
        <div className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="inventory_2" className="text-[18px] text-smb-primary-container" />
            <h4 className="text-sm font-semibold text-smb-on-surface">
              Danh sách sản phẩm ({filtered.length})
            </h4>
          </div>
          <Input
            placeholder="Tìm theo tên hoặc SKU..."
            icon="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-smb-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin text-[16px]" />
                Đang tải sản phẩm...
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-smb-on-surface-variant">
                Không có sản phẩm phù hợp.
              </p>
            ) : (
              filtered.map((p) => {
                const picked = selectedIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`
                      flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors
                      ${picked
                        ? 'border-smb-primary-container bg-smb-primary-container/10'
                        : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'}
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
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="size-8 min-w-8 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = '/placeholder-needs-reupload.png'
                        }}
                      />
                    ) : (
                      <div className="flex size-8 min-w-8 items-center justify-center rounded bg-smb-primary-container/10 text-smb-primary-container">
                        <Icon name="inventory_2" className="text-[16px]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-smb-on-surface">{p.name}</p>
                      <p className="truncate text-xs text-smb-on-surface-variant">
                        {p.sku && `SKU ${p.sku} · `}
                        {formatVND(p.price)} đ
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Selected */}
        <div className="flex flex-col rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="check_circle" className="text-[18px] text-smb-primary-container" />
              <h4 className="text-sm font-semibold text-smb-on-surface">
                Đã chọn ({selectedItems.length})
              </h4>
            </div>
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-smb-on-surface-variant hover:text-smb-error"
              >
                Xoá tất cả
              </button>
            )}
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {selectedItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-smb-on-surface-variant">
                Chưa chọn sản phẩm nào.
              </p>
            ) : (
              selectedItems.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-md border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm"
                >
                  <Icon name="inventory_2" className="text-[16px] text-smb-primary-container" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-smb-on-surface">{p.name}</p>
                    <p className="truncate text-xs text-smb-on-surface-variant">{formatVND(p.price)} đ</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="text-smb-on-surface-variant hover:text-smb-error"
                    aria-label={`Bỏ chọn ${p.name}`}
                  >
                    <Icon name="close" className="text-[16px]" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 rounded-md bg-smb-primary-container/5 px-3 py-2 text-xs text-smb-on-surface-variant">
            Tổng giá trị tham khảo:{' '}
            <strong className="text-smb-on-surface">{formatVND(totalValue)} đ</strong>
            <span className="ml-1">(không tính vào phí kích hoạt)</span>
          </div>
        </div>
      </div>

      {!hasProducts && !loading && !error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Icon name="warning" className="mt-0.5 text-[16px]" />
          <span>
            Vui lòng chọn <strong>ít nhất 1 sản phẩm</strong> để tài trợ trong chiến dịch.
          </span>
        </div>
      )}

      {/* Upload Resources (tuỳ chọn, upload sau khi tạo campaign) */}
      <div className="rounded-2xl border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon name="perm_media" className="text-[20px] text-smb-primary-container" />
            <h3 className="font-semibold text-smb-on-surface">
              Banner / Video cho chiến dịch
              {pendingFiles.length > 0 && (
                <span className="ml-2 rounded-full bg-smb-primary/10 px-2 py-0.5 text-xs font-bold text-smb-primary">
                  {pendingFiles.length}
                </span>
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-smb-primary-container bg-smb-primary-container/5 px-3 py-1.5 text-sm font-medium text-smb-primary-container hover:bg-smb-primary-container/10"
          >
            <Icon name="cloud_upload" className="text-[16px]" />
            Chọn file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={handleFileSelect}
          />
        </div>
        <p className="mb-3 text-xs text-smb-on-surface-variant">
          Tuỳ chọn. File sẽ được upload ngay sau khi campaign được tạo thành công.
        </p>

        {pendingFiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pendingFiles.map((f) => (
              <div key={f.id} className="group relative rounded-xl border border-smb-outline-variant bg-smb-surface-container overflow-hidden">
                <div className="relative h-24 flex items-center justify-center bg-black/5">
                  {f.type === 'Video' ? (
                    <video src={f.previewUrl} className="h-full w-full object-contain" />
                  ) : (
                    <img
                      src={f.previewUrl}
                      alt={f.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = '/placeholder.png'
                      }}
                    />
                  )}
                  <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                    {f.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePending(f.id)}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Icon name="close" className="text-sm" />
                  </button>
                </div>
                <div className="p-1.5">
                  <p className="truncate text-[11px] font-medium text-smb-on-surface">{f.name}</p>
                  <p className="text-[10px] text-smb-on-surface-variant">{formatBytes(f.size)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-xs text-smb-on-surface-variant">
            <Icon name="info" className="text-[14px]" />
            Chưa có file nào. Có thể upload sau khi tạo campaign.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" icon="arrow_back" onClick={onBack}>
          ← Quay Lại
        </Button>
        <Button
          variant="primary"
          icon="arrow_forward"
          onClick={onNext}
          disabled={!hasProducts}
        >
          Tiếp Tục →
        </Button>
      </div>
    </section>
  )
}

export default StepProducts