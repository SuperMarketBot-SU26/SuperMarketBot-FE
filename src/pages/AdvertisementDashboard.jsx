import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { FilterChip, SearchBar } from '../components/FilterBar'
import { CampaignList, DashboardWidgets } from '../features/advertisement'
import { downloadCampaignTemplate, importCampaignsExcel, exportCampaignsExcel } from '../features/advertisement/api/adCampaignApi'
import { toast } from 'react-toastify'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function AdvertisementDashboard() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showImportModal, setShowImportModal] = useState(false)
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
    } catch (err) {
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
    } catch (err) {
      toast.error('Xuất danh sách Excel thất bại.')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importCampaignsExcel(file)
      setImportResult(result)
      setRefreshKey((k) => k + 1)
      toast.success(`Import hoàn tất! Thành công: ${result.successCount}/${result.totalRows}`)
    } catch (err) {
      toast.error(err?.response?.data || 'Import chiến dịch từ Excel thất bại.')
    } finally {
      setImporting(false)
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
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container transition-colors shadow-sm"
                >
                  <Icon name="download" className="text-[18px] text-emerald-600" />
                  Xuất Excel
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImportModal(true); setImportResult(null); }}
                  className="flex items-center gap-1.5 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container transition-colors shadow-sm"
                >
                  <Icon name="upload_file" className="text-[18px] text-blue-600" />
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-smb-surface-container-lowest p-6 shadow-xl border border-smb-outline-variant space-y-4">
            <div className="flex items-center justify-between border-b border-smb-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <Icon name="upload_file" className="text-xl text-smb-primary-container" />
                <h3 className="text-base font-semibold text-smb-on-surface">Import Chiến Dịch Từ Excel</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-smb-on-surface-variant hover:bg-smb-surface-container"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-smb-surface-container-low p-3">
              <div>
                <p className="text-xs font-semibold text-smb-on-surface">Chưa có file mẫu Excel?</p>
                <p className="text-[11px] text-smb-on-surface-variant">Tải file mẫu được định dạng sẵn để nhập dữ liệu nhanh chóng</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1 text-xs font-medium text-smb-primary-container hover:underline"
              >
                <Icon name="download" className="text-[16px]" />
                Tải File Mẫu
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-smb-on-surface-variant">Chọn file Excel (.xlsx):</label>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                disabled={importing}
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-2 text-sm text-smb-on-surface file:mr-3 file:rounded-md file:border-0 file:bg-smb-primary-container/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-smb-primary-container hover:file:bg-smb-primary-container/20 cursor-pointer disabled:opacity-50"
              />
            </div>

            {importing && (
              <div className="flex items-center justify-center py-6 text-sm text-smb-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin mr-2 text-xl" />
                Đang xử lý dữ liệu file Excel...
              </div>
            )}

            {importResult && (
              <div className="space-y-3 rounded-lg border border-smb-outline-variant/80 bg-smb-surface-container-lowest p-4 text-xs">
                <h4 className="font-semibold text-smb-on-surface">Kết quả Import:</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-emerald-50 p-2 text-emerald-700">
                    <p className="text-[10px] uppercase font-semibold">Thành công</p>
                    <p className="text-lg font-bold">{importResult.successCount}</p>
                  </div>
                  <div className="rounded bg-rose-50 p-2 text-rose-700">
                    <p className="text-[10px] uppercase font-semibold">Bỏ qua / Lỗi</p>
                    <p className="text-lg font-bold">{importResult.errorCount}</p>
                  </div>
                  <div className="rounded bg-gray-50 p-2 text-gray-700">
                    <p className="text-[10px] uppercase font-semibold">Tổng số dòng</p>
                    <p className="text-lg font-bold">{importResult.totalRows}</p>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto space-y-1 rounded border border-rose-200 bg-rose-50/50 p-2 text-rose-800">
                    <p className="font-semibold text-[11px]">Chi tiết lỗi theo dòng:</p>
                    {importResult.errors.map((err, idx) => (
                      <p key={idx} className="text-[11px]">
                        • <strong>Dòng {err.rowIndex}:</strong> {err.campaignName ? `[${err.campaignName}] ` : ''}{err.errorMessage}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg bg-smb-primary-container px-4 py-2 text-xs font-semibold text-smb-on-primary-container hover:bg-smb-primary-container/90"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvertisementDashboard
