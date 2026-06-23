import React from 'react'
import { Button } from './ui/Button'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function FormModal({ title, onClose, onSubmit, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-smb-surface-container-lowest shadow-xl">
        <div className="flex items-center justify-between border-b border-smb-outline-variant px-6 py-4">
          <h2 className="text-base font-semibold text-smb-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit?.() }} className="px-6 py-5 space-y-4">
          {children}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-smb-on-surface">{label}</label>
      {children}
    </div>
  )
}

export default FormModal
