import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import CommandPalette from '../components/CommandPalette'

export function RosMapToolPage() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-smb-surface transition-colors duration-200">
      <Sidebar
        activeItem="Bản Đồ & Định Vị Robot"
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <div className="pl-[260px] flex flex-col h-screen">
        <Navbar
          title="Bản Đồ Siêu Thị & Định Vị Di Chuyển"
          subtitle="Quản lý bản đồ sàn siêu thị, hiệu chỉnh điểm dừng và theo dõi xe tự hành theo thời gian thực"
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1 flex flex-col p-4 pt-2 overflow-hidden">
          {/* Top Quick Bar */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Bản Đồ Số Hóa & Tọa Độ Điểm Dừng
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline">
                Theo dõi và hiệu chỉnh không gian di chuyển của Robot
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 text-xs font-medium transition-colors shadow-sm"
                title="Tải lại công cụ ROS Map"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Tải lại
              </button>
              <a
                href="/ros-map-tool.html?edit=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors shadow-sm"
                title="Mở toàn màn hình trong tab mới"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Tab mới
              </a>
            </div>
          </div>

          {/* Embedded ROS Map Tool Iframe */}
          <div className="flex-1 rounded-xl border border-gray-800 bg-[#020617] overflow-hidden shadow-2xl relative">
            <iframe
              key={iframeKey}
              src="/ros-map-tool.html?edit=true"
              className="w-full h-full border-0"
              title="SuperMarketBot ROS Map Tool"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  )
}

export default RosMapToolPage
