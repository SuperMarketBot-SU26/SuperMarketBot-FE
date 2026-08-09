import React, { useEffect, useState } from 'react'
import { SlideOver } from '../../../components/SlideOver'
import { getUser } from '../api/accountApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const ROLE_LABEL = {
  Admin:  { label: 'Admin',         color: 'bg-smb-primary-container/15 text-smb-primary-container border-smb-primary-container/30' },
  Staff:  { label: 'Staff',         color: 'bg-blue-50 text-blue-700 border-blue-200' },
  Member: { label: 'Member',        color: 'bg-gray-100 text-gray-600 border-gray-200' },
}
const STATUS_LABEL = {
  Active:   { label: 'Hoạt động',    color: 'bg-green-50 text-green-700 border-green-200' },
  Inactive: { label: 'Tạm dừng',     color: 'bg-gray-100 text-gray-600 border-gray-200' },
  Pending:  { label: 'Chờ kích hoạt', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  Blocked:  { label: 'Bị khóa',      color: 'bg-red-50 text-red-700 border-red-200' },
}

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function Field({ icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 border-b border-smb-outline-variant/40 py-2.5 last:border-b-0">
      <Icon name={icon} className="mt-0.5 text-[18px] text-smb-on-surface-variant" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-smb-on-surface-variant">{label}</p>
        <p className={`mt-0.5 break-words text-sm ${mono ? 'font-mono' : ''} text-smb-on-surface`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

export function AccountDetailPanel({ accountId, onClose, onEdit }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getUser(accountId)
      .then((data) => { if (!cancelled) setUser(data) })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.error || err.message || 'Không thể tải chi tiết tài khoản.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accountId])

  const roleInfo  = ROLE_LABEL[user?.role]   || { label: user?.role ?? '—',    color: 'bg-gray-100 text-gray-600 border-gray-200' }
  const statusInfo = STATUS_LABEL[user?.status] || { label: user?.status ?? '—', color: 'bg-gray-100 text-gray-600 border-gray-200' }

  const initials = (user?.fullName || user?.username || '?').slice(0, 2).toUpperCase()

  return (
    <SlideOver
      open={!!accountId}
      onClose={onClose}
      title={user ? (user.fullName || `@${user.username}`) : 'Chi tiết tài khoản'}
      subtitle={user ? `@${user.username} · #${user.accountId}` : 'Đang tải...'}
    >
      {loading && (
        <div className="flex items-center justify-center py-12 text-sm text-smb-on-surface-variant">
          <Icon name="progress_activity" className="mr-2 animate-spin text-[18px]" />
          Đang tải chi tiết...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && user && (
        <div className="space-y-5">
          {/* Hero */}
          <div className="flex items-center gap-4 rounded-xl border border-smb-outline-variant bg-smb-surface-container-low p-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-smb-secondary-container text-lg font-semibold text-smb-on-secondary-container">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-smb-on-surface">
                {user.fullName || user.username}
              </h3>
              <p className="truncate text-xs text-smb-on-surface-variant">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Fields */}
          <section className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
            <h4 className="mb-2 text-sm font-semibold text-smb-on-surface">Thông tin đăng nhập</h4>
            <Field icon="badge" label="Account ID" value={user.accountId} mono />
            <Field icon="person" label="Username" value={user.username} mono />
            <Field icon="mail" label="Email" value={user.email} />
          </section>

          <section className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
            <h4 className="mb-2 text-sm font-semibold text-smb-on-surface">Hồ sơ cá nhân</h4>
            <Field icon="account_circle" label="Họ và tên" value={user.fullName} />
            <Field icon="call" label="Số điện thoại" value={user.phone} />
          </section>

          <section className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
            <h4 className="mb-2 text-sm font-semibold text-smb-on-surface">Phân quyền & Trạng thái</h4>
            <Field icon="shield_person" label="Vai trò" value={roleInfo.label} />
            <Field icon="toggle_on" label="Trạng thái" value={statusInfo.label} />
          </section>

          <section className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
            <h4 className="mb-2 text-sm font-semibold text-smb-on-surface">Hoạt động</h4>
            <Field icon="event_available" label="Ngày tạo" value={formatDate(user.createdAt)} />
            {user.lastLoginAt && (
              <Field icon="login" label="Đăng nhập cuối" value={formatDate(user.lastLoginAt)} />
            )}
          </section>

          {/* Actions */}
          {onEdit && (
            <div className="flex justify-end gap-2 border-t border-smb-outline-variant pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-smb-outline-variant px-4 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => onEdit(user)}
                className="inline-flex items-center gap-2 rounded-lg bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary-container hover:opacity-90"
              >
                <Icon name="edit" className="text-[16px]" />
                Chỉnh sửa
              </button>
            </div>
          )}
        </div>
      )}
    </SlideOver>
  )
}

export default AccountDetailPanel