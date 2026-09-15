import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import {
  getRecentScans,
  getShelfDensities,
  getRestockTasks,
  completeRestockTask,
  deleteRestockTask,
  reportOutOfStock,
  getPatrolReadiness,
  dispatchPatrolMission,
  getPatrolRoutes,
  getShelves
} from '../features/robot/api/patrolApi'
import { useRobotFleet } from '../features/robot/hooks/useRobotFleet'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function ShelfPatrolManagement() {
  const [activeTab, setActiveTab] = useState('dispatch') // 'dispatch' | 'history' | 'restock' | 'density'
  
  // ─── Shared State ───
  const { robots, selectedRobotCode, setSelectedRobotCode } = useRobotFleet()
  const [shelves, setShelves] = useState([])
  const [routes, setRoutes] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  // ─── Tab 1: Dispatch State ───
  const [patrolMode, setPatrolMode] = useState('selective') // 'route' | 'selective'
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [selectedShelfNodeIds, setSelectedShelfNodeIds] = useState([])
  const [dispatching, setDispatching] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [liveAnalysis, setLiveAnalysis] = useState({
    targetShelf: 'Chờ phát lệnh...',
    stockStatus: 'Chưa có dữ liệu',
    occupancyRate: 0,
    totalProducts: 0,
    emptySlots: 0,
    aiProcessingMs: 0
  })

  // ─── Tab 2: Scan History State ───
  const [scans, setScans] = useState([])
  const [scanFilterShelf, setScanFilterShelf] = useState('all')
  const [scanFilterStatus, setScanFilterStatus] = useState('all')
  const [previewImage, setPreviewImage] = useState(null)

  // ─── Tab 3: Restock Tasks State ───
  const [tasks, setTasks] = useState([])
  const [taskFilterStatus, setTaskFilterStatus] = useState('all')
  const [completingTask, setCompletingTask] = useState(null)
  const [restockQty, setRestockQty] = useState(10)
  const [showReportOosModal, setShowReportOosModal] = useState(false)
  const [reportOosForm, setReportOosForm] = useState({ shelfId: 1, note: '' })

  // ─── Tab 4: Shelf Densities State ───
  const [densities, setDensities] = useState([])

  // Robot mục tiêu
  const targetRobot = robots.find(r => r.robotCode === selectedRobotCode) || robots[0] || { robotCode: 'RB0001', isOnline: true }

  // ─── Data Loaders ───
  const loadShelvesAndRoutes = useCallback(async () => {
    try {
      const [shelvesRes, routesRes] = await Promise.all([
        getShelves().catch(() => []),
        getPatrolRoutes().catch(() => [])
      ])
      const shelfList = Array.isArray(shelvesRes) ? shelvesRes : (shelvesRes?.items || [])
      setShelves(shelfList)

      const routeList = Array.isArray(routesRes) ? routesRes : (routesRes?.items || [])
      const patrolOnly = routeList.filter(r => (r.routeType || r.type || '').toLowerCase().includes('patrol') || (r.routeName || '').toLowerCase().includes('tuần tra') || true)
      setRoutes(patrolOnly)
      if (patrolOnly.length > 0 && !selectedRouteId) {
        setSelectedRouteId(patrolOnly[0].robotRouteId || patrolOnly[0].routeId || '')
      }
    } catch (e) {
      console.warn('Lỗi load danh sách kệ/tuyến:', e)
    }
  }, [selectedRouteId])

  const checkReadiness = useCallback(async () => {
    setReadinessLoading(true)
    try {
      const res = await getPatrolReadiness()
      setReadiness(res)
    } catch {
      setReadiness({ ready: false, message: 'Không thể kết nối dịch vụ kiểm tra tuần tra' })
    } finally {
      setReadinessLoading(false)
    }
  }, [])

  const loadScanHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRecentScans(50)
      setScans(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error('Lỗi tải lịch sử quét kệ')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRestockTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getRestockTasks()
      const taskList = res?.tasks || res?.items || (Array.isArray(res) ? res : [])
      setTasks(taskList)
    } catch {
      toast.error('Lỗi tải danh sách nhiệm vụ bổ sung hàng')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDensities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getShelfDensities()
      setDensities(Array.isArray(res) ? res : [])
    } catch {
      toast.error('Lỗi tải mật độ kệ hàng')
    } finally {
      setLoading(false)
    }
  }, [])

  // Chuyển tab -> tải dữ liệu tương ứng
  useEffect(() => {
    loadShelvesAndRoutes()
    checkReadiness()
  }, [loadShelvesAndRoutes, checkReadiness])

  useEffect(() => {
    if (activeTab === 'history') loadScanHistory()
    else if (activeTab === 'restock') loadRestockTasks()
    else if (activeTab === 'density') loadDensities()
  }, [activeTab, loadScanHistory, loadRestockTasks, loadDensities])

  // ─── Format Timestamp sang giờ VN (UTC+7) ───
  const formatDateTimeVN = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const str = String(dateStr).trim()
      const hasTz = /[Zz]$|[+\-]\d{2}:?\d{2}$/.test(str)
      const d = new Date(hasTz ? str : `${str}Z`)
      if (Number.isNaN(d.getTime())) return dateStr
      return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // ─── Action Handlers ───
  const handleToggleShelf = (nodeId) => {
    setSelectedShelfNodeIds(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    )
  }

  const handleSelectAllShelves = () => {
    const validNodeIds = shelves.filter(s => s.nodeId).map(s => s.nodeId)
    if (selectedShelfNodeIds.length === validNodeIds.length) {
      setSelectedShelfNodeIds([])
    } else {
      setSelectedShelfNodeIds(validNodeIds)
    }
  }

  const handleDispatchPatrol = async () => {
    const robotCode = targetRobot?.robotCode || 'RB0001'
    if (patrolMode === 'selective' && selectedShelfNodeIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 kệ hàng để tuần tra')
      return
    }

    setDispatching(true)
    try {
      const payload = {
        robotCode,
        flowType: 'patrol',
        ...(patrolMode === 'route'
          ? { robotRouteId: Number(selectedRouteId) }
          : { nodeIds: selectedShelfNodeIds })
      }

      await dispatchPatrolMission(payload)
      toast.success(`Đã phát lệnh tuần tra thành công cho robot ${robotCode}!`)
      setLiveAnalysis(prev => ({
        ...prev,
        targetShelf: patrolMode === 'route' ? `Theo tuyến #${selectedRouteId}` : `${selectedShelfNodeIds.length} kệ đã chọn`,
        stockStatus: 'Đang di chuyển tiếp cận kệ...',
      }))
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Phát lệnh tuần tra thất bại')
    } finally {
      setDispatching(false)
    }
  }

  const handleConfirmRestock = async () => {
    if (!completingTask) return
    try {
      await completeRestockTask({
        aisleId: completingTask.aisleId || completingTask.shelf?.aisleId || 1,
        aisleNodeId: completingTask.navigationNodeId || completingTask.nodeId,
        resolvedSlotIds: completingTask.slotId ? [completingTask.slotId] : []
      })
      toast.success('Đã xác nhận châm hàng và cập nhật tồn kho thành công!')
      setCompletingTask(null)
      loadRestockTasks()
    } catch {
      toast.error('Lỗi khi xác nhận hoàn thành nhiệm vụ')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bạn có chắc chắn muốn bỏ qua nhiệm vụ bổ sung hàng này?')) return
    try {
      await deleteRestockTask(taskId)
      toast.success('Đã xóa nhiệm vụ')
      loadRestockTasks()
    } catch {
      toast.error('Không thể xóa nhiệm vụ')
    }
  }

  const handleSubmitReportOos = async () => {
    try {
      await reportOutOfStock({
        shelfId: Number(reportOosForm.shelfId),
        reporterNote: reportOosForm.note || 'Báo cáo thủ công từ Web Admin'
      })
      toast.success('Đã tạo cảnh báo hết hàng thành công!')
      setShowReportOosModal(false)
      loadRestockTasks()
    } catch {
      toast.error('Không thể gửi cảnh báo')
    }
  }

  // Filtered scans
  const filteredScans = useMemo(() => {
    return scans.filter(s => {
      const matchShelf = scanFilterShelf === 'all' || String(s.shelfId) === String(scanFilterShelf)
      const matchStatus = scanFilterStatus === 'all' ||
        (scanFilterStatus === 'restock' && s.needsRestock) ||
        (scanFilterStatus === 'normal' && !s.needsRestock)
      return matchShelf && matchStatus
    })
  }, [scans, scanFilterShelf, scanFilterStatus])

  return (
    <div className="min-h-screen bg-smb-surface-container-lowest/40 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-smb-outline-variant/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            <Icon name="shield_with_heart" className="text-sm" />
            <span>Hệ Thống Giám Sát & Vận Hành Siêu Thị</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-smb-on-surface flex items-center gap-2.5">
            Quản Lý Tuần Tra Kệ Hàng
            <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
              Flow 4: OOS Closed-Loop
            </span>
          </h1>
          <p className="text-xs text-smb-on-surface-variant max-w-2xl">
            Tự động điều phối robot tuần tra định kỳ, phát hiện ô trống/hết hàng bằng Gemini Vision AI và quản lý quy trình nhân viên châm hàng khép kín.
          </p>
        </div>

        {/* Robot Selector & Quick Status */}
        <div className="flex items-center gap-3 bg-smb-surface-container-lowest p-2 rounded-2xl border border-smb-outline-variant/80 shadow-xs">
          <div className="flex items-center gap-2 px-2">
            <span className={`size-2.5 rounded-full ${targetRobot?.isOnline !== false ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-smb-on-surface">{targetRobot?.robotCode || 'RB0001'}</div>
              <div className="text-[10px] text-smb-on-surface-variant">
                {targetRobot?.isOnline !== false ? 'Robot Đang Online' : 'Ngoại tuyến'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={checkReadiness}
            disabled={readinessLoading}
            className="flex items-center gap-1 text-xs font-semibold text-smb-primary hover:bg-smb-primary/10 px-2.5 py-1.5 rounded-xl transition-all"
            title="Kiểm tra độ sẵn sàng AI & Cloud"
          >
            <Icon name={readinessLoading ? 'sync' : 'verified'} className={`text-base ${readinessLoading ? 'animate-spin' : ''}`} />
            <span>{readinessLoading ? 'Đang kiểm...' : 'Kiểm tra AI'}</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-smb-outline-variant/60 pb-3">
        {[
          { id: 'dispatch', label: 'Điều Khiển & Phát Lệnh', icon: 'rocket_launch' },
          { id: 'history', label: 'Lịch Sử Quét Kệ & Ảnh AI', icon: 'photo_camera' },
          { id: 'restock', label: 'Nhiệm Vụ Bổ Sung Hàng (Staff)', icon: 'inventory' },
          { id: 'density', label: 'Mật Độ 6 Kệ Hàng', icon: 'stacked_bar_chart' }
        ].map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                isActive
                  ? 'bg-teal-600 text-white shadow-teal-600/20 shadow-md ring-2 ring-teal-500/30'
                  : 'bg-smb-surface-container-lowest text-smb-on-surface-variant hover:bg-smb-surface-container-high border border-smb-outline-variant/60'
              }`}
            >
              <Icon name={tab.icon} className="text-base" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: ĐIỀU KHIỂN & PHÁT LỆNH TUẦN TRA
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Cấu hình phát lệnh (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl border border-smb-outline-variant/80 bg-smb-surface-container-lowest p-5 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-smb-outline-variant/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <Icon name="tune" className="text-lg" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-smb-on-surface">Phương Thức Tuần Tra</h2>
                    <p className="text-[11px] text-smb-on-surface-variant">Chọn tuần tra tự động theo lộ trình hoặc tùy chọn kệ cần kiểm tra</p>
                  </div>
                </div>

                {/* Toggle switch */}
                <div className="flex rounded-xl bg-smb-surface-container-high p-1 border border-smb-outline-variant/60">
                  <button
                    type="button"
                    onClick={() => setPatrolMode('route')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      patrolMode === 'route'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-smb-on-surface-variant hover:text-smb-on-surface'
                    }`}
                  >
                    <Icon name="alt_route" className="text-sm" />
                    Theo Tuyến
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatrolMode('selective')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      patrolMode === 'selective'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-smb-on-surface-variant hover:text-smb-on-surface'
                    }`}
                  >
                    <Icon name="checklist" className="text-sm" />
                    Chọn Kệ ({selectedShelfNodeIds.length})
                  </button>
                </div>
              </div>

              {/* Chế độ 1: Theo Tuyến */}
              {patrolMode === 'route' ? (
                <div className="space-y-3 bg-smb-surface-container/20 p-4 rounded-xl border border-smb-outline-variant/40">
                  <label className="text-xs font-bold text-smb-on-surface block">Chọn lộ trình tuần tra định sẵn:</label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full rounded-xl bg-smb-surface-container-lowest border border-smb-outline-variant px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none focus:border-teal-500"
                  >
                    {routes.map(r => (
                      <option key={r.robotRouteId || r.routeId} value={r.robotRouteId || r.routeId}>
                        {r.routeName} ({r.nodeCount || r.nodes?.length || 'Nhiều'} điểm dừng)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-smb-on-surface-variant flex items-center gap-1">
                    <Icon name="info" className="text-xs text-teal-600" />
                    Robot sẽ tự động duyệt qua tất cả các waypoint trong tuyến, chụp ảnh phân tích và gửi báo cáo về kho.
                  </p>
                </div>
              ) : (
                /* Chế độ 2: Chọn Kệ Cụ Thể */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-smb-on-surface">Danh sách Kệ Hàng ({shelves.length} kệ):</span>
                    <button
                      type="button"
                      onClick={handleSelectAllShelves}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      {selectedShelfNodeIds.length === shelves.filter(s => s.nodeId).length ? 'Bỏ chọn tất cả' : 'Chọn tất cả kệ'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto p-1">
                    {shelves.map(shelf => {
                      const isSelected = selectedShelfNodeIds.includes(shelf.nodeId)
                      const hasNode = !!shelf.nodeId
                      return (
                        <div
                          key={shelf.shelfId}
                          onClick={() => hasNode && handleToggleShelf(shelf.nodeId)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-500/10 border-teal-500/50 shadow-xs'
                              : hasNode
                                ? 'bg-smb-surface-container-lowest border-smb-outline-variant/60 hover:bg-smb-surface-container/30'
                                : 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!hasNode}
                              onChange={() => {}}
                              className="size-4 accent-teal-600 rounded cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-smb-on-surface">{shelf.shelfName}</div>
                              <div className="text-[10px] text-smb-on-surface-variant font-mono">
                                Lối đi: {shelf.aisleName || `Aisle #${shelf.aisleId}`} • Node {shelf.nodeId || 'Chưa gán'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded">
                            Tag #{shelf.shelfId}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Nút phát lệnh */}
              <div className="pt-2 border-t border-smb-outline-variant/40 flex items-center justify-between">
                <div className="text-xs text-smb-on-surface-variant">
                  {patrolMode === 'selective' ? `Đã chọn: ${selectedShelfNodeIds.length} kệ hàng` : 'Chế độ: Toàn tuyến tuần tra'}
                </div>
                <button
                  type="button"
                  disabled={dispatching || (targetRobot?.isOnline === false)}
                  onClick={handleDispatchPatrol}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Icon name={dispatching ? 'sync' : 'rocket_launch'} className={`text-base ${dispatching ? 'animate-spin' : ''}`} />
                  <span>{dispatching ? 'Đang phát lệnh...' : 'Phát Lệnh Tuần Tra Ngay'}</span>
                </button>
              </div>
            </div>

            {/* Trạng thái sẵn sàng hệ thống */}
            <div className="rounded-2xl border border-smb-outline-variant/70 bg-smb-surface-container-lowest p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-smb-on-surface">
                <span className="flex items-center gap-1.5">
                  <Icon name="health_and_safety" className="text-teal-600" />
                  Độ Sẵn Sàng Tuần Tra (Readiness Guard)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${readiness?.ready ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                  {readiness?.ready ? 'SẴN SÀNG' : 'CHƯA ĐẦY ĐỦ'}
                </span>
              </div>
              <p className="text-[11px] text-smb-on-surface-variant">
                {readiness?.message || 'Database, Cloudinary Storage và Gemini Vision AI đã được kiểm tra tính sẵn sàng trước chuyến tuần tra.'}
              </p>
            </div>
          </div>

          {/* Cột phải: Camera & AI Analysis HUD (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl border border-smb-outline-variant/80 bg-slate-950 text-white p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="videocam" className="text-teal-400 text-lg" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Giám Sát Camera & Quét Kệ Hàng
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCameraActive(prev => !prev)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                    cameraActive ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white hover:bg-teal-500'
                  }`}
                >
                  {cameraActive ? 'Tắt Camera' : 'Bật Camera'}
                </button>
              </div>

              {/* Camera Preview Area */}
              <div className="relative aspect-video rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                {cameraActive ? (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-2 p-4 text-center">
                    <Icon name="sensors" className="text-3xl text-teal-400 animate-pulse" />
                    <span className="text-xs text-slate-300 font-medium">Đang nhận luồng trực tiếp từ Camera Robot...</span>
                    <span className="text-[10px] text-slate-500 font-mono">Độ trễ AI &lt; 25ms • YuNet + ONNX SFace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 text-slate-500 text-center p-4">
                    <Icon name="photo_camera_back" className="text-4xl text-slate-600" />
                    <span className="text-xs">Camera đang tắt. Bấm "Bật Camera" để xem luồng chụp trực tiếp.</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-teal-300 border border-teal-500/30">
                  HUD LIVE
                </div>
              </div>

              {/* Panel Phân Tích Kệ Hàng (Ảnh 2) */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-2.5 font-mono text-xs">
                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between border-b border-rose-500/20 pb-1.5">
                  <span>Phân Tích Kệ Hàng (AI Gemini)</span>
                  <span className="text-[10px] text-slate-400 font-normal">{liveAnalysis.aiProcessingMs} ms</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kệ mục tiêu:</span>
                    <span className="text-slate-100 font-bold">{liveAnalysis.targetShelf}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stock trạng thái:</span>
                    <span className="text-amber-300 font-bold">{liveAnalysis.stockStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mật độ (Độ đầy):</span>
                    <span className="text-teal-300 font-bold">{liveAnalysis.occupancyRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tổng sản phẩm:</span>
                    <span className="text-slate-200">{liveAnalysis.totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ô trống (Hết hàng):</span>
                    <span className="text-rose-400 font-bold">{liveAnalysis.emptySlots}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: LỊCH SỬ QUÉT KỆ & ẢNH CHỤP AI
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-smb-outline-variant/80 bg-smb-surface-container-lowest p-5 space-y-4 shadow-sm">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-smb-outline-variant/50 pb-4">
            <div className="flex items-center gap-3">
              {/* Lọc kệ */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-smb-on-surface-variant font-semibold">Lọc Kệ:</span>
                <select
                  value={scanFilterShelf}
                  onChange={(e) => setScanFilterShelf(e.target.value)}
                  className="rounded-lg bg-smb-surface-container-high border border-smb-outline-variant px-2.5 py-1 text-xs text-smb-on-surface font-semibold outline-none"
                >
                  <option value="all">Tất cả các kệ</option>
                  {shelves.map(s => (
                    <option key={s.shelfId} value={s.shelfId}>{s.shelfName}</option>
                  ))}
                </select>
              </div>

              {/* Lọc trạng thái */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-smb-on-surface-variant font-semibold">Trạng thái:</span>
                <select
                  value={scanFilterStatus}
                  onChange={(e) => setScanFilterStatus(e.target.value)}
                  className="rounded-lg bg-smb-surface-container-high border border-smb-outline-variant px-2.5 py-1 text-xs text-smb-on-surface font-semibold outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="restock">Cần châm hàng (Thiếu hàng)</option>
                  <option value="normal">Đủ hàng (Bình thường)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={loadScanHistory}
              disabled={loading}
              className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20 transition-all"
            >
              <Icon name="refresh" className={`text-base ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-smb-on-surface">
              <thead className="bg-smb-surface-container-high/60 text-[11px] font-bold uppercase tracking-wider text-smb-on-surface-variant border-b border-smb-outline-variant/60">
                <tr>
                  <th className="px-4 py-3">Thời Gian Quét</th>
                  <th className="px-4 py-3">Kệ Hàng</th>
                  <th className="px-4 py-3">Lối Đi / Node</th>
                  <th className="px-4 py-3">Mật Độ Lấp Đầy</th>
                  <th className="px-4 py-3">Ô Trống</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-center">Ảnh Camera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-smb-outline-variant/40">
                {filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-smb-on-surface-variant">
                      Chưa có bản ghi quét kệ nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredScans.map(scan => {
                    const density = scan.densityPercentage ?? (100 - (scan.emptyPercentage || 0))
                    const isRestock = scan.needsRestock || (scan.emptyPercentage || 0) > 30
                    return (
                      <tr key={scan.scanId} className="hover:bg-smb-surface-container/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                          {formatDateTimeVN(scan.scannedAt)}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          Kệ #{scan.shelfId || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-smb-on-surface-variant">
                          Aisle #{scan.aisleId} {scan.aisleNodeId ? `(Node ${scan.aisleNodeId})` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono">{density}%</span>
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  density > 70 ? 'bg-emerald-500' : density > 35 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, density))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {scan.emptyPercentage ? `${scan.emptyPercentage}%` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isRestock
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}>
                            <span className={`size-1.5 rounded-full ${isRestock ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            {isRestock ? 'Cần Châm Hàng' : 'Đủ Hàng'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {scan.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(scan.imageUrl)}
                              className="size-8 rounded-lg overflow-hidden border border-smb-outline-variant inline-block hover:scale-110 transition-transform shadow-2xs"
                              title="Bấm để xem ảnh phóng to"
                            >
                              <img src={scan.imageUrl} alt="Shelf Scan" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: NHIỆM VỤ BỔ SUNG HÀNG (STAFF RESTOCK)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'restock' && (
        <div className="rounded-2xl border border-smb-outline-variant/80 bg-smb-surface-container-lowest p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-smb-outline-variant/50 pb-4">
            <div>
              <h2 className="text-sm font-bold text-smb-on-surface">Danh Sách Nhiệm Vụ Cần Châm Hàng</h2>
              <p className="text-[11px] text-smb-on-surface-variant">
                Các ô hàng bị phát hiện trống qua Camera Robot hoặc báo cáo OOS khẩn cấp
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowReportOosModal(true)}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-all"
              >
                <Icon name="warning" className="text-sm" />
                Báo Kệ Hết Hàng
              </button>
              <button
                type="button"
                onClick={loadRestockTasks}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20 transition-all"
              >
                <Icon name="refresh" className={`text-base ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>
          </div>

          {/* Task Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.length === 0 ? (
              <div className="col-span-full py-12 text-center text-smb-on-surface-variant space-y-2">
                <Icon name="check_circle" className="text-4xl text-emerald-500" />
                <div className="text-sm font-bold text-smb-on-surface">Tất cả kệ hàng đều đầy đủ!</div>
                <p className="text-xs">Không có nhiệm vụ bổ sung hàng nào đang chờ xử lý.</p>
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.taskId || task.id}
                  className="rounded-xl border border-smb-outline-variant/80 bg-smb-surface-container/20 p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {task.priority || 'Ưu Tiên Cao'}
                    </span>
                    <span className="text-[10px] font-mono text-smb-on-surface-variant">
                      {formatDateTimeVN(task.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-smb-on-surface">
                      {task.productName || `Sản phẩm #${task.productId || '—'}`}
                    </h3>
                    <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                      Vị trí: {task.location || `Khu vực: ${task.zoneName || 'Zone'} • Lối đi ${task.aisleId || ''} • Kệ ${task.shelfId || ''}`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-smb-surface-container-lowest p-2 rounded-lg border border-smb-outline-variant/40 font-mono">
                    <span className="text-smb-on-surface-variant">Số lượng thiếu:</span>
                    <span className="font-bold text-rose-600">-{task.missingQuantity || 1} cái</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-smb-outline-variant/40">
                    <button
                      type="button"
                      onClick={() => setCompletingTask(task)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1"
                    >
                      <Icon name="check" className="text-sm" />
                      Xác Nhận Đã Châm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.taskId || task.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/15 border border-rose-500/30 transition-all"
                      title="Bỏ qua nhiệm vụ này"
                    >
                      <Icon name="delete" className="text-base" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: MẬT ĐỘ 6 KỆ HÀNG
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'density' && (
        <div className="rounded-2xl border border-smb-outline-variant/80 bg-smb-surface-container-lowest p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-smb-outline-variant/50 pb-3">
            <div>
              <h2 className="text-sm font-bold text-smb-on-surface">Tình Trạng & Mật Độ 6 Kệ Hàng Siêu Thị</h2>
              <p className="text-[11px] text-smb-on-surface-variant">
                Được tổng hợp từ các lần quét camera AI của Robot (Tag ArUco #1 đến #6)
              </p>
            </div>
            <button
              type="button"
              onClick={loadDensities}
              disabled={loading}
              className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20 transition-all"
            >
              <Icon name="refresh" className={`text-base ${loading ? 'animate-spin' : ''}`} />
              Cập nhật
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {densities.map((shelf, idx) => {
              const occRate = shelf.occupancyRatePct ?? 80
              const emptyRate = 100 - occRate
              return (
                <div
                  key={shelf.shelfId || idx}
                  className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container/20 p-4 space-y-3.5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-bold text-xs">
                        #{shelf.shelfId || idx + 1}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-smb-on-surface">{shelf.shelfName || `Kệ Hàng #${idx + 1}`}</h3>
                        <p className="text-[10px] text-smb-on-surface-variant font-mono">
                          {shelf.zoneName || 'Khu Vực Tiêu Chuẩn'} • Lối đi {shelf.aisleId || idx + 1}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      occRate > 70 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
                    }`}>
                      {occRate > 70 ? 'Đủ Hàng' : 'Thiếu Hàng'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-smb-on-surface-variant text-[11px]">Mật độ lấp đầy:</span>
                      <span className="font-bold text-smb-on-surface">{occRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          occRate > 70 ? 'bg-emerald-500' : occRate > 40 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${occRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-smb-surface-container-lowest p-2.5 rounded-xl border border-smb-outline-variant/40">
                    <div>
                      <div className="text-smb-on-surface-variant text-[10px]">Tỷ Lệ Trống</div>
                      <div className="font-bold text-rose-600">{emptyRate}%</div>
                    </div>
                    <div>
                      <div className="text-smb-on-surface-variant text-[10px]">Lần Quét Gần Nhất</div>
                      <div className="font-bold text-smb-on-surface">{shelf.lastScannedAt ? formatDateTimeVN(shelf.lastScannedAt) : 'Chưa quét'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (shelf.nodeId) {
                        setSelectedShelfNodeIds([shelf.nodeId])
                        setPatrolMode('selective')
                        setActiveTab('dispatch')
                      } else {
                        toast.error('Kệ này chưa được gán Node trên bản đồ')
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs border border-teal-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Icon name="radar" className="text-sm" />
                    <span>Tuần tra ngay kệ này</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal Phóng To Ảnh Chụp Cloudinary ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono">Ảnh Chụp Thực Tế Từ Camera Robot (Cloudinary)</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <img src={previewImage} alt="Large Shelf Scan" className="w-full max-h-[70vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* ── Modal Xác Nhận Hoàn Tất Châm Hàng ── */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-smb-surface-container-lowest rounded-2xl border border-smb-outline-variant max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-smb-outline-variant/60 pb-3">
              <h3 className="text-sm font-bold text-smb-on-surface">Xác Nhận Hoàn Tất Châm Hàng</h3>
              <button type="button" onClick={() => setCompletingTask(null)} className="text-smb-on-surface-variant">
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <p className="text-xs text-smb-on-surface-variant">
              Bạn có chắc chắn đã bổ sung đầy đủ sản phẩm <strong>{completingTask.productName}</strong> tại vị trí kệ này?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-smb-on-surface">Số lượng đã bổ sung:</label>
              <input
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(Number(e.target.value))}
                className="w-full rounded-xl bg-smb-surface-container-high border border-smb-outline-variant px-3 py-2 text-xs font-mono font-bold text-smb-on-surface outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="flex-1 py-2 rounded-xl border border-smb-outline-variant text-xs font-bold text-smb-on-surface hover:bg-smb-surface-container"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
              >
                Xác Nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Báo Cáo Hết Hàng Khẩn Cấp ── */}
      {showReportOosModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-smb-surface-container-lowest rounded-2xl border border-smb-outline-variant max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-smb-outline-variant/60 pb-3">
              <h3 className="text-sm font-bold text-smb-on-surface flex items-center gap-2 text-rose-600">
                <Icon name="warning" className="text-base" />
                Báo Kệ Hàng Hết Hàng (Report OOS)
              </h3>
              <button type="button" onClick={() => setShowReportOosModal(false)} className="text-smb-on-surface-variant">
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-smb-on-surface block mb-1">Chọn kệ hàng:</label>
                <select
                  value={reportOosForm.shelfId}
                  onChange={(e) => setReportOosForm(prev => ({ ...prev, shelfId: e.target.value }))}
                  className="w-full rounded-xl bg-smb-surface-container-high border border-smb-outline-variant px-3 py-2 text-xs font-semibold text-smb-on-surface outline-none"
                >
                  {shelves.map(s => (
                    <option key={s.shelfId} value={s.shelfId}>{s.shelfName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-smb-on-surface block mb-1">Ghi chú bổ sung:</label>
                <textarea
                  rows={3}
                  value={reportOosForm.note}
                  onChange={(e) => setReportOosForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Ví dụ: Kệ tầng 1 bị khách mua hết sạch nước ngọt..."
                  className="w-full rounded-xl bg-smb-surface-container-high border border-smb-outline-variant p-2.5 text-xs text-smb-on-surface outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReportOosModal(false)}
                className="flex-1 py-2 rounded-xl border border-smb-outline-variant text-xs font-bold text-smb-on-surface hover:bg-smb-surface-container"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitReportOos}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                Gửi Cảnh Báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
