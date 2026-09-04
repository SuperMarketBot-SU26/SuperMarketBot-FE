import React, { useState, useEffect, useCallback } from 'react'
import { getImportHistories, getImportHistoryDetail } from '../api/importHistoryApi'
import { Button } from './ui/Button'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function formatDateVN(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function ImportHistoryModal({ isOpen, onClose, type = 'PRODUCT' }) {
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const normType = type?.toUpperCase()
  const title =
    normType === 'PRODUCT'
      ? 'Lịch Sử Import Sản Phẩm'
      : normType === 'BRAND'
      ? 'Lịch Sử Import Nhãn Hàng'
      : 'Lịch Sử Import Chiến Dịch Quảng Cáo'

  const fetchHistories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getImportHistories(type, 50)
      setHistories(Array.isArray(data) ? data : [])
    } catch {
      setHistories([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    if (isOpen) {
      setSelectedHistory(null)
      fetchHistories()
    }
  }, [isOpen, fetchHistories])

  const handleViewDetail = async (history) => {
    // If errorDetails already parsed and present
    if (history.errorDetails && Array.isArray(history.errorDetails)) {
      setSelectedHistory(history)
      return
    }

    setLoadingDetail(true)
    try {
      const detail = await getImportHistoryDetail(history.importId)
      let parsed = detail.errorDetails
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch {
          parsed = []
        }
      }
      setSelectedHistory({
        ...detail,
        errorDetails: Array.isArray(parsed) ? parsed : [],
      })
    } catch {
      setSelectedHistory(history)
    } finally {
      setLoadingDetail(false)
    }
  }

  if (!isOpen) return null

  // Detail Error Rows
  const errorRows = Array.isArray(selectedHistory?.errorDetails)
    ? selectedHistory.errorDetails
    : []

  const filteredErrors = errorRows.filter((err) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const rIndex = String(err.rowIndex ?? err.RowIndex ?? '')
    const pName = String(
      err.campaignName ??
        err.CampaignName ??
        err.productName ??
        err.ProductName ??
        err.brandName ??
        err.BrandName ??
        ''
    ).toLowerCase()
    const fld = String(err.field ?? err.Field ?? '').toLowerCase()
    const msg = String(err.errorMessage ?? err.ErrorMessage ?? '').toLowerCase()
    return rIndex.includes(term) || pName.includes(term) || fld.includes(term) || msg.includes(term)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Icon name="history" className="text-2xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {title}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {histories.length} đợt
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhật ký các đợt import Excel, số lượng xử lý và chi tiết các dòng lỗi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistories}
              disabled={loading}
              title="Làm mới lịch sử"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              <Icon name="refresh" className={`text-xl ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* VIEW: CHI TIẾT ĐỢT IMPORT ĐƯỢC CHỌN */}
          {selectedHistory ? (
            <div className="space-y-4">
              {/* Top back button & history summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedHistory(null)}
                    className="gap-1.5"
                  >
                    <Icon name="arrow_back" className="text-base" />
                    Quay lại danh sách
                  </Button>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Icon name="description" className="text-blue-500 text-base" />
                      {selectedHistory.fileName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateVN(selectedHistory.importedAt)} • Thực hiện bởi: <span className="font-semibold">{selectedHistory.importedBy || 'Admin'}</span>
                    </p>
                  </div>
                </div>

                {/* Status metrics badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/40">
                    ✓ Thành công: {selectedHistory.successCount}
                  </span>
                  {selectedHistory.duplicateCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/40">
                      ⚠ Trùng lặp: {selectedHistory.duplicateCount}
                    </span>
                  )}
                  {selectedHistory.errorCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800/40">
                      ✕ Lỗi: {selectedHistory.errorCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Error list header & search */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Icon name="report_problem" className="text-amber-500 text-lg" />
                  Danh sách {errorRows.length} dòng gặp lỗi/trùng lặp
                </h3>
                {errorRows.length > 5 && (
                  <div className="relative w-64">
                    <Icon name="search" className="absolute left-3 top-2.5 text-slate-400 text-sm" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm dòng lỗi..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Error Table */}
              {filteredErrors.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
                  <Icon name="check_circle" className="text-3xl text-emerald-500 mb-2 block mx-auto" />
                  <p className="text-sm font-medium">Đợt import này không có dòng lỗi nào!</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 w-16 text-center">Dòng</th>
                        <th className="py-2.5 px-3">
                          {normType === 'PRODUCT'
                            ? 'Tên sản phẩm'
                            : normType === 'BRAND'
                            ? 'Tên nhãn hàng'
                            : 'Tên chiến dịch'}
                        </th>
                        <th className="py-2.5 px-3 w-28">Trường lỗi</th>
                        <th className="py-2.5 px-3">Chi tiết lỗi / Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredErrors.map((err, idx) => {
                        const rowIndex = err.rowIndex ?? err.RowIndex ?? idx + 1
                        const itemName =
                          err.campaignName ??
                          err.CampaignName ??
                          err.productName ??
                          err.ProductName ??
                          err.brandName ??
                          err.BrandName ??
                          '-'
                        const field = err.field ?? err.Field ?? 'Lỗi'
                        const errorMessage = err.errorMessage ?? err.ErrorMessage ?? ''
                        const isDup =
                          field === 'Duplicate' ||
                          errorMessage.includes('trùng lặp')
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                              #{rowIndex}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                              {itemName}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  isDup
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {field}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400">
                              {errorMessage}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* VIEW: DANH SÁCH CÁC ĐỢT IMPORT */
            <div className="space-y-3">
              {loading ? (
                <div className="py-16 text-center space-y-3">
                  <Icon name="sync" className="text-3xl text-blue-500 animate-spin mx-auto block" />
                  <p className="text-sm text-slate-500">Đang tải lịch sử import...</p>
                </div>
              ) : histories.length === 0 ? (
                <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Icon name="history_toggle_off" className="text-3xl" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Chưa có lịch sử import nào
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Mỗi khi bạn tải lên file Excel sản phẩm hoặc nhãn hàng, kết quả và chi tiết lỗi sẽ được lưu lại tại đây.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Thời gian</th>
                        <th className="py-3 px-4">File Excel</th>
                        <th className="py-3 px-4 text-center">Tổng dòng</th>
                        <th className="py-3 px-4 text-center">Thành công</th>
                        <th className="py-3 px-4 text-center">Trùng lặp</th>
                        <th className="py-3 px-4 text-center">Lỗi</th>
                        <th className="py-3 px-4 text-center">Trạng thái</th>
                        <th className="py-3 px-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {histories.map((h, index) => {
                        const isAllSuccess = h.errorCount === 0 && h.duplicateCount === 0
                        const isPartial = h.successCount > 0 && (h.errorCount > 0 || h.duplicateCount > 0)
                        const hasErrors = h.errorCount > 0 || h.duplicateCount > 0

                        return (
                          <tr
                            key={h.importId}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 text-center font-mono text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatDateVN(h.importedAt)}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                bởi: {h.importedBy || 'Admin'}
                              </p>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-2 max-w-[200px] truncate" title={h.fileName}>
                                <Icon name="table_chart" className="text-blue-500 text-base shrink-0" />
                                <span className="truncate">{h.fileName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-bold">
                              {h.totalRows}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                                {h.successCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`font-bold ${
                                  h.duplicateCount > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {h.duplicateCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`font-bold ${
                                  h.errorCount > 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {h.errorCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {isAllSuccess ? (
                                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                  <Icon name="check_circle" className="text-[13px]" />
                                  100% Thành công
                                </span>
                              ) : isPartial ? (
                                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                                  <Icon name="warning" className="text-[13px]" />
                                  Một phần
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                                  <Icon name="error" className="text-[13px]" />
                                  Thất bại
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {hasErrors ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetail(h)}
                                  disabled={loadingDetail}
                                  className="gap-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800"
                                >
                                  <Icon name="visibility" className="text-sm" />
                                  Xem lỗi
                                </Button>
                              ) : (
                                <span className="text-slate-400 text-xs italic">
                                  Không có lỗi
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 px-6 py-3.5 bg-slate-50/50 dark:bg-slate-800/30">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  )
}
