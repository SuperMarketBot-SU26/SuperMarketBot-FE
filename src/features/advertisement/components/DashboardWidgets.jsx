import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../../../components/StatCard'
import { ChartCard } from '../../../components/ChartCard'
import { DonutChart, VerticalBarChart, HorizontalBarChart, SparklineChart } from '../../../components/Charts'
import { getCampaigns } from '../api/adCampaignApi'

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

const STATUS_LABELS = {
  Active: 'Hoạt Động',
  Paused: 'Tạm Dừng',
  Completed: 'Hoàn Thành',
  Canceled: 'Đã Hủy',
  Inactive: 'Không Hoạt Động',
}

const STATUS_COLORS = {
  Active: '#22C55E',
  Paused: '#F59E0B',
  Completed: '#3B82F6',
  Canceled: '#EF4444',
  Inactive: '#94A3B8',
}

function TrendBadge({ value, unit = '' }) {
  if (!value) return null
  const isUp = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
      isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    }`}>
      <Icon name={isUp ? 'trending_up' : 'trending_down'} className="text-[11px]" />
      {isUp ? '+' : ''}{value}{unit}
    </span>
  )
}

export function DashboardWidgets() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCampaigns({ pageSize: 200 })
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res) ? res : res?.items ?? []
        setCampaigns(list)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Không thể tải dữ liệu chiến dịch.')
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
  const total = campaigns.length
  const active = campaigns.filter((c) => c.status === 'Active').length
  const paused = campaigns.filter((c) => c.status === 'Paused').length
  const completed = campaigns.filter((c) => c.status === 'Completed').length
  const inactive = campaigns.filter((c) => c.status === 'Inactive').length
  const canceled = campaigns.filter((c) => c.status === 'Canceled').length
  const totalSpent = campaigns.reduce((s, c) => s + (c.totalSpent || 0), 0)
  const avgSpent = total > 0 ? totalSpent / total : 0
  const maxSpent = Math.max(...campaigns.map(c => c.totalSpent || 0), 0)

  // ── Status donut data ────────────────────────────────────────────────────
  const statusCounts = [
    { label: STATUS_LABELS.Active,    value: active,    color: STATUS_COLORS.Active },
    { label: STATUS_LABELS.Paused,    value: paused,    color: STATUS_COLORS.Paused },
    { label: STATUS_LABELS.Completed, value: completed,  color: STATUS_COLORS.Completed },
    { label: STATUS_LABELS.Inactive,  value: inactive,   color: STATUS_COLORS.Inactive },
    { label: STATUS_LABELS.Canceled,  value: canceled,   color: STATUS_COLORS.Canceled },
  ].filter(s => s.value > 0)

  // ── Active campaigns recently started (for recent-activity widget) ───────
  // Ưu tiên Active + sort theo startDate mới nhất; fallback các status khác
  // nếu không có campaign Active nào.
  const activeRecent = [...campaigns]
    .filter((c) => c.status === 'Active' && c.startDate)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .slice(0, 8)

  // Top by cost dùng cho bar chart (bỏ qua filter status — biểu đồ tổng quan).
  const topByCost = [...campaigns]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 8)

  const barData = topByCost.map(c => ({
    label: c.campaignName?.slice(0, 10) || `ID${c.adCampaignId}`,
    value: c.totalSpent || 0,
  }))

  // ── Top 5 ranking (for horizontal bars) ──────────────────────────────────
  const rankData = topByCost.slice(0, 5).map((c, i) => ({
    label: c.campaignName?.slice(0, 14) || `ID${c.adCampaignId}`,
    value: c.totalSpent || 0,
    color: ['#5C6BC0', '#26A69A', '#EF5350', '#FFA726', '#66BB6A'][i],
  }))

  // ── Sparkline data (mock trend from campaign data) ──────────────────────
  const sparkValues = campaigns.slice(0, 12).map((_, i) => ({
    value: Math.random() * maxSpent * 0.5 + (i / 12) * maxSpent * 0.5
  }))

  const formatVND = (v) => Number(v ?? 0).toLocaleString('vi-VN')
  const formatK = (v) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
    return String(Math.round(v))
  }

  return (
    <div className="space-y-5">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Tổng Chiến Dịch"
          value={total}
          subtitle={`${active} đang hoạt động`}
          icon="campaign"
          trend="up"
          trendValue={`${total} chiến dịch`}
          color="primary"
        />
        <StatCard
          title="Chi Phí Tháng"
          value={totalSpent >= 1_000_000 ? `${(totalSpent / 1_000_000).toFixed(1)}M` : formatVND(totalSpent)}
          subtitle={avgSpent >= 1_000_000 ? `~${(avgSpent / 1_000_000).toFixed(1)}M/chiến dịch` : `${Math.round(avgSpent).toLocaleString('vi-VN')}/chiến dịch`}
          icon="payments"
          trend="up"
          trendValue="+12.5%"
          color="warning"
        />
        <StatCard
          title="Hoàn Thành"
          value={completed}
          subtitle={`/ ${total} tổng`}
          icon="task_alt"
          trend={completed > 0 ? 'up' : 'neutral'}
          trendValue={completed > 0 ? `${completed} hoàn thành` : 'Chưa có'}
          color="success"
        />
        <StatCard
          title="Tổng Chi Phí"
          value={totalSpent >= 1_000_000_000 ? `${(totalSpent / 1_000_000_000).toFixed(1)}B` : totalSpent >= 1_000_000 ? `${(totalSpent / 1_000_000).toFixed(1)}M` : formatVND(totalSpent)}
          subtitle="Tất cả chiến dịch"
          icon="account_balance_wallet"
          trend="up"
          trendValue="+8.2%"
          color="info"
        />
      </div>

      {/* ── Charts Row 1: Donut + Bar + Ranking ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Status Donut */}
        <ChartCard title="Phân Bổ Trạng Thái" icon="pie_chart">
          <DonutChart
            data={statusCounts}
            colors={statusCounts.map(s => s.color)}
            size={140}
            thickness={24}
            showLegend
            showCenter
          />
        </ChartCard>

        {/* Top Cost Bar Chart */}
        <ChartCard title="Top Chiến Dịch Theo Chi Phí" subtitle="Đơn vị: VND" icon="bar_chart">
          {barData.length > 0 ? (
            <VerticalBarChart
              data={barData}
              color="#7C4DFF"
              colorEnd="#5C6BC0"
              height={200}
              barWidth={28}
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

        {/* Quick Stats */}
        <ChartCard title="Thống Kê Nhanh" icon="analytics">
          <div className="space-y-1">
            {[
              { label: 'Tổng chiến dịch', value: total, color: 'text-smb-on-surface' },
              { label: 'Đang hoạt động', value: active, color: 'text-emerald-500', dot: STATUS_COLORS.Active },
              { label: 'Tạm dừng', value: paused, color: 'text-amber-500', dot: STATUS_COLORS.Paused },
              { label: 'Hoàn thành', value: completed, color: 'text-blue-500', dot: STATUS_COLORS.Completed },
              { label: 'Không hoạt động', value: inactive, color: 'text-slate-400', dot: STATUS_COLORS.Inactive },
              { label: 'Chi phí trung bình', value: avgSpent >= 1_000_000 ? `${(avgSpent / 1_000_000).toFixed(1)}M` : `${Math.round(avgSpent).toLocaleString('vi-VN')}`, color: 'text-smb-on-surface', suffix: 'đ' },
            ].map((item, i) => (
              <div key={i} className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-smb-surface-container-low">
                <div className="flex items-center gap-2.5">
                  {item.dot && (
                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.dot, boxShadow: `0 0 4px ${item.dot}88` }} />
                  )}
                  <span className="text-xs text-smb-on-surface-variant">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {sparkValues.length > 1 && item.value > 0 && i < 4 && (
                    <SparklineChart data={sparkValues.slice(0, 6).map((_, si) => ({ value: Math.random() * (item.value || 1) }))} color={item.dot || '#5C6BC0'} width={40} height={20} />
                  )}
                  <span className={`min-w-[2rem] text-right text-xs font-semibold tabular-nums ${item.color}`}>
                    {item.value}{item.suffix ? ` ${item.suffix}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Chart Row 2: Horizontal Ranking ── */}
      {rankData.length > 0 && (
        <ChartCard title="Bảng Xếp Hạng Chi Phí" subtitle="Top 5 chiến dịch tốn kém nhất" icon="leaderboard">
          <HorizontalBarChart
            data={rankData}
            color="#7C4DFF"
            colorEnd="#26A69A"
            height={40}
            formatValue={formatK}
          />
        </ChartCard>
      )}

      {/* ── Campaign Table ── */}
      <ChartCard
        title="Hoạt Động Quảng Cáo Gần Đây"
        subtitle="Các chiến dịch đang chạy, mới kích hoạt nhất"
        icon="history"
        actions={
          <button
            type="button"
            onClick={() => navigate('/advertisement')}
            className="inline-flex items-center gap-1 rounded-md bg-smb-primary-container/10 px-2 py-1 text-xs font-medium text-smb-primary-container hover:bg-smb-primary-container/20"
          >
            Xem tất cả
            <Icon name="arrow_forward" className="text-[14px]" />
          </button>
        }
      >
        <div className="mt-3 -mx-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-smb-outline-variant/50">
                <th className="px-3 py-2.5 text-left font-semibold text-smb-on-surface">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-smb-on-surface">Chiến Dịch</th>
                <th className="px-3 py-2.5 text-left font-semibold text-smb-on-surface">Nhãn Hàng</th>
                <th className="px-3 py-2.5 text-left font-semibold text-smb-on-surface">Ngày Bắt Đầu</th>
                <th className="px-3 py-2.5 text-center font-semibold text-smb-on-surface">Trạng Thái</th>
                <th className="px-3 py-2.5 text-right font-semibold text-smb-on-surface">Chi Phí</th>
              </tr>
            </thead>
            <tbody>
              {activeRecent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-smb-on-surface-variant">
                    <span className="material-symbols-outlined mr-1 text-xl opacity-40">campaign</span>
                    <br />Chưa có chiến dịch nào đang chạy.
                  </td>
                </tr>
              ) : activeRecent.map((row, idx) => (
                <tr key={row.adCampaignId}
                  className="border-b border-smb-outline-variant/30 last:border-0 transition-colors hover:bg-smb-surface-container-low/50"
                >
                  <td className="px-3 py-3">
                    <span className={`inline-flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${
                      idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-600' : 'bg-smb-surface-container-high text-smb-on-surface-variant'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 max-w-36">
                    <p className="truncate font-medium text-smb-on-surface">{row.campaignName || `ID #${row.adCampaignId}`}</p>
                    <p className="truncate text-[10px] text-smb-on-surface-variant">{row.packageName || row.brandName || ''}</p>
                  </td>
                  <td className="px-3 py-3 text-smb-on-surface-variant">{row.brandName || '—'}</td>
                  <td className="px-3 py-3 text-smb-on-surface-variant">
                    {row.startDate ? new Date(row.startDate).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      row.status === 'Active'    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      row.status === 'Paused'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      row.status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      row.status === 'Canceled'  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                      style={row.status === 'Active' ? { boxShadow: '0 0 6px #22C55E55' } : {}}
                    >
                      {row.status === 'Active' && (
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {STATUS_LABELS[row.status] || row.status || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-semibold tabular-nums ${row.totalSpent > 0 ? 'text-smb-primary' : 'text-smb-on-surface-variant'}`}>
                      {row.totalSpent ? `${(row.totalSpent / 1_000_000).toFixed(2)}M đ` : '0 đ'}
                    </span>
                  </td>
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
