import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { ImportHistoryModal } from '../../../components/ImportHistoryModal'
import { getBrands, deleteBrand, importBrands, downloadBrandImportTemplate, exportBrands } from '../api/brandApi'
import { getBrandGradient, getBrandInitials } from './BrandWidgets'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function BrandTable({ brands: propBrands, loading: propLoading, onRefresh }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [internalBrands, setInternalBrands] = useState([])
  const [internalLoading, setInternalLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const brands = propBrands ?? internalBrands
  const loading = propLoading ?? internalLoading

  const fetchInternalBrands = useCallback(async () => {
    if (onRefresh) {
      onRefresh()
      return
    }
    setInternalLoading(true)
    try {
      const data = await getBrands()
      setInternalBrands(Array.isArray(data) ? data : data?.items ?? [])
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Không thể tải danh sách nhãn hàng.')
    } finally {
      setInternalLoading(false)
    }
  }, [onRefresh])

  useEffect(() => {
    if (propBrands === undefined) {
      fetchInternalBrands()
    }
  }, [propBrands, fetchInternalBrands])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.brandId)
    try {
      await deleteBrand(deleteTarget.brandId)
      toast.success(`Đã xóa nhãn hàng "${deleteTarget.brandName}" thành công!`)
      setDeleteTarget(null)
      if (onRefresh) onRefresh()
      else setInternalBrands((prev) => prev.filter((b) => b.brandId !== deleteTarget.brandId))
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Xóa nhãn hàng thất bại.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadBrandImportTemplate()
      toast.success('Đã tải file Excel mẫu nhãn hàng thành công!')
    } catch {
      toast.error('Không thể tải file mẫu. Vui lòng thử lại.')
    }
  }

  const handleExportBrands = async () => {
    try {
      await exportBrands()
      toast.success('Đã xuất danh sách nhãn hàng ra Excel!')
    } catch {
      toast.error('Xuất danh sách nhãn hàng thất bại.')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const res = await importBrands(file)
      if (!res || typeof res !== 'object') {
        toast.success('Import nhãn hàng thành công!')
        if (onRefresh) onRefresh()
        else fetchInternalBrands()
        return
      }

      if (res.errorCount === 0) {
        toast.success(`Import thành công tất cả ${res.successCount} nhãn hàng!`)
      } else if (res.successCount > 0) {
        toast.warning(`Đã import ${res.successCount} nhãn hàng. Có ${res.errorCount} dòng gặp lỗi/trùng lặp.`)
        setImportResult(res)
      } else {
        toast.error(`Không thể import: ${res.errorCount} dòng dữ liệu bị lỗi hoặc trùng lặp.`)
        setImportResult(res)
      }

      if (onRefresh) onRefresh()
      else fetchInternalBrands()
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Lỗi khi import file Excel.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Filters & Search ───────────────────────────────────────────────────
  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      const matchesSearch =
        !search.trim() ||
        b.brandName?.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase())

      const hasCampaign = (b.activeCampaignCount || 0) > 0
      let matchesStatus = true
      if (statusFilter === 'ACTIVE') matchesStatus = hasCampaign
      if (statusFilter === 'INACTIVE') matchesStatus = !hasCampaign

      return matchesSearch && matchesStatus
    })
  }, [brands, search, statusFilter])

  const activeCount = useMemo(() => brands.filter((b) => (b.activeCampaignCount || 0) > 0).length, [brands])
  const inactiveCount = brands.length - activeCount

  return (
    <div className="rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-sm transition-all">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* ── Table Header / Toolbar ────────────────────────────────────────── */}
      <div className="border-b border-smb-outline-variant/40 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-smb-primary-container/10 text-smb-primary">
              <Icon name="corporate_fare" className="text-2xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-smb-on-surface">Danh Sách Nhãn Hàng Đối Tác</h2>
                <span className="inline-flex items-center rounded-full bg-smb-surface-container-high px-2 py-0.5 text-xs font-semibold text-smb-on-surface-variant">
                  {brands.length} đối tác
                </span>
              </div>
              <p className="text-xs text-smb-on-surface-variant">
                Quản lý hồ sơ doanh nghiệp, trạng thái chiến dịch và tích hợp quảng cáo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon="download"
              onClick={handleDownloadTemplate}
              title="Tải file Excel mẫu gồm danh sách nhãn hàng hiện tại"
            >
              File Mẫu Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="file_download"
              onClick={handleExportBrands}
              title="Xuất danh sách nhãn hàng chi tiết ra Excel"
            >
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={importing ? 'progress_activity' : 'upload_file'}
              onClick={handleImportClick}
              disabled={importing}
              className={importing ? 'animate-pulse' : ''}
            >
              {importing ? 'Đang Import...' : 'Import Excel'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="history"
              onClick={() => setHistoryModalOpen(true)}
              title="Xem lịch sử các đợt import Excel nhãn hàng"
            >
              Lịch Sử Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="refresh"
              onClick={onRefresh || fetchInternalBrands}
              disabled={loading}
              title="Làm mới dữ liệu"
            >
              Làm Mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="add"
              onClick={() => navigate('/brand/create')}
            >
              Thêm Nhãn Hàng
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl border border-smb-outline-variant/40 bg-smb-surface-container-low p-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-smb-surface-container-lowest text-smb-primary font-bold shadow-xs'
                  : 'text-smb-on-surface-variant hover:text-smb-on-surface'
              }`}
            >
              Tất cả ({brands.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 font-medium transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-smb-surface-container-lowest text-emerald-600 font-bold shadow-xs'
                  : 'text-smb-on-surface-variant hover:text-smb-on-surface'
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Có chiến dịch ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 font-medium transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-smb-surface-container-lowest text-slate-700 dark:text-slate-200 font-bold shadow-xs'
                  : 'text-smb-on-surface-variant hover:text-smb-on-surface'
              }`}
            >
              <span className="size-1.5 rounded-full bg-slate-400" />
              Chưa có chiến dịch ({inactiveCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-smb-on-surface-variant/60">
              <Icon name="search" className="text-[18px]" />
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-low py-1.5 pl-9 pr-8 text-xs text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:bg-smb-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-smb-on-surface-variant/50 hover:text-smb-on-surface"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table Content ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-smb-outline-variant/40 bg-smb-surface-container-low/50 text-[11px] font-bold uppercase tracking-wider text-smb-on-surface-variant">
              <th className="px-5 py-3.5 text-center w-12">#</th>
              <th className="px-5 py-3.5 text-left">Nhãn Hàng Đối Tác</th>
              <th className="px-5 py-3.5 text-center w-40">Chiến Dịch Đang Chạy</th>
              <th className="px-5 py-3.5 text-center w-40">Trạng Thái</th>
              <th className="px-5 py-3.5 text-right w-44">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-smb-outline-variant/20">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-smb-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-2xl text-smb-primary">progress_activity</span>
                    <span className="text-xs font-medium">Đang tải danh sách nhãn hàng...</span>
                  </div>
                </td>
              </tr>
            ) : filteredBrands.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-smb-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-smb-surface-container-low text-smb-outline">
                      <Icon name="search_off" className="text-2xl" />
                    </div>
                    <p className="text-sm font-semibold text-smb-on-surface">Không tìm thấy nhãn hàng nào</p>
                    <p className="text-xs text-smb-on-surface-variant max-w-sm">
                      {search
                        ? `Không có kết quả phù hợp với từ khóa "${search}". Hãy thử tìm kiếm từ khóa khác.`
                        : 'Chưa có nhãn hàng nào trong danh mục đã chọn.'}
                    </p>
                    {(search || statusFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('')
                          setStatusFilter('ALL')
                        }}
                        className="mt-1 text-xs font-semibold text-smb-primary hover:underline"
                      >
                        Đặt lại bộ lọc
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredBrands.map((b, idx) => {
                const hasCampaign = (b.activeCampaignCount || 0) > 0
                return (
                  <tr
                    key={b.brandId}
                    className="transition-colors hover:bg-smb-surface-container-low/60 group"
                  >
                    {/* Index */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-smb-surface-container-high text-[11px] font-bold text-smb-on-surface-variant">
                        {idx + 1}
                      </span>
                    </td>

                    {/* Brand Info & Avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${getBrandGradient(
                            b.brandName
                          )} text-xs font-bold shadow-xs transition-transform group-hover:scale-105`}
                        >
                          {getBrandInitials(b.brandName)}
                        </div>
                        <div className="min-w-0 max-w-md">
                          <p className="font-bold text-sm text-smb-on-surface group-hover:text-smb-primary transition-colors">
                            {b.brandName}
                          </p>
                          {b.description ? (
                            <p className="text-xs text-smb-on-surface-variant/80 truncate mt-0.5" title={b.description}>
                              {b.description}
                            </p>
                          ) : (
                            <p className="text-[11px] italic text-smb-on-surface-variant/50 mt-0.5">
                              Chưa có mô tả nhãn hàng
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Campaign Count */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          hasCampaign
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-smb-surface-container-high text-smb-on-surface-variant'
                        }`}
                      >
                        <Icon name="campaign" className="text-[15px]" />
                        {b.activeCampaignCount || 0} chiến dịch
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          hasCampaign
                            ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-200/60 text-slate-700 border border-slate-300/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            hasCampaign ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        {hasCampaign ? 'Đang hoạt động' : 'Chưa có chiến dịch'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/brand/update/${b.brandId}`)}
                          className="flex size-8 items-center justify-center rounded-lg border border-smb-outline-variant/60 text-smb-on-surface-variant transition-all hover:border-smb-primary hover:bg-smb-surface-container-high hover:text-smb-primary active:scale-95"
                          title="Chỉnh sửa nhãn hàng"
                        >
                          <Icon name="edit" className="text-[16px]" />
                        </button>

                        <button
                          type="button"
                          disabled={hasCampaign || deletingId === b.brandId}
                          onClick={() => setDeleteTarget(b)}
                          className={`flex size-8 items-center justify-center rounded-lg border transition-all active:scale-95 ${
                            hasCampaign
                              ? 'border-smb-outline-variant/30 text-smb-on-surface-variant/30 cursor-not-allowed'
                              : 'border-smb-outline-variant/60 text-rose-600 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          }`}
                          title={hasCampaign ? 'Không thể xóa nhãn hàng đang có chiến dịch' : 'Xóa nhãn hàng'}
                        >
                          <Icon name="delete" className="text-[16px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Xác nhận xóa nhãn hàng"
          message={`Bạn có chắc chắn muốn xóa nhãn hàng "${deleteTarget.brandName}" không? Dữ liệu liên quan sẽ bị xóa khỏi hệ thống.`}
          confirmLabel="Xác Nhận Xóa"
          cancelLabel="Hủy Bỏ"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Import Results Modal ─────────────────────────────── */}
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 smb-fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-smb-surface-container-lowest shadow-2xl border border-smb-outline-variant/60 overflow-hidden smb-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-smb-outline-variant/40 px-6 py-4 bg-smb-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-smb-on-surface">Báo Cáo Chi Tiết Import Nhãn Hàng</h3>
                  <p className="text-xs text-smb-on-surface-variant">
                    Tổng cộng {importResult.totalRows} dòng dữ liệu trong file đã được phân tích
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="flex size-8 items-center justify-center rounded-full text-smb-on-surface-variant hover:bg-smb-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-3 p-6 bg-smb-surface-container-lowest border-b border-smb-outline-variant/30">
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Thành Công</span>
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">check_circle</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {importResult.successCount}
                </div>
                <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Nhãn hàng đã lưu</div>
              </div>

              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Trùng Lặp</span>
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">content_copy</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">
                  {importResult.duplicateCount}
                </div>
                <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Đã có trong DB hoặc file</div>
              </div>

              <div className="rounded-2xl border border-rose-200/60 bg-rose-50/60 p-3.5 dark:border-rose-500/20 dark:bg-rose-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Lỗi Dữ Liệu</span>
                  <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg">error</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-rose-800 dark:text-rose-300">
                  {Math.max(0, importResult.errorCount - importResult.duplicateCount)}
                </div>
                <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">Thiếu tên hoặc quá ký tự</div>
              </div>
            </div>

            {/* Error Table */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {importResult.errors && importResult.errors.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-smb-on-surface-variant">
                      Chi tiết {importResult.errors.length} dòng lỗi / cảnh báo
                    </span>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      Các dòng lỗi đã được bỏ qua
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-smb-outline-variant/50">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-smb-surface-container-low text-smb-on-surface-variant uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold text-center w-16">Dòng</th>
                          <th className="py-2.5 px-3 font-semibold">Tên Nhãn Hàng</th>
                          <th className="py-2.5 px-3 font-semibold">Phân Loại</th>
                          <th className="py-2.5 px-3 font-semibold">Chi Tiết Lỗi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-smb-outline-variant/30">
                        {importResult.errors.map((err, idx) => {
                          const isDup = err.field === 'Duplicate'
                          return (
                            <tr key={idx} className="hover:bg-smb-surface-container-low/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-center">
                                <span className="inline-flex items-center justify-center rounded-md bg-smb-surface-container px-2 py-0.5 text-xs text-smb-on-surface">
                                  #{err.rowIndex}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-smb-on-surface max-w-[150px] truncate" title={err.brandName}>
                                {err.brandName || '(Trống)'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isDup
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                                }`}>
                                  <span className="material-symbols-outlined text-[11px]">
                                    {isDup ? 'content_copy' : 'warning'}
                                  </span>
                                  {isDup ? 'Trùng lặp' : 'Thiếu/Sai dữ liệu'}
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
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2">check_circle</span>
                  <p className="text-sm font-semibold text-smb-on-surface">Tất cả dữ liệu hoàn toàn hợp lệ!</p>
                  <p className="text-xs text-smb-on-surface-variant mt-1">Không có nhãn hàng nào bị trùng lặp hay thiếu thông tin.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-smb-outline-variant/40 px-6 py-4 bg-smb-surface-container-low/30">
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

      {/* ── Import History Modal ────────────────────────────────────────── */}
      <ImportHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        type="BRAND"
      />
    </div>
  )
}

export default BrandTable
