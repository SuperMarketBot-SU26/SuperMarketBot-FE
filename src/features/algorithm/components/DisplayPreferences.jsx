import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function DisplayPreferences({ data, onChange }) {
  const [prefs, setPrefs] = useState(data || {
    animationDuration: 300,
    maxItemsVisible: 10,
    autoRefreshSeconds: 30,
    compactMode: false,
  })

  const handleChange = (field, value) => {
    const next = { ...prefs, [field]: value }
    setPrefs(next)
    onChange?.(next)
  }

  const toggleItems = [
    { field: 'compactMode', label: 'Chế Độ Thu Gọn', description: 'Hiển thị ít thông tin chi tiết hơn để tối ưu không gian', icon: 'view_compact' },
    { field: 'showBadges', label: 'Hiển Thị Huy Hiệu', description: 'Hiển thị huy hiệu trạng thái trên thẻ điểm bán', icon: 'verified' },
    { field: 'enableSound', label: 'Âm Thanh Thông Báo', description: 'Phát âm thanh khi có đơn hàng mới', icon: 'volume_up' },
  ]

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            visibility
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Tùy Chỉnh Hiển Thị</h3>
          <p className="text-sm text-smb-on-surface-variant">Cấu hình giao diện và trải nghiệm người dùng</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Icon name="speed" className="text-[18px] text-smb-on-surface-variant" />
              <span className="font-medium text-smb-on-surface">Thời Gian Hoạt Cảnh</span>
            </div>
            <span className="font-semibold text-smb-primary-container tabular-nums">{prefs.animationDuration}ms</span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            step={50}
            value={prefs.animationDuration}
            onChange={(e) => handleChange('animationDuration', Number(e.target.value))}
            className="mt-2 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-smb-primary-container
              [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-smb-primary-container
            "
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Icon name="list" className="text-[18px] text-smb-on-surface-variant" />
              <span className="font-medium text-smb-on-surface">Số Mục Hiển Thị Tối Đa</span>
            </div>
            <span className="font-semibold text-smb-primary-container tabular-nums">{prefs.maxItemsVisible}</span>
          </div>
          <input
            type="range"
            min={3}
            max={50}
            step={1}
            value={prefs.maxItemsVisible}
            onChange={(e) => handleChange('maxItemsVisible', Number(e.target.value))}
            className="mt-2 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-smb-primary-container
              [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-smb-primary-container
            "
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Icon name="autorenew" className="text-[18px] text-smb-on-surface-variant" />
              <span className="font-medium text-smb-on-surface">Tự Động Làm Mới</span>
            </div>
            <span className="font-semibold text-smb-primary-container tabular-nums">{prefs.autoRefreshSeconds}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={300}
            step={5}
            value={prefs.autoRefreshSeconds}
            onChange={(e) => handleChange('autoRefreshSeconds', Number(e.target.value))}
            className="mt-2 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-smb-primary-container
              [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-smb-primary-container
            "
          />
        </div>

        <div className="border-t border-smb-outline-variant pt-4">
          {toggleItems.map((item) => (
            <div key={item.field} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded border border-smb-outline-variant bg-smb-surface-container-low text-smb-on-surface-variant">
                  <Icon name={item.icon} className="text-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-smb-on-surface">{item.label}</p>
                  <p className="text-xs text-smb-on-surface-variant">{item.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleChange(item.field, !prefs[item.field])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[item.field] ? 'bg-smb-primary-container' : 'bg-smb-surface-container'}`}
              >
                <span
                  className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${prefs[item.field] ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DisplayPreferences
