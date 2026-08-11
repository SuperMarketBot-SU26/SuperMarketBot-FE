import React, { useState } from 'react'
import { adminDepositBrand } from '../api/brandApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function AdminDepositModal({ open, brand, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!open || !brand) return null

  const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const amountVnd = Number(amount)
    if (!Number.isFinite(amountVnd) || amountVnd <= 0) {
      setError('Số tiền phải là số dương.')
      return
    }
    setSubmitting(true)
    try {
      const result = await adminDepositBrand(brand.brandId, {
        amountVnd,
        note: note.trim() || undefined,
      })
      onSuccess?.(result)
      setAmount('')
      setNote('')
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Nạp ví thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-smb-surface-container-lowest p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-smb-on-surface">Nạp ví cho brand</h2>
            <p className="text-xs text-smb-on-surface-variant">
              Brand: <strong className="text-smb-on-surface">{brand.brandName}</strong>
              {' · '}
              Số dư hiện tại:{' '}
              <strong className="text-smb-primary">{formatVND(brand.wallet?.balance ?? 0)} đ</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-smb-on-surface-variant hover:text-smb-on-surface"
          >
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-smb-on-surface-variant">Số tiền (VND) *</span>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10000000"
              className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-smb-on-surface-variant">Ghi chú (tuỳ chọn)</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Khuyến mãi đầu tháng, đối soát, ..."
              className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
            />
          </label>
          {error && (
            <div className="rounded-lg bg-smb-error-container px-3 py-2 text-xs text-smb-on-error-container">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-smb-on-surface-variant hover:bg-smb-surface-container"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1 rounded-lg bg-smb-primary px-4 py-2 text-sm font-medium text-smb-on-primary hover:bg-smb-primary/90 disabled:opacity-50"
            >
              {submitting && <Icon name="progress_activity" className="animate-spin" />}
              Nạp ví
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
