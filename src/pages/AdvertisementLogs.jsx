import React, { useState, useEffect, useCallback } from 'react'
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
  Click:      { variant: 'primary', icon: 'ads_click',      label: 'Click' },
  Impression: { variant: 'info',    icon: 'visibility',     label: 'Impression' },
  Activation: { variant: 'success', icon: 'play_circle',    label: 'Kích hoạt' },
  Pause:      { variant: 'warning', icon: 'pause_circle',   label: 'Tạm dừng' },
  Resume:     { variant: 'success', icon: 'play_circle',    label: 'Tiếp tục' },
  Cancel:     { variant: 'danger',  icon: 'block',          label: 'Hủy' },
  Navigation: { variant: 'info',    icon: 'navigation',     label: 'Điều hướng' },
}

function formatVnd(n) {
  return (n ?? 0).toLocaleString('vi-VN') + ' đ'
}

function formatDateTime(s) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('vi-VN')
  } catch {
    return s
  }
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

  // Client-side filter — server doesn't support actionType query yet.
  const filtered = actionFilter === 'all'
    ? logs
    : logs.filter((l) => l.actionType === actionFilter)

  const columns = [
    {
      key: 'timestamp',
      label: 'Thời Gian',
      render: (val) => (
        <span className="text-xs tabular-nums text-smb-on-surface-variant">
          {formatDateTime(val)}
        </span>
      ),
    },
    {
      key: 'actionType',
      label: 'Hành Động',
      align: 'center',
      render: (val) => {
        const meta = ACTION_META[val] || { variant: 'neutral', icon: 'help', label: val }
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
      render: (val, row) => (
        <div>
          <p className="font-medium text-smb-on-surface">{val || '—'}</p>
          {row.sponsoredId && (
            <p className="text-xs text-smb-on-surface-variant">Sponsored #{row.sponsoredId}</p>
          )}
        </div>
      ),
    },
    {
      key: 'chargedAmount',
      label: 'Phí',
      align: 'right',
      render: (val) => (
        <span className={`tabular-nums font-medium ${val > 0 ? 'text-smb-on-surface' : 'text-smb-on-surface-variant'}`}>
          {formatVnd(val)}
        </span>
      ),
    },
    {
      key: 'context',
      label: 'Ngữ Cảnh',
      render: (_, row) => {
        const bits = []
        if (row.robotId)    bits.push(`Robot #${row.robotId}`)
        if (row.zoneId)     bits.push(`Zone #${row.zoneId}`)
        if (row.slotId)     bits.push(`Slot #${row.slotId}`)
        if (row.memberId)   bits.push(`Member #${row.memberId}`)
        if (row.sessionId)  bits.push(row.sessionId)
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
      render: (val) => val ? (
        <Badge variant="danger" icon="warning">Fraud</Badge>
      ) : null,
    },
  ]

  const actionTypes = Array.from(new Set(logs.map((l) => l.actionType).filter(Boolean)))

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
                    Activation, pause, cancel, route pass, click, impression — tất cả sự kiện được ghi tại đây.
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
                  const count = logs.filter((l) => l.actionType === type).length
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
