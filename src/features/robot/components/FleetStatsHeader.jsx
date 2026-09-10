import React, { useMemo } from 'react'
import { StatCard } from '../../../components/StatCard'

export function FleetStatsHeader({ robots = [] }) {
  const stats = useMemo(() => {
    const isCharging = (r) =>
      r.deviceIsCharging === true ||
      r.isCharging === true ||
      r.status === 'Offline_Charging' ||
      r.status === 'Charging' ||
      r.mode === 'charging'

    const total = robots.length
    const offlineCharging = robots.filter(isCharging).length
    const powerOff = robots.filter((r) => r.status === 'Power_Off' || r.status === 'Offline').length
    const adCount = robots.filter((r) => !isCharging(r) && (r.activeFlowType === 'ad' || r.mode === 'ad')).length
    const patrolCount = robots.filter((r) => !isCharging(r) && (r.activeFlowType === 'patrol' || r.mode === 'patrol')).length
    const guideCount = robots.filter((r) => !isCharging(r) && (r.activeFlowType === 'guide' || r.mode === 'guide')).length
    const movingCount = robots.filter((r) => !isCharging(r) && (
      r.status === 'Moving' ||
      r.mode === 'moving' ||
      r.activeMissionStatus === 'NAVIGATING' ||
      r.activeMissionStatus === 'DISPATCHED' ||
      r.activeFlowType === 'ad' ||
      r.activeFlowType === 'patrol' ||
      r.activeFlowType === 'guide'
    )).length

    const idle = robots.filter(
      (r) =>
        (r.status === 'Idle' || r.status === 'Online' || r.mode === 'idle') &&
        !isCharging(r) &&
        !r.activeFlowType &&
        r.status !== 'Moving' &&
        r.status !== 'Power_Off' &&
        r.status !== 'Offline'
    ).length
    const interacting = robots.filter(
      (r) => !isCharging(r) && (r.status === 'Interacting' || r.mode === 'interacting')
    ).length
    const lowBat = robots.filter(
      (r) =>
        (r.batteryPct < 25 || (r.deviceBatteryPct != null && r.deviceBatteryPct < 25)) &&
        r.status !== 'Power_Off' &&
        r.status !== 'Offline'
    ).length
    const online = total - powerOff
    const avgBattery = total
      ? Math.round(robots.reduce((sum, r) => sum + (r.batteryPct || 0), 0) / total)
      : 0
    return {
      total,
      moving: movingCount,
      movingCount,
      adCount,
      patrolCount,
      guideCount,
      idle,
      interacting,
      offlineCharging,
      powerOff,
      lowBat,
      online,
      avgBattery,
    }
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
        value={String(stats.movingCount)}
        subtitle={
          stats.movingCount > 0
            ? `${stats.adCount} quảng cáo · ${stats.patrolCount} tuần tra · ${stats.guideCount} dẫn đường`
            : `${stats.idle} rảnh · ${stats.offlineCharging} sạc · 0 nhiệm vụ`
        }
        icon={
          stats.adCount > 0
            ? 'campaign'
            : stats.patrolCount > 0
              ? 'search'
              : stats.guideCount > 0
                ? 'navigation'
                : 'directions_run'
        }
        trend={stats.movingCount > 0 ? 'up' : 'neutral'}
        trendValue={
          stats.adCount > 0
            ? '📢 Đang quảng cáo'
            : stats.patrolCount > 0
              ? '🔍 Đang tuần tra'
              : stats.guideCount > 0
                ? '🛒 Đang dẫn đường'
                : stats.movingCount > 0
                  ? '🚀 Đang di chuyển'
                  : 'Chờ nhiệm vụ'
        }
        color={stats.movingCount > 0 ? 'success' : 'primary'}
      />
      <StatCard
        title="Pin Yếu (<25%)"
        value={String(stats.lowBat)}
        subtitle={
          stats.offlineCharging > 0 && stats.lowBat > 0
            ? `${stats.offlineCharging} máy đang sạc`
            : stats.lowBat > 0
              ? 'Cần sạc / thay pin'
              : 'Dung lượng ổn định'
        }
        icon="battery_alert"
        trend={stats.lowBat > 0 ? (stats.offlineCharging > 0 ? 'up' : 'down') : 'neutral'}
        trendValue={stats.lowBat > 0 ? (stats.offlineCharging > 0 ? 'Đang sạc' : 'Cảnh báo') : 'Ổn định'}
        color="warning"
      />
      <StatCard
        title="Ngoại Tuyến / Đang Sạc"
        value={String(stats.offlineCharging + stats.powerOff)}
        subtitle={`${stats.offlineCharging} sạc · ${stats.powerOff} tắt nguồn`}
        icon={stats.offlineCharging > 0 ? 'battery_charging_full' : 'power_off'}
        trend={stats.offlineCharging > 0 ? 'up' : 'neutral'}
        trendValue={stats.offlineCharging > 0 ? `${stats.offlineCharging} đang sạc pin` : 'Cập nhật liên tục'}
        color={stats.offlineCharging > 0 ? 'warning' : 'danger'}
      />
    </div>
  )
}

export default FleetStatsHeader