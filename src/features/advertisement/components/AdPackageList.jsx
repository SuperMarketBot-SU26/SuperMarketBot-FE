import React, { useState, useEffect, useCallback } from 'react'
import { DataTable } from '../../../components/DataTable'
import { Badge } from '../../../components/DataTable'
import { TableActions } from '../../../components/TableActions'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { FormModal, FormField } from '../../../components/FormModal'
import { getPackages, createPackage, updatePackage, deletePackage } from '../api/adPackageApi'

const statusVariant = (status) => ({
  Active: 'success',
  Inactive: 'neutral',
})[status] || 'neutral'

const statusLabel = (status) => ({
  Active: 'Hoạt động',
  Inactive: 'Tạm dừng',
})[status] || status

const mapStatusForApi = (status) => (status === 'active' ? 'Active' : 'Inactive')
const mapStatusFromApi = (status) => (status === 'Active' ? 'active' : 'inactive')

const EMPTY_FORM = {
  packageName: '',
  pricePackage: '',
  priceRoute: '',
  basePriceClick: '',
  adScore: '',
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
      setError(err.response?.data?.message || 'Không thể tải danh sách gói quảng cáo.')
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
      pricePackage: String(pkg.pricePackage),
      priceRoute: String(pkg.priceRoute),
      basePriceClick: String(pkg.basePriceClick),
      adScore: String(pkg.adScore),
    })
    setModal({ type: 'edit', data: pkg })
  }

  const closeModal = () => {
    setModal(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async () => {
    const payload = {
      packageName: form.packageName.trim(),
      pricePackage: Number(form.pricePackage),
      priceRoute: Number(form.priceRoute),
      basePriceClick: Number(form.basePriceClick),
      adScore: Number(form.adScore),
      ...(modal.type === 'edit' && { status: mapStatusForApi(modal.data.status) }),
    }

    setSubmitting(true)
    try {
      if (modal.type === 'create') {
        const created = await createPackage(payload)
        setPackages((prev) => [...prev, created])
      } else {
        const updated = await updatePackage(modal.data.packageId, payload)
        setPackages((prev) =>
          prev.map((p) => (p.packageId === modal.data.packageId ? updated : p))
        )
      }
      closeModal()
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deletePackage(deleteTarget.packageId)
      setPackages((prev) => prev.filter((p) => p.packageId !== deleteTarget.packageId))
      setDeleteTarget(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa gói. Vui lòng thử lại.')
    }
  }

  const handleToggleStatus = async (pkg) => {
    const newStatus = pkg.status === 'Active' ? 'Inactive' : 'Active'
    const payload = {
      packageName: pkg.packageName,
      pricePackage: pkg.pricePackage,
      priceRoute: pkg.priceRoute,
      basePriceClick: pkg.basePriceClick,
      adScore: pkg.adScore,
      status: newStatus,
    }
    try {
      const updated = await updatePackage(pkg.packageId, payload)
      setPackages((prev) =>
        prev.map((p) => (p.packageId === pkg.packageId ? updated : p))
      )
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    }
  }

  const formatVND = (value) =>
    Number(value).toLocaleString('vi-VN')

  const columns = [
    {
      key: 'packageName',
      label: 'Tên Gói',
      render: (val, row) => (
        <div>
          <p className="font-medium text-smb-on-surface">{val}</p>
          <p className="mt-0.5 text-xs text-smb-on-surface-variant">{row.adScore} điểm ưu tiên</p>
        </div>
      ),
    },
    {
      key: 'pricePackage',
      label: 'Giá Gói',
      align: 'right',
      render: (val) => (
        <span className="font-medium tabular-nums text-smb-on-surface">
          {formatVND(val)} đ
        </span>
      ),
    },
    {
      key: 'priceRoute',
      label: 'Giá/Route',
      align: 'right',
      render: (val) => (
        <span className="tabular-nums text-smb-on-surface">
          {formatVND(val)} đ
        </span>
      ),
    },
    {
      key: 'basePriceClick',
      label: 'Giá/Click',
      align: 'right',
      render: (val) => (
        <span className="tabular-nums text-smb-on-surface">
          {formatVND(val)} đ
        </span>
      ),
    },
    {
      key: 'activeCampaignCount',
      label: 'Chiến Dịch',
      align: 'center',
      render: (val) => (
        <span className="text-sm text-smb-on-surface">{val ?? 0}</span>
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
              label: row.status === 'Active' ? 'Tạm dừng' : 'Kích hoạt',
              icon: row.status === 'Active' ? 'pause_circle' : 'play_circle',
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
            { value: 'inactive', label: 'Tạm Dừng' },
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
        >
          <FormField label="Tên gói">
            <input
              type="text"
              value={form.packageName}
              onChange={(e) => setForm((f) => ({ ...f, packageName: e.target.value }))}
              placeholder="VD: Bạc, Vàng, Kim Cương..."
              className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Giá gói (VNĐ)">
              <input
                type="number"
                value={form.pricePackage}
                onChange={(e) => setForm((f) => ({ ...f, pricePackage: e.target.value }))}
                placeholder="VD: 500000"
                min={0}
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                required
              />
            </FormField>
            <FormField label="Điểm ưu tiên (adScore)">
              <input
                type="number"
                value={form.adScore}
                onChange={(e) => setForm((f) => ({ ...f, adScore: e.target.value }))}
                placeholder="VD: 100"
                min={0}
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Giá mỗi route (VNĐ)">
              <input
                type="number"
                value={form.priceRoute}
                onChange={(e) => setForm((f) => ({ ...f, priceRoute: e.target.value }))}
                placeholder="VD: 1500"
                min={0}
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
                required
              />
            </FormField>
            <FormField label="Giá mỗi click (VNĐ)">
              <input
                type="number"
                value={form.basePriceClick}
                onChange={(e) => setForm((f) => ({ ...f, basePriceClick: e.target.value }))}
                placeholder="VD: 3000"
                min={0}
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary focus:outline-none focus:ring-1 focus:ring-smb-primary"
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
