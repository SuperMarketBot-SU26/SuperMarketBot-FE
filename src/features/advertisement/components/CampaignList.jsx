import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilterChip } from '../../../components/FilterBar'
import { Badge, DataTable } from '../../../components/DataTable'
import { TableActions } from '../../../components/TableActions'
import { Button } from '../../../components/ui/Button'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất Cả', icon: 'apps' },
  { value: 'running', label: 'Đang Chạy', icon: 'play_circle' },
  { value: 'paused', label: 'Tạm Dừng', icon: 'pause_circle' },
  { value: 'cancelled', label: 'Đã Hủy', icon: 'cancel' },
]

const MOCK_CAMPAIGNS = [
  {
    id: 1,
    name: 'Summer Sale - Vinamilk',
    brand: 'Vinamilk',
    package: 'Cao Cấp',
    status: 'running',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    budget: 45_000_000,
    impressions: 128_450,
    clicks: 3_842,
  },
  {
    id: 2,
    name: 'Flash Sale Tháng 6 - TH True Milk',
    brand: 'TH True Milk',
    package: 'Vàng',
    status: 'running',
    startDate: '2026-06-10',
    endDate: '2026-06-25',
    budget: 30_000_000,
    impressions: 89_200,
    clicks: 2_150,
  },
  {
    id: 3,
    name: 'Khuyến Mãi Mùa Hè - Nestlé',
    brand: 'Nestlé',
    package: 'Bạc',
    status: 'paused',
    startDate: '2026-06-05',
    endDate: '2026-07-05',
    budget: 20_000_000,
    impressions: 54_800,
    clicks: 980,
  },
  {
    id: 4,
    name: 'Back to School - Masan',
    brand: 'Masan',
    package: 'Bạc',
    status: 'cancelled',
    startDate: '2026-05-20',
    endDate: '2026-06-15',
    budget: 15_000_000,
    impressions: 22_100,
    clicks: 410,
  },
  {
    id: 5,
    name: 'Ramadan Promo - Acecook',
    brand: 'Acecook',
    package: 'Cơ Bản',
    status: 'running',
    startDate: '2026-06-15',
    endDate: '2026-07-15',
    budget: 10_000_000,
    impressions: 41_300,
    clicks: 720,
  },
]

const statusVariant = (status) => ({
  running: 'success',
  paused: 'warning',
  cancelled: 'danger',
})[status] || 'neutral'

const statusLabel = (status) => ({
  running: 'Đang chạy',
  paused: 'Tạm dừng',
  cancelled: 'Đã hủy',
})[status] || status

const packageLabel = (pkg) => ({
  organic: 'Tự Nhiên',
  basic: 'Cơ Bản',
  silver: 'Bạc',
  gold: 'Vàng',
  premium: 'Cao Cấp',
})[pkg] || pkg

export function CampaignList({ onCreateNew }) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = statusFilter === 'all'
    ? MOCK_CAMPAIGNS
    : MOCK_CAMPAIGNS.filter((c) => c.status === statusFilter)

  const counts = {
    all: MOCK_CAMPAIGNS.length,
    running: MOCK_CAMPAIGNS.filter((c) => c.status === 'running').length,
    paused: MOCK_CAMPAIGNS.filter((c) => c.status === 'paused').length,
    cancelled: MOCK_CAMPAIGNS.filter((c) => c.status === 'cancelled').length,
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
    },
    {
      key: 'endDate',
      label: 'Ngày Kết Thúc',
      align: 'center',
    },
    {
      key: 'budget',
      label: 'Ngân Sách',
      align: 'right',
      render: (val) => (
        <span className="tabular-nums font-medium">
          {val.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      key: 'clicks',
      label: 'Lượt Nhấn',
      align: 'right',
      render: (val) => <span className="tabular-nums">{val.toLocaleString('vi-VN')}</span>,
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
              onClick: () => console.log('Cancel campaign', row.id),
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
          onChange={setStatusFilter}
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon="search" size="sm">Tìm Kiếm</Button>
          <Button variant="primary" icon="add" onClick={onCreateNew}>Tạo Chiến Dịch Mới</Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="Không có chiến dịch nào phù hợp"
      />
    </div>
  )
}

export default CampaignList
