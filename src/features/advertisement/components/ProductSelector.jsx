import React, { useState, useEffect, useCallback } from 'react'
import Input from '../../../components/ui/Input'
import { getProducts } from '../../product/api/productApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function ProductSelector({ value = [], onChange }) {
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getProducts()
      setAllProducts(Array.isArray(data) ? data : [])
    } catch {
      setAllProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filtered = allProducts.filter((p) =>
    p.productName.toLowerCase().includes(search.toLowerCase())
  )

  const toggleProduct = (productId) => {
    const next = value.includes(productId)
      ? value.filter((id) => id !== productId)
      : [...value, productId]
    onChange?.(next)
  }

  const selectedLabels = value
    .map((id) => allProducts.find((p) => p.productId === id)?.productName)
    .filter(Boolean)

  const formatPrice = (val) =>
    val != null ? Number(val).toLocaleString('vi-VN') : '—'

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <Icon name="inventory_2" className="text-xl text-smb-primary-container" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Sản Phẩm Tài Trợ</h3>
          <p className="text-sm text-smb-on-surface-variant">
            Chọn sản phẩm tham gia chiến dịch
            {value.length > 0 && (
              <span className="ml-1 text-smb-primary-container">({value.length} đã chọn)</span>
            )}
          </p>
        </div>
      </div>

      {/* Selected chips */}
      {selectedLabels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedLabels.map((label, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/10 px-3 py-1 text-xs font-medium text-smb-primary-container"
            >
              {label}
              <button
                type="button"
                onClick={() => toggleProduct(value[i])}
                className="ml-0.5 rounded-full hover:bg-smb-primary-container/20"
              >
                <Icon name="close" className="text-[12px]" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2.5 text-sm text-smb-on-surface hover:bg-smb-surface-container transition-colors"
      >
        <span className={selectedLabels.length === 0 ? 'text-smb-outline' : 'text-smb-on-surface'}>
          {selectedLabels.length === 0
            ? 'Chọn sản phẩm...'
            : selectedLabels.join(', ')}
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[20px] text-smb-on-surface-variant" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mt-2 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest shadow-md">
          {/* Search */}
          <div className="p-3 border-b border-smb-outline-variant">
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="search"
            />
          </div>

          {/* Product list */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-smb-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin mr-2 text-[16px]" />
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-smb-on-surface-variant">
                Không tìm thấy sản phẩm nào.
              </div>
            ) : (
              filtered.map((product) => {
                const checked = value.includes(product.productId)
                return (
                  <button
                    key={product.productId}
                    type="button"
                    onClick={() => toggleProduct(product.productId)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-smb-surface-container transition-colors ${
                      checked ? 'bg-smb-primary-container/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? 'border-smb-primary-container bg-smb-primary-container'
                        : 'border-smb-outline'
                    }`}>
                      {checked && <Icon name="check" className="text-[10px] text-white" />}
                    </div>

                    {/* Product info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-smb-on-surface">{product.productName}</p>
                      <p className="text-xs text-smb-on-surface-variant">
                        {formatPrice(product.promotionPrice ?? product.unitPrice)} đ
                        {product.promotionPrice != null && (
                          <span className="ml-1 text-smb-outline line-through">{formatPrice(product.unitPrice)} đ</span>
                        )}
                      </p>
                    </div>

                    {/* Status */}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      product.status === 'Available'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {product.status === 'Available' ? 'Còn hàng' : product.status}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-smb-outline-variant p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-smb-on-surface-variant hover:bg-smb-surface-container transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductSelector
