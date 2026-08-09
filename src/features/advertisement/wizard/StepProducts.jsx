import React, { useEffect, useMemo, useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { getProducts } from '../../product/api/productApi'
import { getErrorMessage } from '../../../api/client'

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
    imageUrl: p.imageUrl ?? p.ImageUrl ?? null,
    status: p.status ?? p.Status ?? null,
  }
}

export function StepProducts({ state, onChange, hasProducts, onBack, onNext }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  // Load products (hiện tại lấy toàn bộ; khi BE có filter theo brand sẽ truyền brandId)
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
  }, [state.basics.brandId])

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