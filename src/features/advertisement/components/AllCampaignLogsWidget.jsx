import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllCampaignLogs } from '../api/adCampaignApi'
import { Badge } from '../../../components/DataTable'
import { Button } from '../../../components/ui/Button'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const ACTION_MAP = {
  Click: {
    label: 'Lượt nhấp (Click)',
    icon: 'ads_click',
    variant: 'primary',
    bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
  },
  Impression: {
    label: 'Lượt hiển thị (Impression)',
    icon: 'visibility',
    variant: 'info',
    bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50'
  },
  Activation: {
    label: 'Kích hoạt',
    icon: 'play_circle',
    variant: 'success',
    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
  },
  FraudDetected: {
    label: 'Gian lận (Spam click)',
    icon: 'gpp_bad',
    variant: 'danger',
    bg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
  },
  RoutePass: {
    label: 'Robot đi qua',
    icon: 'route',
    variant: 'info',
    bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50'
  },
  Pause: {
    label: 'Tạm dừng',
    icon: 'pause_circle',
    variant: 'warning',
    bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
  },
  Cancel: {
    label: 'Hủy chiến dịch',
    icon: 'cancel',
    variant: 'danger',
    bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50'
  },
}

export function AllCampaignLogsWidget() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [actionFilter, setActionFilter] = useState('all')

  const fetchLogs = useCallback(async (page = 1, action = 'all') => {
    setLoading(true)
    setError(null)
    try {
      const params = { pageNumber: page, pageSize: 10 }
      if (action !== 'all') params.action = action
      const data = await getAllCampaignLogs(params)
      setLogs(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.totalCount || 0)
      setPageNumber(data.pageNumber || 1)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Tải nhật ký thất bại')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(pageNumber, actionFilter)
  }, [pageNumber, actionFilter, fetchLogs])

  const handleActionChange = (newAction) => {
    setActionFilter(newAction)
    setPageNumber(1)
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const str = String(dateStr).trim()
      // Nếu chuỗi ISO chưa có hậu tố múi giờ (Z hoặc offset +/-HH:mm),
      // Backend lưu timestamp theo UTC nên bổ sung 'Z' để Date hiểu đúng UTC và convert sang giờ địa phương
      const hasTz = /[Zz]$|[+\-]\d{2}:?\d{2}$/.test(str)
      const d = new Date(hasTz ? str : `${str}Z`)
      if (Number.isNaN(d.getTime())) return dateStr
      return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-smb-outline-variant/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shadow-sm border border-amber-200/60 dark:border-amber-900/40">
            <Icon name="receipt_long" className="text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-smb-on-surface">Nhật Ký Tương Tác Toàn Bộ Chiến Dịch</h2>
              <span className="rounded-full bg-smb-surface-container px-2.5 py-0.5 text-xs font-semibold text-smb-on-surface-variant border border-smb-outline-variant/40">
                {totalCount} sự kiện
              </span>
            </div>
            <p className="text-xs text-smb-on-surface-variant">
              Theo dõi lượt hiển thị (Impression), chạm màn hình (Click), phát hiện gian lận và trừ ngân sách tự động
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-smb-surface-container p-1 border border-smb-outline-variant/40 text-xs font-medium">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'Click', label: 'Lượt nhấp (Click)', icon: 'ads_click' },
              { id: 'Impression', label: 'Lượt xem (Impression)', icon: 'visibility' },
              { id: 'Activation', label: 'Kích hoạt', icon: 'play_circle' },
              { id: 'FraudDetected', label: 'Gian lận', icon: 'gpp_bad' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleActionChange(f.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all ${
                  actionFilter === f.id
                    ? 'bg-smb-surface-container-lowest text-smb-primary font-bold shadow-sm'
                    : 'text-smb-on-surface-variant hover:text-smb-on-surface'
                }`}
              >
                {f.icon && <Icon name={f.icon} className="text-[14px]" />}
                {f.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(pageNumber, actionFilter)}
            disabled={loading}
            icon="refresh"
            title="Làm mới nhật ký"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 flex items-center gap-2">
          <Icon name="error" className="text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-smb-on-surface">
          <thead className="bg-smb-surface-container/50 text-xs font-semibold text-smb-on-surface-variant uppercase tracking-wider border-b border-smb-outline-variant/60">
            <tr>
              <th scope="col" className="px-4 py-3.5">Thời Gian</th>
              <th scope="col" className="px-4 py-3.5">Chiến Dịch</th>
              <th scope="col" className="px-4 py-3.5">Sản Phẩm</th>
              <th scope="col" className="px-4 py-3.5 text-center">Hành Động</th>
              <th scope="col" className="px-4 py-3.5 text-right">Phí Trừ (VNĐ)</th>
              <th scope="col" className="px-4 py-3.5 text-center">Thiết Bị</th>
              <th scope="col" className="px-4 py-3.5">Chi Tiết / Người Thực Hiện</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-smb-outline-variant/40">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-smb-on-surface-variant">
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="progress_activity" className="animate-spin text-smb-primary text-xl" />
                    <span>Đang tải dữ liệu nhật ký...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-smb-on-surface-variant">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-smb-surface-container text-smb-on-surface-variant mb-2">
                    <Icon name="inbox" className="text-2xl" />
                  </div>
                  <p className="font-medium">Chưa có nhật ký tương tác nào</p>
                  <p className="text-xs text-smb-on-surface-variant/80 mt-0.5">
                    Các sự kiện hiển thị, click hoặc kích hoạt từ Robot sẽ tự động hiển thị tại đây
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const actionConfig = ACTION_MAP[log.action] || {
                  label: log.action,
                  icon: 'info',
                  bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200'
                }
                const isCharged = log.amount > 0
                return (
                  <tr key={log.id} className="hover:bg-smb-surface-container/30 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-smb-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <Icon name="schedule" className="text-[15px] text-gray-400" />
                        <span>{formatDateTime(log.createdAt)}</span>
                      </div>
                    </td>

                    {/* Campaign */}
                    <td className="px-4 py-3.5">
                      {log.campaignId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/advertisement/detail/${log.campaignId}`)}
                          className="font-medium text-smb-on-surface hover:text-smb-primary hover:underline text-left"
                        >
                          {log.campaignName || `Chiến dịch #${log.campaignId}`}
                        </button>
                      ) : (
                        <span className="text-smb-on-surface-variant italic">Hệ thống</span>
                      )}
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3.5">
                      {log.productName ? (
                        <div className="flex items-center gap-1.5">
                          <Icon name="shopping_bag" className="text-[16px] text-blue-500 shrink-0" />
                          <span className="font-medium text-smb-on-surface">{log.productName}</span>
                        </div>
                      ) : log.productId ? (
                        <span className="text-xs text-smb-on-surface-variant font-mono">SP #{log.productId}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Action badge */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${actionConfig.bg}`}>
                        <Icon name={actionConfig.icon} className="text-[14px]" />
                        {actionConfig.label}
                      </span>
                    </td>

                    {/* Amount charged */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono">
                      {isCharged ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          -{log.amount.toLocaleString('vi-VN')} đ
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">0 đ</span>
                      )}
                    </td>

                    {/* Device / Robot */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap text-xs text-smb-on-surface-variant">
                      {log.robotId ? (
                        <span className="inline-flex items-center gap-1 rounded bg-smb-surface-container px-2 py-0.5 font-medium">
                          <Icon name="smart_toy" className="text-[14px] text-emerald-600" />
                          Robot #{log.robotId}
                        </span>
                      ) : log.zoneId ? (
                        <span className="inline-flex items-center gap-1 text-xs text-smb-on-surface-variant">
                          <Icon name="grid_view" className="text-[14px]" />
                          Zone {log.zoneId}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Details / PerformedBy */}
                    <td className="px-4 py-3.5 text-xs text-smb-on-surface-variant">
                      <div className="max-w-xs truncate" title={log.description || log.performedBy || ''}>
                        {log.performedBy ? (
                          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                            <Icon name="person" className="text-[14px]" />
                            {log.performedBy}
                          </span>
                        ) : (
                          <span>{log.description || 'Ghi nhận từ thiết bị'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-smb-outline-variant/60 pt-4 text-xs text-smb-on-surface-variant">
          <span>
            Hiển thị trang {pageNumber} trên tổng số {totalPages} trang ({totalCount} kết quả)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
              icon="chevron_left"
            >
              Trước
            </Button>
            <span className="px-2 font-semibold text-smb-on-surface">
              {pageNumber} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pageNumber >= totalPages}
              onClick={() => setPageNumber((p) => p + 1)}
              icon="chevron_right"
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllCampaignLogsWidget
