import React, { useEffect, useState, useMemo } from 'react'
import { StatCard } from '../../../components/StatCard'
import { ChartCard } from '../../../components/ChartCard'
import { DonutChart, VerticalBarChart } from '../../../components/Charts'
import { getBrands } from '../api/brandApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const BRAND_GRADIENTS = [
  'from-rose-500 to-red-600 text-white',
  'from-blue-500 to-indigo-600 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-emerald-500 to-teal-600 text-white',
  'from-violet-500 to-purple-600 text-white',
  'from-cyan-500 to-sky-600 text-white',
]

export function getBrandGradient(brandName = '') {
  let hash = 0
  for (let i = 0; i < brandName.length; i++) {
    hash = (hash << 5) - hash + brandName.charCodeAt(i)
    hash |= 0
  }
  return BRAND_GRADIENTS[Math.abs(hash) % BRAND_GRADIENTS.length]
}

export function getBrandInitials(name = '') {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function BrandWidgets({ brands: propBrands, loading: propLoading }) {
  const [internalBrands, setInternalBrands] = useState([])
  const [internalLoading, setInternalLoading] = useState(false)
  const [chartView, setChartView] = useState('chart') // 'chart' | 'rank'

  const brands = propBrands ?? internalBrands
  const loading = propLoading ?? internalLoading

  useEffect(() => {
    if (propBrands !== undefined) return
    let cancelled = false
    setInternalLoading(true)
    getBrands()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.items ?? []
        setInternalBrands(list)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInternalLoading(false)
      })
    return () => { cancelled = true }
  }, [propBrands])

  // ── Metrics Calculation ────────────────────────────────────────────────
  const totalBrands = brands.length
  const activeCampaigns = useMemo(
    () => brands.reduce((sum, b) => sum + (b.activeCampaignCount || 0), 0),
    [brands]
  )
  const brandsWithCampaign = useMemo(
    () => brands.filter((b) => (b.activeCampaignCount || 0) > 0).length,
    [brands]
  )
  const brandsWithoutCampaign = Math.max(totalBrands - brandsWithCampaign, 0)
  const activePct = totalBrands > 0 ? Math.round((brandsWithCampaign / totalBrands) * 100) : 0

  // ── Donut Chart Data ───────────────────────────────────────────────────
  const donutData = useMemo(() => {
    if (totalBrands === 0) {
      return [{ label: 'Chưa có nhãn hàng', value: 1, color: '#94A3B8' }]
    }
    const data = []
    if (brandsWithCampaign > 0) {
      data.push({ label: 'Có chiến dịch', value: brandsWithCampaign, color: '#10B981' })
    }
    if (brandsWithoutCampaign > 0) {
      data.push({ label: 'Chưa có chiến dịch', value: brandsWithoutCampaign, color: '#94A3B8' })
    }
    return data
  }, [brandsWithCampaign, brandsWithoutCampaign, totalBrands])

  // ── Campaign Bar Data ──────────────────────────────────────────────────
  const topByCampaigns = useMemo(() => {
    return [...brands]
      .sort((a, b) => (b.activeCampaignCount || 0) - (a.activeCampaignCount || 0))
      .slice(0, 6)
  }, [brands])

  const campaignBarData = useMemo(() => {
    return topByCampaigns.map((b) => ({
      label: b.brandName || `Brand #${b.brandId}`,
      value: b.activeCampaignCount || 0,
    }))
  }, [topByCampaigns])

  if (loading && !propBrands) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-smb-surface-container-low border border-smb-outline-variant/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── 1. KPI Stats Cards Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Số Nhãn Hàng"
          value={totalBrands}
          subtitle={`${brandsWithCampaign} nhãn hàng đang chạy quảng cáo`}
          icon="storefront"
          trend={totalBrands > 0 ? 'up' : 'neutral'}
          trendValue={totalBrands > 0 ? `${totalBrands} đối tác liên kết` : 'Chưa có đối tác'}
          color="primary"
        />
        <StatCard
          title="Nhãn Hàng Hoạt Động"
          value={brandsWithCampaign}
          subtitle={`${activePct}% tổng số đối tác`}
          icon="verified"
          trend={brandsWithCampaign > 0 ? 'up' : 'neutral'}
          trendValue={brandsWithCampaign > 0 ? 'Đang phát sóng' : 'Chưa kích hoạt'}
          color="success"
        />
        <StatCard
          title="Chiến Dịch Đang Chạy"
          value={activeCampaigns}
          subtitle={`Phát sóng trên hệ thống robot`}
          icon="campaign"
          trend={activeCampaigns > 0 ? 'up' : 'neutral'}
          trendValue={activeCampaigns > 0 ? `${activeCampaigns} chiến dịch realtime` : '0 chiến dịch'}
          color="info"
        />
        <StatCard
          title="Tỷ Lệ Phủ Sóng"
          value={`${activePct}%`}
          subtitle={`${brandsWithoutCampaign} nhãn hàng chưa có chiến dịch`}
          icon="donut_large"
          trend={activePct >= 50 ? 'up' : 'neutral'}
          trendValue={activePct >= 50 ? 'Độ phủ cao' : 'Tiềm năng mở rộng'}
          color="warning"
        />
      </div>

      {/* ── 2. Visual Analytics Row ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Donut Chart: Campaign Activation Ratio */}
        <div className="lg:col-span-5 flex flex-col">
          <ChartCard
            title="Tỷ Lệ Nhãn Hàng Có Chiến Dịch"
            subtitle="Tổng quan hoạt động quảng cáo của các đối tác"
            icon="donut_large"
            className="flex-1 flex flex-col justify-between"
          >
            <div className="py-2 flex flex-col sm:flex-row items-center justify-around gap-6">
              <div className="shrink-0">
                <DonutChart
                  data={donutData}
                  size={148}
                  thickness={24}
                  showLegend={false}
                  showCenter
                />
              </div>

              {/* Enhanced Legend Breakdown */}
              <div className="flex-1 w-full space-y-3 min-w-[180px]">
                {/* Active */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 transition-colors hover:bg-emerald-500/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
                      <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
                      Có chiến dịch
                    </span>
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      {brandsWithCampaign} <span className="font-normal text-emerald-700/80">({activePct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-emerald-200/50 dark:bg-emerald-950/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${activePct}%` }}
                    />
                  </div>
                </div>

                {/* Inactive */}
                <div className="rounded-xl border border-slate-300/40 bg-slate-100/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/40 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                      <span className="size-2 rounded-full bg-slate-400" />
                      Chưa có chiến dịch
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {brandsWithoutCampaign} <span className="font-normal text-slate-500">({100 - activePct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-400 transition-all duration-500"
                      style={{ width: `${100 - activePct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Bar / Ranking: Campaigns per Brand */}
        <div className="lg:col-span-7 flex flex-col">
          <ChartCard
            title="Chiến Dịch Theo Nhãn Hàng"
            subtitle="Phân bổ số chiến dịch đang chạy theo thương hiệu"
            icon="bar_chart"
            actions={
              <div className="inline-flex rounded-lg border border-smb-outline-variant/60 bg-smb-surface-container-low p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setChartView('chart')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all ${
                    chartView === 'chart'
                      ? 'bg-smb-surface-container-lowest text-smb-primary shadow-xs font-semibold'
                      : 'text-smb-on-surface-variant hover:text-smb-on-surface'
                  }`}
                >
                  <Icon name="bar_chart" className="text-[14px]" />
                  Biểu đồ
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('rank')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all ${
                    chartView === 'rank'
                      ? 'bg-smb-surface-container-lowest text-smb-primary shadow-xs font-semibold'
                      : 'text-smb-on-surface-variant hover:text-smb-on-surface'
                  }`}
                >
                  <Icon name="format_list_numbered" className="text-[14px]" />
                  Xếp hạng
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            {chartView === 'chart' ? (
              <div className="py-2">
                {campaignBarData.length > 0 ? (
                  <VerticalBarChart
                    data={campaignBarData}
                    color="#10B981"
                    colorEnd="#059669"
                    height={190}
                    barWidth={38}
                    gap={16}
                    showValues
                    formatValue={(v) => `${v}`}
                    formatLabel={(label) => (label.length > 10 ? label.slice(0, 9) + '…' : label)}
                  />
                ) : (
                  <div className="flex h-44 flex-col items-center justify-center text-sm text-smb-on-surface-variant">
                    <Icon name="storefront" className="text-3xl opacity-40 mb-1" />
                    <span>Chưa có dữ liệu nhãn hàng</span>
                  </div>
                )}
              </div>
            ) : (
              /* Top Brands Leaderboard View */
              <div className="space-y-2 py-1">
                {topByCampaigns.map((b, idx) => {
                  const maxCampaigns = Math.max(...topByCampaigns.map((x) => x.activeCampaignCount || 0), 1)
                  const pct = Math.round(((b.activeCampaignCount || 0) / maxCampaigns) * 100)
                  return (
                    <div
                      key={b.brandId}
                      className="flex items-center gap-3 rounded-xl border border-smb-outline-variant/30 bg-smb-surface-container-lowest/70 p-2.5 transition-all hover:bg-smb-surface-container-low hover:border-smb-primary-container/30"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-smb-surface-container-high text-xs font-bold text-smb-on-surface-variant">
                        {idx + 1}
                      </span>
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br ${getBrandGradient(b.brandName)} text-xs font-bold shadow-xs`}>
                        {getBrandInitials(b.brandName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <p className="truncate font-semibold text-smb-on-surface">{b.brandName}</p>
                          <span className={`font-bold tabular-nums ${
                            (b.activeCampaignCount || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-smb-on-surface-variant'
                          }`}>
                            {b.activeCampaignCount || 0} chiến dịch
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-smb-surface-container-high overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

export default BrandWidgets
