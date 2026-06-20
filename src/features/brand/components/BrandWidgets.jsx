import React from 'react'
import { StatCard } from '../../../components/StatCard'
import { ChartCard } from '../../../components/ChartCard'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function MockBarChart({ data, color = '#5C6BC0' }) {
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="flex h-40 items-end gap-2 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              backgroundColor: color,
              opacity: 0.7 + (i / data.length) * 0.3,
            }}
          />
          <span className="text-[10px] text-smb-on-surface-variant">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function MockDonutChart({ segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let currentAngle = -90
  const paths = segments.map((seg) => {
    const pct = seg.value / total
    const angle = pct * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const toRad = (deg) => (deg * Math.PI) / 180
    const r = 40
    const cx = 50
    const cy = 50
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(endAngle))
    const y2 = cy + r * Math.sin(toRad(endAngle))
    const large = angle > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  })

  return (
    <div className="flex items-center gap-6 px-4 py-2">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0">
        {paths.map((path, i) => (
          <path key={i} d={path} fill={segments[i].color} />
        ))}
        <circle cx="50" cy="50" r="22" fill="var(--smb-surface-container-lowest)" />
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-smb-on-surface-variant">{seg.label}</span>
            <span className="ml-auto text-xs font-semibold text-smb-on-surface">
              {((seg.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const WALLET_MONTHLY_DATA = [
  { label: 'T1', value: 320_000_000 },
  { label: 'T2', value: 380_000_000 },
  { label: 'T3', value: 295_000_000 },
  { label: 'T4', value: 410_000_000 },
  { label: 'T5', value: 465_000_000 },
  { label: 'T6', value: 520_000_000 },
]

const TIER_SEGMENTS = [
  { label: 'Kim Cương', value: 4, color: '#7C4DFF' },
  { label: 'Vàng', value: 8, color: '#FFA726' },
  { label: 'Bạc', value: 5, color: '#90A4AE' },
  { label: 'Đồng', value: 3, color: '#BC8A5F' },
]

export function BrandWidgets() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Số Nhãn Hàng"
          value="20"
          subtitle="Đang hoạt động: 16"
          icon="store"
          trend="up"
          trendValue="+3 nhãn hàng mới trong tháng"
          color="primary"
        />
        <StatCard
          title="Tổng Ví Thương Hiệu"
          value="5.2T"
          subtitle="Nạp thêm: ~870B / tháng"
          icon="account_balance_wallet"
          trend="up"
          trendValue="+12% so với tháng trước"
          color="warning"
        />
        <StatCard
          title="Chiến Dịch Đang Chạy"
          value="47"
          subtitle="Từ 20 nhãn hàng đang hoạt động"
          icon="campaign"
          trend="up"
          trendValue="+8 so với tháng trước"
          color="info"
        />
        <StatCard
          title="Chi Phí Quảng Cáo"
          value="2.1T"
          subtitle="Tổng chi tiêu tháng này"
          icon="payments"
          trend="down"
          trendValue="-5% so với tháng trước"
          color="success"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Tổng Ví Theo Tháng"
          subtitle="Tổng số dư ví thương hiệu 6 tháng gần nhất (VND)"
          icon="bar_chart"
        >
          <MockBarChart data={WALLET_MONTHLY_DATA} color="#FFA726" />
        </ChartCard>

        <ChartCard
          title="Phân Bổ Theo Hạng Thành Viên"
          subtitle="Số lượng nhãn hàng theo hạng VIP"
          icon="donut_large"
        >
          <MockDonutChart segments={TIER_SEGMENTS} />
        </ChartCard>
      </div>
    </div>
  )
}

export default BrandWidgets
