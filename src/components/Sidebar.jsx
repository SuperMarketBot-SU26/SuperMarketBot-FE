import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

const navItems = [
  { icon: 'smart_toy', label: 'Giám Sát Robot', path: '/robots' },
  { icon: 'manage_accounts', label: 'Quản Lý Tài Khoản', path: '/accounts' },
  { icon: 'campaign', label: 'Chiến Dịch Quảng Cáo', path: '/' },
  { icon: 'sell', label: 'Gói Quảng Cáo', path: '/ad-packages' },
  { icon: 'account_balance_wallet', label: 'Quản Lý Nhãn Hàng', path: '/brand-dashboard' },
  { icon: 'inventory_2', label: 'Quản Lý Sản Phẩm', path: '/products' },
]

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function initialsFromName(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Sidebar({ activeItem = 'Khuyến Mãi & Trợ Giá' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const handleNav = (item) => {
    if (item.path) navigate(item.path)
  }

  const isActive = (item) => {
    if (item.path) return location.pathname === item.path
    return activeItem === item.label
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.fullName || user?.email || 'Khách'
  const primaryRole = user?.roles?.[0] || 'Member'
  const initials = initialsFromName(user?.fullName || user?.email)

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
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex w-full items-center gap-3 rounded-md border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2.5 text-left transition-colors hover:bg-smb-surface-container"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-smb-secondary-container text-xs font-semibold text-smb-on-secondary-container">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-smb-on-surface">
                {displayName}
              </p>
              <p className="truncate text-xs text-smb-on-surface-variant">
                {primaryRole}
              </p>
            </div>
            <Icon
              name={menuOpen ? 'expand_less' : 'unfold_more'}
              className="text-[18px] text-smb-outline"
            />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div
                role="menu"
                className="absolute bottom-full left-0 right-0 z-30 mb-1 overflow-hidden rounded-md border border-smb-outline-variant bg-smb-surface-container-lowest shadow-[var(--shadow-smb-2)] smb-pop-in"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-smb-on-surface hover:bg-smb-surface-container-low"
                >
                  <Icon name="logout" className="text-[18px] text-smb-error" />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar