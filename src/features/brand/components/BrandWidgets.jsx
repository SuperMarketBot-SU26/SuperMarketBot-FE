import React, { useEffect, useState } from 'react'
import { StatCard } from '../../../components/StatCard'
import { ChartCard } from '../../../components/ChartCard'
import { DonutChart, VerticalBarChart, HorizontalBarChart, SparklineChart } from '../../../components/Charts'
import { getBrands } from '../api/brandApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function LoadingSpinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-2xl text-smb-on-surface-variant">progress_activity</span>
    </div>
  )
}

function formatK(v) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}

export function BrandWidgets() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBrands()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.items ?? []
        setBrands(list)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Không thể tải dữ liệu nhãn hàng.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingSpinner />
  if (error) return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-smb-error">
      <Icon name="error" className="text-[18px]" />
      {error}
    </div>
  )

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalBrands = brands.length
  const totalWallet = brands.reduce((s, b) => s + (b.wallet || 0), 0)
  const activeCampaigns = brands.reduce((s, b) => s + (b.activeCampaignCount || 0), 0)
  const brandsWithCampaign = brands.filter(b => b.activeCampaignCount > 0).length

  // ── Bar chart: top 8 by wallet ───────────────────────────────────────────
  const topByWallet = [...brands]
    .sort((a, b) => (b.wallet || 0) - (a.wallet || 0))
    .slice(0, 8)

  const barData = topByWallet.map(b => ({
    label: b.brandName?.slice(0, 10) || `Brand ${b.brandId}`,
    value: b.wallet || 0,
  }))

  // ── Donut: brands with/without campaigns ─────────────────────────────────
  const donutData = [
    { label: 'Có chiến dịch', value: brandsWithCampaign, color: '#7C4DFF' },
    { label: 'Chưa có chiến dịch', value: Math.max(totalBrands - brandsWithCampaign, 0), color: '#90A4AE' },
  ]

  // ── Horizontal ranking: top 5 by wallet ──────────────────────────────────
  const rankData = topByWallet.slice(0, 5).map((b, i) => ({
    label: b.brandName?.slice(0, 14) || `Brand ${b.brandId}`,
    value: b.wallet || 0,
    color: ['#7C4DFF', '#26A69A', '#FFA726', '#66BB6A', '#EF5350'][i],
  }))

  // ── Sparkline: brand wallet distribution mock ────────────────────────────
  const sparkData = brands.slice(0, 8).map((_, i) => ({
    value: Math.random() * totalWallet * 0.3 + (i / 8) * totalWallet * 0.1,
  }))

  // ── Campaign count per brand (for second bar chart) ─────────────────────
  const topByCampaigns = [...brands]
    .sort((a, b) => (b.activeCampaignCount || 0) - (a.activeCampaignCount || 0))
    .slice(0, 6)

  const campaignBarData = topByCampaigns.map(b => ({
    label: b.brandName?.slice(0, 10) || `Brand ${b.brandId}`,
    value: b.activeCampaignCount || 0,
  }))

  const avgWallet = totalBrands > 0 ? totalWallet / totalBrands : 0
  const maxWallet = Math.max(...brands.map(b => b.wallet || 0), 0)

  return (
    <div className="space-y-5">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Tổng Nhãn Hàng"
          value={totalBrands}
          subtitle={`${brandsWithCampaign} đang có chiến dịch`}
          icon="store"
          trend={totalBrands > 0 ? 'up' : 'neutral'}
          trendValue={totalBrands > 0 ? `${totalBrands} nhãn hàng` : 'Chưa có'}
          color="primary"
        />
        <StatCard
          title="Tổng Ví"
          value={totalWallet >= 1_000_000_000 ? `${(totalWallet / 1_000_000_000).toFixed(1)}B` : totalWallet >= 1_000_000 ? `${(totalWallet / 1_000_000).toFixed(0)}M` : totalWallet.toLocaleString('vi-VN')}
          subtitle={`Trung bình ${formatK(avgWallet)}/nhãn hàng`}
          icon="account_balance_wallet"
          trend={totalWallet > 0 ? 'up' : 'neutral'}
          trendValue={totalWallet > 0 ? 'Đang hoạt động' : 'Chưa có số dư'}
          color="warning"
        />
        <StatCard
          title="Chiến Dịch Đang Chạy"
          value={activeCampaigns}
          subtitle={`Từ ${brandsWithCampaign} nhãn hàng`}
          icon="campaign"
          trend={activeCampaigns > 0 ? 'up' : 'neutral'}
          trendValue={activeCampaigns > 0 ? `${activeCampaigns} đang chạy` : 'Không có'}
          color="info"
        />
        <StatCard
          title="Nhãn Hàng Tích Cực"
          value={brandsWithCampaign}
          subtitle={`/ ${totalBrands} tổng`}
          icon="trending_up"
          trend={brandsWithCampaign > 0 ? 'up' : 'neutral'}
          trendValue={brandsWithCampaign > 0 ? `${brandsWithCampaign} tích cực` : 'Chưa có'}
          color="success"
        />
      </div>

      {/* ── Charts Row 1: Donut + Bar ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Donut: campaign ratio */}
        <ChartCard
          title="Tỷ Lệ Nhãn Hàng Có Chiến Dịch"
          subtitle="Tổng quan hoạt động quảng cáo"
          icon="donut_large"
        >
          <DonutChart
            data={donutData}
            size={150}
            thickness={26}
            showLegend
            showCenter
          />
        </ChartCard>

        {/* Bar: top by wallet */}
        <ChartCard
          title="Top Nhãn Hàng Theo Ví"
          subtitle="Số dư ví (VND)"
          icon="bar_chart"
        >
          {barData.length > 0 ? (
            <VerticalBarChart
              data={barData}
              color="#FFA726"
              colorEnd="#EF5350"
              height={220}
              barWidth={32}
              showValues
              formatValue={formatK}
              formatLabel={(l) => l.length > 8 ? l.slice(0, 8) + '…' : l}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-smb-on-surface-variant">
              <span className="material-symbols-outlined mr-1 text-lg opacity-50">bar_chart</span>
              Chưa có dữ liệu
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Charts Row 2: Horizontal Ranking + Campaign Bar ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Ranking */}
        {rankData.length > 0 && (
          <ChartCard
            title="Xếp Hạng Ví Nhãn Hàng"
            subtitle="Top 5 nhãn hàng có số dư cao nhất"
            icon="leaderboard"
          >
            <HorizontalBarChart
              data={rankData}
              color="#7C4DFF"
              colorEnd="#26A69A"
              height={44}
              formatValue={formatK}
            />
          </ChartCard>
        )}

        {/* Campaign count bar */}
        <ChartCard
          title="Chiến Dịch Theo Nhãn Hàng"
          subtitle="Số chiến dịch đang chạy"
          icon="campaign"
        >
          {campaignBarData.length > 0 ? (
            <VerticalBarChart
              data={campaignBarData}
              color="#26A69A"
              colorEnd="#5C6BC0"
              height={200}
              barWidth={36}
              showValues
              formatValue={(v) => String(v)}
              formatLabel={(l) => l.length > 8 ? l.slice(0, 8) + '…' : l}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-smb-on-surface-variant">
              <span className="material-symbols-outlined mr-1 text-lg opacity-50">campaign</span>
              Chưa có chiến dịch
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Brand Table ── */}
      <ChartCard title="Danh Sách Nhãn Hàng" icon="list_alt">
        <div className="mt-3 -mx-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-smb-outline-variant/50">
                <th className="px-3 py-2.5 text-left font-semibold text-smb-on-surface">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-smb-on-surface">Nhãn Hàng</th>
                <th className="px-3 py-2.5 text-left font-semibold text-smb-on-surface">Số Dư Ví</th>
                <th className="px-3 py-2.5 text-center font-semibold text-smb-on-surface">Chiến Dịch</th>
                <th className="px-3 py-2.5 text-center font-semibold text-smb-on-surface">Trạng Thái</th>
                <th className="px-3 py-2.5 text-right font-semibold text-smb-on-surface">Xu Hướng</th>
              </tr>
            </thead>
            <tbody>
              {topByWallet.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-smb-on-surface-variant">
                    <span className="material-symbols-outlined mr-1 text-xl opacity-40">store</span>
                    <br />Chưa có nhãn hàng nào.
                  </td>
                </tr>
              ) : topByWallet.map((b, idx) => {
                const walletPct = maxWallet > 0 ? ((b.wallet || 0) / maxWallet * 100) : 0
                return (
                  <tr key={b.brandId}
                    className="border-b border-smb-outline-variant/30 last:border-0 transition-colors hover:bg-smb-surface-container-low/50"
                  >
                    <td className="px-3 py-3">
                      <span className={`inline-flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${
                        idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-600' : 'bg-smb-surface-container-high text-smb-on-surface-variant'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-40">
                      <p className="truncate font-medium text-smb-on-surface">{b.brandName || `Brand #${b.brandId}`}</p>
                      {b.email && <p className="truncate text-[10px] text-smb-on-surface-variant">{b.email}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold tabular-nums text-smb-on-surface">
                          {formatK(b.wallet || 0)} đ
                        </span>
                        {/* Mini progress bar */}
                        <div className="w-16 rounded-full bg-smb-surface-container-high overflow-hidden h-1.5">
                          <div className="h-full rounded-full bg-linear-to-r from-smb-primary to-smb-primary-container"
                            style={{ width: `${walletPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[1.5rem] rounded-full px-2 py-0.5 text-xs font-semibold ${
                        (b.activeCampaignCount || 0) > 0
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                          : 'bg-smb-surface-container-high text-smb-on-surface-variant'
                      }`}>
                        {b.activeCampaignCount || 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        (b.activeCampaignCount || 0) > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {(b.activeCampaignCount || 0) > 0 && (
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {(b.activeCampaignCount || 0) > 0 ? 'Hoạt động' : 'Chưa có'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {sparkData.length > 1 && (
                        <SparklineChart
                          data={sparkData}
                          color={rankData[idx]?.color || '#7C4DFF'}
                          width={60}
                          height={24}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default BrandWidgets
