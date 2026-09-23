import React, { useState, useMemo } from 'react'
import { toast } from 'react-toastify'
import SupermarketInteractiveMap from './SupermarketInteractiveMap'
import {
  cancelRobotNavigation,
  pauseRobotNavigation,
  resumeRobotNavigation,
} from '../api/navigationApi'

/**
 * Chuyển đổi tọa độ Decartes (x, y) sang vị trí ngữ cảnh bán lẻ trực quan
 * Loại bỏ các số float khó hiểu như (0.27m, 2.09m)
 */
function getFriendlyLocationName(pose) {
  if (!pose || typeof pose.xCoord !== 'number' || typeof pose.yCoord !== 'number') {
    return 'Vị Trí Của Robot (Khu trung tâm)'
  }
  const x = pose.xCoord
  const y = pose.yCoord

  // Khoảng cách tới Vị Trí Của Robot / Dock (x: 1.07, y: 0.13) — Node 7
  const distDock = Math.hypot(x - 1.07, y - 0.13)
  if (distDock < 0.5) return 'Vị Trí Của Robot (Dock ⚡)'

  // Khoảng cách tới Quầy Thu Ngân (x: 0.23, y: 0.42) — Node 8
  const distCashier = Math.hypot(x - 0.23, y - 0.42)
  if (distCashier < 0.5) return 'Quầy Thu Ngân (POS 💳)'

  // 6 Kệ hàng chính thức trong siêu thị (Khớp 100% bản đồ SLAM thực tế)
  const shelfPositions = [
    { id: 1, name: 'Kệ 1 - Đồ Ăn Vặt & Bánh Kẹo', x: 1.55, y: 0.15 },
    { id: 2, name: 'Kệ 2 - Nước Giải Khát & Đồ Uống', x: 2.25, y: 0.15 },
    { id: 3, name: 'Kệ 3 - Thực Phẩm Tươi Sống', x: 2.55, y: 1.10 },
    { id: 4, name: 'Kệ 4 - Mì Ăn Liền & Đóng Gói', x: 1.45, y: 2.48 },
    { id: 5, name: 'Kệ 5 - Đồ Gia Dụng & Tiện Ích', x: 0.35, y: 2.48 },
    { id: 6, name: 'Kệ 6 - Gia Vị & Trà', x: 0.60, y: 1.10 },
  ]

  let closest = null
  let minDist = Infinity
  for (const s of shelfPositions) {
    const d = Math.hypot(x - s.x, y - s.y)
    if (d < minDist) {
      minDist = d
      closest = s
    }
  }

  if (closest && minDist < 0.7) {
    return `Khu vực ${closest.name}`
  }

  if (x < 1.2) return 'Dãy A01 (Khu Đồ Ăn Vặt & Nước Giải Khát)'
  if (x < 2.0) return 'Dãy B01 (Khu Thực Phẩm Tươi Sống & Đóng Gói)'
  return 'Dãy C01 (Khu Gia Vị & Đồ Gia Dụng)'
}

export default function FleetMap({
  robots,
  poses,
  map,
  missionState,
  selectedRobotCode,
  onMissionCancelled,
}) {
  // 'map' (Bản đồ 2D siêu thị - mặc định) | 'camera' (Camera AI & quét kệ)
  const [viewMode, setViewMode] = useState('map')
  // Khay ngăn kéo xem chi tiết các chặng dừng (Waypoints Drawer) nổi trên nền bản đồ
  const [showWaypointsDrawer, setShowWaypointsDrawer] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const activeRobotCode = selectedRobotCode || robots?.[0]?.robotCode || 'RB0001'
  const selectedRobot = robots?.find((r) => r.robotCode === activeRobotCode)
  const pose = poses?.[activeRobotCode]

  const waypoints = missionState?.waypoints || []
  const currentIndex = missionState?.currentWaypointIndex ?? -1
  const missionStatus = String(missionState?.status || 'IDLE').toUpperCase()
  const isMissionActive = Boolean(
    missionState &&
    missionStatus !== 'COMPLETED' &&
    missionStatus !== 'CANCELLED' &&
    missionStatus !== 'IDLE' &&
    waypoints.length > 0
  )

  const flowType = (isMissionActive ? (missionState?.flowType || selectedRobot?.activeFlowType || '') : '').toLowerCase()
  const isFreeRoam = Boolean(missionState?.isFreeRoam || missionState?.fullZoneMap)

  const friendlyLocation = useMemo(() => getFriendlyLocationName(pose), [pose])

  const flowTypeLabel = useMemo(() => {
    if (!isMissionActive || !flowType) {
      return {
        text: 'RẢNH / TRẠM SẠC',
        color: 'bg-gray-500',
        bg: 'bg-gray-500/10',
        textCol: 'text-gray-400',
        border: 'border-gray-500/50',
      }
    }
    if (flowType === 'ad') {
      return {
        text: isFreeRoam ? 'QUẢNG CÁO TỰ DO' : 'QUẢNG CÁO THEO KỆ',
        color: 'bg-orange-500',
        bg: 'bg-orange-500/15',
        textCol: 'text-orange-400',
        border: 'border-orange-500/50',
      }
    }
    if (flowType === 'patrol') {
      return {
        text: 'TUẦN TRA KỆ HÀNG',
        color: 'bg-blue-500',
        bg: 'bg-blue-500/15',
        textCol: 'text-blue-400',
        border: 'border-blue-500/50',
      }
    }
    if (flowType === 'guide') {
      return {
        text: 'DẪN ĐƯỜNG MUA SẮM',
        color: 'bg-emerald-500',
        bg: 'bg-emerald-500/15',
        textCol: 'text-emerald-400',
        border: 'border-emerald-500/50',
      }
    }
    if (flowType === 'return') {
      return {
        text: 'ĐANG QUAY VỀ',
        color: 'bg-orange-500',
        bg: 'bg-orange-500/15',
        textCol: 'text-orange-400',
        border: 'border-orange-500/50',
      }
    }
    return {
      text: flowType.toUpperCase(),
      color: 'bg-indigo-500',
      bg: 'bg-indigo-500/15',
      textCol: 'text-indigo-400',
      border: 'border-indigo-500/50',
    }
  }, [isMissionActive, flowType, isFreeRoam])

  // Điểm dừng waypoint hiện tại
  const currentWaypoint = currentIndex >= 0 && waypoints[currentIndex] ? waypoints[currentIndex] : waypoints[0]

  // Các thao tác điều khiển nhanh từ Admin xuống Robot
  const handlePause = async () => {
    setActionLoading(true)
    try {
      await pauseRobotNavigation(activeRobotCode)
      toast.info(`⏸ Đã gửi lệnh TẠM DỪNG tới Robot ${activeRobotCode}`)
    } catch (e) {
      toast.error(`Lỗi tạm dừng: ${e?.message || 'Không thể kết nối'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    setActionLoading(true)
    try {
      await resumeRobotNavigation(activeRobotCode)
      toast.success(`▶ Đã gửi lệnh TIẾP TỤC lộ trình tới Robot ${activeRobotCode}`)
    } catch (e) {
      toast.error(`Lỗi tiếp tục: ${e?.message || 'Không thể kết nối'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn dừng nhiệm vụ và yêu cầu Robot ${activeRobotCode} về vị trí robot?`)) {
      return
    }
    setActionLoading(true)
    try {
      await cancelRobotNavigation(activeRobotCode, 'Admin stopped mission from 2D Live Map')
      toast.warn(`⏹ Đã gửi lệnh DỪNG NHIỆM VỤ tới Robot ${activeRobotCode}`)
      if (onMissionCancelled) onMissionCancelled()
    } catch (e) {
      toast.error(`Lỗi hủy nhiệm vụ: ${e?.message || 'Không thể kết nối'}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="relative h-full w-full flex flex-col bg-slate-50 text-slate-800 smb-fade-in overflow-hidden">
      {/* ── 1. HEADER BAR: TELEMETRY & VIEW SWITCHER ───────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Robot Status & Retail Context Location */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Status Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs tracking-wider border ${flowTypeLabel.border} ${flowTypeLabel.bg} ${flowTypeLabel.textCol} shadow-xs backdrop-blur-md`}
          >
            <span className={`size-2 rounded-full ${flowTypeLabel.color} ${isMissionActive ? 'animate-ping' : ''}`} />
            <span>{flowTypeLabel.text}</span>
          </div>

          {/* Location & Battery Tag */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
            <span className="font-extrabold text-teal-600 font-mono">{activeRobotCode}</span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-slate-700">
              <span className="material-symbols-outlined text-[15px] text-teal-600">location_on</span>
              <span>{friendlyLocation}</span>
            </span>
            {selectedRobot?.batteryPct != null && (
              <>
                <span className="text-slate-300">|</span>
                <span className={selectedRobot.batteryPct > 50 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  🔋 {selectedRobot.batteryPct}%
                </span>
              </>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Right: View Switcher (2D Map, Camera AI, Waypoints Drawer) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-xs gap-1">
            {/* Button 1: Bản Đồ 2D Siêu Thị (Mặc định chính) */}
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Xem không gian tương tác 2D toàn siêu thị"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>Bản Đồ 2D Siêu Thị</span>
            </button>

            {/* Button 2: Camera AI & Quét Kệ (Góc nhìn camera robot) */}
            <button
              type="button"
              onClick={() => setViewMode('camera')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'camera'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Xem luồng Camera AI nhận diện kệ hàng và ArUco"
            >
              <span className="material-symbols-outlined text-[16px]">videocam</span>
              <span>Camera AI Quét Kệ</span>
            </button>

            {/* Button 3: Lộ Trình / Chặng (Bật/Tắt Ngăn Kéo Nổi, không làm mất bản đồ) */}
            <button
              type="button"
              onClick={() => setShowWaypointsDrawer((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                showWaypointsDrawer
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Xem danh sách chi tiết các chặng dừng trong lộ trình"
            >
              <span className="material-symbols-outlined text-[16px]">timeline</span>
              <span>Lộ Trình ({waypoints.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. BODY CONTENT: BẢN ĐỒ 2D HOẶC CAMERA AI ───────────────────────── */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-50">
        {/* VIEW A: BẢN ĐỒ 2D SIÊU THỊ (LUÔN CÓ MẶT NỀN TẢNG) */}
        <div className={`w-full h-full relative ${viewMode === 'map' ? 'block' : 'hidden'}`}>
          <SupermarketInteractiveMap
            waypoints={isMissionActive ? waypoints : []}
            currentIndex={isMissionActive ? currentIndex : -1}
            robotPose={pose}
            robotCode={activeRobotCode}
            missionStatus={isMissionActive ? missionStatus : 'IDLE'}
            flowType={isMissionActive ? flowType : 'idle'}
          />
        </div>

        {/* VIEW B: CAMERA AI & QUÉT KỆ */}
        <div
          className={`w-full h-full relative bg-slate-50 ${viewMode === 'camera' ? 'block' : 'hidden'}`}
          style={{
            paddingTop: '58px',
            paddingBottom: isMissionActive ? '76px' : '0px',
          }}
        >
          <iframe
            src="/ros-ai-monitor.html?v=light_theme_v2"
            className="w-full h-full border-0 bg-slate-50"
            title="Hệ thống Giám sát Camera AI Kệ hàng"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>

        {/* ── 3. OVERLAY DRAWER: DANH SÁCH CHẶNG DỪNG (NỔI TRÊN NỀN BẢN ĐỒ 2D) ── */}
        {showWaypointsDrawer && (
          <div className="absolute inset-x-4 bottom-24 z-40 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-4 shadow-2xl transition-all smb-pop-in max-h-[320px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 text-xl">alt_route</span>
                <span className="font-extrabold text-sm text-slate-800">
                  Lộ Trình Di Chuyển Chi Tiết {waypoints.length > 0 ? `(${waypoints.length} mốc dừng)` : ''}
                </span>
                {isMissionActive && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                    Đang chạy: Mốc {Math.max(1, currentIndex + 1)}/{waypoints.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowWaypointsDrawer(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
                title="Đóng khay lộ trình"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {waypoints.length === 0 ? (
              <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-4xl text-slate-300">route</span>
                <p className="text-xs font-bold text-slate-700">Robot hiện chưa có lộ trình di chuyển hoạt động</p>
                <p className="text-[11px] text-slate-400 max-w-md">
                  Robot đang ở trạm sạc. Bạn có thể chọn tuyến hoặc chọn kệ ở bảng điều khiển bên phải và phát lệnh Tuần tra / Quảng cáo để bắt đầu.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-start gap-3 overflow-x-auto pb-3 px-1 w-full custom-scrollbar">
                {waypoints.map((wp, idx) => {
                  const isActive = idx === currentIndex
                  const isPast = idx < currentIndex
                  return (
                    <React.Fragment key={idx}>
                      <div className="relative flex flex-col items-center shrink-0 w-44 group bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
                        <div
                          className={`size-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                            isActive
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-105 ring-4 ring-teal-500/20'
                              : isPast
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isPast ? '✓' : idx + 1}
                        </div>
                        <div className="mt-2 text-center w-full">
                          <div className={`text-xs truncate font-bold ${isActive ? 'text-teal-700 font-extrabold' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                            {wp.shelfName || wp.nodeName || `Mốc #${wp.nodeId}`}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            {wp.aisleName || (wp.zoneName ? `Khu ${wp.zoneName}` : 'Điểm dừng lộ trình')}
                          </div>
                          {wp.dwellTimeSeconds > 0 && (
                            <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5 mt-1 inline-block">
                              ⏱ Dừng: {wp.dwellTimeSeconds}s
                            </div>
                          )}
                        </div>
                      </div>
                      {idx < waypoints.length - 1 && (
                        <div className="min-w-[20px] h-0.5 bg-slate-200 relative shrink-0">
                          <div className={`h-full ${isPast ? 'bg-teal-500' : 'bg-slate-200'}`} />
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. BOTTOM FLOATING MISSION HUD & QUICK CONTROLS ─────────────────── */}
      <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none flex justify-center">
        {isMissionActive ? (
          /* Bảng HUD khi Robot Đang Chạy Nhiệm Vụ */
          <div className="pointer-events-auto max-w-2xl w-full bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3.5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 smb-pop-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] text-teal-600 animate-spin">
                  {missionStatus === 'PAUSED' ? 'pause' : 'autorenew'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    {flowTypeLabel.text}
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono font-bold border border-teal-200">
                    Mốc {Math.max(1, currentIndex + 1)}/{waypoints.length}
                  </span>
                </div>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  Đang tại:{' '}
                  <span className="font-bold text-slate-900">
                    {currentWaypoint?.shelfName || currentWaypoint?.nodeName || `Mốc ${currentIndex + 1}`}
                  </span>
                  {currentWaypoint?.dwellTimeSeconds > 0 && ` (Dừng ${currentWaypoint.dwellTimeSeconds}s)`}
                </p>
              </div>
            </div>

            {/* Quick Action Control Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowWaypointsDrawer((prev) => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
              >
                <span className="material-symbols-outlined text-[15px]">list</span>
                <span>{showWaypointsDrawer ? 'Ẩn Lộ Trình' : 'Xem Lộ Trình'}</span>
              </button>

              {missionStatus === 'PAUSED' ? (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Tiếp Tục</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">pause</span>
                  <span>Tạm Dừng</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">stop</span>
                <span>Hủy & Về Trạm</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  )
}
