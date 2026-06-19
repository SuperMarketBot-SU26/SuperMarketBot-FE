import React from 'react'
import { Link } from 'react-router-dom'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Navbar({ title = 'Khởi Tạo Chiến Dịch', subtitle = 'Tạo chiến dịch khuyến mãi mới cho thương hiệu đối tác' }) {
  return (
    <header className="sticky top-0 z-20 border-b border-smb-outline-variant bg-smb-surface-container-lowest/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-smb-on-surface">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-smb-on-surface-variant">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container"
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container"
          >
            <Icon name="notifications" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
