import React from 'react'
import { Button } from './ui/Button'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  error = null,
  loading = false,
  confirmText = 'Xác Nhận',
  cancelText = 'Hủy',
  // 'danger' = red confirm button; 'primary' = blue confirm button
  confirmVariant = 'primary',
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-smb-surface-container-lowest shadow-xl">
        <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-smb-error-container">
            <Icon name="warning" className="text-[28px] text-smb-error" />
          </div>
          <p className="text-base font-medium text-smb-on-surface">{message}</p>
          {error && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-700">
              <Icon name="error" className="mt-0.5 text-[14px] text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}