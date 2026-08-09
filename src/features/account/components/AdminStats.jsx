import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * AdminStats — 4 thẻ thống kê trên cùng trang Account Management.
 * Click một thẻ để filter nhanh theo role.
 */
const ROLE_CONFIG = {
  all: {
    label: 'Tổng Tài Khoản',
    icon: 'groups',
    bg: 'bg-smb-primary-container/10',
    text: 'text-smb-primary-container',
    ring: 'ring-smb-primary-container/30',
  },
  Admin: {
    label: 'Quản Trị Viên',
    icon: 'admin_panel_settings',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    ring: 'ring-purple-300',
  },
  Staff: {
    label: 'Nhân Viên',
    icon: 'support_agent',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-300',
  },
  Member: {
    label: 'Khách Hàng',
    icon: 'person',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-300',
  },
}

export function AdminStats({ users, roleFilter, onRoleFilter }) {
  const counts = {
    all:    users.length,
    Admin:  users.filter((u) => u.role === 'Admin').length,
    Staff:  users.filter((u) => u.role === 'Staff').length,
    Member: users.filter((u) => u.role === 'Member').length,
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
        const active = roleFilter === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onRoleFilter?.(key)}
            className={`
              flex items-center gap-3 rounded-xl border p-4 text-left transition-all
              ${active
                ? `border-smb-primary-container ring-2 ${cfg.ring}`
                : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'}
            `}
          >
            <div className={`flex size-11 items-center justify-center rounded-lg ${cfg.bg} ${cfg.text}`}>
              <Icon name={cfg.icon} className="text-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-smb-on-surface-variant">{cfg.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${active ? cfg.text : 'text-smb-on-surface'}`}>
                {counts[key] ?? 0}
              </p>
            </div>
            {active && (
              <Icon name="check_circle" className={`text-[20px] ${cfg.text}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default AdminStats