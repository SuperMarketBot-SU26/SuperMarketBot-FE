import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
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
  getShelves,
  getRestockHistory,
  getAutonomousMissionsHistory
} from '../features/robot/api/patrolApi'
import { useRobotFleet } from '../features/robot/hooks/useRobotFleet'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const DEFAULT_SHELF_META = {
  1: { name: 'Kệ 1 - Snack & Đồ Ăn Vặt', aisle: 'Dãy A01 • Khu Snack', tag: 1, node: 1 },
  2: { name: 'Kệ 2 - Nước Giải Khát & Đồ Uống', aisle: 'Dãy A01 • Khu Đồ Uống', tag: 2, node: 2 },
  3: { name: 'Kệ 3 - Thực Phẩm Tươi Sống', aisle: 'Dãy B01 • Khu Tươi Sống', tag: 3, node: 3 },
  4: { name: 'Kệ 4 - Mì Ăn Liền & Đóng Gói', aisle: 'Dãy B01 • Khu Đồ Khô', tag: 4, node: 4 },
  5: { name: 'Kệ 5 - Đồ Gia Dụng & Tiện Ích', aisle: 'Dãy C01 • Khu Gia Dụng', tag: 5, node: 5 },
  6: { name: 'Kệ 6 - Gia Vị & Trà', aisle: 'Dãy C01 • Khu Gia Vị', tag: 6, node: 6 },
}

const INITIAL_MISSIONS = [
  {
    missionId: 'MS-20260918-001',
    robotCode: 'RB0001',
    flowType: 'guide',
    source: 'RobotKiosk',
    dispatchedBy: 'Khách vãng lai tại Robot',
    targetSummary: 'Dẫn đường tới Kệ 2 (Nước giải khát & Đồ uống)',
    startedAtUtc: new Date(Date.now() - 15 * 60000).toISOString(),
    completedAtUtc: new Date(Date.now() - 12 * 60000).toISOString(),
    status: 'COMPLETED',
    waypointCount: 1,
    currentWaypointIndex: 0,
    dwellTimeSeconds: 30,
    estimatedDurationSeconds: 180,
    waypoints: [
      {
        nodeId: 2,
        nodeName: 'Kệ 2 - Nước Giải Khát & Đồ Uống',
        xCoord: 1.8,
        yCoord: 1.2,
        shelfName: 'Kệ 2 - Nước Giải Khát',
        zoneName: 'Zone 1 - Đồ Uống',
        effectiveDwellTimeSeconds: 30,
        productNames: ['Trà xanh C2 455ml', 'Nước ngọt Coca-Cola 320ml', 'Cà phê lon Highlands']
      }
    ]
  },
  {
    missionId: 'MS-20260918-002',
    robotCode: 'RB0001',
    flowType: 'ad',
    source: 'RobotKiosk',
    dispatchedBy: 'Nguyễn Văn An (VIP)',
    targetSummary: 'Dẫn đến Kệ 1 (Snack & Bánh Kẹo) & Xem quảng cáo ưu đãi',
    startedAtUtc: new Date(Date.now() - 35 * 60000).toISOString(),
    completedAtUtc: new Date(Date.now() - 30 * 60000).toISOString(),
    status: 'COMPLETED',
    waypointCount: 1,
    currentWaypointIndex: 0,
    dwellTimeSeconds: 30,
    estimatedDurationSeconds: 240,
    waypoints: [
      {
        nodeId: 1,
        nodeName: 'Kệ 1 - Snack & Đồ Ăn Vặt',
        xCoord: 1.0,
        yCoord: 1.2,
        shelfName: 'Kệ 1 - Bánh Kẹo',
        zoneName: 'Zone 1 - Snack',
        effectiveDwellTimeSeconds: 30,
        productNames: ['Bánh que Pocky Glico', 'Khoai tây sấy Lay\'s']
      }
    ]
  },
  {
    missionId: 'MS-20260918-003',
    robotCode: 'RB0001',
    flowType: 'guide',
    source: 'RobotKiosk',
    dispatchedBy: 'Trần Thị Mai (Member #3)',
    targetSummary: 'Dẫn đường mua sắm giỏ hàng đa điểm: Kệ 1, Kệ 2, Kệ 4',
    startedAtUtc: new Date(Date.now() - 60 * 60000).toISOString(),
    completedAtUtc: new Date(Date.now() - 52 * 60000).toISOString(),
    status: 'COMPLETED',
    waypointCount: 3,
    currentWaypointIndex: 2,
    dwellTimeSeconds: 30,
    estimatedDurationSeconds: 420,
    waypoints: [
      {
        nodeId: 1,
        nodeName: 'Kệ 1 - Snack & Bánh Kẹo',
        xCoord: 1.0,
        yCoord: 1.2,
        shelfName: 'Kệ 1',
        effectiveDwellTimeSeconds: 30,
        productNames: ['Bánh quy Oreo socola']
      },
      {
        nodeId: 2,
        nodeName: 'Kệ 2 - Nước Giải Khát',
        xCoord: 1.8,
        yCoord: 1.2,
        shelfName: 'Kệ 2',
        effectiveDwellTimeSeconds: 30,
        productNames: ['Sữa tươi TH True Milk 1L']
      },
      {
        nodeId: 4,
        nodeName: 'Kệ 4 - Mì Ăn Liền & Đồ Khô',
        xCoord: 1.8,
        yCoord: 2.2,
        shelfName: 'Kệ 4',
        effectiveDwellTimeSeconds: 30,
        productNames: ['Mì tôm Hảo Hảo chua cay']
      }
    ]
  },
  {
    missionId: 'MS-20260918-004',
    robotCode: 'RB0001',
    flowType: 'ad',
    source: 'AdminWeb',
    dispatchedBy: 'Admin Portal (Quản trị viên)',
    targetSummary: 'Phát quảng cáo chiến dịch khuyến mãi: Kệ 1, Kệ 3, Kệ 5',
    startedAtUtc: new Date(Date.now() - 95 * 60000).toISOString(),
    completedAtUtc: new Date(Date.now() - 82 * 60000).toISOString(),
    status: 'COMPLETED',
    waypointCount: 3,
    currentWaypointIndex: 2,
    dwellTimeSeconds: 30,
    estimatedDurationSeconds: 600,
    waypoints: [
      { nodeId: 1, nodeName: 'Kệ 1 - Snack & Đồ Ăn Vặt', shelfName: 'Kệ 1', effectiveDwellTimeSeconds: 30 },
      { nodeId: 3, nodeName: 'Kệ 3 - Thực Phẩm Tươi Sống', shelfName: 'Kệ 3', effectiveDwellTimeSeconds: 30 },
      { nodeId: 5, nodeName: 'Kệ 5 - Đồ Gia Dụng', shelfName: 'Kệ 5', effectiveDwellTimeSeconds: 30 }
    ]
  },
  {
    missionId: 'MS-20260918-005',
    robotCode: 'RB0001',
    flowType: 'patrol',
    source: 'StaffMobile',
    dispatchedBy: 'NV01 - Nguyễn Văn Staff',
    targetSummary: 'Tuần tra quét AI kiểm tra ô trống Kệ 3 & Kệ 4',
    startedAtUtc: new Date(Date.now() - 150 * 60000).toISOString(),
    completedAtUtc: new Date(Date.now() - 146 * 60000).toISOString(),
    status: 'COMPLETED',
    waypointCount: 2,
    currentWaypointIndex: 1,
    dwellTimeSeconds: 5,
    estimatedDurationSeconds: 150,
    waypoints: [
      { nodeId: 3, nodeName: 'Kệ 3 - Thực Phẩm Tươi Sống', shelfName: 'Kệ 3', effectiveDwellTimeSeconds: 5 },
      { nodeId: 4, nodeName: 'Kệ 4 - Mì Ăn Liền & Đóng Gói', shelfName: 'Kệ 4', effectiveDwellTimeSeconds: 5 }
    ]
  },
  {
    missionId: 'MS-20260918-006',
    robotCode: 'RB0001',
    flowType: 'patrol',
    source: 'SystemSchedule',
    dispatchedBy: 'Hệ thống tự động (Cron)',
    targetSummary: 'Tuần tra quét AI định kỳ toàn bộ 6 Kệ hàng',
    startedAtUtc: new Date(Date.now() - 280 * 60000).toISOString(),
    completedAtUtc: new Date(Date.now() - 268 * 60000).toISOString(),
    status: 'COMPLETED',
    waypointCount: 6,
    currentWaypointIndex: 5,
    dwellTimeSeconds: 5,
    estimatedDurationSeconds: 720,
    waypoints: [
      { nodeId: 1, nodeName: 'Kệ 1', shelfName: 'Kệ 1', effectiveDwellTimeSeconds: 5 },
      { nodeId: 2, nodeName: 'Kệ 2', shelfName: 'Kệ 2', effectiveDwellTimeSeconds: 5 },
      { nodeId: 3, nodeName: 'Kệ 3', shelfName: 'Kệ 3', effectiveDwellTimeSeconds: 5 },
      { nodeId: 4, nodeName: 'Kệ 4', shelfName: 'Kệ 4', effectiveDwellTimeSeconds: 5 },
      { nodeId: 5, nodeName: 'Kệ 5', shelfName: 'Kệ 5', effectiveDwellTimeSeconds: 5 },
      { nodeId: 6, nodeName: 'Kệ 6', shelfName: 'Kệ 6', effectiveDwellTimeSeconds: 5 }
    ]
  }
]

export default function ShelfPatrolManagement() {
  const [activeTab, setActiveTab] = useState('missions') // 'missions' | 'history' | 'restock' | 'density'
  
  // ─── Shared State ───
  const { robots, selectedRobotCode, setSelectedRobotCode } = useRobotFleet()
  const [shelves, setShelves] = useState([])
  const [routes, setRoutes] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  // ─── Tab 1: Autonomous Missions & History State ───
  const [allMissions, setAllMissions] = useState([])
  const [missionKpis, setMissionKpis] = useState({
    totalMissions: 0,
    guideCount: 0,
    adCount: 0,
    patrolCount: 0,
    activeCount: 0
  })
  const [missionFilterFlow, setMissionFilterFlow] = useState('all') // 'all' | 'guide' | 'ad' | 'patrol'
  const [missionFilterSource, setMissionFilterSource] = useState('all') // 'all' | 'AdminWeb' | 'RobotKiosk' | 'StaffMobile' | 'SystemSchedule'
  const [missionFilterStatus, setMissionFilterStatus] = useState('all')
  const [missionSearchQuery, setMissionSearchQuery] = useState('')
  const [selectedMissionDetail, setSelectedMissionDetail] = useState(null)
  const [missionsLoading, setMissionsLoading] = useState(false)

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

  // ─── Tab 3: Restock Tasks & Staff History State ───
  const [restockSubTab, setRestockSubTab] = useState('history') // 'history' | 'density'
  const [tasks, setTasks] = useState([])
  const [restockHistory, setRestockHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
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

  const loadRestockHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await getRestockHistory(50)
      const list = res?.items || (Array.isArray(res) ? res : [])
      setRestockHistory(list)
    } catch {
      console.warn('Lỗi tải lịch sử châm hàng của nhân viên')
    } finally {
      setHistoryLoading(false)
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

  const loadAutonomousMissions = useCallback(async (isManualRefresh = false) => {
    setMissionsLoading(true)
    try {
      const res = await getAutonomousMissionsHistory({ take: 100, reload: isManualRefresh })
      if (res && Array.isArray(res.items)) {
        setAllMissions(res.items)
        if (res.kpis) setMissionKpis(res.kpis)
      }
    } catch (e) {
      console.warn('Lỗi tải lịch sử di chuyển tự hành từ backend:', e)
      setAllMissions(prev => (prev.length > 0 ? prev : INITIAL_MISSIONS))
    } finally {
      setMissionsLoading(false)
    }
  }, [])

  // Chuyển tab -> tải dữ liệu tương ứng
  useEffect(() => {
    loadShelvesAndRoutes()
    checkReadiness()
    loadAutonomousMissions()
  }, [loadShelvesAndRoutes, checkReadiness, loadAutonomousMissions])

  useEffect(() => {
    if (activeTab === 'missions') loadAutonomousMissions()
    else if (activeTab === 'history') loadScanHistory()
    else if (activeTab === 'restock') {
      loadRestockHistory()
      loadDensities()
    }
  }, [activeTab, loadAutonomousMissions, loadScanHistory, loadRestockHistory, loadDensities])

  const guideCount = useMemo(() => allMissions.filter(m => (m.flowType || '').toLowerCase() === 'guide').length, [allMissions])
  const adCount = useMemo(() => allMissions.filter(m => (m.flowType || '').toLowerCase() === 'ad').length, [allMissions])
  const patrolCount = useMemo(() => allMissions.filter(m => (m.flowType || '').toLowerCase() === 'patrol').length, [allMissions])
  const totalMissionsCount = allMissions.length

  const displayKpis = useMemo(() => ({
    totalMissions: missionKpis.totalMissions || totalMissionsCount,
    guideCount: missionKpis.guideCount || guideCount,
    adCount: missionKpis.adCount || adCount,
    patrolCount: missionKpis.patrolCount || patrolCount,
    activeCount: missionKpis.activeCount || allMissions.filter(m => ['DISPATCHED', 'NAVIGATING', 'ARRIVED'].includes((m.status || '').toUpperCase())).length
  }), [missionKpis, totalMissionsCount, guideCount, adCount, patrolCount, allMissions])

  const filteredMissions = useMemo(() => {
    return allMissions.filter(m => {
      // 1. Flow Filter
      if (missionFilterFlow !== 'all') {
        if ((m.flowType || '').toLowerCase() !== missionFilterFlow.toLowerCase()) return false
      }
      // 2. Source Filter
      if (missionFilterSource !== 'all') {
        if ((m.source || '').toLowerCase() !== missionFilterSource.toLowerCase()) return false
      }
      // 3. Status Filter
      if (missionFilterStatus !== 'all') {
        if ((m.status || '').toUpperCase() !== missionFilterStatus.toUpperCase()) return false
      }
      // 4. Search Filter
      if (missionSearchQuery.trim()) {
        const q = missionSearchQuery.toLowerCase()
        const match =
          (m.missionId && m.missionId.toLowerCase().includes(q)) ||
          (m.dispatchedBy && m.dispatchedBy.toLowerCase().includes(q)) ||
          (m.targetSummary && m.targetSummary.toLowerCase().includes(q)) ||
          (m.robotCode && m.robotCode.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [allMissions, missionFilterFlow, missionFilterSource, missionFilterStatus, missionSearchQuery])

  const renderSourceBadge = (source, dispatchedBy) => {
    if (source === 'AdminWeb') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          <Icon name="shield_person" className="text-xs" />
          Admin Portal
        </span>
      )
    }
    if (source === 'StaffMobile') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
          <Icon name="engineering" className="text-xs" />
          Nhân Viên Staff
        </span>
      )
    }
    if (source === 'SystemSchedule') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
          <Icon name="schedule" className="text-xs" />
          Lịch Tự Động
        </span>
      )
    }
    if (source === 'RobotSystem') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
          <Icon name="smart_toy" className="text-xs" />
          Robot Tự Hành
        </span>
      )
    }
    const isVip = dispatchedBy && (dispatchedBy.includes('VIP') || dispatchedBy.includes('Member'));
    if (isVip) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
          <Icon name="stars" className="text-xs text-amber-500" />
          Thành Viên VIP
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
        <Icon name="shopping_cart" className="text-xs" />
        Khách Mua Sắm
      </span>
    )
  }


  const renderFlowBadge = (flowType) => {
    const f = (flowType || '').toLowerCase()
    if (f === 'guide') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
          <Icon name="near_me" className="text-xs" />
          Dẫn Đường
        </span>
      )
    }
    if (f === 'ad') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
          <Icon name="campaign" className="text-xs" />
          Quảng Cáo
        </span>
      )
    }
    if (f === 'patrol') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
          <Icon name="security" className="text-xs" />
          Tuần Tra AI
        </span>
      )
    }
    if (f === 'return') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          <Icon name="home" className="text-xs" />
          Trở Về Trạm
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-gray-500/10 text-gray-600">
        {flowType}
      </span>
    )
  }


  const renderStatusBadge = (status) => {
    const s = (status || '').toUpperCase()
    if (s === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <Icon name="check_circle" className="text-xs text-emerald-500" />
          Hoàn Thành
        </span>
      )
    }
    if (s === 'NAVIGATING' || s === 'DISPATCHED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 animate-pulse">
          <Icon name="sync" className="text-xs animate-spin text-blue-500" />
          Đang Chạy
        </span>
      )
    }
    if (s === 'ARRIVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
          <Icon name="pin_drop" className="text-xs text-teal-500" />
          Đã Đến Đích
        </span>
      )
    }
    if (s === 'CANCELLED' || s === 'STOPPED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-500/15 text-gray-700 dark:text-gray-400 border border-gray-500/30">
          <Icon name="cancel" className="text-xs" />
          Đã Dừng/Hủy
        </span>
      )
    }
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <Icon name="error" className="text-xs text-rose-500" />
          Thất Bại
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600">
        {status}
      </span>
    )
  }

  // ─── Format Timestamp sang giờ VN (UTC+7) ───
  const formatDateTimeVN = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const str = String(dateStr).trim().replace(' ', 'T')
      const hasTz = /[Zz]$|[+\-]\d{2}:?\d{2}$/.test(str)
      // Nếu không có hậu tố timezone, Backend đã lưu sẵn theo giờ VN (VnDateTime) -> gắn +07:00
      const d = new Date(hasTz ? str : `${str}+07:00`)
      if (Number.isNaN(d.getTime())) return dateStr
      return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
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
      loadRestockHistory()
      loadScanHistory()
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
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Di Chuyển Tự Hành" />

      <div className="pl-[264px]">
        <Navbar
          title="Quản Lý Robot Di Chuyển Tự Hành"
          subtitle="Hệ thống giám sát, điều phối và truy vết lịch sử toàn bộ hoạt động di chuyển tự hành: Dẫn đường, Quảng cáo, Tuần tra"
        />

        <main className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* ── Header ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-smb-outline-variant/60 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                <Icon name="alt_route" className="text-sm" />
                <span>Hệ Thống Giám Sát & Điều Phối Đội Robot Tự Hành</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-smb-on-surface flex items-center gap-2.5">
                Quản Lý Robot Di Chuyển Tự Hành
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
                  AMR Autonomous Fleet
                </span>
              </h1>
              <p className="text-xs text-smb-on-surface-variant max-w-2xl">
                Theo dõi và truy vết minh bạch lịch sử mọi lượt tương tác robot di chuyển tự hành: Dẫn đường mua sắm, phát quảng cáo và tuần tra quét AI kệ hàng từ đa nguồn (Admin, Khách vãng lai, Thành viên VIP, Staff, Hệ thống).
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

          {/* ── KPI Summary Cards Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Tổng lượt di chuyển */}
            <div className="rounded-2xl border border-smb-outline-variant/70 bg-smb-surface-container-lowest p-4 shadow-xs hover:border-teal-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-smb-on-surface-variant uppercase tracking-wider">Tổng Phiên Tự Hành</span>
                <span className="size-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                  <Icon name="alt_route" className="text-lg" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-smb-on-surface font-mono">{displayKpis.totalMissions}</div>
              <div className="mt-1 text-[11px] text-teal-600 font-semibold flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-teal-500" />
                Đa nguồn tương tác
              </div>
            </div>

            {/* Card 2: Dẫn đường mua sắm */}
            <div className="rounded-2xl border border-smb-outline-variant/70 bg-smb-surface-container-lowest p-4 shadow-xs hover:border-emerald-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-smb-on-surface-variant uppercase tracking-wider">Dẫn Đường Mua Sắm</span>
                <span className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Icon name="near_me" className="text-lg" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600 font-mono">{displayKpis.guideCount}</div>
              <div className="mt-1 text-[11px] text-smb-on-surface-variant font-medium">Khách & Thành viên VIP</div>
            </div>

            {/* Card 3: Phát quảng cáo */}
            <div className="rounded-2xl border border-smb-outline-variant/70 bg-smb-surface-container-lowest p-4 shadow-xs hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-smb-on-surface-variant uppercase tracking-wider">Phát Quảng Cáo</span>
                <span className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Icon name="campaign" className="text-lg" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600 font-mono">{displayKpis.adCount}</div>
              <div className="mt-1 text-[11px] text-smb-on-surface-variant font-medium">Admin & Theo kệ & Kiosk</div>
            </div>

            {/* Card 4: Tuần tra quét AI */}
            <div className="rounded-2xl border border-smb-outline-variant/70 bg-smb-surface-container-lowest p-4 shadow-xs hover:border-sky-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-smb-on-surface-variant uppercase tracking-wider">Tuần Tra Quét AI</span>
                <span className="size-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Icon name="security" className="text-lg" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-sky-600 font-mono">{displayKpis.patrolCount}</div>
              <div className="mt-1 text-[11px] text-smb-on-surface-variant font-medium">Staff App & Admin & Cron</div>
            </div>

            {/* Card 5: Robot AMR Trực Tuyến */}
            <div className="rounded-2xl border border-smb-outline-variant/70 bg-smb-surface-container-lowest p-4 shadow-xs hover:border-purple-500/50 transition-all col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-smb-on-surface-variant uppercase tracking-wider">Đội Robot AMR</span>
                <span className="size-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Icon name="smart_toy" className="text-lg" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-smb-on-surface font-mono">{targetRobot?.robotCode || 'RB0001'}</span>
                <span className={`inline-block size-2 rounded-full ${targetRobot?.isOnline !== false ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              </div>
              <div className="mt-1 text-[11px] text-smb-on-surface-variant font-medium">
                {displayKpis.activeCount > 0 ? `${displayKpis.activeCount} phiên đang chạy` : 'Sẵn sàng nhận lệnh'}
              </div>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div className="flex flex-wrap items-center gap-2 border-b border-smb-outline-variant/60 pb-3">
            {[
              { id: 'missions', label: 'Lịch Sử Di Chuyển Tự Hành', icon: 'alt_route', badge: displayKpis.totalMissions },
              { id: 'history', label: 'Lịch Sử Quét Kệ & Ảnh AI', icon: 'photo_camera' },
              { id: 'restock', label: 'Lịch Sử Châm Hàng', icon: 'history' },
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
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-smb-surface-container-high text-smb-on-surface-variant'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB 1: LỊCH SỬ DI CHUYỂN TỰ HÀNH (ALL FLOWS & ALL SOURCES)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'missions' && (
            <div className="rounded-2xl border border-smb-outline-variant/80 bg-smb-surface-container-lowest p-5 space-y-4 shadow-sm">
              {/* Controls & Multi-Source Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-smb-outline-variant/50 pb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Flow Type Chips */}
                  <div className="flex items-center gap-1 bg-smb-surface-container-high/60 p-1 rounded-xl border border-smb-outline-variant/60">
                    {[
                      { id: 'all', label: 'Tất cả hoạt động', count: displayKpis.totalMissions, icon: 'apps' },
                      { id: 'guide', label: 'Dẫn đường', count: displayKpis.guideCount, icon: 'near_me' },
                      { id: 'ad', label: 'Quảng cáo', count: displayKpis.adCount, icon: 'campaign' },
                      { id: 'patrol', label: 'Tuần tra AI', count: displayKpis.patrolCount, icon: 'security' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setMissionFilterFlow(f.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          missionFilterFlow === f.id
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-smb-on-surface-variant hover:text-smb-on-surface hover:bg-smb-surface-container'
                        }`}
                      >
                        <Icon name={f.icon} className="text-xs" />
                        <span>{f.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                          missionFilterFlow === f.id ? 'bg-white/20 text-white' : 'bg-smb-surface-container-highest text-smb-on-surface-variant'
                        }`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Lọc Nguồn Ra Lệnh */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-smb-on-surface-variant font-semibold">Nguồn ra lệnh:</span>
                    <select
                      value={missionFilterSource}
                      onChange={(e) => setMissionFilterSource(e.target.value)}
                      className="rounded-lg bg-smb-surface-container-high border border-smb-outline-variant px-2.5 py-1.5 text-xs text-smb-on-surface font-semibold outline-none"
                    >
                      <option value="all">Tất cả các nguồn</option>
                      <option value="RobotKiosk">Robot Kiosk (Khách / Thành viên)</option>
                      <option value="AdminWeb">Admin Portal (Web Admin)</option>
                      <option value="StaffMobile">Nhân viên (Staff Mobile)</option>
                      <option value="SystemSchedule">Hệ thống tự động (Cron)</option>
                    </select>
                  </div>

                  {/* Lọc Trạng Thái */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-smb-on-surface-variant font-semibold">Trạng thái:</span>
                    <select
                      value={missionFilterStatus}
                      onChange={(e) => setMissionFilterStatus(e.target.value)}
                      className="rounded-lg bg-smb-surface-container-high border border-smb-outline-variant px-2.5 py-1.5 text-xs text-smb-on-surface font-semibold outline-none"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="COMPLETED">Đã hoàn thành</option>
                      <option value="NAVIGATING">Đang thực hiện</option>
                      <option value="CANCELLED">Đã dừng/hủy</option>
                      <option value="FAILED">Thất bại</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search box */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm mã phiên, người thực hiện, kệ..."
                      value={missionSearchQuery}
                      onChange={(e) => setMissionSearchQuery(e.target.value)}
                      className="w-56 md:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-smb-surface-container-high border border-smb-outline-variant text-xs text-smb-on-surface placeholder:text-smb-on-surface-variant outline-none"
                    />
                    <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-smb-on-surface-variant" />
                    {missionSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMissionSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-smb-on-surface-variant hover:text-smb-on-surface"
                      >
                        <Icon name="close" className="text-xs" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => loadAutonomousMissions(true)}
                    disabled={missionsLoading}
                    className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20 transition-all"
                  >
                    <Icon name="refresh" className={`text-base ${missionsLoading ? 'animate-spin' : ''}`} />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-smb-on-surface">
                  <thead className="bg-smb-surface-container-high/60 text-[11px] font-bold uppercase tracking-wider text-smb-on-surface-variant border-b border-smb-outline-variant/60">
                    <tr>
                      <th className="px-4 py-3">Thời Gian & Mã Phiên</th>
                      <th className="px-4 py-3">Loại Hoạt Động</th>
                      <th className="px-4 py-3">Nguồn & Người Tương Tác</th>
                      <th className="px-4 py-3">Mục Tiêu & Đích Đến</th>
                      <th className="px-4 py-3">Lộ Trình & Dwell</th>
                      <th className="px-4 py-3">Trạng Thái</th>
                      <th className="px-4 py-3 text-center">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-smb-outline-variant/40">
                    {missionsLoading && allMissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-smb-on-surface-variant">
                          <div className="flex flex-col items-center gap-2">
                            <Icon name="sync" className="animate-spin text-2xl text-teal-600" />
                            <span>Đang tải lịch sử di chuyển tự hành...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredMissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-smb-on-surface-variant">
                          <div className="flex flex-col items-center gap-2">
                            <Icon name="alt_route" className="text-3xl text-smb-outline" />
                            <span className="font-semibold">Chưa tìm thấy phiên di chuyển tự hành nào phù hợp</span>
                            <span className="text-[11px] text-smb-on-surface-variant">
                              Hãy thử thay đổi bộ lọc hoặc phát lệnh mới từ Robot Kiosk / Web Admin.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMissions.map((m) => (
                        <tr key={m.missionId} className="hover:bg-smb-surface-container-high/40 transition-colors">
                          {/* Thời Gian & Mã Phiên */}
                          <td className="px-4 py-3 font-mono">
                            <div className="font-semibold text-smb-on-surface">{formatDateTimeVN(m.startedAtUtc)}</div>
                            <div className="text-[10px] text-smb-on-surface-variant flex items-center gap-1 mt-0.5">
                              <span className="font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded font-mono">
                                {m.robotCode}
                              </span>
                              <span className="truncate max-w-[110px]" title={m.missionId}>#{m.missionId}</span>
                            </div>
                          </td>

                          {/* Loại Hoạt Động */}
                          <td className="px-4 py-3">
                            {renderFlowBadge(m.flowType)}
                          </td>

                          {/* Nguồn & Người Tương Tác */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {renderSourceBadge(m.source, m.dispatchedBy)}
                              <div className="font-bold text-xs text-smb-on-surface flex items-center gap-1">
                                <span className="truncate max-w-[180px]" title={m.dispatchedBy}>{m.dispatchedBy}</span>
                              </div>
                            </div>
                          </td>

                          {/* Mục Tiêu & Đích Đến */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-smb-on-surface text-xs leading-relaxed">
                              {m.targetSummary || 'Nhiệm vụ tự hành'}
                            </div>
                          </td>

                          {/* Lộ Trình & Dwell */}
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-smb-on-surface">
                              {m.waypointCount} mốc dừng
                            </div>
                            <div className="text-[11px] text-smb-on-surface-variant mt-0.5">
                              Dwell: {m.dwellTimeSeconds || 30}s / mốc
                            </div>
                          </td>

                          {/* Trạng Thái */}
                          <td className="px-4 py-3">
                            {renderStatusBadge(m.status)}
                          </td>

                          {/* Chi Tiết CTA */}
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedMissionDetail(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 transition-all"
                              title="Xem chi tiết lộ trình"
                            >
                              <Icon name="visibility" className="text-sm" />
                              <span>Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-smb-outline-variant/40 text-xs text-smb-on-surface-variant">
                <div>
                  Hiển thị <span className="font-bold text-smb-on-surface">{filteredMissions.length}</span> / {allMissions.length} phiên di chuyển tự hành
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> Dẫn đường: {displayKpis.guideCount}</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" /> Quảng cáo: {displayKpis.adCount}</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-sky-500" /> Tuần tra: {displayKpis.patrolCount}</span>
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
                  {(shelves.length > 0 ? shelves : Object.entries(DEFAULT_SHELF_META).map(([id, m]) => ({ shelfId: Number(id), shelfName: m.name }))).map(s => {
                    const meta = DEFAULT_SHELF_META[s.shelfId] || {}
                    return (
                      <option key={s.shelfId} value={s.shelfId}>
                        {s.shelfName || meta.name || `Kệ #${s.shelfId}`}
                      </option>
                    )
                  })}
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
                  <th className="px-4 py-3">Kệ Hàng & Danh Mục</th>
                  <th className="px-4 py-3">Vị Trí & Điểm Dừng</th>
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
                    const shelfId = scan.shelfLevelId || scan.shelfId || 1
                    const matchedShelf = shelves.find(s => s.shelfId === shelfId)
                    const meta = DEFAULT_SHELF_META[shelfId] || {}

                    const displayShelfName = scan.shelfName || matchedShelf?.shelfName || meta.name || `Kệ #${shelfId}`
                    const displayAisle = scan.aisleName || matchedShelf?.aisleName || meta.aisle || `Dãy A0${scan.aisleId || 1}`
                    const effectiveNodeId = scan.aisleNodeId || matchedShelf?.nodeId || meta.node

                    return (
                      <tr key={scan.scanId} className="hover:bg-smb-surface-container/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                          {formatDateTimeVN(scan.scannedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-bold text-smb-on-surface text-xs flex items-center gap-1.5">
                              <span className="text-sm">🏷️</span>
                              <span>{displayShelfName}</span>
                            </div>
                            <div>
                              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-mono">
                                Tag ArUco #{shelfId}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                              <Icon name="storefront" className="text-xs text-emerald-600" />
                              <span>{displayAisle}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                              <Icon name="pin_drop" className="text-[11px] text-slate-400" />
                              <span>Điểm dừng Node #{effectiveNodeId || '—'}</span>
                            </div>
                          </div>
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
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isRestock
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                : scan.analysisStatus === 'RestockedByStaff'
                                ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}>
                              <span className={`size-1.5 rounded-full ${
                                isRestock ? 'bg-rose-500' : scan.analysisStatus === 'RestockedByStaff' ? 'bg-indigo-500' : 'bg-emerald-500'
                              }`} />
                              {isRestock ? 'Cần Châm Hàng' : scan.analysisStatus === 'RestockedByStaff' ? 'Staff Đã Châm Hàng' : 'Đủ Hàng'}
                            </span>
                            {scan.analysisStatus === 'RestockedByStaff' && (
                              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium">👤 Bởi Nhân viên</span>
                            )}
                          </div>
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
          TAB 3: LỊCH SỬ CHÂM HÀNG (ADMIN VIEW — history + density sub-tabs)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'restock' && (
        <div className="rounded-2xl border border-smb-outline-variant/80 bg-smb-surface-container-lowest p-5 space-y-4 shadow-sm">
          {/* Header + Sub-tab Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-smb-outline-variant/50 pb-4">
            <div>
              <h2 className="text-sm font-bold text-smb-on-surface">
                {restockSubTab === 'history' ? 'Nhật Ký Châm Hàng Của Nhân Viên' : 'Tình Trạng & Mật Độ 6 Kệ Hàng'}
              </h2>
              <p className="text-[11px] text-smb-on-surface-variant">
                {restockSubTab === 'history'
                  ? 'Ghi nhận chi tiết thời gian, vị trí kệ, sản phẩm và kết quả châm hàng của nhân viên'
                  : 'Được tổng hợp từ các lần quét camera AI của Robot (Tag ArUco #1 đến #6)'}
              </p>
            </div>

            {/* Sub-tab Pill Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-smb-surface-container/40 rounded-xl border border-smb-outline-variant/60">
              <button
                type="button"
                onClick={() => setRestockSubTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  restockSubTab === 'history'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-smb-on-surface-variant hover:text-smb-on-surface hover:bg-smb-surface-container'
                }`}
              >
                <Icon name="receipt_long" className="text-sm" />
                <span>Nhật Ký Châm Hàng</span>
                {restockHistory.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    restockSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {restockHistory.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRestockSubTab('density')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  restockSubTab === 'density'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-smb-on-surface-variant hover:text-smb-on-surface hover:bg-smb-surface-container'
                }`}
              >
                <Icon name="stacked_bar_chart" className="text-sm" />
                <span>Mật Độ Kệ Hàng</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (restockSubTab === 'history') loadRestockHistory()
                  else loadDensities()
                }}
                disabled={loading || historyLoading}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20 transition-all"
              >
                <Icon name="refresh" className={`text-base ${(loading || historyLoading) ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>
          </div>

          {/* Sub-tab: Nhật Ký Châm Hàng */}
          {restockSubTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-smb-on-surface">
                <thead className="bg-smb-surface-container-high/60 text-[11px] font-bold uppercase tracking-wider text-smb-on-surface-variant border-b border-smb-outline-variant/60">
                  <tr>
                    <th className="px-4 py-3">Thời Gian Bổ Sung</th>
                    <th className="px-4 py-3">Kệ Hàng & Dãy</th>
                    <th className="px-4 py-3">Vị Trí & Ô Slot</th>
                    <th className="px-4 py-3">Sản Phẩm Đã Châm</th>
                    <th className="px-4 py-3">Mật Độ Sau Châm</th>
                    <th className="px-4 py-3">Người Thực Hiện</th>
                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-smb-outline-variant/40">
                  {restockHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-smb-on-surface-variant">
                        <Icon name="history_toggle_off" className="text-3xl text-gray-400 mb-1" />
                        <div>Chưa có lịch sử châm hàng nào được ghi nhận.</div>
                      </td>
                    </tr>
                  ) : (
                    restockHistory.map((item) => {
                      const shelfId = item.shelfId || 1
                      const meta = DEFAULT_SHELF_META[shelfId] || {}
                      const displayShelfName = item.shelfName || meta.name || `Kệ #${shelfId}`
                      const displayAisle = item.aisleName || meta.aisle || `Dãy A0${item.aisleId || 1}`
                      return (
                        <tr key={item.scanId || `${item.shelfId}-${item.restockedAt}`} className="hover:bg-smb-surface-container/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium whitespace-nowrap text-emerald-700 dark:text-emerald-400">
                            {formatDateTimeVN(item.restockedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="font-bold text-smb-on-surface text-xs flex items-center gap-1.5">
                                <span className="text-sm">🏷️</span>
                                <span>{displayShelfName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-mono">
                                  Tag ArUco #{shelfId}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                                <Icon name="storefront" className="text-xs text-emerald-600" />
                                <span>{displayAisle}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <Icon name="grid_view" className="text-[11px] text-slate-400" />
                                <span>Ô Slot: {item.slotCode || 'Tất cả các ô'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-smb-on-surface">
                              {item.productName || 'Toàn bộ sản phẩm trên kệ'}
                            </div>
                            <div className="text-[10px] text-smb-on-surface-variant">
                              {item.notes || 'Bổ sung đầy đủ 100% hàng hóa'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-emerald-600">
                                {item.densityPercentage ?? 100}%
                              </span>
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500 w-full" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 font-medium text-[11px]">
                              <Icon name="person" className="text-xs text-indigo-500" />
                              {item.performedBy || 'Nhân viên siêu thị (Staff)'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Đã Hoàn Tất
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab: Mật Độ Kệ Hàng */}
          {restockSubTab === 'density' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {densities.length === 0 ? (
                <div className="col-span-full py-12 text-center text-smb-on-surface-variant space-y-2">
                  <Icon name="stacked_bar_chart" className="text-4xl text-gray-400" />
                  <div className="text-sm font-bold text-smb-on-surface">Chưa có dữ liệu mật độ kệ hàng</div>
                  <p className="text-xs">Hãy cho Robot tuần tra để cập nhật dữ liệu mới nhất.</p>
                </div>
              ) : densities.map((shelf, idx) => {
                const scanTime = shelf.scannedAt || shelf.lastScannedAt
                const hasScanned = !!(scanTime || shelf.latestScanId)
                const occRate = hasScanned
                  ? Math.round(Number(shelf.densityPercentage ?? shelf.occupancyRatePct ?? 100))
                  : null
                const emptyRate = hasScanned
                  ? Math.round(Number(shelf.emptyPercentage ?? (100 - (occRate ?? 0))))
                  : null
                const isSufficient = hasScanned ? (shelf.needsRestock === false || (!shelf.needsRestock && (occRate ?? 0) >= 70)) : true
                const displayAisle = shelf.aisleName || (shelf.aisleId ? `Lối đi ${shelf.aisleId}` : 'Khu Tiêu Chuẩn')

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
                            {shelf.zoneName || 'Khu Vực Tiêu Chuẩn'} • {displayAisle}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        !hasScanned
                          ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                          : isSufficient
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-rose-500/15 text-rose-600'
                      }`}>
                        {!hasScanned ? 'Chưa Quét' : isSufficient ? 'Đủ Hàng' : 'Thiếu Hàng'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-smb-on-surface-variant text-[11px]">Mật độ lấp đầy:</span>
                        <span className="font-bold text-smb-on-surface">
                          {hasScanned ? `${occRate}%` : 'Chưa có dữ liệu'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            !hasScanned
                              ? 'bg-slate-300 dark:bg-slate-600'
                              : (occRate ?? 0) >= 70
                              ? 'bg-emerald-500'
                              : (occRate ?? 0) >= 40
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${hasScanned ? (occRate ?? 0) : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-smb-surface-container-lowest p-2.5 rounded-xl border border-smb-outline-variant/40">
                      <div>
                        <div className="text-smb-on-surface-variant text-[10px]">Tỷ Lệ Trống</div>
                        <div className="font-bold text-rose-600 dark:text-rose-400">
                          {hasScanned ? `${emptyRate}%` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-smb-on-surface-variant text-[10px]">Lần Quét Gần Nhất</div>
                        <div className="font-bold text-smb-on-surface text-[10px] leading-tight">
                          {hasScanned ? formatDateTimeVN(scanTime) : 'Chưa quét'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

        </main>
      </div>

      {/* ── Modal Phóng To Ảnh Chụp Cloudinary ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between text-slate-800 border-b border-slate-200 pb-2">
              <span className="text-xs font-bold font-mono flex items-center gap-2">
                <Icon name="photo_camera" className="text-emerald-600 text-sm" />
                Ảnh Chụp Thực Tế Từ Camera Robot (Cloudinary)
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-700"
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

      {/* ── Modal Chi Tiết Phiên Di Chuyển Tự Hành ── */}
      {selectedMissionDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-smb-surface-container-lowest rounded-2xl border border-smb-outline-variant max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-smb-outline-variant/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="size-9 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-bold">
                  <Icon name="alt_route" className="text-xl" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-smb-on-surface flex items-center gap-2">
                    Chi Tiết Phiên Di Chuyển
                    <span className="text-xs font-mono font-normal text-smb-on-surface-variant">
                      #{selectedMissionDetail.missionId}
                    </span>
                  </h3>
                  <div className="text-[11px] text-smb-on-surface-variant">
                    Robot {selectedMissionDetail.robotCode} • Khởi hành lúc {formatDateTimeVN(selectedMissionDetail.startedAtUtc)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMissionDetail(null)}
                className="size-8 rounded-lg flex items-center justify-center text-smb-on-surface-variant hover:bg-smb-surface-container-high transition-colors"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-smb-surface-container-high/40 p-3.5 rounded-xl border border-smb-outline-variant/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-smb-on-surface-variant block">Loại Hoạt Động</span>
                <div className="mt-1">{renderFlowBadge(selectedMissionDetail.flowType)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-smb-on-surface-variant block">Nguồn Ra Lệnh</span>
                <div className="mt-1">{renderSourceBadge(selectedMissionDetail.source, selectedMissionDetail.dispatchedBy)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-smb-on-surface-variant block">Người Thực Hiện</span>
                <div className="mt-1 font-bold text-smb-on-surface truncate" title={selectedMissionDetail.dispatchedBy}>
                  {selectedMissionDetail.dispatchedBy}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-smb-on-surface-variant block">Trạng Thái</span>
                <div className="mt-1">{renderStatusBadge(selectedMissionDetail.status)}</div>
              </div>
            </div>

            {/* Target Summary Box */}
            <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 block">
                Mục Tiêu & Nội Dung Di Chuyển
              </span>
              <p className="text-xs font-semibold text-smb-on-surface">
                {selectedMissionDetail.targetSummary}
              </p>
            </div>

            {/* Waypoints Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-smb-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                <Icon name="timeline" className="text-base text-teal-600" />
                Lộ Trình Các Điểm Dừng ({selectedMissionDetail.waypointCount} mốc)
              </h4>

              {(!selectedMissionDetail.waypoints || selectedMissionDetail.waypoints.length === 0) ? (
                <div className="text-xs text-smb-on-surface-variant italic p-4 text-center bg-smb-surface-container-high/30 rounded-xl">
                  (Thông tin mốc waypoint đã hoàn tất lưu trữ)
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedMissionDetail.waypoints.map((wp, idx) => (
                    <div
                      key={wp.nodeId || idx}
                      className="flex items-start gap-3 p-2.5 rounded-xl bg-smb-surface-container-high/40 border border-smb-outline-variant/60 text-xs"
                    >
                      <span className="size-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-smb-on-surface">
                            {wp.nodeName || `Mốc #${wp.nodeId}`}
                          </span>
                          <span className="text-[10px] font-mono text-smb-on-surface-variant">
                            X: {wp.xCoord?.toFixed(1) ?? '—'}, Y: {wp.yCoord?.toFixed(1) ?? '—'}
                          </span>
                        </div>
                        <div className="text-[11px] text-smb-on-surface-variant flex flex-wrap gap-2">
                          {wp.shelfName && <span>🏢 {wp.shelfName}</span>}
                          {wp.zoneName && <span>📍 {wp.zoneName}</span>}
                          <span>⏱️ Dừng: {wp.effectiveDwellTimeSeconds || wp.dwellTimeSeconds || 30}s</span>
                        </div>
                        {wp.productNames && wp.productNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {wp.productNames.map((p, pIdx) => (
                              <span key={pIdx} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                                🛒 {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-smb-outline-variant/60">
              <button
                type="button"
                onClick={() => setSelectedMissionDetail(null)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
