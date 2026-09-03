import React, { useEffect, useState } from 'react'
import { StatCard } from '../../../components/StatCard'
import { ChartCard } from '../../../components/ChartCard'
import { DonutChart, VerticalBarChart } from '../../../components/Charts'
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
  const activeCampaigns = brands.reduce((s, b) => s + (b.activeCampaignCount || 0), 0)
  const brandsWithCampaign = brands.filter(b => b.activeCampaignCount > 0).length

  // ── Donut: brands with/without campaigns ─────────────────────────────────
  const donutData = [
    { label: 'Có chiến dịch', value: brandsWithCampaign, color: '#7C4DFF' },
    { label: 'Chưa có chiến dịch', value: Math.max(totalBrands - brandsWithCampaign, 0), color: '#90A4AE' },
  ]

  // ── Campaign count per brand ─────────────────────────────────────────────
  const topByCampaigns = [...brands]
    .sort((a, b) => (b.activeCampaignCount || 0) - (a.activeCampaignCount || 0))
    .slice(0, 6)

  const campaignBarData = topByCampaigns.map(b => ({
    label: b.brandName?.slice(0, 10) || `Brand ${b.brandId}`,
    value: b.activeCampaignCount || 0,
  }))

  return (
    <div className="space-y-5">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          title="Chiến Dịch Đang Chạy"
          value={activeCampaigns}
          subtitle={`Từ ${brandsWithCampaign} nhãn hàng`}
          icon="campaign"
          trend={activeCampaigns > 0 ? 'up' : 'neutral'}
          trendValue={activeCampaigns > 0 ? `${activeCampaigns} đang chạy` : 'Không có'}
          color="info"
        />
        <StatCard
          title="Nhãn Hàng Hoạt Động"
          value={brandsWithCampaign}
          subtitle={`/ ${totalBrands} tổng`}
          icon="trending_up"
          trend={brandsWithCampaign > 0 ? 'up' : 'neutral'}
          trendValue={brandsWithCampaign > 0 ? `${brandsWithCampaign} hoạt động` : 'Chưa có'}
          color="success"
        />
      </div>

      {/* ── Charts Row ── */}
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
                <th className="px-3 py-2.5 text-center font-semibold text-smb-on-surface">Chiến Dịch</th>
                <th className="px-3 py-2.5 text-center font-semibold text-smb-on-surface">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-smb-on-surface-variant">
                    <span className="material-symbols-outlined mr-1 text-xl opacity-40">store</span>
                    <br />Chưa có nhãn hàng nào.
                  </td>
                </tr>
              ) : brands.map((b, idx) => {
                return (
                  <tr key={b.brandId}
                    className="border-b border-smb-outline-variant/30 last:border-0 transition-colors hover:bg-smb-surface-container-low/50"
                  >
                    <td className="px-3 py-3">
                      <span className="inline-flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white bg-smb-surface-container-high text-smb-on-surface-variant">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-40">
                      <p className="truncate font-medium text-smb-on-surface">{b.brandName || `Brand #${b.brandId}`}</p>
                      {b.description && <p className="truncate text-[10px] text-smb-on-surface-variant">{b.description}</p>}
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
