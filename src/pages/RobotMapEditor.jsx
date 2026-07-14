import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const EDITOR_PATH = '/robot-map-editor.html'

/**
 * RobotMapEditor — loads the standalone map-editor HTML inside an iframe.
 * The parent React app handles auth; the iframe receives the API base URL
 * and auth token via postMessage so it can call our backend endpoints.
 */
export default function RobotMapEditor() {
  const navigate = useNavigate()
  const iframeRef = useRef(null)

  // Inject API config into the iframe after it loads
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        const editorOrigin = EDITOR_PATH.startsWith('/')
          ? window.location.origin
          : new URL(EDITOR_PATH, window.location.href).origin

        iframe.contentWindow.postMessage(
          {
            type: 'MAP_EDITOR_CONFIG',
            apiBase: '/api',
            token: localStorage.getItem('accessToken') ?? '',
          },
          editorOrigin
        )
      } catch (e) {
        console.error('[RobotMapEditor] postMessage failed:', e)
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col bg-smb-surface">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-smb-outline-variant bg-smb-surface-container-low px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/robots')}
            className="flex size-8 items-center justify-center rounded-lg border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface transition-colors"
            title="Quay lại Giám Sát Robot"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-sm font-bold text-smb-on-surface leading-tight">Robot Map Editor</h1>
            <p className="text-[10px] text-smb-on-surface-variant">Chỉnh sửa bản đồ & lộ trình</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-smb-success animate-pulse" />
          <span className="text-xs text-smb-on-surface-variant">Đang hoạt động</span>
        </div>
      </header>

      {/* Full-screen iframe */}
      <iframe
        ref={iframeRef}
        src={EDITOR_PATH}
        title="Robot Map Editor"
        className="flex-1 w-full border-0"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  )
}
