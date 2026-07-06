import React, { useMemo } from 'react'
import { StatCard } from '../../../components/StatCard'

export function FleetStatsHeader({ robots = [] }) {
  const stats = useMemo(() => {
    const total = robots.length
    const moving = robots.filter((r) => r.status === 'Moving').length
    const idle = robots.filter((r) => r.status === 'Idle').length
    const interacting = robots.filter((r) => r.status === 'Interacting').length
    const offlineCharging = robots.filter((r) => r.status === 'Offline_Charging').length
    const powerOff = robots.filter((r) => r.status === 'Power_Off').length
    const lowBat = robots.filter((r) => r.batteryPct < 25 && r.status !== 'Power_Off').length
    const online = total - powerOff
    const avgBattery = total
      ? Math.round(robots.reduce((sum, r) => sum + (r.batteryPct || 0), 0) / total)
      : 0
    return { total, moving, idle, interacting, offlineCharging, powerOff, lowBat, online, avgBattery }
  }, [robots])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Tổng Robot"
        value={String(stats.total)}
        subtitle={`${stats.online} đang online`}
        icon="smart_toy"
        trend="up"
        trendValue={`Pin TB ${stats.avgBattery}%`}
        color="primary"
      />
      <StatCard
        title="Đang Di Chuyển"
        value={String(stats.moving)}
        subtitle={`${stats.idle} rảnh · ${stats.interacting} tương tác`}
        icon="directions_run"
        trend="up"
        trendValue="Realtime"
        color="success"
      />
      <StatCard
        title="Pin Yếu (<25%)"
        value={String(stats.lowBat)}
        subtitle="Cần sạc / thay pin"
        icon="battery_alert"
        trend={stats.lowBat > 0 ? 'down' : 'neutral'}
        trendValue={stats.lowBat > 0 ? 'Cảnh báo' : 'Ổn định'}
        color="warning"
      />
      <StatCard
        title="Ngoại Tuyến / Đang Sạc"
        value={String(stats.offlineCharging + stats.powerOff)}
        subtitle={`${stats.offlineCharging} sạc · ${stats.powerOff} tắt nguồn`}
        icon="power_off"
        trend="neutral"
        trendValue="Cập nhật liên tục"
        color="danger"
      />
    </div>
  )
}

export default FleetStatsHeader