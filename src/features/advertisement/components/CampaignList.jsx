import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, DataTable } from '../../../components/DataTable'
import { TableActions } from '../../../components/TableActions'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { getCampaigns, cancelCampaign } from '../api/adCampaignApi'

const STATUS_ICONS = {
  Active: 'check_circle',
  Inactive: 'cancel',
  Paused: 'pause_circle',
  Canceled: 'block',
  Completed: 'task_alt',
}

const statusVariant = (status) => ({
  Inactive:  'danger',
  Active:    'success',
  Paused:    'warning',
  Canceled:  'danger',
  Completed: 'neutral',
})[status] || 'neutral'

const statusLabel = (status) => ({
  Inactive:  'Không hoạt động',
  Active:    'Hoạt động',
  Paused:    'Tạm dừng',
  Canceled:  'Đã hủy',
  Completed: 'Hoàn thành',
})[status] || status

const packageLabel = (pkg) => ({
  organic: 'Tự Nhiên',
  basic: 'Cơ Bản',
  silver: 'Bạc',
  gold: 'Vàng',
  premium: 'Cao Cấp',
})[pkg] || pkg

const normalizeCampaign = (item) => ({
  id: item.adCampaignId,
  name: item.campaignName,
  brand: item.brandName,
  package: item.packageName,
  status: item.status,
  startDate: item.startDate,
  endDate: item.endDate,
  totalSpent: item.totalSpent,
  sponsoredProductCount: item.sponsoredProductCount ?? 0,
  sponsoredProducts: item.sponsoredProducts ?? [],
})

export function CampaignList({ onCreateNew, search = '', status = 'all' }) {
  const navigate = useNavigate()
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [pageNumber, setPageNumber] = useState(1)
  const [cancellingId, setCancellingId] = useState(null)

  const fetchCampaigns = useCallback(async (currentStatus, page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = { pageNumber: page, pageSize: 10 }
      if (currentStatus !== 'all') params.status = currentStatus
      const data = await getCampaigns(params)
      setCampaigns((data.items || []).map(normalizeCampaign))
      setTotalPages(data.totalPages || 1)
      setPageNumber(data.pageNumber || 1)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Tải danh sách chiến dịch thất bại')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPageNumber(1)
  }, [status])

  useEffect(() => {
    fetchCampaigns(status, pageNumber)
  }, [status, pageNumber, fetchCampaigns])

  const handleConfirmCancel = async () => {
    if (!confirmTarget) return
    setCancellingId(confirmTarget.id)
    try {
      await cancelCampaign(confirmTarget.id)
      setConfirmTarget(null)
      fetchCampaigns(status, pageNumber)
    } catch (err) {
      alert(err?.response?.data?.error || 'Hủy chiến dịch thất bại')
    } finally {
      setCancellingId(null)
    }
  }

  const filtered = campaigns.filter((c) => {
    const matchesSearch = !search || [c.name, c.brand, c.package]
      .some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    return matchesSearch
  })

  const columns = [
    {
      key: 'name',
      label: 'Chiến Dịch',
      render: (val, row) => (
        <div>
          <p className="font-medium text-smb-on-surface">{val}</p>
          <p className="text-xs text-smb-on-surface-variant">{row.brand}</p>
        </div>
      ),
    },
    {
      key: 'package',
      label: 'Gói',
      align: 'center',
      render: (val) => (
        <span className="rounded-full bg-smb-primary-container/10 px-2 py-0.5 text-xs font-semibold text-smb-primary-container">
          {packageLabel(val)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng Thái',
      align: 'center',
      render: (val) => (
        <Badge variant={statusVariant(val)} icon={STATUS_ICONS[val]}>
          {statusLabel(val)}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      label: 'Ngày Bắt Đầu',
      align: 'center',
      render: (val) => val ? new Date(val).toLocaleDateString('vi-VN') : '—',
    },
    {
      key: 'endDate',
      label: 'Ngày Kết Thúc',
      align: 'center',
      render: (val) => val ? new Date(val).toLocaleDateString('vi-VN') : '—',
    },
    {
      key: 'totalSpent',
      label: 'Đã Chi',
      align: 'right',
      render: (val) => (
        <span className="tabular-nums font-medium">
          {(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      key: 'sponsoredProductCount',
      label: 'Số Sản Phẩm',
      align: 'center',
      render: (val) => <span className="tabular-nums">{val ?? 0}</span>,
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (_, row) => {
        const isCancellable = ['Inactive', 'Active', 'Paused'].includes(row.status)
        return (
          <TableActions
            actions={[
              {
                label: 'Cập Nhật',
                icon: 'edit',
                onClick: () => navigate(`/advertisement/update/${row.id}`),
              },
              {
                label: 'Xem Nhật Ký',
                icon: 'history',
                onClick: () => navigate(`/advertisement/logs/${row.id}`),
              },
              {
                label: 'Hủy Chiến Dịch',
                icon: 'cancel',
                danger: true,
                disabled: cancellingId === row.id || !isCancellable,
                onClick: () => setConfirmTarget(row),
              },
            ]}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={error ? '' : 'Không có chiến dịch nào phù hợp'}
      />

      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button
            variant="outline" size="sm"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            ← Trước
          </Button>
          <span className="flex items-center px-3 text-sm text-smb-on-surface-variant">
            Trang {pageNumber} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={pageNumber >= totalPages}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            Sau →
          </Button>
        </div>
      )}

      {confirmTarget && (
        <ConfirmModal
          message={`Bạn có chắc muốn hủy chiến dịch "${confirmTarget.name}" không?`}
          onConfirm={handleConfirmCancel}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}

export default CampaignList
