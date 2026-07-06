import React, { useId, useState, useEffect } from 'react'

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
  const [focused, setFocused] = useState(false)
  const percentage = ((value - min) / (max - min)) * 100

  // Keep the thumb active during drag for a smoother experience.
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    if (!dragging) return
    const stop = () => setDragging(false)
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchend', stop)
    return () => {
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchend', stop)
    }
  }, [dragging])

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-smb-on-surface">
          {label}
          {props.required && <span className="text-smb-error ml-0.5">*</span>}
        </label>
        {showValue && (
          <span className={`text-sm font-semibold tabular-nums transition-colors duration-150 ${focused ? 'text-smb-primary' : 'text-smb-primary-container'}`}>
            {value}{unit}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-smb-on-surface-variant">{description}</p>
      )}

      <div className={`relative flex items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
        {icon && (
          <div className={`flex size-8 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${focused ? 'border-smb-primary-container text-smb-primary-container bg-smb-active-bg' : 'border-smb-outline-variant bg-smb-surface-container-low text-smb-on-surface-variant'}`}>
            <Icon name={icon} className="text-[18px]" />
          </div>
        )}

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 my-auto flex items-center">
            <div className={`h-1.5 w-full rounded-full transition-colors duration-150 ${focused ? 'bg-smb-primary-container/15' : 'bg-smb-surface-container-low'}`}>
              <div
                className="h-full rounded-full bg-smb-primary-container transition-[width] duration-100 ease-out"
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
            onMouseDown={() => setDragging(true)}
            onTouchStart={() => setDragging(true)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            className={`
              relative z-10 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:size-4
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-smb-primary-container
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-smb-surface-container-lowest
              [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgb(15_23_42/0.2)]
              [&::-webkit-slider-thumb]:transition-[transform,box-shadow] duration-150
              [&::-webkit-slider-thumb]:ease-[cubic-bezier(0.16,1,0.3,1)]
              [&::-webkit-slider-thumb]:hover:scale-125
              [&::-webkit-slider-thumb]:hover:shadow-[0_0_0_6px_rgb(74_222_128/0.20),0_1px_2px_rgb(15_23_42/0.2)]
              [&::-webkit-slider-thumb]:active:scale-110
              [&::-moz-range-thumb]:size-4
              [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-smb-primary-container
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-smb-surface-container-lowest
              [&::-moz-range-thumb]:shadow-[0_1px_2px_rgb(15_23_42/0.2)]
              [&::-moz-range-thumb]:transition-[transform,box-shadow] duration-150
              [&::-moz-range-thumb]:hover:scale-125
              focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_6px_rgb(74_222_128/0.20),0_1px_2px_rgb(15_23_42/0.2)]
              focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_6px_rgb(74_222_128/0.20),0_1px_2px_rgb(15_23_42/0.2)]
              ${focused || dragging ? '[&::-webkit-slider-thumb]:scale-125 [&::-moz-range-thumb]:scale-125' : ''}
              disabled:cursor-not-allowed disabled:[&::-webkit-slider-thumb]:hover:scale-100 disabled:[&::-moz-range-thumb]:hover:scale-100
              motion-reduce:[&::-webkit-slider-thumb]:transition-none motion-reduce:[&::-moz-range-thumb]:transition-none
            `}
            {...props}
          />
        </div>
      </div>
    </div>
  )
}

export default Slider