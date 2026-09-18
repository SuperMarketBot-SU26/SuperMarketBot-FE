import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'

/**
 * THÔNG SỐ KHÔNG GIAN BẢN ĐỒ SIÊU THỊ 3m x 3m
 * Tỷ lệ: SCALE = 1000 (ViewBox: 0 0 3000 3000)
 * Gốc (0, 0) ở góc Trên - Trái (Top-Left)
 */
export const ARENA_CONFIG = {
  widthM: 3.0,
  heightM: 3.0,
  scale: 1000,
  viewBox: '0 0 3000 3000',
}

/**
 * Tách tên kệ hàng thành 2 dòng ngang gọn gàng cho kệ dọc
 */
export function getShelfNameLines(name) {
  if (!name) return ['']
  if (name.includes(' & ')) {
    const parts = name.split(' & ')
    return [parts[0], `& ${parts[1]}`]
  }
  const words = name.split(' ')
  if (words.length > 2) {
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }
  return [name]
}

// 6 Kệ hàng chính thức theo đặc tả kỹ thuật và dữ liệu thực tế từ Database
export const OFFICIAL_SHELVES = [
  {
    id: 1,
    tag: '#1',
    aisle: 'A01',
    name: 'Đồ Ăn Vặt & Snack',
    icon: '🍪',
    type: 'vertical',
    x: 80,
    y: 850,
    w: 380,
    h: 850,
    color: '#0284c7', // Sky Blue A01
    approachPoint: { x: 850, y: 1275 },
    products: [
      "Snack Khoai Tây O'Star Vị Tảo Biển",
      'Snack Swing Bò Bít Tết New York',
      "Snack O'Star Phô Mai Trứng Muối",
      "Snack Khoai Tây O'Star Tảo Đậm",
    ],
    description: 'Dãy A01 · Kệ dọc bên trái phía trên quầy thu ngân',
  },
  {
    id: 2,
    tag: '#2',
    aisle: 'A01',
    name: 'Nước Giải Khát & Đồ Uống',
    icon: '🥤',
    type: 'horizontal',
    x: 450,
    y: 80,
    w: 850,
    h: 380,
    color: '#0284c7', // Sky Blue A01
    approachPoint: { x: 875, y: 780 },
    products: [
      'Bia Heineken Silver Lon 330ml',
      'Nước Tinh Khiết Number 1 Chai 500ml',
      'Bia Nobilis Lon 250ml',
      'Lốc 50 Ly Nhựa Tiện Lợi',
    ],
    description: 'Dãy A01 · Kệ ngang phía trên bên trái',
  },
  {
    id: 3,
    tag: '#3',
    aisle: 'B01',
    name: 'Thực Phẩm Tươi Sống',
    icon: '🥩',
    type: 'horizontal',
    x: 1700,
    y: 80,
    w: 850,
    h: 380,
    color: '#059669', // Emerald Green B01
    approachPoint: { x: 2125, y: 780 },
    products: [
      'Phi Lê Cá Hồi Na Uy Tươi Sống',
      'Thịt Bò Tươi Sạch Fillet 500g',
      'Thịt Ba Chỉ Heo Tươi Sạch 500g',
      'Dưa Leo Baby Giòn Ngọt 500g',
    ],
    description: 'Dãy B01 · Kệ ngang phía trên bên phải',
  },
  {
    id: 4,
    tag: '#4',
    aisle: 'B01',
    name: 'Mì Ăn Liền & Đóng Gói',
    icon: '🍜',
    type: 'vertical',
    x: 2540,
    y: 850,
    w: 380,
    h: 850,
    color: '#059669', // Emerald Green B01
    approachPoint: { x: 2140, y: 1275 },
    products: [
      'Mì Koreno Jumbo Vị Bò Cay 1kg',
      'Mì Ly Life Cup Sườn Cay 65g',
      'Cháo Thịt Bằm Gấu Đỏ Gói 50g',
      'Mì Ý Spaghetti Barilla 500g',
    ],
    description: 'Dãy B01 · Kệ dọc bên phải giáp tường',
  },
  {
    id: 5,
    tag: '#5',
    aisle: 'C01',
    name: 'Đồ Gia Dụng & Tiện Ích',
    icon: '🧴',
    type: 'vertical',
    x: 2470,
    y: 1900,
    w: 450,
    h: 950,
    color: '#d97706', // Warm Amber C01
    approachPoint: { x: 2050, y: 2375 },
    products: [
      'Khăn Ướt Dịu Nhẹ Hình Gấu 80 Tờ',
      'Khăn Ướt Em Bé Bumbo Gói 100 Tờ',
      'Màng Bọc Thực Phẩm PE 400m',
      'Thố Inox Giữ Nhiệt Có Nắp Đậy',
    ],
    description: 'Dãy C01 · Kệ dọc lớn góc dưới bên phải',
  },
  {
    id: 6,
    tag: '#6',
    aisle: 'C01',
    name: 'Gia Vị & Trà',
    icon: '🧂',
    type: 'vertical',
    x: 1350,
    y: 1950,
    w: 380,
    h: 950,
    color: '#d97706', // Warm Amber C01
    approachPoint: { x: 950, y: 2425 },
    products: [
      'Trà Hương Lài Ngọc An Gói 300g',
      'Trà Thảo Mộc Thiên Thảo Dưỡng Nhan',
      'Bột Nêm Gà Cao Cấp Hũ Vàng 250g',
      'Nước Tương Chin-su Tỏi Ớt 330ml',
    ],
    description: 'Dãy C01 · Kệ dọc trung tâm lối vào siêu thị',
  },
]

// Khu vực chức năng
export const FUNCTIONAL_AREAS = {
  cashier: {
    id: 'cashier',
    name: 'Quầy Thu Ngân (POS)',
    icon: '💳',
    x: 80,
    y: 2300,
    w: 600,
    h: 580,
    color: '#475569',
  },
  dock: {
    id: 'dock',
    name: 'Trạm Sạc Robot (Dock)',
    icon: '⚡',
    cx: 270,
    cy: 2090,
    r: 90,
    approachPoint: { x: 270, y: 2090 },
  },
  entrance: {
    id: 'entrance',
    name: 'Cửa Vào Siêu Thị',
    x: 800,
    y: 2940,
    w: 450,
    h: 60,
    label: 'CỬA VÀO ➔',
    color: '#10b981',
  },
}

/**
 * Phân giải tọa độ Waypoint trên bản đồ 3m x 3m SVG
 */
export function resolveWaypointSvgPos(wp, index = 0) {
  if (!wp) return { x: 1500, y: 1500 }

  // 1. Phân giải qua shelfId
  const shelfId = wp.shelfId ?? wp.ShelfId
  if (typeof shelfId === 'number' && shelfId >= 1 && shelfId <= 6) {
    const shelf = OFFICIAL_SHELVES.find((s) => s.id === shelfId)
    if (shelf) {
      // Thêm độ lệch nhẹ nếu có nhiều mốc trùng kệ
      const offsetX = ((index * 23) % 40) - 20
      const offsetY = ((index * 17) % 40) - 20
      return { x: shelf.approachPoint.x + offsetX, y: shelf.approachPoint.y + offsetY }
    }
  }

  // 2. Phân giải qua tên kệ
  const shelfName = String(wp.shelfName || wp.nodeName || '').toLowerCase()
  for (const s of OFFICIAL_SHELVES) {
    if (shelfName.includes(`kệ ${s.id}`) || shelfName.includes(`k${s.id}`)) {
      return s.approachPoint
    }
  }

  // 3. Phân giải Trạm Sạc / Dock
  if (shelfName.includes('sạc') || shelfName.includes('dock') || wp.nodeId === 10029 || wp.nodeId === 7) {
    return FUNCTIONAL_AREAS.dock.approachPoint
  }

  // 4. Phân giải qua tọa độ thực xCoord, yCoord
  const rawX = typeof wp.xCoord === 'number' ? wp.xCoord : typeof wp.x === 'number' ? wp.x : null
  const rawY = typeof wp.yCoord === 'number' ? wp.yCoord : typeof wp.y === 'number' ? wp.y : null

  if (rawX !== null && rawY !== null) {
    // Nếu trong khoảng 0..3.0m (Hệ SVG chuẩn)
    if (rawX >= 0 && rawX <= 3.0 && rawY >= 0 && rawY <= 3.0) {
      return {
        x: Math.max(80, Math.min(2920, rawX * 1000)),
        y: Math.max(80, Math.min(2920, rawY * 1000)),
      }
    }
    // Nếu trong khoảng [-1.5, 1.5] (Hệ ROS SLAM gốc tại tâm)
    if (rawX >= -1.6 && rawX <= 1.6 && rawY >= -1.6 && rawY <= 1.6) {
      return {
        x: Math.max(80, Math.min(2920, ((rawX + 1.5) / 3.0) * 3000)),
        y: Math.max(80, Math.min(2920, ((1.5 - rawY) / 3.0) * 3000)),
      }
    }
  }

  // Vị trí mặc định
  return { x: 1500, y: 1500 }
}

export default function SupermarketInteractiveMap({
  waypoints = [],
  currentIndex = -1,
  robotPose = null,
  robotCode = 'RB0001',
  missionStatus = 'IDLE',
  flowType = 'ad',
  onSelectShelf = null,
}) {
  const [selectedShelf, setSelectedShelf] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [showGrid, setShowGrid] = useState(true)

  const containerRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragMovedRef = useRef(false)

  // 1. Kéo giữ chuột trái để di chuyển bản đồ (Pan)
  const handleMouseDown = useCallback((e) => {
    // Chỉ kích hoạt khi nhấn chuột trái
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    dragMovedRef.current = false
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    if (Math.abs(newX - pan.x) > 3 || Math.abs(newY - pan.y) > 3) {
      dragMovedRef.current = true
    }
    setPan({ x: newX, y: newY })
  }, [isDragging, pan])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Đảm bảo dừng kéo nếu thả chuột bên ngoài container
  useEffect(() => {
    if (!isDragging) return
    const onGlobalMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [isDragging])

  // 2. Lăn bánh xe chuột để phóng to / thu nhỏ tại vị trí con trỏ (Zoom to cursor)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87

      setZoomLevel((prevZoom) => {
        const nextZoom = Math.min(3.5, Math.max(0.5, prevZoom * zoomFactor))

        // Tâm điểm zoom theo con trỏ chuột
        const rect = el.getBoundingClientRect()
        const mouseX = e.clientX - (rect.left + rect.width / 2)
        const mouseY = e.clientY - (rect.top + rect.height / 2)

        setPan((prevPan) => {
          const scaleChange = nextZoom / prevZoom
          return {
            x: mouseX - (mouseX - prevPan.x) * scaleChange,
            y: mouseY - (mouseY - prevPan.y) * scaleChange,
          }
        })

        return nextZoom
      })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Đặt lại góc nhìn mặc định
  const handleResetView = useCallback(() => {
    setZoomLevel(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Nhấp đúp chuột vào nền để reset góc nhìn
  const handleDoubleClick = useCallback((e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect' || e.target.id === 'canvas-wrapper') {
      handleResetView()
    }
  }, [handleResetView])

  // Tọa độ thực của Robot trên SVG
  const robotSvgPos = useMemo(() => {
    if (!robotPose) {
      // Mặc định robot đang ở Trạm Sạc nếu không có tọa độ
      return { x: 270, y: 2090, heading: 0, isDocked: true, rawX: 0.27, rawY: 2.09 }
    }

    const rx = typeof robotPose.xCoord === 'number' ? robotPose.xCoord : typeof robotPose.x === 'number' ? robotPose.x : null
    const ry = typeof robotPose.yCoord === 'number' ? robotPose.yCoord : typeof robotPose.y === 'number' ? robotPose.y : null

    let heading = 0
    if (typeof robotPose.headingYawDeg === 'number') heading = robotPose.headingYawDeg
    else if (typeof robotPose.headingDeg === 'number') heading = robotPose.headingDeg
    else if (typeof robotPose.headingRad === 'number') heading = (robotPose.headingRad * 180) / Math.PI

    if (rx !== null && ry !== null) {
      // 1. Trường hợp tọa độ SVG pixel sẵn (0..3000)
      if (rx > 50 || ry > 50) {
        const x = Math.max(80, Math.min(2920, rx))
        const y = Math.max(80, Math.min(2920, ry))
        return {
          x,
          y,
          heading,
          isDocked: Math.hypot(x - 270, y - 2090) < 180,
          rawX: rx / 1000,
          rawY: ry / 1000,
        }
      }

      // 2. Trường hợp Robot tại Trạm Sạc / Dock khởi tạo SLAM (quanh điểm gốc 0,0 hoặc 0.26, -0.11)
      if (rx >= -0.6 && rx <= 0.6 && ry >= -0.6 && ry <= 0.4) {
        const x = Math.max(80, Math.min(680, 270 + (rx - 0.26) * 600))
        const y = Math.max(1800, Math.min(2600, 2090 + (ry - (-0.11)) * 600))
        return {
          x,
          y,
          heading,
          isDocked: true,
          rawX: rx,
          rawY: ry,
        }
      }

      // 3. Hệ tọa độ chuẩn Siêu Thị 3m x 3m (X: 0..3.0m, Y: 0..3.0m)
      if (rx >= 0 && rx <= 3.0 && ry >= 0 && ry <= 3.0) {
        const x = Math.max(80, Math.min(2920, rx * 1000))
        const y = Math.max(80, Math.min(2920, ry * 1000))
        return {
          x,
          y,
          heading,
          isDocked: Math.hypot(x - 270, y - 2090) < 180,
          rawX: rx,
          rawY: ry,
        }
      }

      // 4. Hệ ROS SLAM tâm (0,0) trong khoảng [-1.5, 1.5]
      if (rx >= -1.6 && rx <= 1.6 && ry >= -1.6 && ry <= 1.6) {
        const x = Math.max(80, Math.min(2920, ((rx + 1.5) / 3.0) * 3000))
        const y = Math.max(80, Math.min(2920, ((1.5 - ry) / 3.0) * 3000))
        return {
          x,
          y,
          heading,
          isDocked: Math.hypot(x - 270, y - 2090) < 180,
          rawX: rx,
          rawY: ry,
        }
      }
    }

    return { x: 270, y: 2090, heading: 0, isDocked: true, rawX: rx ?? 0.27, rawY: ry ?? 2.09 }
  }, [robotPose])

  // Danh sách điểm tọa độ Waypoint đã phân giải
  const resolvedWaypoints = useMemo(() => {
    return (waypoints || []).map((wp, idx) => {
      const pos = resolveWaypointSvgPos(wp, idx)
      return {
        ...wp,
        svgX: pos.x,
        svgY: pos.y,
        index: idx,
      }
    })
  }, [waypoints])

  // Chuỗi tọa độ cho đường nối Polyline
  const polylinePoints = useMemo(() => {
    if (resolvedWaypoints.length < 2) return ''
    return resolvedWaypoints.map((wp) => `${wp.svgX},${wp.svgY}`).join(' ')
  }, [resolvedWaypoints])

  // Kệ hàng đang được robot nhắm tới hiện tại
  const activeShelfId = useMemo(() => {
    if (currentIndex >= 0 && resolvedWaypoints[currentIndex]) {
      const wp = resolvedWaypoints[currentIndex]
      return wp.shelfId ?? null
    }
    return null
  }, [currentIndex, resolvedWaypoints])

  const handleShelfClick = (shelf) => {
    if (dragMovedRef.current) return
    setSelectedShelf(shelf)
    if (onSelectShelf) onSelectShelf(shelf)
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      className={`relative w-full h-full bg-slate-50 overflow-hidden select-none flex flex-col justify-center items-center ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Zoom / Viewport Controls (Góc dưới bên phải) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-sm pointer-events-auto">
        <span className="text-[10px] text-slate-500 px-2 hidden lg:inline font-medium select-none">
          🖱️ Giữ chuột kéo để di chuyển · Lăn chuột để zoom
        </span>
        <div className="w-[1px] h-4 bg-slate-200 mx-0.5 hidden lg:block" />
        <button
          onClick={() => setZoomLevel((z) => Math.min(3.5, z * 1.2))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          title="Phóng to (hoặc lăn chuột lên)"
        >
          <span className="material-symbols-outlined text-[18px]">zoom_in</span>
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.5, z / 1.2))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          title="Thu nhỏ (hoặc lăn chuột xuống)"
        >
          <span className="material-symbols-outlined text-[18px]">zoom_out</span>
        </button>
        <button
          onClick={handleResetView}
          className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors"
          title="Đặt lại vị trí ban đầu (100%)"
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        <button
          onClick={handleResetView}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          title="Về trung tâm (Reset Pan & Zoom)"
        >
          <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
        </button>
        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
        <button
          onClick={() => setShowGrid((g) => !g)}
          className={`p-1.5 rounded-lg transition-colors ${showGrid ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'text-slate-500 hover:bg-slate-100'}`}
          title="Bật/Tắt Lưới Tọa Độ"
        >
          <span className="material-symbols-outlined text-[18px]">grid_4x4</span>
        </button>
      </div>

      {/* Map Legend Mini Bar (Góc dưới bên trái) */}
      <div className="absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-[11px] font-medium text-slate-700 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#0284c7]" />
          <span>Dãy A01</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#059669]" />
          <span>Dãy B01</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#d97706]" />
          <span>Dãy C01</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#10b981]" />
          <span>⚡ Trạm Sạc</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#64748b]" />
          <span>💳 Thu Ngân</span>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <div
        id="canvas-wrapper"
        className="w-full h-full flex items-center justify-center p-2"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        <svg
          viewBox={ARENA_CONFIG.viewBox}
          className="w-full h-full max-w-full max-h-full object-contain pointer-events-auto"
          style={{
            aspectRatio: '1 / 1',
            filter: 'drop-shadow(0 10px 25px rgba(15,23,42,0.08))',
          }}
        >
          {/* DEFINITIONS & GRADIENTS */}
          <defs>
            {/* Lưới tọa độ 500mm */}
            <pattern id="grid-500" width="500" height="500" patternUnits="userSpaceOnUse">
              <path d="M 500 0 L 0 0 0 500" fill="none" stroke="rgba(203, 213, 225, 0.7)" strokeWidth="3" />
            </pattern>
            <pattern id="grid-100" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(226, 232, 240, 0.5)" strokeWidth="1.5" />
            </pattern>

            {/* Gradient cho 3 Zone Dãy A, B, C */}
            <radialGradient id="grad-zone-a" cx="30%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="grad-zone-b" cx="70%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="grad-zone-c" cx="60%" cy="80%" r="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Đổ bóng cho Khối kệ siêu thị */}
            <filter id="shelf-shadow" x="-10%" y="-10%" width="125%" height="125%">
              <feDropShadow dx="0" dy="8" stdDeviation="14" floodColor="#0f172a" floodOpacity="0.08" />
            </filter>

            {/* Bộ lọc phát sáng Neon cho Lộ trình */}
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="robot-pulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="20" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. NỀN ARENA 3000 x 3000 */}
          <rect x="0" y="0" width="3000" height="3000" fill="#ffffff" rx="40" stroke="#cbd5e1" strokeWidth="6" />

          {/* 2. LƯỚI TỌA ĐỘ VÀ THƯỚC ĐO */}
          {showGrid && (
            <>
              <rect x="0" y="0" width="3000" height="3000" fill="url(#grid-100)" />
              <rect x="0" y="0" width="3000" height="3000" fill="url(#grid-500)" />

              {/* Nhãn khoảng cách trên các trục (0.5m -> 3.0m) */}
              {[500, 1000, 1500, 2000, 2500].map((val) => (
                <React.Fragment key={val}>
                  <text x={val} y="48" fill="#64748b" fontSize="30" fontFamily="monospace" fontWeight="600" textAnchor="middle">
                    {(val / 1000).toFixed(1)}m
                  </text>
                  <text x="35" y={val + 10} fill="#64748b" fontSize="30" fontFamily="monospace" fontWeight="600" textAnchor="middle">
                    {(val / 1000).toFixed(1)}m
                  </text>
                </React.Fragment>
              ))}
            </>
          )}

          {/* 3. VÙNG AMBIENT 3 DÃY A, B, C */}
          <rect x="0" y="0" width="1500" height="1500" fill="url(#grad-zone-a)" />
          <rect x="1500" y="0" width="1500" height="1500" fill="url(#grad-zone-b)" />
          <rect x="800" y="1500" width="2200" height="1500" fill="url(#grad-zone-c)" />

          {/* 4. KHU VỰC CHỨC NĂNG: QUẦY THU NGÂN (CASHIER POS) */}
          <g className="cursor-pointer">
            <rect
              x={FUNCTIONAL_AREAS.cashier.x}
              y={FUNCTIONAL_AREAS.cashier.y}
              width={FUNCTIONAL_AREAS.cashier.w}
              height={FUNCTIONAL_AREAS.cashier.h}
              rx="30"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="5"
              filter="url(#shelf-shadow)"
            />
            <rect
              x={FUNCTIONAL_AREAS.cashier.x + 20}
              y={FUNCTIONAL_AREAS.cashier.y + 20}
              width={FUNCTIONAL_AREAS.cashier.w - 40}
              height={FUNCTIONAL_AREAS.cashier.h - 40}
              rx="20"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="3"
            />
            <text
              x={FUNCTIONAL_AREAS.cashier.x + FUNCTIONAL_AREAS.cashier.w / 2}
              y={FUNCTIONAL_AREAS.cashier.y + 240}
              fontSize="90"
              textAnchor="middle"
            >
              💳
            </text>
            <text
              x={FUNCTIONAL_AREAS.cashier.x + FUNCTIONAL_AREAS.cashier.w / 2}
              y={FUNCTIONAL_AREAS.cashier.y + 360}
              fill="#0f172a"
              fontSize="44"
              fontWeight="800"
              textAnchor="middle"
            >
              QUẦY THU NGÂN
            </text>
            <text
              x={FUNCTIONAL_AREAS.cashier.x + FUNCTIONAL_AREAS.cashier.w / 2}
              y={FUNCTIONAL_AREAS.cashier.y + 430}
              fill="#64748b"
              fontSize="34"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="600"
            >
              (POS Station)
            </text>
          </g>

          {/* 5. KHU VỰC CHỨC NĂNG: TRẠM SẠC ROBOT (DOCK SẠC) */}
          <g>
            <circle
              cx={FUNCTIONAL_AREAS.dock.cx}
              cy={FUNCTIONAL_AREAS.dock.cy}
              r={FUNCTIONAL_AREAS.dock.r + 30}
              fill="rgba(5, 150, 105, 0.05)"
              stroke="#10b981"
              strokeWidth="5"
              strokeDasharray="20 10"
            />
            <circle
              cx={FUNCTIONAL_AREAS.dock.cx}
              cy={FUNCTIONAL_AREAS.dock.cy}
              r={FUNCTIONAL_AREAS.dock.r}
              fill="#ecfdf5"
              stroke="#059669"
              strokeWidth="5"
              filter="url(#shelf-shadow)"
            />
            <text
              x={FUNCTIONAL_AREAS.dock.cx}
              y={FUNCTIONAL_AREAS.dock.cy + 25}
              fill="#059669"
              fontSize="70"
              textAnchor="middle"
            >
              ⚡
            </text>
            <text
              x={FUNCTIONAL_AREAS.dock.cx}
              y={FUNCTIONAL_AREAS.dock.cy + 160}
              fill="#047857"
              fontSize="34"
              fontWeight="800"
              textAnchor="middle"
            >
              TRẠM SẠC
            </text>
          </g>

          {/* 6. KHU VỰC CHỨC NĂNG: CỬA VÀO (ENTRANCE DOOR) */}
          <g>
            <rect
              x={FUNCTIONAL_AREAS.entrance.x}
              y={FUNCTIONAL_AREAS.entrance.y}
              width={FUNCTIONAL_AREAS.entrance.w}
              height={FUNCTIONAL_AREAS.entrance.h}
              rx="15"
              fill="#ecfdf5"
              stroke="#059669"
              strokeWidth="5"
              filter="url(#shelf-shadow)"
            />
            <text
              x={FUNCTIONAL_AREAS.entrance.x + FUNCTIONAL_AREAS.entrance.w / 2}
              y={FUNCTIONAL_AREAS.entrance.y + 45}
              fill="#047857"
              fontSize="36"
              fontWeight="800"
              textAnchor="middle"
              letterSpacing="2"
            >
              CỬA VÀO SIÊU THỊ ➔
            </text>
          </g>

          {/* 7. VẼ ĐƯỜNG ĐI LỘ TRÌNH (POLYLINE PATH) NẾU CÓ MISSION */}
          {polylinePoints && (
            <>
              {/* Lớp viền phát sáng */}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke={flowType === 'ad' ? '#059669' : flowType === 'patrol' ? '#0284c7' : '#10b981'}
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.25"
                filter="url(#neon-glow)"
              />
              {/* Lớp nét đứt chuyển động */}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke={flowType === 'ad' ? '#10b981' : flowType === 'patrol' ? '#0ea5e9' : '#059669'}
                strokeWidth="8"
                strokeDasharray="30 20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* 8. 6 KỆ HÀNG CHÍNH THỨC */}
          {OFFICIAL_SHELVES.map((shelf) => {
            const isTarget = activeShelfId === shelf.id
            const isSelected = selectedShelf?.id === shelf.id
            const cx = shelf.x + shelf.w / 2
            const nameLines = getShelfNameLines(shelf.name)

            return (
              <g
                key={shelf.id}
                onClick={() => handleShelfClick(shelf)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* Vòng hào quang phát sáng nếu Kệ đang là mục tiêu di chuyển */}
                {isTarget && (
                  <rect
                    x={shelf.x - 25}
                    y={shelf.y - 25}
                    width={shelf.w + 50}
                    height={shelf.h + 50}
                    rx="36"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="10"
                    strokeOpacity="0.6"
                    filter="url(#neon-glow)"
                  />
                )}

                {/* Khối thân Kệ hàng */}
                <rect
                  x={shelf.x}
                  y={shelf.y}
                  width={shelf.w}
                  height={shelf.h}
                  rx="26"
                  fill="#ffffff"
                  stroke={isSelected ? '#059669' : isTarget ? '#10b981' : shelf.color}
                  strokeWidth={isSelected ? 9 : isTarget ? 7 : 4.5}
                  filter="url(#shelf-shadow)"
                />

                {/* Các vạch ngăn tầng kệ */}
                {shelf.type === 'vertical' ? (
                  <>
                    <line x1={shelf.x + 20} y1={shelf.y + shelf.h * 0.33} x2={shelf.x + shelf.w - 20} y2={shelf.y + shelf.h * 0.33} stroke="#f1f5f9" strokeWidth="3" />
                    <line x1={shelf.x + 20} y1={shelf.y + shelf.h * 0.66} x2={shelf.x + shelf.w - 20} y2={shelf.y + shelf.h * 0.66} stroke="#f1f5f9" strokeWidth="3" />
                  </>
                ) : (
                  <>
                    <line x1={shelf.x + shelf.w * 0.33} y1={shelf.y + 20} x2={shelf.x + shelf.w * 0.33} y2={shelf.y + shelf.h - 20} stroke="#f1f5f9" strokeWidth="3" />
                    <line x1={shelf.x + shelf.w * 0.66} y1={shelf.y + 20} x2={shelf.x + shelf.w * 0.66} y2={shelf.y + shelf.h - 20} stroke="#f1f5f9" strokeWidth="3" />
                  </>
                )}

                {/* NỘI DUNG KỆ HÀNG */}
                {shelf.type === 'vertical' ? (
                  /* ── KỆ DỌC (KỆ 1, 4, 5, 6) ── */
                  <g>
                    {/* Tag ArUco Marker ID (Góc trên - trái) */}
                    <rect
                      x={shelf.x + 22}
                      y={shelf.y + 22}
                      width="105"
                      height="48"
                      rx="14"
                      fill={shelf.color}
                    />
                    <text
                      x={shelf.x + 74}
                      y={shelf.y + 56}
                      fill="#ffffff"
                      fontSize="30"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {shelf.tag}
                    </text>

                    {/* Badge Dãy Aisle (Góc trên - phải) */}
                    <rect
                      x={shelf.x + shelf.w - 127}
                      y={shelf.y + 22}
                      width="105"
                      height="48"
                      rx="14"
                      fill={`${shelf.color}15`}
                      stroke={shelf.color}
                      strokeWidth="2"
                    />
                    <text
                      x={shelf.x + shelf.w - 74}
                      y={shelf.y + 55}
                      fill={shelf.color}
                      fontSize="26"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {shelf.aisle}
                    </text>

                    {/* Tiêu đề KỆ ID */}
                    <text
                      x={cx}
                      y={shelf.y + 138}
                      fill="#0f172a"
                      fontSize="46"
                      fontWeight="800"
                      textAnchor="middle"
                      letterSpacing="2"
                    >
                      KỆ {shelf.id}
                    </text>

                    {/* Icon danh mục sản phẩm lớn chính giữa */}
                    <text
                      x={cx}
                      y={shelf.y + 235}
                      fontSize="80"
                      textAnchor="middle"
                    >
                      {shelf.icon}
                    </text>

                    {/* Tên nhóm hàng */}
                    <text
                      x={cx}
                      y={shelf.y + 315}
                      fill="#0f172a"
                      fontSize="34"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {nameLines[0]}
                    </text>
                    {nameLines[1] && (
                      <text
                        x={cx}
                        y={shelf.y + 360}
                        fill="#334155"
                        fontSize="32"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {nameLines[1]}
                      </text>
                    )}

                    {/* Đường kẻ phân cách tinh tế */}
                    <line
                      x1={shelf.x + 35}
                      y1={shelf.y + 405}
                      x2={shelf.x + shelf.w - 35}
                      y2={shelf.y + 405}
                      stroke="#e2e8f0"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />

                    {/* Chip số lượng mặt hàng */}
                    <rect
                      x={cx - 105}
                      y={shelf.y + 425}
                      width="210"
                      height="44"
                      rx="12"
                      fill="#f8fafc"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />
                    <text
                      x={cx}
                      y={shelf.y + 455}
                      fill="#475569"
                      fontSize="24"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      📦 {shelf.products.length} MẶT HÀNG
                    </text>

                    {/* Danh sách sản phẩm tiêu biểu */}
                    <g>
                      {shelf.products.slice(0, shelf.h >= 900 ? 4 : 3).map((p, pIdx) => (
                        <text
                          key={pIdx}
                          x={cx}
                          y={shelf.y + 515 + pIdx * 46}
                          fill="#1e293b"
                          fontSize="24"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          <tspan fill="#059669" fontWeight="bold">✦ </tspan>
                          {p.length > 18 ? p.slice(0, 17) + '…' : p}
                        </text>
                      ))}
                    </g>

                    {/* Điểm neo tiếp cận robot ở đáy kệ */}
                    <g>
                      <text
                        x={cx}
                        y={shelf.y + shelf.h - 35}
                        fill={shelf.color}
                        fontSize="22"
                        fontWeight="700"
                        textAnchor="middle"
                        letterSpacing="1"
                      >
                        VỊ TRÍ TIẾP CẬN ▼
                      </text>
                    </g>
                  </g>
                ) : (
                  /* ── KỆ NGANG (KỆ 2, 3) ── */
                  <g>
                    {/* Tag ArUco Marker ID */}
                    <rect
                      x={shelf.x + 24}
                      y={shelf.y + 24}
                      width="110"
                      height="50"
                      rx="14"
                      fill={shelf.color}
                    />
                    <text
                      x={shelf.x + 79}
                      y={shelf.y + 59}
                      fill="#ffffff"
                      fontSize="32"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {shelf.tag}
                    </text>

                    {/* Badge Dãy Aisle */}
                    <rect
                      x={shelf.x + 148}
                      y={shelf.y + 24}
                      width="110"
                      height="50"
                      rx="14"
                      fill={`${shelf.color}15`}
                      stroke={shelf.color}
                      strokeWidth="2"
                    />
                    <text
                      x={shelf.x + 203}
                      y={shelf.y + 58}
                      fill={shelf.color}
                      fontSize="28"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {shelf.aisle}
                    </text>

                    {/* Icon bên phải */}
                    <text
                      x={shelf.x + shelf.w - 85}
                      y={shelf.y + 90}
                      fontSize="90"
                      textAnchor="middle"
                    >
                      {shelf.icon}
                    </text>

                    {/* Tiêu đề KỆ ID và Tên Kệ (Ngang) */}
                    <text
                      x={shelf.x + 40}
                      y={shelf.y + 155}
                      fill="#0f172a"
                      fontSize="46"
                      fontWeight="800"
                    >
                      KỆ {shelf.id}: <tspan fill="#334155" fontWeight="bold">{shelf.name}</tspan>
                    </text>

                    {/* Danh sách sản phẩm tiêu biểu theo hàng ngang */}
                    <text
                      x={shelf.x + 40}
                      y={shelf.y + 225}
                      fill="#1e293b"
                      fontSize="28"
                      fontWeight="600"
                    >
                      <tspan fill="#059669">✦ </tspan>{shelf.products[0] || ''}
                      {shelf.products[1] && <tspan fill="#64748b">   |   </tspan>}
                      {shelf.products[1] && <tspan fill="#059669">✦ </tspan>}
                      {shelf.products[1] || ''}
                    </text>

                    <text
                      x={shelf.x + 40}
                      y={shelf.y + 275}
                      fill="#475569"
                      fontSize="26"
                      fontWeight="500"
                    >
                      <tspan fill="#059669">✦ </tspan>{shelf.products[2] || ''}
                      {shelf.products[3] && <tspan fill="#94a3b8">   |   </tspan>}
                      {shelf.products[3] && <tspan fill="#059669">✦ </tspan>}
                      {shelf.products[3] || ''}
                    </text>

                    {/* Badge số lượng mặt hàng */}
                    <rect
                      x={shelf.x + shelf.w - 260}
                      y={shelf.y + shelf.h - 68}
                      width="225"
                      height="44"
                      rx="12"
                      fill="#f8fafc"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />
                    <text
                      x={shelf.x + shelf.w - 147}
                      y={shelf.y + shelf.h - 38}
                      fill="#475569"
                      fontSize="22"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      📦 {shelf.products.length} MẶT HÀNG
                    </text>
                  </g>
                )}

                {/* Điểm tiếp cận xe (Approach Marker) */}
                <circle
                  cx={shelf.approachPoint.x}
                  cy={shelf.approachPoint.y}
                  r="24"
                  fill="rgba(5, 150, 105, 0.15)"
                  stroke={shelf.color}
                  strokeWidth="5"
                  strokeDasharray="8 5"
                />
                <circle
                  cx={shelf.approachPoint.x}
                  cy={shelf.approachPoint.y}
                  r="8"
                  fill={shelf.color}
                />
              </g>
            )
          })}

          {/* 9. VẼ CÁC ĐIỂM DỪNG WAYPOINTS TRÊN LỘ TRÌNH */}
          {resolvedWaypoints.map((wp, idx) => {
            const isActive = idx === currentIndex
            const isPast = idx < currentIndex
            const isTarget = isActive

            return (
              <g key={`wp-${idx}`} transform={`translate(${wp.svgX}, ${wp.svgY})`}>
                {/* Vòng tròn nhấp nháy cho điểm đích hiện tại */}
                {isTarget && (
                  <circle r="75" fill="none" stroke="#10b981" strokeWidth="12" opacity="0.8">
                    <animate attributeName="r" values="45;95;45" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Thân điểm dừng */}
                <circle
                  r="45"
                  fill={isTarget ? '#059669' : isPast ? '#f1f5f9' : '#ffffff'}
                  stroke={isTarget ? '#10b981' : isPast ? '#94a3b8' : '#059669'}
                  strokeWidth="7"
                  filter="url(#shelf-shadow)"
                />

                {/* Số thứ tự điểm dừng */}
                <text
                  x="0"
                  y="15"
                  fill={isTarget ? '#ffffff' : isPast ? '#64748b' : '#047857'}
                  fontSize="42"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {isPast ? '✓' : idx + 1}
                </text>

                {/* Dwell time badge */}
                {wp.dwellTimeSeconds > 0 && (
                  <g transform="translate(55, -20)">
                    <rect x="0" y="0" width="130" height="42" rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" filter="url(#shelf-shadow)" />
                    <text x="65" y="28" fill="#0f172a" fontSize="24" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                      ⏱ {wp.dwellTimeSeconds}s
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* 10. ROBOT REALTIME TELEMETRY AVATAR */}
          <g transform={`translate(${robotSvgPos.x}, ${robotSvgPos.y})`}>
            {/* Vòng radar quét sóng xung quanh Robot */}
            <circle r="120" fill="none" stroke="#059669" strokeWidth="8" opacity="0.25">
              <animate attributeName="r" values="70;140;70" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite" />
            </circle>

            {/* Mũi tên chỉ hướng Heading Yaw */}
            <g transform={`rotate(${robotSvgPos.heading})`}>
              <polygon points="0,-115 -35,-65 35,-65" fill="#059669" filter="url(#neon-glow)" />
              <circle cx="0" cy="-60" r="10" fill="#ffffff" />
            </g>

            {/* Thân xe Robot */}
            <circle
              r="65"
              fill="#ecfdf5"
              stroke="#059669"
              strokeWidth="9"
              filter="url(#shelf-shadow)"
            />
            <circle r="42" fill="#d1fae5" stroke="#10b981" strokeWidth="4" />

            {/* Icon robot ở trung tâm */}
            <text x="0" y="16" fontSize="48" textAnchor="middle">
              🤖
            </text>

            {/* Bảng nhãn trạng thái bay phía trên Robot */}
            <g transform="translate(0, -150)">
              <rect
                x="-220"
                y="-55"
                width="440"
                height="85"
                rx="22"
                fill="#ffffff"
                stroke="#059669"
                strokeWidth="4.5"
                filter="url(#shelf-shadow)"
              />
              <text x="0" y="-12" fill="#0f172a" fontSize="32" fontWeight="800" textAnchor="middle">
                {robotCode} · {robotSvgPos.isDocked ? '⚡ Đang Sạc' : missionStatus}
              </text>
              <text x="0" y="22" fill="#059669" fontSize="24" fontFamily="monospace" fontWeight="700" textAnchor="middle">
                ({(robotSvgPos.rawX ?? robotSvgPos.x / 1000).toFixed(2)}m, {(robotSvgPos.rawY ?? robotSvgPos.y / 1000).toFixed(2)}m)
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* POPUP CHI TIẾT KỆ HÀNG KHI NHẤP CHUỘT */}
      {selectedShelf && (
        <div className="absolute top-16 left-6 z-30 w-84 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 shadow-2xl text-slate-800 smb-pop-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{selectedShelf.icon}</span>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Kệ {selectedShelf.id}: {selectedShelf.name}</h4>
                <p className="text-xs text-slate-500">Tag ArUco: {selectedShelf.tag} · Dãy {selectedShelf.aisle}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedShelf(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-2 mb-3 leading-relaxed">{selectedShelf.description}</p>

          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Sản Phẩm Trưng Bày ({selectedShelf.products.length}):</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {selectedShelf.products.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate font-medium">{p}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Tọa độ kệ: ({selectedShelf.x / 1000}m, {selectedShelf.y / 1000}m)</span>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              2 Tầng / 4 Slots
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
