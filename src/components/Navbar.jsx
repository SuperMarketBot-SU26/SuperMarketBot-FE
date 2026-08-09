import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Navbar({
  title = 'Khởi Tạo Chiến Dịch',
  subtitle = 'Tạo chiến dịch khuyến mãi mới cho thương hiệu đối tác',
  onOpenCommandPalette,
}) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 border-b border-smb-outline-variant/60 bg-smb-surface/80 backdrop-blur-md transition-colors duration-200">
      <div className="flex items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex size-9 items-center justify-center rounded-lg border border-smb-outline-variant/70 bg-smb-surface-container-lowest text-smb-on-surface-variant transition-all hover:border-smb-primary hover:bg-smb-surface-container hover:text-smb-on-surface active:scale-95"
            title="Quay lại"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </button>
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-smb-on-surface-variant/70 uppercase tracking-wider">
              <span className="inline-flex items-center gap-1 rounded bg-smb-surface-container px-1.5 py-0.5">
                <Icon name="grid_view" className="text-[10px] text-smb-primary" />
                <span>SMB Portal</span>
              </span>
              <Icon name="chevron_right" className="text-[10px]" />
              <span className="text-smb-primary">{title}</span>
            </div>
            <h1 className="text-[18px] font-bold tracking-tight text-smb-on-surface mt-1">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-smb-on-surface-variant/80">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Command Palette Button */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="relative hidden items-center gap-2 rounded-lg border border-smb-outline-variant/70 bg-smb-surface-container-lowest py-1.5 pl-3 pr-2.5 text-xs text-smb-on-surface-variant transition-all hover:border-smb-primary/50 hover:bg-smb-surface-container md:flex active:scale-95"
          >
            <Icon name="search" className="text-[16px] text-smb-outline" />
            <span className="text-xs text-smb-on-surface-variant/70">Tìm nhanh...</span>
            <kbd className="ml-2 flex items-center rounded border border-smb-outline-variant/80 bg-smb-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-smb-on-surface-variant">
              ⌘K
            </kbd>
          </button>

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex size-9 items-center justify-center rounded-lg border border-smb-outline-variant/70 bg-smb-surface-container-lowest text-smb-on-surface-variant shadow-sm transition-all hover:border-smb-primary hover:bg-smb-surface-container hover:text-smb-on-surface active:scale-95"
            title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {theme === 'dark' ? (
              <Icon name="light_mode" className="text-[19px] text-amber-400 animate-spin-once" />
            ) : (
              <Icon name="dark_mode" className="text-[19px] text-slate-700" />
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-lg border border-smb-outline-variant/70 bg-smb-surface-container-lowest text-smb-on-surface-variant shadow-sm transition-all hover:border-smb-primary hover:bg-smb-surface-container hover:text-smb-on-surface active:scale-95"
            title="Thông báo"
          >
            <Icon name="notifications" className="text-[19px]" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-500 ring-2 ring-smb-surface smb-live-pulse" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar