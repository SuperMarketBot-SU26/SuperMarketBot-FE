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

function MockLineChart({ data, color = '#5C6BC0' }) {
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max === min ? 1 : max - min
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((d.value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="relative h-40 w-full overflow-hidden px-2">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex justify-between px-2">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-smb-on-surface-variant">{d.label}</span>
        ))}
      </div>
    </div>
  )
}

const MONTHLY_DATA = [
  { label: 'T1', value: 42000000 },
  { label: 'T2', value: 38500000 },
  { label: 'T3', value: 51000000 },
  { label: 'T4', value: 47300000 },
  { label: 'T5', value: 55800000 },
  { label: 'T6', value: 61000000 },
]

const DAILY_DATA = [
  { label: 'T2', value: 1200000 },
  { label: 'T3', value: 980000 },
  { label: 'T4', value: 1450000 },
  { label: 'T5', value: 1100000 },
  { label: 'T6', value: 1320000 },
  { label: 'T7', value: 1680000 },
  { label: 'CN', value: 1890000 },
]

export function DashboardWidgets() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Chiến Dịch"
          value="12"
          subtitle="Đang hoạt động: 6"
          icon="campaign"
          trend="up"
          trendValue="+2 so với tháng trước"
          color="primary"
        />
        <StatCard
          title="Chi Phí Tháng Này"
          value="61M"
          subtitle="~10.2M / chiến dịch"
          icon="payments"
          trend="up"
          trendValue="+18% so với tháng trước"
          color="warning"
        />
        <StatCard
          title="Tổng Lượt Hiển Thị"
          value="334K"
          subtitle="Tăng 24% so với tháng trước"
          icon="visibility"
          trend="up"
          trendValue="+24% so với tháng trước"
          color="info"
        />
        <StatCard
          title="CTR Trung Bình"
          value="2.98%"
          subtitle="Qua 6 chiến dịch đang chạy"
          icon="touch_app"
          trend="down"
          trendValue="-0.3% so với tháng trước"
          color="success"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Chi Phí Theo Tháng"
          subtitle="Tổng chi phí quảng cáo 6 tháng gần nhất (VND)"
          icon="bar_chart"
        >
          <MockBarChart data={MONTHLY_DATA} color="#5C6BC0" />
        </ChartCard>

        <ChartCard
          title="Chi Phí Theo Ngày"
          subtitle="Chi tiêu trong tuần hiện tại (VND)"
          icon="show_chart"
        >
          <MockLineChart data={DAILY_DATA} color="#26A69A" />
        </ChartCard>
      </div>

      {/* Performance Table */}
      <ChartCard
        title="Top Chiến Dịch Theo Hiệu Suất"
        subtitle="Chiến dịch có CTR cao nhất trong tháng"
        icon="leaderboard"
      >
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-smb-outline-variant">
                <th className="px-4 py-2 text-left font-semibold text-smb-on-surface">Chiến Dịch</th>
                <th className="px-4 py-2 text-right font-semibold text-smb-on-surface">Ngân Sách</th>
                <th className="px-4 py-2 text-right font-semibold text-smb-on-surface">Hiển Thị</th>
                <th className="px-4 py-2 text-right font-semibold text-smb-on-surface">Nhấn</th>
                <th className="px-4 py-2 text-right font-semibold text-smb-on-surface">CTR</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Summer Sale - Vinamilk', budget: 45_000_000, impressions: 128450, clicks: 3842, ctr: '2.99%' },
                { name: 'Flash Sale Tháng 6 - TH True Milk', budget: 30_000_000, impressions: 89200, clicks: 2150, ctr: '2.41%' },
                { name: 'Ramadan Promo - Acecook', budget: 10_000_000, impressions: 41300, clicks: 720, ctr: '1.74%' },
                { name: 'Khuyến Mãi Mùa Hè - Nestlé', budget: 20_000_000, impressions: 54800, clicks: 980, ctr: '1.79%' },
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-smb-outline-variant last:border-0">
                  <td className="px-4 py-3 font-medium text-smb-on-surface">{row.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.budget.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.impressions.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.clicks.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums">{row.ctr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default DashboardWidgets
