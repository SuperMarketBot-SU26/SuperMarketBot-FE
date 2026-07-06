import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { icon: 'inventory_2', label: 'Tổng Quan' },
  { icon: 'smart_toy', label: 'Giám Sát Robot', path: '/robots' },
  { icon: 'groups', label: 'Quản Lý Khách Hàng' },
  { icon: 'campaign', label: 'Chiến Dịch Quảng Cáo', path: '/' },
  { icon: 'sell', label: 'Gói Quảng Cáo', path: '/ad-packages' },
  { icon: 'account_balance_wallet', label: 'Quản Lý Nhãn Hàng', path: '/brand-dashboard' },
  { icon: 'inventory_2', label: 'Quản Lý Sản Phẩm', path: '/products' },
  { icon: 'reviews', label: 'Đánh Giá & Phản Hồi' },
  { icon: 'tune', label: 'Cấu Hình Thuật Toán', path: '/algorithm-settings' },
  { icon: 'manage_accounts', label: 'Quản Lý Tài Khoản' },
  { icon: 'history', label: 'Nhật Ký Hệ Thống' },
]

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Sidebar({ activeItem = 'Khuyến Mãi & Trợ Giá' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNav = (item) => {
    if (item.path) navigate(item.path)
  }

  const isActive = (item) => {
    if (item.path) return location.pathname === item.path
    return activeItem === item.label
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-smb-outline-variant bg-smb-surface-container-lowest">
      {/* Brand band — matches the reference's purple sidebar top, in green. */}
      <div className="border-b border-smb-outline-variant bg-smb-surface-container-low px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-smb-primary-container text-smb-on-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]">
            <Icon name="storefront" className="text-[22px]" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-smb-on-surface">
              SmartMarketBot
            </p>
            <p className="text-xs font-medium text-smb-on-surface-variant">
              Admin Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Search — mirrors the reference's search box under the brand. */}
      <div className="px-3 pt-3">
        <div className="relative flex items-center">
          <Icon name="search" className="pointer-events-none absolute left-2.5 text-[16px] text-smb-outline" />
          <input
            type="text"
            placeholder="Tìm kiếm nhanh…"
            className="w-full rounded-md border border-smb-outline-variant bg-smb-surface-container-low py-1.5 pl-8 pr-2 text-xs text-smb-on-surface placeholder:text-smb-outline focus:border-smb-primary-container focus:outline-none focus:ring-1 focus:ring-smb-primary-container transition-colors"
          />
          <span className="absolute right-2 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-1 py-px text-[9px] font-medium text-smb-on-surface-variant">
            ⌘K
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); handleNav(item) }}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[120ms] ${
                  isActive(item)
                    ? 'bg-smb-active-bg text-smb-primary-container'
                    : 'text-smb-on-surface-variant hover:bg-smb-surface-container-low hover:text-smb-on-surface'
                }`}
              >
                {isActive(item) && (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-smb-primary-container" />
                )}
                <Icon
                  name={item.icon}
                  className={`text-[20px] transition-colors duration-[120ms] ${isActive(item) ? 'text-smb-primary-container' : 'group-hover:text-smb-on-surface'}`}
                />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-smb-outline-variant p-4">
        <div className="flex items-center gap-3 rounded-md border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2.5 transition-colors hover:bg-smb-surface-container">
          <div className="flex size-8 items-center justify-center rounded-full bg-smb-secondary-container text-xs font-semibold text-smb-on-secondary-container">
            TH
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-smb-on-surface">
              Trần Hoàng Nam
            </p>
            <p className="truncate text-xs text-smb-on-surface-variant">
              Quản trị viên
            </p>
          </div>
          <Icon name="unfold_more" className="text-[18px] text-smb-outline" />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar