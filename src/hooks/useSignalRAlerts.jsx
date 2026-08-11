import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast } from 'react-toastify';
import React from 'react';
import { ShieldAlert } from 'lucide-react';

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
const signalrEnabled = false

export function useSignalRAlerts() {
  const [connection, setConnection] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const connectionRef = useRef(null)

  useEffect(() => {
    if (!signalrEnabled) {
      // Hub not available on BE yet — skip silently.
      return undefined
    }

    // 1. Khởi tạo kết nối SignalR
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/staff') // Trỏ tới StaffHub của Backend (qua Vite proxy)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    setConnection(newConnection)
    connectionRef.current = newConnection

    const startConnection = async () => {
      try {
        await newConnection.start()
        setIsConnected(true)
        console.log('✅ SignalR Connected to StaffHub')
      } catch (err) {
        console.warn('⚠️ SignalR connect failed (will retry):', err?.message ?? err)
        setTimeout(startConnection, 5000)
      }
    }

    // 2. Lắng nghe sự kiện "ReceiveShelfPatrolAlert"
    newConnection.on('ReceiveShelfPatrolAlert', (payload) => {
      console.log('🔔 Received Patrol Alert:', payload)
      // payload shape: { AisleCode, OccupancyRatePct, EmptySlotCount, Message, ImageUrl? }
      toast.error(
        <div className="flex flex-col gap-1.5 p-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <ShieldAlert size={18} className="text-red-500" />
            <span>Cảnh Báo Kệ Hết Hàng!</span>
          </div>
          <div className="text-xs text-gray-700">
            <p><b>Kệ:</b> {payload.AisleCode}</p>
            <p className="text-red-600 font-semibold"><b>Mật độ lấp đầy:</b> {payload.OccupancyRatePct}%</p>
            <p><b>Số slot trống:</b> {payload.EmptySlotCount}</p>
            <p className="mt-1 italic text-gray-500">"{payload.Message}"</p>
          </div>
          {payload.ImageUrl && (
            <div className="mt-2 rounded-md overflow-hidden border border-red-100 shadow-sm">
              <img src={payload.ImageUrl} alt="Bằng chứng từ Robot" className="w-full h-auto object-cover max-h-32" />
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
    })

    newConnection.onreconnecting(() => setIsConnected(false))
    newConnection.onreconnected((connectionId) => {
      console.log('✅ SignalR Reconnected. Connection ID:', connectionId)
      setIsConnected(true)
    })
    newConnection.onclose(() => setIsConnected(false))

    startConnection()

    return () => {
      if (connectionRef.current) {
        connectionRef.current.off('ReceiveShelfPatrolAlert')
        connectionRef.current.stop()
        connectionRef.current = null
      }
    }
  }, [])

  return { connection, isConnected }
}
