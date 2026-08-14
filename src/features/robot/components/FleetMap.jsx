export default function FleetMap() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-[#0b0f17] shadow-sm flex flex-col">
      <iframe
        src="/ros-map-tool.html"
        className="w-full h-full border-none flex-1"
        title="ROS Bridge Map"
      />
    </div>
  )
}
