import React from 'react'
import { DataTable } from '../../../components/DataTable'
import { TableActions } from '../../../components/TableActions'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const TIER_CONFIG = {
  diamond: { label: 'Kim Cương', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  gold: { label: 'Vàng', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  silver: { label: 'Bạc', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
  bronze: { label: 'Đồng', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
}

const MOCK_BRANDS = [
  {
    id: 'b001',
    name: 'Vinamilk',
    tier: 'diamond',
    walletBalance: 850_000_000,
    totalSpent: 2_400_000_000,
    activeCampaigns: 5,
    totalCampaigns: 12,
    impressions: 1_250_000,
    ctr: '3.21%',
    status: 'active',
  },
  {
    id: 'b002',
    name: 'TH True Milk',
    tier: 'gold',
    walletBalance: 420_000_000,
    totalSpent: 1_850_000_000,
    activeCampaigns: 3,
    totalCampaigns: 8,
    impressions: 890_000,
    ctr: '2.95%',
    status: 'active',
  },
  {
    id: 'b003',
    name: 'Nestlé',
    tier: 'gold',
    walletBalance: 310_000_000,
    totalSpent: 1_200_000_000,
    activeCampaigns: 2,
    totalCampaigns: 6,
    impressions: 620_000,
    ctr: '2.40%',
    status: 'active',
  },
  {
    id: 'b004',
    name: 'Acecook',
    tier: 'silver',
    walletBalance: 180_000_000,
    totalSpent: 650_000_000,
    activeCampaigns: 2,
    totalCampaigns: 5,
    impressions: 310_000,
    ctr: '1.88%',
    status: 'active',
  },
  {
    id: 'b005',
    name: 'Masan',
    tier: 'silver',
    walletBalance: 95_000_000,
    totalSpent: 420_000_000,
    activeCampaigns: 1,
    totalCampaigns: 4,
    impressions: 185_000,
    ctr: '1.65%',
    status: 'active',
  },
  {
    id: 'b006',
    name: 'Nutifood',
    tier: 'bronze',
    walletBalance: 55_000_000,
    totalSpent: 210_000_000,
    activeCampaigns: 1,
    totalCampaigns: 3,
    impressions: 98_000,
    ctr: '1.52%',
    status: 'active',
  },
  {
    id: 'b007',
    name: 'Vinasoy',
    tier: 'bronze',
    walletBalance: 40_000_000,
    totalSpent: 180_000_000,
    activeCampaigns: 1,
    totalCampaigns: 2,
    impressions: 75_000,
    ctr: '1.34%',
    status: 'inactive',
  },
  {
    id: 'b008',
    name: 'Dutch Lady',
    tier: 'gold',
    walletBalance: 275_000_000,
    totalSpent: 980_000_000,
    activeCampaigns: 2,
    totalCampaigns: 5,
    impressions: 445_000,
    ctr: '2.78%',
    status: 'active',
  },
]

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        status === 'active'
          ? 'bg-green-50 text-green-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span className={`size-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`} />
      {status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
    </span>
  )
}

function TierBadge({ tier }) {
  const config = TIER_CONFIG[tier]
  if (!config) return null
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.color} ${config.bg} ${config.border}`}>
      <span className={`size-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
      {config.label}
    </span>
  )
}

function formatVND(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}T`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`
  return value.toLocaleString('vi-VN')
}

function formatNumber(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString('vi-VN')
}

const COLUMNS = [
  {
    key: 'name',
    label: 'Nhãn Hàng',
    render: (val) => <span className="font-medium text-smb-on-surface">{val}</span>,
  },
  {
    key: 'tier',
    label: 'Hạng Thành Viên',
    render: (val) => <TierBadge tier={val} />,
  },
  {
    key: 'walletBalance',
    label: 'Số Dư Ví',
    align: 'right',
    render: (val) => (
      <span className="font-medium tabular-nums text-smb-on-surface">
        {formatVND(val)} đ
      </span>
    ),
  },
  {
    key: 'totalSpent',
    label: 'Tổng Chi Tiêu',
    align: 'right',
    render: (val) => (
      <span className="text-smb-on-surface-variant tabular-nums">
        {formatVND(val)} đ
      </span>
    ),
  },
  {
    key: 'campaigns',
    label: 'Chiến Dịch',
    align: 'center',
    render: (_, row) => (
      <div className="text-center">
        <span className="font-semibold text-smb-on-surface">{row.activeCampaigns}</span>
        <span className="text-smb-on-surface-variant">/{row.totalCampaigns}</span>
      </div>
    ),
  },
  {
    key: 'impressions',
    label: 'Lượt Hiển Thị',
    align: 'right',
    render: (val) => (
      <span className="text-smb-on-surface-variant tabular-nums">{formatNumber(val)}</span>
    ),
  },
  {
    key: 'ctr',
    label: 'CTR',
    align: 'right',
    render: (val) => (
      <span className="font-semibold tabular-nums text-smb-primary-container">{val}</span>
    ),
  },
  {
    key: 'status',
    label: 'Trạng Thái',
    align: 'center',
    render: (val) => <StatusBadge status={val} />,
  },
  {
    key: 'actions',
    label: '',
    align: 'center',
    render: (_, row) => (
      <TableActions
        items={[
          { label: 'Xem chi tiết', icon: 'visibility', onClick: () => console.log('View', row.id) },
          { label: 'Nạp tiền ví', icon: 'add_card', onClick: () => console.log('Top up', row.id) },
          { label: 'Chỉnh sửa', icon: 'edit', onClick: () => console.log('Edit', row.id) },
        ]}
      />
    ),
  },
]

export function BrandTable() {
  return (
    <DataTable
      columns={COLUMNS}
      data={MOCK_BRANDS}
      searchable
      searchPlaceholder="Tìm kiếm nhãn hàng..."
      emptyMessage="Không tìm thấy nhãn hàng nào."
    />
  )
}

export default BrandTable
