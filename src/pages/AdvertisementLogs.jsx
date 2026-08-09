import React, { useState, useEffect, useCallback } from 'react'
import { useAdLogEnrichment } from '../hooks/useAdLogEnrichment'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { Button } from '../components/ui/Button'
import { DataTable, Badge } from '../components/DataTable'
import {
  getCampaign,
  getCampaignLogs,
} from '../features/advertisement/api/adCampaignApi'

/**
 * AdvertisementLogs — paginated activity log viewer for a single campaign.
 *
 * BE: GET /api/v1/ad-campaigns/{id}/logs?pageNumber=&pageSize=
 * Response: { items[], totalCount, pageNumber, pageSize, totalPages }
 *
 * Each log row carries an ActionType (RoutePass | Click | Activation |
 * Pause | Cancel | ...). We map common types to badges; everything else
 * falls back to neutral.
 */

const ACTION_META = {
  RoutePass:  { variant: 'info',    icon: 'route',          label: 'Robot đi qua' },
  Click:      { variant: 'primary', icon: 'ads_click',      label: 'Lượt nhấp' },
  Impression: { variant: 'info',    icon: 'visibility',     label: 'Lượt hiển thị' },
  Activation: { variant: 'success', icon: 'play_circle',    label: 'Kích hoạt' },
  Activate:   { variant: 'success', icon: 'play_circle',    label: 'Kích hoạt' },
  Pause:      { variant: 'warning', icon: 'pause_circle',   label: 'Tạm dừng' },
  Resume:     { variant: 'success', icon: 'play_circle',    label: 'Tiếp tục' },
  Cancel:     { variant: 'danger',  icon: 'block',          label: 'Hủy' },
  Navigation: { variant: 'info',    icon: 'navigation',     label: 'Điều hướng' },
  Complete:   { variant: 'info',    icon: 'task_alt',       label: 'Hoàn thành' },
  Create:     { variant: 'primary', icon: 'add_circle',     label: 'Tạo mới' },
  Update:     { variant: 'neutral', icon: 'edit',           label: 'Cập nhật' },
  AssignZone: { variant: 'primary', icon: 'grid_view',      label: 'Gán khu vực' },
  AssignRoute:{ variant: 'primary', icon: 'route',          label: 'Gán tuyến' },
  AssignShelf:{ variant: 'primary', icon: 'inventory_2',    label: 'Gán kệ' },
  Charge:     { variant: 'danger',  icon: 'payments',       label: 'Trừ phí' },
  Refund:     { variant: 'success', icon: 'undo',           label: 'Hoàn tiền' },
}

function formatVnd(n) {
  // null / undefined / 0 / empty → dash (free action like Pause/Resume).
  if (n == null || n === 0 || n === '') return '—'
  const num = Number(n)
  if (Number.isNaN(num) || num === 0) return '—'
  return num.toLocaleString('vi-VN') + ' đ'
}

/**
 * Format BE timestamp → "dd/MM/yyyy HH:mm:ss" (giờ VN, UTC+7).
 *
 * BE trả 2 format hỗn hợp:
 *   - ISO UTC:       "2026-08-09T07:33:10.962Z"     → có 'Z' / offset
 *   - Naive VN time: "2026-08-09T07:23:26.3017710"   → KHÔNG có offset
 *
 * Giả định: naive timestamps đã được BE lưu theo giờ VN (UTC+7).
 * Để hiển thị đúng, ta gắn "+07:00" vào naive trước khi parse.
 */
function parseVNDate(s) {
  if (!s) return null
  const str = String(s).trim()
  if (!str) return null

  // Đã có timezone indicator → parse bình thường.
  const hasTZ = /[Zz]$|[+\-]\d{2}:?\d{2}$/.test(str)
  if (hasTZ) {
    const d = new Date(str)
    return Number.isNaN(d.getTime()) ? null : d
  }

  // Naive (không có offset) → BE lưu theo giờ VN, gắn +07:00.
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?/)
  if (!m) {
    const d = new Date(str)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+07:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDateTime(s) {
  const d = parseVNDate(s)
  if (!d) return '—'
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function AdvertisementLogs() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [actionFilter, setActionFilter] = useState('all')

  // Resolve zoneId/productId → tên (cache theo campaign id từ URL param)
  const { enrichLog } = useAdLogEnrichment(logs, id ? Number(id) : null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCampaignLogs(Number(id), page, pageSize)
      setLogs(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotalCount(data.totalCount ?? 0)
      setPageNumber(data.pageNumber ?? page)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Tải nhật ký thất bại.')
    } finally {
      setLoading(false)
    }
  }, [id, pageSize])

  // Initial: load campaign header + first page of logs
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [c] = await Promise.all([
          getCampaign(Number(id)).catch(() => null),
          fetchLogs(1),
        ])
        if (!cancelled) setCampaign(c)
      } catch (_) { /* fetchLogs already set error */ }
    })()
    return () => { cancelled = true }
  }, [id, fetchLogs])

  const goToPage = (next) => {
    if (next < 1 || next > totalPages) return
    fetchLogs(next)
  }

  // Client-side filter — server doesn't support action query yet.
  // Map BE action → FE actionType-style key so existing ACTION_META + filter chips work.
  const normalizeAction = (a) => {
    if (!a) return a
    const s = String(a)
    // Already PascalCase enum-like values stay as-is
    if (ACTION_META[s]) return s
    // Map verb forms (Resumed, Paused, Activation) → noun/canonical forms used in ACTION_META
    if (/^Resumed?$/i.test(s)) return 'Resume'
    if (/^Paused?$/i.test(s)) return 'Pause'
    if (/^(Activated|Activation)$/i.test(s)) return 'Activation'
    if (/^(Cancelled|Cancellation)$/i.test(s)) return 'Cancel'
    if (/^AssignZone$/i.test(s)) return 'AssignZone'
    if (/^AssignRoute$/i.test(s)) return 'AssignRoute'
    if (/^AssignShelf$/i.test(s)) return 'AssignShelf'
    return s
  }

  const filtered = actionFilter === 'all'
    ? logs
    : logs.filter((l) => normalizeAction(l.action) === actionFilter)

  // Columns map BE fields → UI columns.
  // BE returns each log row with: id, campaignId, action, description, amount, createdAt,
  //   zoneId, robotId, productId, memberId, performedBy.
  // We map createdAt→timestamp, action→actionType, amount→chargedAmount, etc.
  const columns = [
    {
      key: 'timestamp',
      label: 'Thời Gian',
      render: (_val, row) => (
        <span className="text-xs tabular-nums text-smb-on-surface-variant">
          {formatDateTime(row.createdAt ?? row.timestamp)}
        </span>
      ),
    },
    {
      key: 'actionType',
      label: 'Hành Động',
      align: 'center',
      render: (_val, row) => {
        const action = normalizeAction(row.action ?? row.actionType)
        const meta = ACTION_META[action] || { variant: 'neutral', icon: 'help', label: row.action ?? '—' }
        return (
          <Badge variant={meta.variant} icon={meta.icon}>
            {meta.label}
          </Badge>
        )
      },
    },
    {
      key: 'productName',
      label: 'Sản Phẩm',
      render: (_val, rawRow) => {
        const row = enrichLog(rawRow)
        const hasProduct = row._productName || row.productId != null
        return (
          <div>
            <p className="font-medium text-smb-on-surface">
              {row._productName || row.productName || row.product ||
                (row.productId ? `Sản phẩm #${row.productId}` : '—')}
            </p>
            {row.sponsoredId && (
              <p className="text-xs text-smb-on-surface-variant">Tài trợ #{row.sponsoredId}</p>
            )}
            {!hasProduct && (
              <p className="text-xs text-smb-on-surface-variant/60">—</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'chargedAmount',
      label: 'Phí',
      align: 'right',
      render: (_val, row) => {
        const amount = row.chargedAmount ?? row.amount
        const color = amount > 0
          ? 'text-rose-600'
          : amount < 0
            ? 'text-emerald-600'
            : 'text-smb-on-surface-variant'
        return (
          <span className={`tabular-nums font-medium ${color}`}>
            {formatVnd(amount)}
          </span>
        )
      },
    },
    {
      key: 'context',
      label: 'Ngữ Cảnh',
      render: (_val, rawRow) => {
        const row = enrichLog(rawRow)
        const bits = []
        // Zone: ưu tiên tên zone, fallback id
        if (row._zoneName) {
          bits.push(row._floorName ? `${row._zoneName} (${row._floorName})` : row._zoneName)
        } else if (row.zoneId != null) {
          bits.push(`Khu vực #${row.zoneId}`)
        }
        // Robot
        if (row.robotId != null) bits.push(`Robot #${row.robotId}`)
        // Member
        if (row.memberId != null) bits.push(`Thành viên #${row.memberId}`)
        // Legacy fields
        if (row.slotId)     bits.push(`Vị trí #${row.slotId}`)
        if (row.sessionId)  bits.push(`Phiên ${row.sessionId}`)
        // Admin
        if (row.performedBy) bits.push(`bởi ${row.performedBy}`)
        return (
          <span className="text-xs text-smb-on-surface-variant">
            {bits.length > 0 ? bits.join(' · ') : '—'}
          </span>
        )
      },
    },
    {
      key: 'isFraud',
      label: '',
      align: 'center',
      render: (val, row) => (val ?? row.isFraud) ? (
        <Badge variant="danger" icon="warning">Gian lận</Badge>
      ) : null,
    },
  ]

  const actionTypes = Array.from(new Set(logs.map((l) => normalizeAction(l.action)).filter(Boolean)))

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Nhật Ký Hoạt Động"
          subtitle={campaign?.campaignName ? `${campaign.campaignName} · ${totalCount} sự kiện` : `${totalCount} sự kiện`}
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-6">

            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Header card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
                  <span className="material-symbols-outlined text-xl text-smb-primary-container">history</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-smb-on-surface">
                    Nhật Ký Chiến Dịch #{id}
                  </h2>
                  <p className="text-sm text-smb-on-surface-variant">
                    Kích hoạt, tạm dừng, hủy, lượt robot đi qua, lượt nhấp, lượt hiển thị — tất cả sự kiện của chiến dịch được ghi tại đây.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                icon="arrow_back"
                size="sm"
                onClick={() => navigate(`/advertisement/update/${id}`)}
              >
                Quay lại chỉnh sửa
              </Button>
            </div>

            {/* Action type filter (client-side) */}
            {actionTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-3">
                <span className="text-xs font-medium text-smb-on-surface-variant">Lọc hành động:</span>
                <button
                  type="button"
                  onClick={() => setActionFilter('all')}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    actionFilter === 'all'
                      ? 'bg-smb-primary-container text-smb-on-primary-container'
                      : 'bg-smb-surface-container text-smb-on-surface-variant hover:bg-smb-surface'
                  }`}
                >
                  Tất cả ({totalCount})
                </button>
                {actionTypes.map((type) => {
                  const count = logs.filter((l) => normalizeAction(l.action) === type).length
                  const meta = ACTION_META[type] || { label: type }
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActionFilter(type)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        actionFilter === type
                          ? 'bg-smb-primary-container text-smb-on-primary-container'
                          : 'bg-smb-surface-container text-smb-on-surface-variant hover:bg-smb-surface'
                      }`}
                    >
                      {meta.label} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {/* Logs table */}
            <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
              <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                emptyMessage={error ? '' : 'Chưa có sự kiện nào được ghi cho chiến dịch này.'}
              />
            </div>

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pageNumber <= 1}
                  onClick={() => goToPage(pageNumber - 1)}
                >
                  ← Trước
                </Button>
                <span className="flex items-center px-3 text-sm text-smb-on-surface-variant">
                  Trang {pageNumber} / {totalPages}
                </span>
                <Button
                  variant="outline" size="sm"
                  disabled={pageNumber >= totalPages}
                  onClick={() => goToPage(pageNumber + 1)}
                >
                  Sau →
                </Button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementLogs
