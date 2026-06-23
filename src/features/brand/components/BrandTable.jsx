import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '../../../components/DataTable'
import { Badge } from '../../../components/DataTable'
import { TableActions } from '../../../components/TableActions'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { getBrands, deleteBrand } from '../api/brandApi'

const formatVND = (value) =>
  Number(value || 0).toLocaleString('vi-VN')

const normalizeBrand = (item) => ({
  brandId: item.brandId,
  brandName: item.brandName,
  wallet: item.wallet,
  description: item.description,
  activeCampaignCount: item.activeCampaignCount,
})

export function BrandTable() {
  const navigate = useNavigate()
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBrands()
      setBrands(Array.isArray(data) ? data.map(normalizeBrand) : [])
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Không thể tải danh sách nhãn hàng.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.brandId)
    try {
      await deleteBrand(deleteTarget.brandId)
      setBrands((prev) => prev.filter((b) => b.brandId !== deleteTarget.brandId))
      setDeleteTarget(null)
    } catch (err) {
      alert(err?.response?.data?.error || 'Xóa nhãn hàng thất bại.')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = search.trim()
    ? brands.filter((b) =>
        b.brandName.toLowerCase().includes(search.toLowerCase())
      )
    : brands

  const columns = [
    {
      key: 'brandName',
      label: 'Nhãn Hàng',
      render: (val, row) => (
        <div>
          <p className="font-medium text-smb-on-surface">{val}</p>
          {row.description && (
            <p className="mt-0.5 text-xs text-smb-on-surface-variant line-clamp-1">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'wallet',
      label: 'Số Dư Ví',
      align: 'right',
      render: (val) => (
        <span className="font-medium tabular-nums text-smb-on-surface">
          {formatVND(val)} đ
        </span>
      ),
    },
    {
      key: 'activeCampaignCount',
      label: 'Chiến Dịch Đang Chạy',
      align: 'center',
      render: (val) => (
        <span className={`font-semibold tabular-nums ${val > 0 ? 'text-smb-primary-container' : 'text-smb-on-surface-variant'}`}>
          {val ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (_, row) => (
        <TableActions
          actions={[
            {
              label: 'Chỉnh sửa',
              icon: 'edit',
              onClick: () => navigate(`/brand/update/${row.brandId}`),
            },
            {
              label: 'Xóa nhãn hàng',
              icon: 'delete',
              danger: true,
              disabled: deletingId === row.brandId || row.activeCampaignCount > 0,
              onClick: () => {
                if (row.activeCampaignCount > 0) {
                  alert('Không thể xóa nhãn hàng đang có chiến dịch đang chạy.')
                  return
                }
                setDeleteTarget(row)
              },
            },
          ]}
        />
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-smb-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
        <span className="ml-2 text-sm">Đang tải dữ liệu...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="material-symbols-outlined text-4xl text-smb-error">error</span>
        <p className="text-sm text-smb-error">{error}</p>
        <Button variant="secondary" onClick={fetchBrands}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-smb-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm nhãn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest pl-9 pr-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant focus:border-smb-primary-container focus:outline-none focus:ring-1 focus:ring-smb-primary-container/30"
          />
        </div>
        <Button
          variant="primary"
          icon="add"
          onClick={() => navigate('/brand/create')}
        >
          Thêm Nhãn Hàng Mới
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={false}
        emptyMessage="Không tìm thấy nhãn hàng nào."
      />

      {deleteTarget && (
        <ConfirmModal
          message={`Bạn có chắc muốn xóa nhãn hàng "${deleteTarget.brandName}" không? Hành động này không thể hoàn tác.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default BrandTable
