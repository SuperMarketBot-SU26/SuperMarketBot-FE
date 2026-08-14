import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const navigationItems = [
    { label: 'Giám Sát Robot Theo Thời Gian Thực', path: '/robot-monitoring', icon: 'smart_toy', category: 'Điều Hành' },
    { label: 'Quản Lý Chiến Dịch Quảng Cáo', path: '/advertisement', icon: 'campaign', category: 'Quảng Cáo' },
    { label: 'Tạo Chiến Dịch Mới', path: '/advertisement/create', icon: 'add_circle', category: 'Quảng Cáo' },
    { label: 'Quản Lý Gói Quảng Cáo', path: '/ad-packages', icon: 'inventory_2', category: 'Quảng Cáo' },
    { label: 'Quản Lý Thương Hiệu Đối Tác', path: '/brand', icon: 'storefront', category: 'Đối Tác' },
    { label: 'Ví Thương Hiệu & Giao Dịch', path: '/advertisement/brand-wallet', icon: 'account_balance_wallet', category: 'Đối Tác' },
    { label: 'Quản Lý Sản Phẩm Siêu Thị', path: '/products', icon: 'shopping_bag', category: 'Kho Hàng' },
    { label: 'Quản Lý Tài Khoản Hệ Thống', path: '/accounts', icon: 'manage_accounts', category: 'Hệ Thống' },
  ]

  const filteredItems = navigationItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity smb-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-2xl transition-all smb-pop-in">
        {/* Search Header */}
        <div className="flex items-center border-b border-smb-outline-variant/60 px-4 py-3">
          <Icon name="search" className="text-xl text-smb-outline mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ tên trang hoặc tính năng (VD: Robot, Bản đồ, Chiến dịch)..."
            className="w-full bg-transparent text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/60 focus:outline-none"
          />
          <kbd className="rounded border border-smb-outline-variant/60 bg-smb-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-smb-on-surface-variant">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-smb-outline-variant/20">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-smb-on-surface-variant/60">
              <Icon name="search_off" className="text-3xl mb-2" />
              <p className="text-xs">Không tìm thấy tính năng nào phù hợp với từ khóa "{query}"</p>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSelect(item.path)}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-smb-primary/10 hover:text-smb-primary group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-smb-outline-variant/40 bg-smb-surface-container-low text-smb-on-surface-variant group-hover:border-smb-primary/40 group-hover:bg-smb-primary/20 group-hover:text-smb-primary">
                    <Icon name={item.icon} className="text-lg" />
                  </div>
                  <div>
                    <p className="font-semibold text-smb-on-surface group-hover:text-smb-primary">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-smb-on-surface-variant/70">
                      {item.path}
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-smb-outline-variant/40 bg-smb-surface-container-high px-2 py-0.5 text-[10px] text-smb-on-surface-variant">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-smb-outline-variant/60 bg-smb-surface-container-low/50 px-4 py-2 text-[11px] text-smb-on-surface-variant/70">
          <div className="flex items-center gap-3">
            <span>↑↓ di chuyển</span>
            <span>↵ chọn</span>
          </div>
          <span>SmartMarketBot Command Palette</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
