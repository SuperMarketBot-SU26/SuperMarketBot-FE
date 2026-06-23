import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilterChip } from '../../../components/FilterBar'
import { Badge, DataTable } from '../../../components/DataTable'
import { TableActions } from '../../../components/TableActions'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { getCampaigns, cancelCampaign } from '../api/adCampaignApi'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất Cả', icon: 'apps' },
  { value: 'Running', label: 'Đang Chạy', icon: 'play_circle' },
  { value: 'Paused', label: 'Tạm Dừng', icon: 'pause_circle' },
  { value: 'Cancelled', label: 'Đã Hủy', icon: 'cancel' },
]

const statusVariant = (status) => ({
  Running: 'success',
  Paused: 'warning',
  Cancelled: 'danger',
})[status] || 'neutral'

const statusLabel = (status) => ({
  Running: 'Đang chạy',
  Paused: 'Tạm dừng',
  Cancelled: 'Đã hủy',
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
  budget: item.totalSpent,
  impressions: null,
  clicks: null,
})

export function CampaignList({ onCreateNew }) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [pageNumber, setPageNumber] = useState(1)
  const [cancellingId, setCancellingId] = useState(null)

  const fetchCampaigns = useCallback(async (status, page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = { pageNumber: page, pageSize: 10 }
      if (status !== 'all') params.status = status
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
    fetchCampaigns(statusFilter, pageNumber)
  }, [statusFilter, pageNumber, fetchCampaigns])

  const handleConfirmCancel = async () => {
    if (!confirmTarget) return
    setCancellingId(confirmTarget.id)
    try {
      await cancelCampaign(confirmTarget.id)
      setConfirmTarget(null)
      fetchCampaigns(statusFilter, pageNumber)
    } catch (err) {
      alert(err?.response?.data?.error || 'Hủy chiến dịch thất bại')
    } finally {
      setCancellingId(null)
    }
  }

  const filtered = statusFilter === 'all'
    ? campaigns
    : campaigns.filter((c) => c.status === statusFilter)

  const counts = {
    all: campaigns.length,
    Running: campaigns.filter((c) => c.status === 'Running').length,
    Paused: campaigns.filter((c) => c.status === 'Paused').length,
    Cancelled: campaigns.filter((c) => c.status === 'Cancelled').length,
  }

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
        <Badge variant={statusVariant(val)} icon={STATUS_OPTIONS.find((o) => o.value === val)?.icon}>
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
      key: 'budget',
      label: 'Ngân Sách',
      align: 'right',
      render: (val) => (
        <span className="tabular-nums font-medium">
          {(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      key: 'clicks',
      label: 'Lượt Nhấn',
      align: 'right',
      render: (val) => <span className="tabular-nums">{val?.toLocaleString('vi-VN') ?? '—'}</span>,
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (_, row) => (
        <TableActions
          actions={[
            {
              label: 'Cập Nhật',
              icon: 'edit',
              onClick: () => navigate(`/advertisement/update/${row.id}`),
            },
            {
              label: 'Hủy Chiến Dịch',
              icon: 'cancel',
              danger: true,
              disabled: cancellingId === row.id,
              onClick: () => setConfirmTarget(row),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChip
          label="Trạng thái"
          options={STATUS_OPTIONS.map((opt) => ({
            ...opt,
            count: counts[opt.value],
          }))}
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val); setPageNumber(1) }}
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon="search" size="sm">Tìm Kiếm</Button>
          <Button variant="primary" icon="add" onClick={onCreateNew}>Tạo Chiến Dịch Mới</Button>
        </div>
      </div>

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
