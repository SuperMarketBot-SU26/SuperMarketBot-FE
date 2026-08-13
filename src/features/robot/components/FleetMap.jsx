import React, { useRef, useEffect } from 'react'
import { useRosConnection } from '../hooks/useRosConnection'
import { useRosSimulator } from '../hooks/useRosSimulator'

export default function FleetMap({
  map,
  robots = [],
  robotPoses = {},
  routeTypes = [],
  selectedRoute = null,
  selectedNodeId = null,
  onNodeClick,
  focusedRobot = null,
  scale = 64,
  onClearSelection,
  onSelectRobot,
  isEditing = false,
  onToggleEdit,
  onMapSaved,
  robotIp = '192.168.0.105',
  foxglovePort = 8765,
  enableRosBridge = false,
}) {
  const iframeRef = useRef(null)

  // ROS Bridge Connection State - Use real ROS or simulator
  const useRealRos = enableRosBridge
  
  const {
    isConnected: rosConnected,
    connectionState: rosConnectionState,
    rosMapData,
    robotPose: rosRobotPose,
    laserScan,
    reconnect: rosReconnect,
  } = useRealRos 
    ? useRosConnection({
        robotIp,
        port: foxglovePort,
        autoConnect: true,
        subscribeTopics: ['/map', '/odom', '/scan', '/tf'],
      })
    : useRosSimulator({
        enabled: true,
        robotIp,
      })

  // Whenever isEditing changes, notify the iframe
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
      {/* Header Info */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/90 px-3.5 py-1.5 backdrop-blur-md shadow-md pointer-events-auto">
          <span className="relative flex size-2.5">
            {rosConnected ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
            )}
          </span>
          <span className="text-xs font-semibold text-white">
            {rosConnected ? (rosConnectionState === 'simulator' ? 'SIMULATOR' : 'ROS Bridge Connected') : rosConnectionState === 'reconnecting' ? 'Reconnecting...' : 'ROS Bridge Offline'}
          </span>
        </div>
      </div>

      <iframe 
        ref={iframeRef}
        src="/ros-map-tool.html" 
        className="w-full h-full border-none flex-1"
        title="ROS Map Tool"
        onLoad={() => {
          // Sync edit state immediately when iframe loads
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
