import React, { useRef, useEffect } from 'react'

export default function FleetMap({
  isEditing = false,
}) {
  const iframeRef = useRef(null)

  // Whenever isEditing changes, notify the iframe (if needed in the future)
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'SET_EDIT_MODE', isEditing },
        '*'
      )
    }
  }, [isEditing])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-[#0b0f17] shadow-sm flex flex-col">
      <iframe 
        ref={iframeRef}
        src="/ros-map-tool.html" 
        className="w-full h-full border-none flex-1"
        title="ROS Map Tool"
        onLoad={() => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              { type: 'SET_EDIT_MODE', isEditing },
              '*'
            )
          }
        }}
      />
    </div>
  )
}
