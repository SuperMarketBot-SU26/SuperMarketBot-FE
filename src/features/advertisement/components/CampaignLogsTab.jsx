import React, { useEffect, useState } from 'react'
import { getCampaignLogs } from '../api/adCampaignApi'
import { useAdLogEnrichment } from '../../../hooks/useAdLogEnrichment'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// Map BE action names → UI label/icon.
// BE returns verb forms like "Resumed", "Paused", "Activation" — normalize to canonical keys.
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

/**
 * Build a human-readable context sentence from a log row.
 * Example outputs:
 *   "Robot #1 đi qua Khu vực Rau củ (Tầng 1)"
 *   "Click banner, sản phẩm Sữa Vinamilk 1L"
 *   "Trừ phí click 5.000 đ — Sữa Vinamilk 1L"
 *   "Hoàn tiền 50.000 đ — Khu vực Rau củ (do hủy chiến dịch)"
 * Returns empty string when there's nothing useful to say.
 */
function buildContext(log, action) {
  const zName = log._zoneName
  const floor = log._floorName
  const pName = log._productName
  const zoneStr = zName
    ? floor
      ? `${zName} (${floor})`
      : zName
    : log.zoneId != null
      ? `Khu vực #${log.zoneId}`
      : null

  // --- Action-specific ---
  if (action === 'RoutePass' || action === 'RoutePass') {
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
    // log.description typically carries the reason (e.g. "Click 5.000 đ", "Zone charge 30.000 đ")
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
  if (action === 'AssignRoute') {
    return log.description ? `Đã gán ${log.description}` : 'Đã gán tuyến'
  }
  if (action === 'AssignShelf') {
    return log.description ? `Đã gán ${log.description}` : 'Đã gán kệ'
  }
  if (action === 'Activate' || action === 'Activation') {
    return 'Chiến dịch được kích hoạt'
  }
  if (action === 'Pause') {
    return log.description ? `Tạm dừng: ${log.description}` : 'Tạm dừng chiến dịch'
  }
  if (action === 'Resume') {
    return 'Tiếp tục chiến dịch'
  }
  if (action === 'Cancel') {
    return log.description ? `Hủy: ${log.description}` : 'Hủy chiến dịch'
  }
  return ''
}

const formatVND = (val) => {
  if (val == null || val === 0) return '—'
  return `${Number(val).toLocaleString('vi-VN')} đ`
}

// Parse BE timestamp. BE trả 2 format hỗn hợp:
//   - ISO UTC:       "2026-08-09T07:33:10.962Z"
//   - Naive VN time: "2026-08-09T07:23:26.3017710"   (BE lưu theo giờ VN, UTC+7)
// Naive → gắn +07:00 trước khi parse để hiển thị đúng giờ VN.
function parseVNDate(s) {
  if (!s) return null
  const str = String(s).trim()
  if (!str) return null
  const hasTZ = /[Zz]$|[+\-]\d{2}:?\d{2}$/.test(str)
  if (hasTZ) {
    const d = new Date(str)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?/)
  if (!m) {
    const d = new Date(str)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+07:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const formatDateTime = (val) => {
  const d = parseVNDate(val)
  if (!d) return '—'
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function CampaignLogsTab({ campaignId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Resolve zoneId/productId → tên zone/sản phẩm (cache theo campaignId)
  const { enrichLog, isReady } = useAdLogEnrichment(logs, campaignId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getCampaignLogs(campaignId, pageNumber, pageSize)
      .then((data) => {
        if (cancelled) return
        // Debug: log shape nếu items có vẻ lạ
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[CampaignLogs] response:', data)
        }
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (items.length > 0 && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[CampaignLogs] first item keys:', Object.keys(items[0]))
        }
        setLogs(items)
        setTotalPages(data?.totalPages ?? 1)
        setTotalCount(data?.totalCount ?? items.length)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.error || err.message || 'Không tải được nhật ký.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [campaignId, pageNumber, pageSize])

  return (
    <div className="space-y-4">
      {/* Header row với badge count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-smb-on-surface-variant">
            history
          </span>
          <h3 className="text-sm font-semibold text-smb-on-surface">Lịch sử hoạt động</h3>
          <span className="rounded-full bg-smb-surface-container px-2 py-0.5 text-[11px] font-semibold text-smb-on-surface-variant">
            {totalCount}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <Icon name="error" className="text-[18px] shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest py-12 text-sm text-smb-on-surface-variant">
          <Icon name="progress_activity" className="mr-2 animate-spin text-[16px]" />
          Đang tải nhật ký...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest py-12 text-center text-sm text-smb-on-surface-variant">
          <Icon name="history" className="mx-auto mb-2 block text-[28px]" />
          Chưa có nhật ký cho chiến dịch này.
        </div>
      ) : (
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
              {logs.map((rawLog, idx) => {
                const log = enrichLog(rawLog)
                const action = normalizeAction(log.action)
                const meta = ACTION_META[action] || {
                  label: log.action || '—',
                  icon: 'event_note',
                  color: 'text-smb-on-surface-variant',
                  bg: 'bg-smb-surface-container',
                }
                // BE có thể trả: timestamp / createdAt / occurredAt → fallback chain
                const timestamp = log.createdAt ?? log.timestamp ?? log.occurredAt ?? log.createdDate
                const amount = log.amount ?? log.chargedAmount ?? log.deltaAmount
                const contextStr = buildContext(log, action)
                const hasProduct = log._productName || log.productId != null
                const hasZone = log._zoneName || log.floorName || log.zoneId != null
                return (
                  <tr
                    key={log.id ?? log.logId ?? idx}
                    className="border-t border-smb-outline-variant/40 transition-colors hover:bg-smb-surface-container/50"
                  >
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
                          <span className="text-[11px] leading-snug text-smb-on-surface">
                            {contextStr}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Sản phẩm */}
                    <td className="px-4 py-3 text-xs">
                      {log._productName ? (
                        <span className="font-medium text-smb-on-surface">{log._productName}</span>
                      ) : hasProduct ? (
                        <span className="text-smb-on-surface-variant">#{log.productId}</span>
                      ) : (
                        <span className="text-smb-on-surface-variant/60">—</span>
                      )}
                    </td>
                    {/* Khu vực */}
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
                    {/* Số tiền */}
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-smb-on-surface">
                      {amount != null && amount !== 0 ? (
                        <span className={`font-semibold ${amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {amount > 0 ? '+' : ''}{formatVND(amount)}
                        </span>
                      ) : (
                        <span className="text-sm text-smb-on-surface-variant">—</span>
                      )}
                    </td>
                    {/* Người thực hiện */}
                    <td className="px-4 py-3 text-xs text-smb-on-surface">
                      <div className="flex flex-col gap-0.5">
                        {log.performedByName ? (
                          <>
                            <span className="font-medium text-smb-on-surface">{log.performedByName}</span>
                            <span className="text-[10px] text-smb-on-surface-variant/70">ID #{log.performedBy}</span>
                          </>
                        ) : log.performedBy ? (
                          <span className="font-medium text-smb-on-surface">#{log.performedBy}</span>
                        ) : (
                          <span className="text-smb-on-surface-variant/70 italic">Hệ thống</span>
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
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-xs text-smb-on-surface-variant">
            Trang <strong>{pageNumber}</strong> / {totalPages} · {totalCount} mục
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="inline-flex items-center gap-1 rounded-md border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-xs font-medium text-smb-on-surface transition-colors hover:bg-smb-surface-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevron_left" className="text-[14px]" />
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              disabled={pageNumber >= totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-xs font-medium text-smb-on-surface transition-colors hover:bg-smb-surface-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
              <Icon name="chevron_right" className="text-[14px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignLogsTab
