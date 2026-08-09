/**
 * Dev-only demo page — preview CampaignLogsTab với mock data.
 *
 * Mounted at `/__demo/logs` for visual verification of context rendering
 * (zone name, product name, charge/refund reasons) without needing JWT.
 *
 * DELETE THIS FILE before production / before commit.
 *
 * NOTE: We don't monkey-patch ES modules (readonly). Instead we provide
 * mock data + mock enrichment via a sibling component <DemoCampaignLogsView>
 * that wraps the same row rendering logic.
 */

import React, { useMemo } from 'react'

// Hardcoded mock data
const MOCK_ZONES = {
  2: { zoneName: 'Khu vực Rau củ tươi', floorName: 'Tầng 1', floorId: 1 },
  5: { zoneName: 'Khu vực Sữa & Đồ uống', floorName: 'Tầng 2', floorId: 2 },
  8: { zoneName: 'Khu vực Bánh kẹo', floorName: 'Tầng 1', floorId: 1 },
}
const MOCK_PRODUCTS = {
  5: { productName: 'Sữa Vinamilk 1L' },
  12: { productName: 'Bánh Oreo 137g' },
  20: { productName: 'Mì Hảo Hảo Tôm chua cay' },
  33: { productName: 'Nước ngọt Coca-Cola 1.5L' },
}

const MOCK_LOGS = [
  {
    id: 92, action: 'RoutePass', zoneId: 2, robotId: 1, productId: 20, memberId: null,
    amount: null, description: 'Robot đi qua zone #2', performedBy: null,
    createdAt: '2026-08-09T16:25:12.000Z',
  },
  {
    id: 91, action: 'Click', zoneId: 5, robotId: null, productId: 5, memberId: 42,
    amount: -5000, description: 'Click 5.000 đ', performedBy: null,
    createdAt: '2026-08-09T16:20:05.000Z',
  },
  {
    id: 90, action: 'RoutePass', zoneId: 2, robotId: 1, productId: 20, memberId: null,
    amount: null, description: 'RoutePass logged for campaign', performedBy: null,
    createdAt: '2026-08-09T16:15:30.000Z',
  },
  {
    id: 89, action: 'Impression', zoneId: 2, robotId: null, productId: 5, memberId: null,
    amount: null, description: 'Banner impression', performedBy: null,
    createdAt: '2026-08-09T16:10:00.000Z',
  },
  {
    id: 88, action: 'Charge', zoneId: 5, robotId: null, productId: 5, memberId: null,
    amount: -30000, description: 'Click 30.000 đ', performedBy: 'admin2@supermarket.vn',
    createdAt: '2026-08-09T16:05:00.000Z',
  },
  {
    id: 87, action: 'Refund', zoneId: 8, robotId: null, productId: 12, memberId: null,
    amount: 50000, description: 'Hoàn tiền do hủy chiến dịch', performedBy: 'admin2@supermarket.vn',
    createdAt: '2026-08-09T15:55:00.000Z',
  },
  {
    id: 86, action: 'AssignZone', zoneId: 5, robotId: null, productId: null, memberId: null,
    amount: -15000, description: 'Zone charge', performedBy: 'admin2@supermarket.vn',
    createdAt: '2026-08-09T15:40:00.000Z',
  },
  {
    id: 85, action: 'Pause', zoneId: null, robotId: null, productId: null, memberId: null,
    amount: null, description: 'Đợi duyệt', performedBy: 'admin2@supermarket.vn',
    createdAt: '2026-08-09T15:30:00.000Z',
  },
  {
    id: 84, action: 'Activate', zoneId: null, robotId: null, productId: null, memberId: null,
    amount: null, description: null, performedBy: 'admin2@supermarket.vn',
    createdAt: '2026-08-09T15:25:00.000Z',
  },
  {
    id: 83, action: 'Charge', zoneId: null, robotId: null, productId: null, memberId: null,
    amount: -200000, description: 'Phí kích hoạt gói Premium', performedBy: 'admin2@supermarket.vn',
    createdAt: '2026-08-09T15:20:00.000Z',
  },
]

// Helper: build enrich function từ mock maps
function mockEnrich(log) {
  if (!log) return log
  const z = log.zoneId != null ? MOCK_ZONES[log.zoneId] : null
  const p = log.productId != null ? MOCK_PRODUCTS[log.productId] : null
  return {
    ...log,
    _zoneName: z?.zoneName || null,
    _floorName: z?.floorName || null,
    _productName: p?.productName || null,
  }
}

// Inline bản copy của các helper từ CampaignLogsTab — để demo render
// KHÔNG cần fetch từ BE thật.
function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const normalizeAction = (a) => {
  if (!a) return a
  const s = String(a)
  if (ACTION_META[s]) return s
  if (/^Resumed?$/i.test(s)) return 'Resume'
  if (/^Paused?$/i.test(s)) return 'Pause'
  if (/^(Activated|Activation)$/i.test(s)) return 'Activation'
  if (/^(Cancelled|Cancellation)$/i.test(s)) return 'Cancel'
  if (/^Completed?$/i.test(s)) return 'Complete'
  if (/^Charged?$/i.test(s)) return 'Charge'
  if (/^Refunded?$/i.test(s)) return 'Refund'
  return s
}

const ACTION_META = {
  Activate:     { label: 'Kích hoạt',   icon: 'play_circle',   color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  Activation:   { label: 'Kích hoạt',   icon: 'play_circle',   color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  Pause:        { label: 'Tạm dừng',    icon: 'pause_circle',  color: 'text-amber-600',   bg: 'bg-amber-500/10' },
  Resume:       { label: 'Tiếp tục',    icon: 'play_circle',   color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  Cancel:       { label: 'Hủy',         icon: 'block',         color: 'text-rose-600',    bg: 'bg-rose-500/10' },
  Complete:     { label: 'Hoàn thành',  icon: 'task_alt',      color: 'text-sky-600',     bg: 'bg-sky-500/10' },
  Create:       { label: 'Tạo',         icon: 'add_circle',    color: 'text-smb-primary-container', bg: 'bg-smb-primary-container/10' },
  Update:       { label: 'Cập nhật',    icon: 'edit',          color: 'text-smb-on-surface-variant', bg: 'bg-smb-surface-container' },
  AssignRoute:  { label: 'Gán tuyến',  icon: 'route',         color: 'text-smb-primary-container', bg: 'bg-smb-primary-container/10' },
  AssignZone:   { label: 'Gán khu vực', icon: 'grid_view',     color: 'text-smb-primary-container', bg: 'bg-smb-primary-container/10' },
  AssignShelf:  { label: 'Gán kệ',     icon: 'inventory_2',   color: 'text-smb-primary-container', bg: 'bg-smb-primary-container/10' },
  Impression:   { label: 'Lượt hiển thị', icon: 'visibility',  color: 'text-sky-600',     bg: 'bg-sky-500/10' },
  Click:        { label: 'Lượt nhấp',  icon: 'ads_click',     color: 'text-smb-primary-container', bg: 'bg-smb-primary-container/10' },
  RoutePass:    { label: 'Robot đi qua', icon: 'route',        color: 'text-sky-600',     bg: 'bg-sky-500/10' },
  Charge:       { label: 'Trừ phí',    icon: 'payments',      color: 'text-rose-600',    bg: 'bg-rose-500/10' },
  Refund:       { label: 'Hoàn tiền',  icon: 'undo',          color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
}

const formatVND = (val) => {
  if (val == null || val === 0) return '—'
  return `${Number(val).toLocaleString('vi-VN')} đ`
}

function buildContext(log, action) {
  const zName = log._zoneName
  const floor = log._floorName
  const pName = log._productName
  const zoneStr = zName
    ? floor ? `${zName} (${floor})` : zName
    : log.zoneId != null ? `Khu vực #${log.zoneId}` : null

  if (action === 'RoutePass') {
    const parts = []
    if (log.robotId != null) parts.push(`Robot #${log.robotId}`)
    if (zoneStr) parts.push(`đi qua ${zoneStr}`)
    if (pName) parts.push(`• sản phẩm ${pName}`)
    return parts.join(' ')
  }
  if (action === 'Impression') {
    const parts = ['Hiển thị banner']
    if (zoneStr) parts.push(`tại ${zoneStr}`)
    if (pName) parts.push(`• sản phẩm ${pName}`)
    if (log.memberId != null) parts.push(`• thành viên #${log.memberId}`)
    return parts.join(' ')
  }
  if (action === 'Click') {
    const parts = ['Click banner']
    if (zoneStr) parts.push(`tại ${zoneStr}`)
    if (pName) parts.push(`• sản phẩm ${pName}`)
    if (log.memberId != null) parts.push(`• thành viên #${log.memberId}`)
    return parts.join(' ')
  }
  if (action === 'Charge') {
    const reason = (log.description || '').replace(/\s*—\s*$/, '').trim()
    const parts = []
    if (reason) parts.push(reason)
    if (pName) parts.push(`— ${pName}`)
    else if (zoneStr) parts.push(`— ${zoneStr}`)
    return parts.join(' ')
  }
  if (action === 'Refund') {
    const reason = (log.description || '').replace(/\s*—\s*$/, '').trim()
    const parts = []
    if (reason) parts.push(reason)
    if (zoneStr) parts.push(`— ${zoneStr}`)
    else if (pName) parts.push(`— ${pName}`)
    return parts.join(' ')
  }
  if (action === 'AssignZone') {
    return zoneStr ? `Đã gán ${zoneStr}` : log.description || ''
  }
  if (action === 'Activate' || action === 'Activation') {
    return 'Chiến dịch được kích hoạt'
  }
  if (action === 'Pause') {
    return log.description ? `Tạm dừng: ${log.description}` : 'Tạm dừng chiến dịch'
  }
  return ''
}

function formatDateTime(s) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function DemoLogsPage() {
  return (
    <div className="min-h-screen bg-smb-surface">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>⚠️ DEMO MODE</strong> — Mock data để preview UI logs mới. Mount tại
          <code className="mx-1 rounded bg-amber-100 px-1">/__demo/logs</code>.
          Verify rằng <strong>tên zone</strong>, <strong>tên sản phẩm</strong>, và <strong>lý do charge/refund</strong> hiển thị đúng.
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-smb-on-surface-variant">history</span>
              <h3 className="text-sm font-semibold text-smb-on-surface">Lịch sử hoạt động</h3>
              <span className="rounded-full bg-smb-surface-container px-2 py-0.5 text-[11px] font-semibold text-smb-on-surface-variant">
                {MOCK_LOGS.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
            <table className="w-full text-sm">
              <thead className="bg-smb-surface-container">
                <tr className="text-left text-[11px] uppercase tracking-wider text-smb-on-surface-variant">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Hành động</th>
                  <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-4 py-3 font-semibold">Khu vực</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Số tiền</th>
                  <th className="px-4 py-3 font-semibold">Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LOGS.map((rawLog, idx) => {
                  const log = mockEnrich(rawLog)
                  const action = normalizeAction(log.action)
                  const meta = ACTION_META[action] || {
                    label: log.action || '—', icon: 'event_note',
                    color: 'text-smb-on-surface-variant', bg: 'bg-smb-surface-container',
                  }
                  const timestamp = log.createdAt
                  const amount = log.amount
                  const contextStr = buildContext(log, action)
                  const hasProduct = log._productName || log.productId != null
                  const hasZone = log._zoneName || log.floorName || log.zoneId != null
                  return (
                    <tr key={log.id ?? idx} className="border-t border-smb-outline-variant/40">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-smb-on-surface-variant tabular-nums">
                        {formatDateTime(timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.bg} ${meta.color}`}>
                            <Icon name={meta.icon} className="text-[14px]" />
                            {meta.label}
                          </span>
                          {contextStr && (
                            <span className="text-[11px] leading-snug text-smb-on-surface">{contextStr}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log._productName ? (
                          <span className="font-medium text-smb-on-surface">{log._productName}</span>
                        ) : hasProduct ? (
                          <span className="text-smb-on-surface-variant">#{log.productId}</span>
                        ) : (
                          <span className="text-smb-on-surface-variant/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log._zoneName ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-smb-on-surface">{log._zoneName}</span>
                            {log._floorName && (
                              <span className="text-[10px] text-smb-on-surface-variant">{log._floorName}</span>
                            )}
                          </div>
                        ) : hasZone ? (
                          <span className="text-smb-on-surface-variant">Khu vực #{log.zoneId}</span>
                        ) : (
                          <span className="text-smb-on-surface-variant/60">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {amount != null && amount !== 0 ? (
                          <span className={`font-semibold ${amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {amount > 0 ? '+' : ''}{formatVND(amount)}
                          </span>
                        ) : (
                          <span className="text-sm text-smb-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-smb-on-surface">
                        <div className="flex flex-col gap-0.5">
                          {log.performedBy && (
                            <span className="font-medium text-smb-on-surface">{log.performedBy}</span>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-smb-on-surface-variant/80">
                            {log.robotId != null && <span>Robot #{log.robotId}</span>}
                            {log.memberId != null && <span>Thành viên #{log.memberId}</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
