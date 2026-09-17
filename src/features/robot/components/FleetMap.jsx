import React, { useState, useMemo, useEffect } from 'react'
import { toast } from 'react-toastify'
import SupermarketInteractiveMap from './SupermarketInteractiveMap'
import {
  cancelRobotNavigation,
  pauseRobotNavigation,
  resumeRobotNavigation,
} from '../api/navigationApi'

export default function FleetMap({
  robots,
  poses,
  map,
  missionState,
  selectedRobotCode,
  onMissionCancelled,
}) {
  const [viewMode, setViewMode] = useState('map') // 'patrol' | 'map' | 'linear'
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

  // Tự động chuyển màn hình giám sát phù hợp khi nhiệm vụ bắt đầu
  useEffect(() => {
    if (isMissionActive && flowType === 'patrol') {
      setViewMode('patrol')
    } else if (isMissionActive && flowType === 'ad') {
      setViewMode('map')
    }
  }, [isMissionActive, flowType])

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
    if (!window.confirm(`Bạn có chắc chắn muốn dừng nhiệm vụ và yêu cầu Robot ${activeRobotCode} về trạm sạc?`)) {
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
      {/* ── 1. HEADER BAR ────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Flow Type & Robot Telemetry Info */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs tracking-wider border ${flowTypeLabel.border} ${flowTypeLabel.bg} ${flowTypeLabel.textCol} shadow-xs backdrop-blur-md`}
          >
            <span className={`size-2 rounded-full ${flowTypeLabel.color} ${isMissionActive ? 'animate-ping' : ''}`} />
            <span>{flowTypeLabel.text}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
            <span className="font-extrabold text-emerald-600">{activeRobotCode}</span>
            <span className="text-slate-300">|</span>
            <span>
              {pose && typeof pose.xCoord === 'number'
                ? `(${pose.xCoord.toFixed(2)}m, ${pose.yCoord.toFixed(2)}m)`
                : 'Trạm Sạc (0.27m, 2.09m)'}
            </span>
            {selectedRobot?.batteryPct != null && (
              <>
                <span className="text-slate-300">|</span>
                <span className={selectedRobot.batteryPct > 50 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  🔋 {selectedRobot.batteryPct}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Switch View & Direct Link to ROS Map Tool */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Toggle Giám sát Tuần Tra / Giám sát Quảng Cáo / Danh sách chặng */}
          <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-xs gap-1">
            <button
              onClick={() => setViewMode('patrol')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'patrol'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Màn hình giám sát Camera AI & Tuần tra quét kệ hàng"
            >
              <span className="material-symbols-outlined text-[16px]">videocam</span>
              <span>Giám Sát Tuần Tra</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Bản đồ 2D siêu thị & Giám sát di chuyển quảng cáo"
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>Giám Sát Quảng Cáo</span>
            </button>
            <button
              onClick={() => setViewMode('linear')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'linear'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Danh sách các chặng dừng trong lộ trình"
            >
              <span className="material-symbols-outlined text-[15px]">timeline</span>
              <span>Chặng ({isMissionActive ? waypoints.length : 0})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. BODY CONTENT: GIÁM SÁT TUẦN TRA (AI MONITOR), BẢN ĐỒ 2D, HOẶC DANH SÁCH CHẶNG ────── */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-50">
        {/* View 1: Giám Sát Tuần Tra (AI Camera & Shelf Sweep Monitor) */}
        <div
          className={`w-full h-full relative bg-slate-50 ${
            viewMode === 'patrol' ? 'block' : 'hidden'
          }`}
          style={{
            paddingTop: '58px',
            paddingBottom: isMissionActive ? '76px' : '0px',
          }}
        >
          <iframe
            src="/ros-ai-monitor.html?v=light_theme_v2"
            className="w-full h-full border-0 bg-slate-50"
            title="Hệ thống Giám sát AI Kệ hàng"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>

        {/* View 2: Giám Sát Quảng Cáo (2D Interactive Supermarket Map) */}
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

        {/* View 3: Danh sách chặng di chuyển (Linear Mode) */}
        {viewMode === 'linear' && (
          <div className="w-full h-full p-8 pt-24 overflow-y-auto flex flex-col items-center justify-center bg-slate-50">
            {!isMissionActive || waypoints.length === 0 ? (
              <div className="text-center text-slate-400 flex flex-col items-center justify-center py-16">
                <span className="material-symbols-outlined text-6xl mb-3 opacity-30 text-slate-400">alt_route</span>
                <p className="text-base font-semibold text-slate-700">Chưa có danh sách chặng di chuyển</p>
                <p className="text-xs text-slate-500 mt-1">Phát lệnh lộ trình ở bảng điều khiển bên phải để xem chi tiết.</p>
              </div>
            ) : (
              <div className="flex items-center justify-start gap-3 overflow-x-auto pb-16 pt-8 px-6 w-full custom-scrollbar">
                {waypoints.map((wp, idx) => {
                  const isActive = idx === currentIndex
                  const isPast = idx < currentIndex
                  return (
                    <React.Fragment key={idx}>
                      <div className="relative flex flex-col items-center shrink-0 w-36 group smb-pop-in">
                        {isActive && (
                          <div className={`absolute top-4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full ${flowTypeLabel.bg} animate-ping opacity-75`} />
                        )}
                        <div
                          className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300 ${
                            isActive
                              ? `${flowTypeLabel.color} text-white border-transparent shadow-lg scale-110`
                              : isPast
                              ? `${flowTypeLabel.border} ${flowTypeLabel.textCol} bg-emerald-50`
                              : 'border-slate-300 text-slate-400 bg-slate-100'
                          }`}
                        >
                          <span className="font-bold text-sm">{isPast ? '✓' : idx + 1}</span>
                        </div>
                        <div className="mt-3 text-center w-full">
                          <div className={`text-xs font-semibold truncate px-1 ${isActive ? 'text-slate-900 font-bold' : isPast ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                            {wp.shelfName || wp.nodeName || `Node ${wp.nodeId}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ({wp.xCoord?.toFixed(1) ?? '?'}, {wp.yCoord?.toFixed(1) ?? '?'})
                          </div>
                          {wp.dwellTimeSeconds > 0 && (
                            <div className="text-[9px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block border border-slate-200 font-medium">
                              ⏱ {wp.dwellTimeSeconds}s
                            </div>
                          )}
                        </div>
                      </div>
                      {idx < waypoints.length - 1 && (
                        <div className="flex-1 min-w-[36px] max-w-[70px] h-0.5 relative z-0 shrink-0">
                          <div className={`absolute inset-0 transition-colors duration-500 ${isPast ? flowTypeLabel.color : 'bg-slate-200'}`} />
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

      {/* ── 3. BOTTOM FLOATING MISSION HUD & CONTROLS ────────── */}
      {(isMissionActive || viewMode !== 'patrol') && (
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
        {isMissionActive ? (
          /* Bảng HUD điều khiển khi Robot Đang Có Nhiệm Vụ */
          <div className="pointer-events-auto max-w-2xl w-full bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3.5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 smb-pop-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] text-orange-500 animate-spin">
                  {missionStatus === 'PAUSED' ? 'pause' : 'autorenew'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    {flowTypeLabel.text}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200">
                    Chặng {Math.max(1, currentIndex + 1)}/{waypoints.length}
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
              {missionStatus === 'PAUSED' ? (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  Tiếp Tục
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">pause</span>
                  Tạm Dừng
                </button>
              )}

              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">stop</span>
                Hủy & Về Trạm
              </button>
            </div>
          </div>
        ) : (
          /* Bảng trạng thái khi Robot Đang Rảnh */
          <div className="pointer-events-auto max-w-xl w-full bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl px-5 py-3 shadow-md flex items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-emerald-600">smart_toy</span>
              <span>
                <strong className="text-slate-900 font-bold">Robot {activeRobotCode}</strong> đang ở trạm chờ / sạc pin (Sẵn sàng nhận lệnh).
              </span>
            </div>
          </div>
        )}
      </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  )
}
