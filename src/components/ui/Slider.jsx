import React, { useId } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Slider({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  icon,
  showValue = true,
  disabled = false,
  className = '',
  ...props
}) {
  const id = useId()

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-smb-on-surface">
          {label}
          {props.required && <span className="text-smb-error ml-0.5">*</span>}
        </label>
        {showValue && (
          <span className="text-sm font-semibold text-smb-primary-container tabular-nums">
            {value}{unit}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-smb-on-surface-variant">{description}</p>
      )}

      <div className="relative flex items-center gap-3">
        {icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded border border-smb-outline-variant bg-smb-surface-container-low text-smb-on-surface-variant">
            <Icon name={icon} className="text-[18px]" />
          </div>
        )}

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 my-auto flex items-center">
            <div className="h-1.5 w-full rounded-full bg-smb-surface-container-low">
              <div
                className="h-full rounded-full bg-smb-primary-container transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange?.(Number(e.target.value))}
            disabled={disabled}
            className="relative z-10 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:size-4
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-smb-primary-container
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-smb-surface-container-lowest
              [&::-webkit-slider-thumb]:shadow-sm
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:size-4
              [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-smb-primary-container
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-smb-surface-container-lowest
              [&::-moz-range-thumb]:shadow-sm
              disabled:[&::-webkit-slider-thumb]:cursor-not-allowed
              disabled:[&::-moz-range-thumb]:cursor-not-allowed
            "
            {...props}
          />
        </div>
      </div>
    </div>
  )
}

export default Slider
