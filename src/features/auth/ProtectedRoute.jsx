import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * <ProtectedRoute>
 * Wraps any route that requires the user to be signed in. If they're not,
 * redirect to /login and remember where they were trying to go.
 *
 * Usage:
 *   <Route path="/robots" element={<ProtectedRoute><RobotMonitoring /></ProtectedRoute>} />
 *
 * If `roles` is provided, the user must have at least one matching role —
 * otherwise they get redirected to /forbidden. Combine with FE-side checks
 * (the BE also enforces [Authorize] on protected endpoints, so this is
 * defense-in-depth, not the primary gate).
 */
export function ProtectedRoute({ children, roles = null }) {
  const { bootstrapping, isAuthenticated, hasRole } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-smb-surface">
        <div className="flex flex-col items-center gap-3 text-smb-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-3xl text-smb-primary-container">
            progress_activity
          </span>
          <p className="text-sm">Đang kiểm tra phiên đăng nhập…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (roles && roles.length > 0) {
    const ok = roles.some(hasRole)
    if (!ok) return <Navigate to="/forbidden" replace />
  }

  return children
}

export default ProtectedRoute