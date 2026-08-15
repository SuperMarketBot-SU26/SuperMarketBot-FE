import { Map, ArrowUpRight } from 'lucide-react'

export default function FleetMap() {
  const openMapTool = () => {
    window.open('/ros-map-tool.html?edit=true', '_blank')
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-[#0b0f17] shadow-sm flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-blue-500/10 p-4 mb-4">
        <Map className="w-10 h-10 text-blue-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">ROS 2 Map Editor</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm">
        Công cụ gán tọa độ và thiết lập Waypoint chuyên sâu trên nền tảng ROS 2. Sẽ được mở sang một tab mới để hiển thị toàn màn hình.
      </p>
      <button 
        onClick={openMapTool}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-6 rounded-xl transition-colors cursor-pointer"
      >
        <span>Mở Fullscreen Editor</span>
        <ArrowUpRight className="w-4 h-4" />
      </button>
    </div>
  )
}
