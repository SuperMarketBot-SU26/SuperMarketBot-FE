import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { FilterChip, SearchBar } from '../components/FilterBar'
import { CampaignList, DashboardWidgets } from '../features/advertisement'
import { downloadCampaignTemplate, importCampaignsExcel, exportCampaignsExcel } from '../features/advertisement/api/adCampaignApi'
import { ImportHistoryModal } from '../components/ImportHistoryModal'
import { Button } from '../components/ui/Button'
import { toast } from 'react-toastify'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function getErrorBadge(field) {
  switch (field) {
    case 'Duplicate':
      return {
        label: 'Trùng lặp',
        icon: 'content_copy',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
      }
    case 'Budget':
      return {
        label: 'Vượt ngân sách',
        icon: 'payments',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300'
      }
    case 'Brand':
      return {
        label: 'Thương hiệu',
        icon: 'storefront',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300'
      }
    case 'Package':
      return {
        label: 'Gói quảng cáo',
        icon: 'inventory_2',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
      }
    case 'Media':
      return {
        label: 'Hình ảnh / Video',
        icon: 'perm_media',
        className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
      }
    case 'Products':
      return {
        label: 'SP Tài trợ',
        icon: 'shopping_bag',
        className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300'
      }
    case 'Targeting':
      return {
        label: 'Vị trí / Tuyến',
        icon: 'pin_drop',
        className: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300'
      }
    default:
      return {
        label: 'Dữ liệu',
        icon: 'warning',
        className: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
      }
  }
}

export function AdvertisementDashboard() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showImportModal, setShowImportModal] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadCampaignTemplate()
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Mau_Import_Chien_Dich_Quang_Cao.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Đã tải xuống template Excel mẫu.')
    } catch {
      toast.error('Tải template mẫu thất bại.')
    }
  }

  const handleExportExcel = async () => {
    try {
      const blob = await exportCampaignsExcel({ status: statusFilter !== 'all' ? statusFilter : undefined })
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Danh_Sach_Chien_Dich_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Đã xuất danh sách chiến dịch ra Excel.')
    } catch {
      toast.error('Xuất danh sách Excel thất bại.')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importCampaignsExcel(file)
      setImportResult(result)
      setShowImportModal(false)
      setRefreshKey((k) => k + 1)
      toast.success(`Import hoàn tất! Thành công: ${result.successCount}/${result.totalRows}`)
    } catch (err) {
      toast.error(err?.response?.data || 'Import chiến dịch từ Excel thất bại.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Dashboard Quảng Cáo"
          subtitle="Tổng quan hiệu suất chiến dịch & quản lý quảng cáo"
        />

        <main className="px-6 py-6 space-y-8">
          <DashboardWidgets />

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-smb-on-surface">Danh Sách Chiến Dịch</h2>
                <p className="text-sm text-smb-on-surface-variant">
                  Xem, lọc và quản lý tất cả chiến dịch quảng cáo của bạn
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container transition-colors shadow-sm"
                  title="Tải template Excel chuẩn để nhập dữ liệu chiến dịch"
                >
                  <Icon name="description" className="text-[18px] text-blue-600" />
                  File Mẫu
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container transition-colors shadow-sm"
                >
                  <Icon name="download" className="text-[18px] text-emerald-600" />
                  Xuất Excel
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container transition-colors shadow-sm"
                >
                  <Icon name="history" className="text-[18px] text-amber-600" />
                  Lịch Sử Import
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImportModal(true); }}
                  className="flex items-center gap-1.5 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container transition-colors shadow-sm"
                >
                  <Icon name="upload_file" className="text-[18px] text-indigo-600" />
                  Import Excel
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/advertisement/create')}
                  className="flex items-center gap-2 rounded-lg bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary-container shadow-sm hover:bg-smb-primary-container/90 transition-colors"
                >
                  <Icon name="add" className="text-[18px]" />
                  Tạo Chiến Dịch Mới
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Tìm kiếm chiến dịch..."
                className="max-w-xs"
              />
              <FilterChip
                label="Trạng thái"
                options={[
                  { value: 'all',       label: 'Tất Cả',            icon: 'apps'        },
                  { value: 'Inactive',  label: 'Không Hoạt Động',   icon: 'cancel'       },
                  { value: 'Active',    label: 'Hoạt Động',          icon: 'check_circle' },
                  { value: 'Paused',    label: 'Tạm Dừng',           icon: 'pause_circle' },
                  { value: 'Canceled',  label: 'Đã Hủy',             icon: 'block'        },
                  { value: 'Completed', label: 'Hoàn Thành',          icon: 'task_alt'     },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>

            <CampaignList
              key={refreshKey}
              onCreateNew={() => navigate('/advertisement/create')}
              search={search}
              status={statusFilter}
            />
          </div>
        </main>
      </div>

      {/* ── Modal Chọn File Import Excel ──────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-smb-surface-container-lowest p-6 shadow-2xl border border-smb-outline-variant space-y-5">
            <div className="flex items-center justify-between border-b border-smb-outline-variant/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <Icon name="upload_file" className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-smb-on-surface">Import Chiến Dịch Từ Excel</h3>
                  <p className="text-xs text-smb-on-surface-variant">Tải lên danh sách chiến dịch kèm targeting & sản phẩm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1.5 text-smb-on-surface-variant hover:bg-smb-surface-container"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3.5">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Chưa có file mẫu Excel chuẩn?</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400">Tải file mẫu kèm danh mục tham chiếu ID Thương hiệu, Gói, Zone, Shelf, Route</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 hover:bg-blue-50"
              >
                <Icon name="download" className="text-[16px]" />
                Tải Mẫu
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-smb-on-surface">Chọn file Excel (.xlsx):</label>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                disabled={importing}
                className="w-full rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-2.5 text-sm text-smb-on-surface file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700 cursor-pointer disabled:opacity-50"
              />
              <p className="text-[11px] text-smb-on-surface-variant">
                Lưu ý: Chiến dịch không có ngày kết thúc cố định mà sẽ tự động chạy cho tới khi hết ngân sách gói quảng cáo.
              </p>
            </div>

            {importing && (
              <div className="flex items-center justify-center py-6 text-sm text-indigo-600 font-medium bg-indigo-50/50 rounded-xl border border-indigo-100">
                <Icon name="progress_activity" className="animate-spin mr-2 text-xl" />
                Đang xử lý dữ liệu và kiểm tra hợp lệ...
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportModal(false)}
                disabled={importing}
              >
                Hủy bỏ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Báo Cáo Kết Quả Import Chi Tiết ─────────────────────────── */}
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-smb-surface-container-lowest shadow-2xl border border-smb-outline-variant overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-smb-outline-variant/60 px-6 py-4 bg-smb-surface-container-low/40">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl ${
                  importResult.errorCount === 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  <Icon name={importResult.errorCount === 0 ? 'verified' : 'fact_check'} className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-smb-on-surface">Kết Quả Import Chiến Dịch</h3>
                  <p className="text-xs text-smb-on-surface-variant">Chi tiết kết quả thêm mới, trùng lặp và các lỗi phát hiện</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="rounded-lg p-1.5 text-smb-on-surface-variant hover:bg-smb-surface-container"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-center dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Tổng Số Dòng</p>
                  <p className="mt-1 text-2xl font-black text-slate-800 dark:text-slate-100">{importResult.totalRows}</p>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Thành Công</p>
                  <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{importResult.successCount}</p>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                  <p className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-400">Trùng Lặp</p>
                  <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{importResult.duplicateCount ?? 0}</p>
                </div>

                <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-3.5 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                  <p className="text-[11px] font-semibold uppercase text-rose-700 dark:text-rose-400">Lỗi / Bỏ Qua</p>
                  <p className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">{importResult.errorCount}</p>
                </div>
              </div>

              {/* Error Detail Table */}
              {importResult.errors && importResult.errors.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Icon name="error" className="text-base" />
                      Chi tiết {importResult.errors.length} cảnh báo / lỗi cần sửa:
                    </h4>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-smb-outline-variant/60">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-smb-surface-container-low text-smb-on-surface-variant uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold text-center w-16">Dòng</th>
                          <th className="py-2.5 px-3 font-semibold">Tên Chiến Dịch</th>
                          <th className="py-2.5 px-3 font-semibold">Phân Loại</th>
                          <th className="py-2.5 px-3 font-semibold">Chi Tiết Lỗi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-smb-outline-variant/30">
                        {importResult.errors.map((err, idx) => {
                          const badge = getErrorBadge(err.field)
                          return (
                            <tr key={idx} className="hover:bg-smb-surface-container-low/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-center">
                                <span className="inline-flex items-center justify-center rounded-md bg-smb-surface-container px-2 py-0.5 text-xs text-smb-on-surface">
                                  #{err.rowIndex}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-smb-on-surface max-w-[180px] truncate" title={err.campaignName}>
                                {err.campaignName || '(Trống)'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                                  <Icon name={badge.icon} className="text-[11px]" />
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-rose-700 dark:text-rose-300 font-normal">
                                {err.errorMessage}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <Icon name="check_circle" className="text-4xl text-emerald-600 mb-2" />
                  <p className="text-sm font-semibold text-emerald-900">Tất cả dữ liệu nhập vào đều hoàn toàn hợp lệ!</p>
                  <p className="text-xs text-emerald-700 mt-1">Các chiến dịch đã được khởi tạo và sẵn sàng kích hoạt.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-smb-outline-variant/40 px-6 py-4 bg-smb-surface-container-low/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportResult(null)
                  setHistoryModalOpen(true)
                }}
                className="gap-1.5"
              >
                <Icon name="history" className="text-base text-amber-600" />
                Xem Lịch Sử Import
              </Button>
              <Button
                variant="primary"
                onClick={() => setImportResult(null)}
              >
                Đã Hiểu & Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Lịch Sử Import Chiến Dịch ───────────────────────────────── */}
      <ImportHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        type="CAMPAIGN"
      />
    </div>
  )
}

export default AdvertisementDashboard
