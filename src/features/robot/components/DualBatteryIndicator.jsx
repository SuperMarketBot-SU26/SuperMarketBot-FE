import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function getBatteryColor(pct) {
  if (pct == null) return 'bg-gray-400 text-gray-400 border-gray-400'
  if (pct > 50) return 'bg-emerald-500 text-emerald-500 border-emerald-500'
  if (pct >= 20) return 'bg-amber-500 text-amber-500 border-amber-500'
  return 'bg-rose-500 text-rose-500 border-rose-500'
}

function getBatteryIcon(pct, isCharging = false) {
  if (isCharging) return 'battery_charging_full'
  if (pct == null) return 'battery_unknown'
  if (pct > 90) return 'battery_full'
  if (pct > 75) return 'battery_6_bar'
  if (pct > 50) return 'battery_5_bar'
  if (pct > 30) return 'battery_3_bar'
  if (pct >= 20) return 'battery_2_bar'
  return 'battery_alert'
}

export function DualBatteryIndicator({
  batteryPct,
  deviceBatteryPct,
  deviceIsCharging = false,
  espBatteryPct,
  espBatteryVolts,
  robotStatus = '',
  variant = 'card',
  className = '',
}) {
  // Xác định robot có thực sự đang online/kết nối hay không
  const isOffline = ['Power_Off', 'Offline', 'Unknown', ''].includes(robotStatus) && batteryPct == null
  const isPowerOff = robotStatus === 'Power_Off' || robotStatus === 'Offline'

  const overall = batteryPct != null ? Math.max(0, Math.min(100, Math.round(batteryPct))) : null
  const devBat = deviceBatteryPct != null ? Math.max(0, Math.min(100, Math.round(deviceBatteryPct))) : null
  const espBat = espBatteryPct != null ? Math.max(0, Math.min(100, Math.round(espBatteryPct))) : (overall != null ? overall : null)
  const isLow = overall != null && overall < 20

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {/* Pin Tổng */}
        <div className="flex items-center gap-1.5" title={`Pin tổng hợp: ${overall ?? '?'}%${deviceIsCharging ? ' (Điện thoại đang sạc)' : ''}`}>
          <Icon
            name={getBatteryIcon(overall, deviceIsCharging)}
            className={`text-[16px] ${deviceIsCharging ? 'text-amber-500 animate-pulse' : (overall > 50 ? 'text-emerald-500' : overall >= 20 ? 'text-amber-500' : 'text-rose-500')}`}
          />
          <div className="relative h-2 w-10 overflow-hidden rounded-full bg-smb-surface-container-high border border-smb-outline-variant/60">
            <div
              className={`h-full transition-all duration-300 ${deviceIsCharging ? 'bg-amber-500' : (overall > 50 ? 'bg-emerald-500' : overall >= 20 ? 'bg-amber-500' : 'bg-rose-500')}`}
              style={{ width: `${overall ?? 0}%` }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-smb-on-surface">
            {overall != null ? `${overall}%` : '—'}
          </span>
        </div>

        {/* 2 Pin nhỏ: Tablet & ESP32 */}
        <div className="flex items-center gap-2 text-[10px] text-smb-on-surface-variant/80 font-medium">
          <span className="inline-flex items-center gap-1" title="Pin điện thoại / tablet Kiosk">
            <Icon name="smartphone" className="text-[11px] text-blue-500" />
            <span className="tabular-nums font-semibold">{devBat != null ? `${devBat}%` : '—'}</span>
            {deviceIsCharging && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30" title="Điện thoại đang cắm sạc">
                <Icon name="bolt" className="text-[10px] text-amber-500 animate-pulse" />
                Sạc
              </span>
            )}
          </span>
          <span className="text-smb-outline-variant/80">|</span>
          <span className="inline-flex items-center gap-0.5" title="Pin động cơ xe (Giả lập ESP32)">
            <Icon name="smart_toy" className="text-[11px] text-indigo-500" />
            <span className="tabular-nums font-semibold">{espBat != null ? `${espBat}%` : '—'}</span>
            {espBatteryVolts != null && (
              <span className="text-[9px] text-smb-on-surface-variant/60">({espBatteryVolts.toFixed(1)}V)</span>
            )}
          </span>
        </div>
      </div>
    )
  }

  // Variant = 'card' (Display on RobotAssignmentPanel and RobotDetailModal)
  // Nếu robot tắt nguồn hoặc chưa kết nối → hiển thị trạng thái tắt thay vì pin giả
  if (isPowerOff || isOffline) {
    return (
      <div className={`rounded-xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest/80 p-3 shadow-xs ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-500/15 text-gray-500">
            <Icon name="power_settings_new" className="text-[22px]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-smb-on-surface">
              {isPowerOff ? '🔴 Robot đang tắt nguồn' : '⚪ Chưa nhận được dữ liệu pin'}
            </p>
            <p className="text-[10px] text-smb-on-surface-variant/80 mt-0.5">
              {isPowerOff
                ? 'Bật nguồn robot và khởi động ứng dụng trên Tablet để bắt đầu.'
                : 'Đang chờ kết nối từ thiết bị... Kiểm tra robot đã bật và có WiFi.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest/80 p-3 shadow-xs ${className}`}>
      {/* 1. Pin Tổng (Overall Battery) */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${deviceIsCharging ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : (overall > 50 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : overall >= 20 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400')}`}>
            <Icon name={getBatteryIcon(overall, deviceIsCharging)} className="text-[20px]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-smb-on-surface">Pin Tổng Hệ Thống</span>
              {deviceIsCharging ? (
                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                  <Icon name="bolt" className="text-[11px]" />
                  Đang sạc pin
                </span>
              ) : isLow && (
                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse">
                  <Icon name="warning" className="text-[11px]" />
                  Yếu &lt; 20%
                </span>
              )}
            </div>
            <p className="text-[10px] text-smb-on-surface-variant/80">
              min(Tablet, ESP32) · {deviceIsCharging ? '⚡ Đang cắm sạc điện thoại...' : (overall != null ? (overall > 50 ? 'Dung lượng an toàn' : overall >= 20 ? 'Mức trung bình' : 'Cần về trạm sạc') : 'Chưa có dữ liệu')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-black tabular-nums tracking-tight text-smb-on-surface">
            {overall != null ? `${overall}%` : '—'}
          </span>
        </div>
      </div>

      {/* Progress Bar Pin Tổng */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-smb-surface-container-high border border-smb-outline-variant/40 mb-3">
        <div
          className={`h-full transition-all duration-500 ${deviceIsCharging ? 'bg-amber-500' : (overall > 50 ? 'bg-emerald-500' : overall >= 20 ? 'bg-amber-500' : 'bg-rose-500')}`}
          style={{ width: `${overall ?? 0}%` }}
        />
      </div>

      {/* 2. Hai pin nhỏ bên dưới: Tablet Android & ESP32 Motor */}
      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-smb-outline-variant/30">
        {/* Pin Tablet Kiosk */}
        <div className={`rounded-lg p-2 border flex flex-col justify-between ${deviceIsCharging ? 'border-amber-500/50 bg-amber-500/10' : 'bg-smb-surface-container-low/60 border-smb-outline-variant/30'}`}>
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1">
              <Icon name="smartphone" className="text-[14px] text-blue-500" />
              <span className="text-[11px] font-semibold text-smb-on-surface">Tablet Kiosk</span>
            </div>
            {deviceIsCharging ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded animate-pulse" title="Đang cắm sạc">
                <Icon name="bolt" className="text-[10px] text-amber-500" />
                Đang sạc
              </span>
            ) : null}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold tabular-nums text-smb-on-surface">
              {devBat != null ? `${devBat}%` : 'Chờ app...'}
            </span>
            <span className="text-[9px] text-smb-on-surface-variant/70">Pin thực</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-smb-surface-container-high">
            <div
              className={`h-full transition-all duration-300 ${deviceIsCharging ? 'bg-amber-500' : (devBat > 50 ? 'bg-blue-500' : devBat >= 20 ? 'bg-amber-500' : 'bg-rose-500')}`}
              style={{ width: `${devBat ?? 0}%` }}
            />
          </div>
        </div>

        {/* Pin Động Cơ ESP32 (Giả lập) */}
        <div className="rounded-lg bg-smb-surface-container-low/60 p-2 border border-smb-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1">
              <Icon name="smart_toy" className="text-[14px] text-indigo-500" />
              <span className="text-[11px] font-semibold text-smb-on-surface">Động Cơ</span>
            </div>
            <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded">
              Giả lập
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold tabular-nums text-smb-on-surface">
              {espBat != null ? `${espBat}%` : '—'}
            </span>
            {espBatteryVolts != null ? (
              <span className="text-[10px] font-medium text-smb-on-surface-variant tabular-nums">
                {espBatteryVolts.toFixed(1)}V
              </span>
            ) : (
              <span className="text-[9px] text-smb-on-surface-variant/70">ESP32</span>
            )}
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-smb-surface-container-high">
            <div
              className={`h-full transition-all duration-300 ${espBat > 50 ? 'bg-indigo-500' : espBat >= 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${espBat ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DualBatteryIndicator
