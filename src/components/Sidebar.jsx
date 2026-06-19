import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { icon: 'inventory_2', label: 'Quản Lý Kho Hàng' },
  { icon: 'smart_toy', label: 'Giám Sát Robot' },
  { icon: 'groups', label: 'Quản Lý Khách Hàng' },
  { icon: 'sell', label: 'Khuyến Mãi & Trợ Giá', path: '/' },
  { icon: 'gpp_maybe', label: 'Chống Gian Lận' },
  { icon: 'account_balance_wallet', label: 'Đối Soát Ví Brand' },
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
    if (item.path) {
      navigate(item.path)
    }
  }

  const isActive = (item) => {
    if (item.path) return location.pathname === item.path
    return activeItem === item.label
  }
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-smb-outline-variant bg-smb-surface-container-lowest">
      <div className="flex items-center gap-3 border-b border-smb-outline-variant px-6 py-5">
        <div className="flex size-9 items-center justify-center rounded bg-smb-primary-container text-smb-on-primary">
          <Icon name="storefront" className="text-[22px]" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-smb-on-surface">
            SmartMarketBot
          </p>
          <p className="text-xs font-medium text-smb-on-surface-variant">
            Admin Dashboard
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); handleNav(item) }}
                className={`relative flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item)
                    ? 'bg-smb-active-bg text-smb-primary-container'
                    : 'text-smb-on-surface-variant hover:bg-smb-surface-container-low hover:text-smb-on-surface'
                }`}
              >
                {isActive(item) && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-smb-primary-container" />
                )}
                <Icon
                  name={item.icon}
                  className={`text-[20px] ${isActive(item) ? 'text-smb-primary-container' : ''}`}
                />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-smb-outline-variant p-4">
        <div className="flex items-center gap-3 rounded border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2.5">
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
