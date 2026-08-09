import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { DataTable } from '../components/DataTable'
import { FormModal, FormField } from '../components/FormModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { TableActions } from '../components/TableActions'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { AdminStats } from '../features/account/components/AdminStats'
import { AccountDetailPanel } from '../features/account/components/AccountDetailPanel'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../features/account'

const ROLE_OPTIONS = [
  { value: 'Member', label: 'Member — Khách hàng' },
  { value: 'Staff', label: 'Staff — Nhân viên vận hành' },
  { value: 'Admin', label: 'Admin — Toàn quyền' },
]

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Hoạt động' },
  { value: 'Inactive', label: 'Tạm dừng' },
  { value: 'Pending', label: 'Chờ kích hoạt' },
  { value: 'Blocked', label: 'Bị khóa' },
]

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
  role: 'Member',
  status: 'Active',
}

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('vi-VN')
  } catch {
    return '—'
  }
}

export function AccountManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create/Edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null) // null = create mode
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirm state
  const [deletingUser, setDeletingUser] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Detail panel (slide-over)
  const [detailId, setDetailId] = useState(null)
  // Sub-tab: 'all' = tất cả, 'admin-only' = chỉ admin
  const [adminTab, setAdminTab] = useState('all')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getUsers({ pageNumber: 1, pageSize: 200 })
      const items = Array.isArray(data?.items) ? data.items : []
      setUsers(items)
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải danh sách tài khoản.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.fullName || '').toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    const matchAdminTab = adminTab === 'all' || u.role === 'Admin'
    return matchSearch && matchRole && matchStatus && matchAdminTab
  })

  const openCreate = () => {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setForm({
      username: user.username ?? '',
      email: user.email ?? '',
      password: '',
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      role: user.role ?? 'Member',
      status: user.status ?? 'Active',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleSubmit = async () => {
    setFormError(null)

    if (!form.username.trim()) {
      setFormError('Username không được để trống.')
      return
    }
    if (!form.email.trim()) {
      setFormError('Email không được để trống.')
      return
    }
    if (!editingUser && !form.password) {
      setFormError('Mật khẩu không được để trống khi tạo tài khoản.')
      return
    }
    if (!editingUser && form.password.length < 8) {
      setFormError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    if (editingUser) {
      const payload = {
        email: form.email.trim(),
        fullName: form.fullName.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        status: form.status,
      }
      setSubmitting(true)
      try {
        await updateUser(editingUser.accountId, payload)
        await fetchUsers()
        closeModal()
      } catch (err) {
        setFormError(err?.response?.data?.error || err.message || 'Cập nhật tài khoản thất bại.')
      } finally {
        setSubmitting(false)
      }
    } else {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        status: form.status,
      }
      setSubmitting(true)
      try {
        await createUser(payload)
        await fetchUsers()
        closeModal()
      } catch (err) {
        setFormError(err?.response?.data?.error || err.message || 'Tạo tài khoản thất bại.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setDeleting(true)
    try {
      await deleteUser(deletingUser.accountId)
      await fetchUsers()
      setDeletingUser(null)
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Xóa tài khoản thất bại.')
      setDeletingUser(null)
    } finally {
      setDeleting(false)
    }
  }

  const roleBadge = (role) => {
    const map = {
      Admin: 'bg-smb-primary-container/15 text-smb-primary-container border-smb-primary-container/30',
      Staff: 'bg-blue-50 text-blue-700 border-blue-200',
      Member: 'bg-gray-100 text-gray-600 border-gray-200',
    }
    return map[role] || 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const statusBadge = (status) => {
    const map = {
      Active: 'bg-green-50 text-green-700 border-green-200',
      Pending: 'bg-amber-50 text-amber-700 border-amber-200',
      Inactive: 'bg-gray-100 text-gray-600 border-gray-200',
      Blocked: 'bg-red-50 text-red-700 border-red-200',
    }
    return map[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const statusLabel = (status) =>
    STATUS_OPTIONS.find((s) => s.value === status)?.label || status

  const columns = [
    {
      key: 'accountId',
      label: 'ID',
      align: 'center',
      render: (val) => (
        <span className="text-xs tabular-nums text-smb-on-surface-variant">#{val}</span>
      ),
    },
    {
      key: 'username',
      label: 'Tài Khoản',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-smb-secondary-container text-xs font-semibold text-smb-on-secondary-container">
            {(row.fullName || row.username || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-smb-on-surface">
              {row.fullName || row.username}
            </p>
            <p className="truncate text-xs text-smb-on-surface-variant">@{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => (
        <span className="text-sm text-smb-on-surface-variant">{val}</span>
      ),
    },
    {
      key: 'role',
      label: 'Vai Trò',
      align: 'center',
      render: (val) => (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadge(val)}`}>
          {val}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng Thái',
      align: 'center',
      render: (val) => (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(val)}`}>
          {statusLabel(val)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Ngày Tạo',
      align: 'center',
      render: (val) => (
        <span className="text-xs text-smb-on-surface-variant">{formatDate(val)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <TableActions
            actions={[
              {
                label: 'Xem Chi Tiết',
                icon: 'visibility',
                onClick: () => setDetailId(row.accountId),
              },
              { label: 'Sửa', icon: 'edit', onClick: () => openEdit(row) },
              {
                label: 'Xóa',
                icon: 'delete',
                danger: true,
                onClick: () => setDeletingUser(row),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Tài Khoản" />

      <div className="pl-[260px]">
        <Navbar
          title="Quản Lý Tài Khoản"
          subtitle="Danh sách tài khoản hệ thống SmartMarketBot"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-5">
            {/* Stats */}
            <AdminStats
              users={users}
              roleFilter={adminTab === 'admin-only' ? 'Admin' : roleFilter}
              onRoleFilter={(v) => {
                // Khi click "Quản Trị Viên" → tự động vào tab Admin
                if (v === 'Admin') {
                  setAdminTab('admin-only')
                  setRoleFilter('all')
                } else {
                  setAdminTab('all')
                  setRoleFilter(v)
                }
              }}
            />

            {/* Sub-tab: Quản Lý Admin / Tất Cả */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-1">
                <button
                  type="button"
                  onClick={() => setAdminTab('all')}
                  className={`
                    flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all
                    ${adminTab === 'all'
                      ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
                      : 'text-smb-on-surface-variant hover:bg-smb-surface-container'}
                  `}
                >
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  Tất Cả Tài Khoản
                </button>
                <button
                  type="button"
                  onClick={() => { setAdminTab('admin-only'); setRoleFilter('all') }}
                  className={`
                    flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all
                    ${adminTab === 'admin-only'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-smb-on-surface-variant hover:bg-smb-surface-container'}
                  `}
                >
                  <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                  Quản Lý Admin
                </button>
              </div>

              {adminTab === 'admin-only' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                  Hiển thị chỉ tài khoản Admin
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-smb-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo username, email, họ tên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest pl-9 pr-4 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  icon="refresh"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading}
                >
                  Làm Mới
                </Button>
                <Button
                  variant="primary"
                  icon="add"
                  size="sm"
                  onClick={openCreate}
                >
                  Thêm Tài Khoản
                </Button>
              </div>
            </div>

            {/* Filter tabs: role + status */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-1">
                {[
                  { value: 'all', label: 'Tất Cả Vai Trò' },
                  { value: 'Admin', label: 'Admin' },
                  { value: 'Staff', label: 'Staff' },
                  { value: 'Member', label: 'Member' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRoleFilter(opt.value)}
                    className={`
                      rounded-md px-3 py-1.5 text-xs font-medium transition-all
                      ${roleFilter === opt.value
                        ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
                        : 'text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-1">
                {[
                  { value: 'all', label: 'Tất Cả Trạng Thái' },
                  { value: 'Active', label: 'Hoạt Động' },
                  { value: 'Pending', label: 'Chờ' },
                  { value: 'Inactive', label: 'Tạm Dừng' },
                  { value: 'Blocked', label: 'Bị Khóa' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusFilter(opt.value)}
                    className={`
                      rounded-md px-3 py-1.5 text-xs font-medium transition-all
                      ${statusFilter === opt.value
                        ? 'bg-smb-primary-container text-smb-on-primary-container shadow-sm'
                        : 'text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest py-16">
                <span className="material-symbols-outlined animate-spin text-2xl text-smb-on-surface-variant">
                  progress_activity
                </span>
                <span className="ml-2 text-sm text-smb-on-surface-variant">
                  Đang tải tài khoản...
                </span>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12 gap-3">
                <span className="material-symbols-outlined text-4xl text-smb-error">
                  error
                </span>
                <p className="text-sm text-smb-error">{fetchError}</p>
                <Button variant="secondary" onClick={fetchUsers}>
                  Thử lại
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest">
                <DataTable
                  columns={columns}
                  data={filtered}
                  emptyMessage={
                    adminTab === 'admin-only'
                      ? 'Chưa có tài khoản Admin nào trong hệ thống.'
                      : 'Không tìm thấy tài khoản nào.'
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <FormModal
          title={editingUser ? `Sửa Tài Khoản — @${editingUser.username}` : 'Thêm Tài Khoản Mới'}
          onClose={closeModal}
          onSubmit={handleSubmit}
          footer={
            <>
              <Button variant="secondary" type="button" onClick={closeModal} disabled={submitting}>
                Hủy
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                {editingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
              </Button>
            </>
          }
        >
          {formError && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <FormField label="Username" required>
            <Input
              placeholder="VD: nguyen.van.a"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              maxLength={100}
              disabled={!!editingUser}
              required
            />
          </FormField>

          <FormField label="Email" required>
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </FormField>

          {!editingUser && (
            <FormField label="Mật Khẩu" required>
              <Input
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                minLength={8}
                required
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Họ và Tên">
              <Input
                placeholder="Nguyễn Văn A"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                maxLength={100}
              />
            </FormField>
            <FormField label="Số Điện Thoại">
              <Input
                type="tel"
                placeholder="VD: 0901234567"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vai Trò" required>
              <Select
                options={ROLE_OPTIONS}
                value={form.role}
                onChange={(v) => handleChange('role', v)}
              />
            </FormField>
            <FormField label="Trạng Thái" required>
              <Select
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(v) => handleChange('status', v)}
              />
            </FormField>
          </div>
        </FormModal>
      )}

      {/* Delete confirm modal */}
      {deletingUser && (
        <ConfirmModal
          message={`Bạn có chắc muốn xóa tài khoản "${deletingUser.username}"? Tài khoản sẽ được chuyển sang trạng thái Tạm Dừng.`}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeletingUser(null)}
        />
      )}

      {/* Detail slide-over panel */}
      <AccountDetailPanel
        accountId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(user) => { setDetailId(null); openEdit(user) }}
      />
    </div>
  )
}

export default AccountManagement