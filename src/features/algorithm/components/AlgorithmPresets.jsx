import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const presets = [
  {
    id: 'balanced',
    name: 'Cân Bằng',
    icon: 'equalizer',
    description: 'Cân bằng giữa tất cả các yếu tố',
    recommended: true,
  },
  {
    id: 'promotion',
    name: 'Khuyến Mãi',
    icon: 'local_offer',
    description: 'Ưu tiên chiết khấu cao nhất',
    recommended: false,
  },
  {
    id: 'brand',
    name: 'Thương Hiệu',
    icon: 'business',
    description: 'Tập trung vào thương hiệu đối tác VIP',
    recommended: false,
  },
  {
    id: 'proximity',
    name: 'Vị Trí',
    icon: 'near_me',
    description: 'Ưu tiên điểm bán gần nhất',
    recommended: false,
  },
  {
    id: 'custom',
    name: 'Tùy Chỉnh',
    icon: 'tune',
    description: 'Tự cấu hình trọng số theo nhu cầu',
    recommended: false,
  },
]

export function AlgorithmPresets({ value, onChange }) {
  const [selected, setSelected] = useState(value || 'balanced')

  const handleSelect = (presetId) => {
    setSelected(presetId)
    onChange?.(presetId)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            psychology
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Cấu Hình Sẵn</h3>
          <p className="text-sm text-smb-on-surface-variant">Chọn cấu hình thuật toán phù hợp</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelect(preset.id)}
            className={`
              relative rounded-lg border-2 p-4 text-left transition-all
              ${selected === preset.id
                ? 'border-smb-primary-container bg-smb-active-bg'
                : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'
              }
            `}
          >
            {preset.recommended && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-smb-secondary-container px-2.5 py-0.5 text-xs font-medium text-smb-on-secondary-container">
                Đề xuất
              </span>
            )}

            <div className="flex size-9 items-center justify-center rounded-lg">
              <Icon
                name={preset.icon}
                className={`text-[22px] ${selected === preset.id ? 'text-smb-primary-container' : 'text-smb-on-surface-variant'}`}
              />
            </div>

            <h4 className={`mt-2 font-semibold ${selected === preset.id ? 'text-smb-primary-container' : 'text-smb-on-surface'}`}>
              {preset.name}
            </h4>

            <p className="mt-1 text-xs leading-relaxed text-smb-on-surface-variant">
              {preset.description}
            </p>

            {selected === preset.id && (
              <div className="absolute right-3 top-3">
                <div className="flex size-5 items-center justify-center rounded-full bg-smb-primary-container">
                  <Icon name="check" className="text-xs text-smb-on-primary" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AlgorithmPresets
