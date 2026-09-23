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
        activeItem="Quản Lý Giao Diện Bản Đồ"
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <div className="pl-[260px] flex flex-col h-screen">
        <Navbar
          title="Quản Lý Giao Diện Bản Đồ"
          subtitle="Quản lý bản đồ sàn siêu thị, hiệu chỉnh điểm dừng và theo dõi xe tự hành theo thời gian thực"
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1 flex flex-col p-4 pt-2 overflow-hidden">
          {/* Top Quick Bar */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Bản Đồ Số Hóa & Tọa Độ Điểm Dừng
              </span>
              <span className="text-xs text-smb-on-surface-variant hidden sm:inline">
                Theo dõi và hiệu chỉnh không gian di chuyển của Robot
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all shadow-2xs active:scale-95"
                title="Tải lại công cụ ROS Map"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Tải lại
              </button>
              <a
                href="/ros-map-tool.html?edit=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-semibold transition-all shadow-2xs active:scale-95"
                title="Mở toàn màn hình trong tab mới"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Tab mới
              </a>
            </div>
          </div>

          {/* Embedded ROS Map Tool Iframe */}
          <div className="flex-1 rounded-2xl border border-smb-outline-variant/60 bg-white overflow-hidden shadow-xs relative">
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
