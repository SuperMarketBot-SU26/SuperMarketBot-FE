import React, { useState, useEffect, useCallback } from 'react'
import { DataTable } from '../../../components/DataTable'
import { Badge } from '../../../components/DataTable'
import { TableActions } from '../../../components/TableActions'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { FormModal, FormField } from '../../../components/FormModal'
import { getPackages, createPackage, updatePackage, updatePackageStatus, deletePackage } from '../api/adPackageApi'
import { getErrorMessage } from '../../../api/client'
import { toast } from 'react-toastify'

const statusVariant = (status) => ({
  Active: 'success',
  Inactive: 'neutral',
})[status] || 'neutral'

const statusLabel = (status) => ({
  Active: 'Hoạt động',
  Inactive: 'Không hoạt động',
})[status] || status

const mapStatusFromApi = (status) => (status === 'Active' ? 'active' : 'inactive')

const EMPTY_FORM = {
  packageName: '',
  description: '',
  budget: '',
  zoneUnitPrice: '',
  shelfUnitPrice: '',
  routeUnitPrice: '',
  clickFee: '',
  adScore: '50',
  status: 'Active',
}

export function AdPackageList() {
  const [packages, setPackages] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // { type: 'create'|'edit', data?: pkg }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPackages()
      setPackages(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách gói quảng cáo.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  const filtered = statusFilter === 'all'
    ? packages
    : packages.filter((p) => mapStatusFromApi(p.status) === statusFilter)

  const counts = {
    all: packages.length,
    active: packages.filter((p) => mapStatusFromApi(p.status) === 'active').length,
    inactive: packages.filter((p) => mapStatusFromApi(p.status) === 'inactive').length,
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setModal({ type: 'create' })
  }

  const openEdit = (pkg) => {
    setForm({
      packageName: pkg.packageName,
      description: pkg.description || '',
      budget: String(pkg.budget),
      zoneUnitPrice: String(pkg.zoneUnitPrice ?? pkg.zoneFee ?? 0),
      shelfUnitPrice: String(pkg.shelfUnitPrice ?? pkg.shelfFee ?? 0),
      routeUnitPrice: String(pkg.routeUnitPrice ?? pkg.routeFee ?? 0),
      clickFee: String(pkg.clickFee),
      adScore: String(pkg.adScore ?? 50),
      status: pkg.status,
    })
    setModal({ type: 'edit', data: pkg })
  }

  const closeModal = () => {
    setModal(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async () => {
    // Basic client-side validation
    if (!form.packageName.trim()) {
      toast.error('Tên gói không được để trống.')
      return
    }
    const budget = Number(form.budget)
    if (isNaN(budget) || budget <= 0) {
      toast.error('Ngân sách quảng cáo phải lớn hơn 0.')
      return
    }
    const zoneUnitPrice = Number(form.zoneUnitPrice)
    const shelfUnitPrice = Number(form.shelfUnitPrice)
    const routeUnitPrice = Number(form.routeUnitPrice)
    const clickFee = Number(form.clickFee)
    if (isNaN(zoneUnitPrice) || zoneUnitPrice < 0 || isNaN(shelfUnitPrice) || shelfUnitPrice < 0 || isNaN(routeUnitPrice) || routeUnitPrice < 0 || isNaN(clickFee) || clickFee < 0) {
      toast.error('Đơn giá quảng cáo không được âm.')
      return
    }
    const adScore = Number(form.adScore)
    if (isNaN(adScore) || adScore < 0) {
      toast.error('Điểm ưu tiên (AdScore) không được âm.')
      return
    }

    const payload = {
      packageName: form.packageName.trim(),
      description: form.description?.trim() || null,
      budget,
      zoneUnitPrice,
      shelfUnitPrice,
      routeUnitPrice,
      clickFee,
      adScore,
      ...(modal.type === 'edit' && { status: form.status }),
    }

    setSubmitting(true)
    try {
      if (modal.type === 'create') {
        const created = await createPackage(payload)
        setPackages((prev) => [...prev, created])
        toast.success(`Đã tạo gói "${created.packageName}".`)
      } else {
        const updated = await updatePackage(modal.data.packageId, payload)
        setPackages((prev) =>
          prev.map((p) => (p.packageId === modal.data.packageId ? updated : p))
        )
        toast.success(`Đã cập nhật gói "${updated.packageName}".`)
      }
      closeModal()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Có lỗi xảy ra. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deletePackage(deleteTarget.packageId)
      setPackages((prev) => prev.filter((p) => p.packageId !== deleteTarget.packageId))
      toast.success(`Đã xóa gói "${deleteTarget.packageName}".`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể xóa gói. Vui lòng thử lại.'))
    }
  }

  const handleToggleStatus = async (pkg) => {
    const newStatus = pkg.status === 'Active' ? 'Inactive' : 'Active'
    try {
      const updated = await updatePackageStatus(pkg.packageId, newStatus)
      setPackages((prev) =>
        prev.map((p) => (p.packageId === pkg.packageId ? updated : p))
      )
      toast.success(
        newStatus === 'Active'
          ? `Đã kích hoạt gói "${updated.packageName}".`
          : `Đã tắt kích hoạt gói "${updated.packageName}".`
      )
    } catch (err) {
      toast.error(getErrorMessage(err, 'Có lỗi xảy ra. Vui lòng thử lại.'))
    }
  }

  const formatVND = (value) =>
    Number(value || 0).toLocaleString('vi-VN')

  const columns = [
    {
      key: 'packageName',
      label: 'Tên Gói',
      render: (val, row) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-smb-on-surface truncate">{val}</p>
          {row.description && (
            <p className="mt-0.5 text-xs text-smb-on-surface-variant line-clamp-2" title={row.description}>
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'budget',
      label: 'Ngân Sách',
      align: 'right',
      render: (val) => (
        <span className="font-semibold tabular-nums text-smb-primary-container">
          {formatVND(val)} đ
        </span>
      ),
    },
    {
      key: 'adScore',
      label: 'Độ Ưu Tiên',
      align: 'center',
      render: (val) => (
        <span className="font-bold tabular-nums text-smb-primary">
          {val ?? 50} pts
        </span>
      ),
    },
    {
      key: 'zoneUnitPrice',
      label: 'Đơn Giá Zone',
      align: 'right',
      render: (val, row) => <span className="tabular-nums text-smb-on-surface">{formatVND(val ?? row.zoneFee)} đ</span>,
    },
    {
      key: 'shelfUnitPrice',
      label: 'Đơn Giá Kệ',
      align: 'right',
      render: (val, row) => <span className="tabular-nums text-smb-on-surface">{formatVND(val ?? row.shelfFee)} đ</span>,
    },
    {
      key: 'routeUnitPrice',
      label: 'Đơn Giá Tuyến',
      align: 'right',
      render: (val, row) => <span className="tabular-nums text-smb-on-surface">{formatVND(val ?? row.routeFee)} đ</span>,
    },
    {
      key: 'clickFee',
      label: 'Phí Click',
      align: 'right',
      render: (val) => (
        <span className="tabular-nums text-smb-on-surface font-medium text-amber-600">
          {formatVND(val)} đ
        </span>
      ),
    },
    {
      key: 'activeCampaignCount',
      label: 'Chiến Dịch',
      align: 'center',
      render: (val) => (
        <span className="text-sm text-smb-on-surface font-medium">{val ?? 0}</span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng Thái',
      align: 'center',
      render: (val) => (
        <Badge variant={statusVariant(val)}>
          {statusLabel(val)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (_, row) => (
        <TableActions
          actions={[
            { label: 'Chỉnh sửa', icon: 'edit', onClick: () => openEdit(row) },
            {
              label: row.status === 'Active' ? 'Tắt kích hoạt' : 'Kích hoạt',
              icon: row.status === 'Active' ? 'cancel' : 'play_circle',
              onClick: () => handleToggleStatus(row),
            },
            { label: 'Xóa', icon: 'delete', danger: true, onClick: () => setDeleteTarget(row) },
          ]}
        />
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-smb-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
        <span className="ml-2 text-sm">Đang tải dữ liệu...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="material-symbols-outlined text-4xl text-smb-error">error</span>
        <p className="text-sm text-smb-error">{error}</p>
        <Button variant="secondary" onClick={fetchPackages}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-1">
          {[
            { value: 'all', label: 'Tất Cả' },
            { value: 'active', label: 'Hoạt Động' },
            { value: 'inactive', label: 'Không Hoạt Động' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`
                flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all
                ${statusFilter === opt.value
                  ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
                  : 'text-smb-on-surface-variant hover:bg-smb-surface-container'
                }
              `}
            >
              {opt.label}
              <span className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${
                statusFilter === opt.value
                  ? 'bg-smb-on-primary-container/20'
                  : 'bg-smb-surface-container text-smb-on-surface-variant'
              }`}>
                {counts[opt.value]}
              </span>
            </button>
          ))}
        </div>

        <Button variant="primary" icon="add" onClick={openCreate}>
          Tạo Gói Quảng Cáo
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="Không có gói quảng cáo nào."
      />

      {modal && (
        <FormModal
          title={modal.type === 'create' ? 'Tạo Gói Quảng Cáo Mới' : 'Chỉnh Sửa Gói Quảng Cáo'}
          onClose={closeModal}
          onSubmit={handleSubmit}
          disabled={submitting}
        >
          {modal.type === 'edit' && (
            <FormField label="Trạng thái">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
              >
                <option value="Active">Hoạt động</option>
                <option value="Inactive">Không hoạt động</option>
              </select>
            </FormField>
          )}

          <FormField label="Tên gói">
            <input
              type="text"
              value={form.packageName}
              onChange={(e) => setForm((f) => ({ ...f, packageName: e.target.value }))}
              placeholder="VD: Basic, Standard, Premium..."
              className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/40 focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
              required
            />
          </FormField>

          <FormField label="Mô tả gói">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Nhập mô tả ngắn về gói quảng cáo này..."
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/40 focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary resize-none"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Ngân sách quảng cáo (VNĐ)">
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                placeholder="VD: 5000000"
                min={0.01}
                step="any"
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/40 focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                required
              />
            </FormField>
            <FormField label="Điểm Ưu Tiên (AdScore)">
              <input
                type="number"
                value={form.adScore}
                onChange={(e) => setForm((f) => ({ ...f, adScore: e.target.value }))}
                placeholder="VD: 50, 100..."
                min={0}
                step="1"
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/40 focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                required
              />
            </FormField>
          </div>

          {/* Unit Prices Section */}
          <div className="mt-4 border-t border-smb-outline-variant/60 pt-4">
            <h4 className="mb-3 text-xs font-semibold text-smb-primary uppercase tracking-wider">
              Đơn giá tùy chọn vị trí & tuyến đường (Unit Prices)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Đơn giá Zone (VNĐ)">
                <input
                  type="number"
                  value={form.zoneUnitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, zoneUnitPrice: e.target.value }))}
                  placeholder="VD: 500000"
                  min={0}
                  step="any"
                  className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                  required
                />
              </FormField>
              <FormField label="Đơn giá Kệ (VNĐ)">
                <input
                  type="number"
                  value={form.shelfUnitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, shelfUnitPrice: e.target.value }))}
                  placeholder="VD: 300000"
                  min={0}
                  step="any"
                  className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                  required
                />
              </FormField>
              <FormField label="Đơn giá Tuyến (VNĐ)">
                <input
                  type="number"
                  value={form.routeUnitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, routeUnitPrice: e.target.value }))}
                  placeholder="VD: 200000"
                  min={0}
                  step="any"
                  className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                  required
                />
              </FormField>
            </div>
          </div>

          {/* Usage-Based Click Fee Section */}
          <div className="mt-4 border-t border-smb-outline-variant/60 pt-4">
            <h4 className="mb-3 text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Phí phát sinh (Usage Fee)
            </h4>
            <FormField label="Phí Click (Đơn giá/Click - VNĐ)">
              <input
                type="number"
                value={form.clickFee}
                onChange={(e) => setForm((f) => ({ ...f, clickFee: e.target.value }))}
                placeholder="VD: 5000"
                min={0}
                step="any"
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                required
              />
            </FormField>
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Bạn có chắc muốn xóa gói "${deleteTarget.packageName}" không? Hành động này không thể hoàn tác.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default AdPackageList
