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
  { icon: 'category', label: 'Quản Lý Loại Sản Phẩm', path: '/product-types' },
  { icon: 'shelves', label: 'Quản Lý Kệ Hàng', path: '/shelf-management' },
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

export function Sidebar({ activeItem = 'Giám Sát Robot', onOpenCommandPalette }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const handleNav = (item) => {
    if (item.path) navigate(item.path)
  }

  const isActive = (item) => {
    if (item.path) {
      if (item.path === '/' && (location.pathname === '/' || location.pathname === '/advertisement')) {
        return true
      }
      return location.pathname.startsWith(item.path) && item.path !== '/'
    }
    return activeItem === item.label
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.fullName || user?.email || 'Khách'
  const primaryRole = user?.roles?.[0] || 'Administrator'
  const initials = initialsFromName(user?.fullName || user?.email)

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-smb-outline-variant/60 bg-smb-surface-container-lowest transition-colors duration-200">
      {/* Brand Header */}
      <div className="border-b border-smb-outline-variant/60 bg-smb-surface-container-low/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md shadow-emerald-700/20 smb-float">
            <Icon name="smart_toy" className="text-[22px]" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-gradient-primary">
              SmartMarketBot
            </p>
            <p className="text-[10px] font-semibold text-smb-on-surface-variant/80 uppercase tracking-wider">
              Powered by AI Robot
            </p>
          </div>
        </div>
      </div>

      {/* Quick Search Input (Cmd+K trigger) */}
      <div className="px-3 pt-3.5">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group relative flex w-full items-center rounded-xl border border-smb-outline-variant/70 bg-smb-surface-container-low/60 py-2 pl-3 pr-2 text-left text-xs text-smb-on-surface-variant transition-all hover:border-smb-primary/60 hover:bg-smb-surface-container active:scale-[0.99]"
        >
          <Icon name="search" className="mr-2 text-[16px] text-smb-outline group-hover:text-smb-primary" />
          <span className="truncate text-xs text-smb-on-surface-variant/70">Tìm kiếm nhanh…</span>
          <kbd className="ml-auto rounded border border-smb-outline-variant/80 bg-smb-surface-container-lowest px-1.5 py-0.5 text-[9px] font-semibold text-smb-on-surface-variant shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item)
            return (
              <li key={item.label}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handleNav(item)
                  }}
                  className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-smb-primary/10 text-smb-primary shadow-xs dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'text-smb-on-surface-variant hover:bg-smb-surface-container-low hover:text-smb-on-surface'
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-smb-primary shadow-sm shadow-emerald-500/50" />
                  )}
                  <Icon
                    name={item.icon}
                    className={`text-[20px] transition-colors duration-150 ${
                      active ? 'text-smb-primary dark:text-emerald-400' : 'text-smb-outline group-hover:text-smb-on-surface'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.label === 'Giám Sát Robot' && (
                    <span className="ml-auto flex size-2 rounded-full bg-emerald-500 smb-live-pulse" />
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-smb-outline-variant/60 p-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex w-full items-center gap-3 rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-low/50 px-3 py-2.5 text-left transition-all hover:border-smb-primary/50 hover:bg-smb-surface-container active:scale-[0.99]"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-smb-on-surface">
                {displayName}
              </p>
              <div className="mt-0.5 flex">
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {primaryRole}
                </span>
              </div>
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
                className="absolute bottom-full left-0 right-0 z-30 mb-1.5 overflow-hidden rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest p-1 shadow-lg smb-pop-in"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                >
                  <Icon name="logout" className="text-[18px]" />
                  Đăng xuất hệ thống
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