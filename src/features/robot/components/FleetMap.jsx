import React, { useMemo } from 'react'

export default function FleetMap({ robots, poses, map, missionState, selectedRobotCode }) {
  const selectedRobot = robots?.find(r => r.robotCode === selectedRobotCode)
  const pose = poses?.[selectedRobotCode]

  const flowTypeLabel = useMemo(() => {
    if (!missionState?.flowType) return { text: 'RẢNH', color: 'bg-gray-500', bg: 'bg-gray-500/10', textCol: 'text-gray-400', border: 'border-gray-500/50' }
    const type = missionState.flowType.toLowerCase()
    if (type === 'ad') return { text: 'QUẢNG CÁO', color: 'bg-orange-500', bg: 'bg-orange-500/10', textCol: 'text-orange-400', border: 'border-orange-500/50' }
    if (type === 'patrol') return { text: 'TUẦN TRA', color: 'bg-blue-500', bg: 'bg-blue-500/10', textCol: 'text-blue-400', border: 'border-blue-500/50' }
    if (type === 'guide') return { text: 'DẪN ĐƯỜNG', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', textCol: 'text-emerald-400', border: 'border-emerald-500/50' }
    return { text: type.toUpperCase(), color: 'bg-indigo-500', bg: 'bg-indigo-500/10', textCol: 'text-indigo-400', border: 'border-indigo-500/50' }
  }, [missionState])

  const waypoints = missionState?.waypoints || []
  const currentIndex = missionState?.currentWaypointIndex ?? -1
  const isIdle = !missionState || missionState.status === 'COMPLETED' || waypoints.length === 0

  return (
    <div className="relative h-full w-full flex flex-col bg-[#0b0f17] text-white smb-fade-in">
      {/* Header Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className={`px-4 py-1.5 rounded-full font-bold text-sm tracking-wider border ${flowTypeLabel.border} ${flowTypeLabel.bg} ${flowTypeLabel.textCol} shadow-sm backdrop-blur-sm`}>
          {flowTypeLabel.text}
        </div>
        {selectedRobot && (
          <div className="text-xs font-mono text-gray-400 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800">
            {selectedRobot.robotName} {pose ? `(${pose.xCoord?.toFixed(1)}, ${pose.yCoord?.toFixed(1)})` : ''}
          </div>
        )}
      </div>

      {/* Map Management Link */}
      <div className="absolute top-4 right-4 z-10">
        <a href="/shelf-management" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 text-xs font-medium transition-colors shadow-sm backdrop-blur-sm">
          <span className="material-symbols-outlined text-[16px]">map</span>
          Quản lý Bản đồ & Node
        </a>
      </div>

      <div className="flex-1 overflow-auto p-8 pt-24 flex flex-col justify-center">
        {isIdle ? (
           <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full smb-pop-in">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-30">smart_toy</span>
              <p className="text-lg font-medium text-gray-400">Robot đang ở trạng thái rảnh</p>
              <p className="text-sm text-gray-600 mt-2 mb-4">Vui lòng gán lộ trình hoặc nhiệm vụ ở bảng điều khiển bên phải.</p>
              
              <a 
                href="/ros-map-tool.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-gray-800/50 px-5 py-2.5 hover:bg-gray-700/80 text-gray-400 hover:text-white border border-gray-700/50 hover:border-gray-600 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px] text-indigo-400">data_object</span>
                <span className="text-sm font-medium">Mở công cụ ROS Map Tool (Cấu trúc & Data)</span>
              </a>
           </div>
        ) : (
          <div className="flex items-center justify-start gap-2 overflow-x-auto pb-16 pt-8 px-8 w-full h-full custom-scrollbar">
             {/* Draw sequence of nodes */}
             {waypoints.map((wp, idx) => {
                const isActive = idx === currentIndex
                const isPast = idx < currentIndex
                
                return (
                  <React.Fragment key={idx}>
                    <div className="relative flex flex-col items-center shrink-0 w-32 group smb-pop-in" style={{ animationDelay: `${idx * 50}ms` }}>
                      {/* Active Node Pulse Ring */}
                      {isActive && (
                        <div className={`absolute top-4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full ${flowTypeLabel.bg} animate-ping opacity-75`} />
                      )}
                      
                      <div className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300
                        ${isActive ? `${flowTypeLabel.color} text-white border-transparent shadow-lg scale-110` : 
                          isPast ? `${flowTypeLabel.border} ${flowTypeLabel.textCol} bg-gray-900/50` : 'border-gray-800 text-gray-600 bg-gray-900'}`}>
                        <span className="font-bold text-sm">{idx + 1}</span>
                      </div>
                      
                      <div className="mt-4 text-center w-full">
                         <div className={`text-sm font-semibold truncate px-2 transition-colors ${isActive ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                           {wp.nodeName || `Node ${wp.nodeId}`}
                         </div>
                         <div className="text-[10px] text-gray-500 font-mono mt-1">
                           ({wp.xCoord?.toFixed(1)}, {wp.yCoord?.toFixed(1)})
                         </div>
                         {wp.dwellTimeSeconds > 0 && (
                           <div className="text-[10px] text-gray-400 bg-gray-800/80 rounded px-1.5 py-0.5 mt-1.5 inline-block border border-gray-700/50">
                             ⏱ {wp.dwellTimeSeconds}s
                           </div>
                         )}
                      </div>
                      
                      {/* Active Status message */}
                      {isActive && (
                        <div className={`absolute -bottom-12 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-lg border shadow-lg smb-fade-in
                          ${flowTypeLabel.border} ${flowTypeLabel.bg} ${flowTypeLabel.textCol}`}>
                           {missionState.status === 'NAVIGATING' ? 'Đang di chuyển tới...' : 
                            missionState.status === 'ARRIVED' ? `Đang dừng (${wp.dwellTimeSeconds}s)` :
                            missionState.status === 'PAUSED' ? 'Tạm dừng' : 'Đang xử lý nhiệm vụ...'}
                        </div>
                      )}
                    </div>
                    
                    {/* Connection line */}
                    {idx < waypoints.length - 1 && (
                      <div className="flex-1 min-w-[40px] max-w-[80px] h-0.5 relative z-0 shrink-0">
                         <div className={`absolute inset-0 transition-colors duration-500
                           ${isPast ? flowTypeLabel.color : 'bg-gray-800'}`} />
                      </div>
                    )}
                  </React.Fragment>
                )
             })}
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  )
}
