import React from 'react'
import { useNavigate } from 'react-router-dom'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Navbar({ title = 'Khởi Tạo Chiến Dịch', subtitle = 'Tạo chiến dịch khuyến mãi mới cho thương hiệu đối tác' }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 border-b border-smb-outline-variant bg-smb-surface-container-lowest/85 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex size-9 items-center justify-center rounded-md border border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant transition-colors hover:bg-smb-surface-container hover:text-smb-on-surface"
            title="Quay lại"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>
          <div className="leading-tight">
            <h1 className="text-[22px] font-semibold tracking-tight text-smb-on-surface">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-smb-on-surface-variant">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-smb-outline" />
            <input
              type="text"
              placeholder="Tìm kiếm…"
              className="w-56 rounded-md border border-smb-outline-variant bg-smb-surface-container-lowest py-1.5 pl-8 pr-8 text-xs text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary-container focus:outline-none focus:ring-1 focus:ring-smb-primary-container transition-colors"
            />
          </div>

          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-md border border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant transition-colors hover:bg-smb-surface-container hover:text-smb-on-surface"
            title="Thông báo"
          >
            <Icon name="notifications" className="text-[20px]" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-smb-primary-container" />
          </button>

          <button
            type="button"
            className="hidden size-9 items-center justify-center rounded-md border border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant transition-colors hover:bg-smb-surface-container hover:text-smb-on-surface md:flex"
            title="Trợ giúp"
          >
            <Icon name="help" className="text-[20px]" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar