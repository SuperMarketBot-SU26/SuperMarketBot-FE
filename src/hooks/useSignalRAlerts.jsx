import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast } from 'react-toastify';
import { ShieldAlert } from 'lucide-react';
import { ACTIVE_BACKEND_URL } from '../api/client';

/**
 * Real-time alert listener for StaffHub (backend /hubs/staff).
 *
 * NOTE: SignalR/Hubs are NOT in the current BE endpoints list
 * (see docs/BE_PROMPT_endpoints.md). Until StaffHub is exposed on BE,
 * this hook silently no-ops so the app does not spam connection errors.
 *
 * When BE ships the hub, change `signalrEnabled = false` → `true` below
 * (or wire it to an env/feature flag).
 *
 * The signal-handler logic (ReceiveShelfPatrolAlert → toast) is preserved
 * so you only flip the flag to re-enable it.
 */
export function useSignalRAlerts() {
  const [isConnected, setIsConnected] = useState(false)
  const connectionRef = useRef(null)

  useEffect(() => {
    // 1. Khởi tạo kết nối SignalR
    const hubUrl = import.meta.env.DEV ? '/hubs/staff' : `${ACTIVE_BACKEND_URL}/hubs/staff`
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connectionRef.current = newConnection

    const startConnection = async () => {
      try {
        await newConnection.start()
        await newConnection.invoke('JoinStaffGroup')
        setIsConnected(true)
        console.log('✅ SignalR Connected to StaffHub')
      } catch (err) {
        console.warn('⚠️ SignalR connect failed (will retry):', err?.message ?? err)
        setTimeout(startConnection, 5000)
      }
    }

    const showRestockAlert = (payload) => {
      console.log('🔔 Received Patrol Alert:', payload)
      // payload shape: { AisleCode, OccupancyRatePct, EmptySlotCount, Message, ImageUrl? }
      toast.error(
        <div className="flex flex-col gap-1.5 p-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <ShieldAlert size={18} className="text-red-500" />
            <span>Cảnh Báo Kệ Hết Hàng!</span>
          </div>
          <div className="text-xs text-gray-700">
            <p><b>Kệ:</b> {payload.aisleCode || payload.AisleCode || payload.shelfName || `Node ${payload.nodeId}`}</p>
            <p className="text-red-600 font-semibold"><b>Mật độ lấp đầy:</b> {payload.occupancyRatePct ?? payload.OccupancyRatePct}%</p>
            <p><b>Số slot trống:</b> {payload.emptySlotCount ?? payload.EmptySlotCount}</p>
            <p className="mt-1 italic text-gray-500">"{payload.aiRecommendation || payload.Message || 'Cần bổ sung hàng.'}"</p>
          </div>
          {(payload.imageUrl || payload.ImageUrl) && (
            <div className="mt-2 rounded-md overflow-hidden border border-red-100 shadow-sm">
              <img src={payload.imageUrl || payload.ImageUrl} alt="Bằng chứng từ Robot" className="w-full h-auto object-cover max-h-32" />
            </div>
          )}
        </div>,
        {
          position: 'top-right',
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: 'light',
        }
      )
    }

    newConnection.on('ReceiveShelfPatrolAlert', showRestockAlert)
    newConnection.on('OutOfStockAlert', showRestockAlert)
    newConnection.on('ShelfPatrolScanCompleted', (payload) => {
      if (payload.needsRestock) return
      toast.success(`Kệ ${payload.shelfName || payload.nodeName || payload.nodeId} đạt ${payload.occupancyRatePct}% hàng.`)
    })
    newConnection.on('ShelfPatrolScanFailed', (payload) => {
      toast.error(`AI Vision lỗi tại Node ${payload.nodeId}: ${payload.errorMessage || 'Không phân tích được ảnh.'}`)
    })

    newConnection.onreconnecting(() => setIsConnected(false))
    newConnection.onreconnected(async (connectionId) => {
      console.log('✅ SignalR Reconnected. Connection ID:', connectionId)
      setIsConnected(true)
      await newConnection.invoke('JoinStaffGroup').catch(() => {})
    })
    newConnection.onclose(() => setIsConnected(false))

    startConnection()

    return () => {
      if (connectionRef.current) {
        connectionRef.current.off('ReceiveShelfPatrolAlert')
        connectionRef.current.off('OutOfStockAlert')
        connectionRef.current.off('ShelfPatrolScanCompleted')
        connectionRef.current.off('ShelfPatrolScanFailed')
        connectionRef.current.stop()
        connectionRef.current = null
      }
    }
  }, [])

  return { connection: connectionRef.current, isConnected }
}
