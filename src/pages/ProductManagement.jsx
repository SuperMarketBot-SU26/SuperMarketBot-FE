import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { DataTable } from '../components/DataTable'
import { getProducts, formatVND, statusVariant, statusLabel } from '../features/product'
import { ProductImage } from '../features/product'

export function ProductManagement() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getProducts()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải danh sách sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filtered = products.filter((p) => {
    const matchSearch =
      !search || p.productName.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === 'all' || p.status.toLowerCase() === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === 'Active').length,
    inactive: products.filter((p) => p.status === 'Inactive').length,
    discontinued: products.filter((p) => p.status === 'Discontinued').length,
  }

  const columns = [
    {
      key: 'imageUrl',
      label: '',
      width: '56px',
      render: (val) => (
        <ProductImage
          src={val}
          alt="product"
          className="h-10 w-10 rounded-lg object-cover border border-smb-outline-variant"
        />
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
            val === 'Active'
              ? 'bg-green-100 text-green-700'
              : val === 'Inactive'
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

              <Button
                variant="outline"
                icon="refresh"
                size="sm"
                onClick={fetchProducts}
                disabled={loading}
              >
                Làm Mới
              </Button>
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
    </div>
  )
}

export default ProductManagement
