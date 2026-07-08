import React, { createContext, useCallback, useMemo, useState } from 'react'
import * as authApi from './api/authApi'
import {
  clearSession,
  isAccessTokenExpired,
  loadSession,
  saveSession,
} from './authStorage'

/**
 * AuthContext
 * Single source of truth for "who is logged in right now" on the FE.
 *
 * - Hydrates from localStorage on mount (so a page refresh keeps you signed in).
 * - Exposes imperative actions (login/register/logout) that update both
 *   state and storage together.
 * - Surfaces a `bootstrapping` flag so route guards can render a single
 *   spinner during initial hydration instead of flashing the login screen.
 *
 * Tokens are persisted via authStorage. The `client.js` axios interceptor
 * reads the same store on every request and clears it on 401.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Initialize directly from localStorage on the first render. This is
  // safe for a Vite SPA (no SSR) and avoids a "setState in effect"
  // cascading render that the React 19 lint rules frown upon.
  const [session, setSession] = useState(() => loadSession())
  const [bootstrapping] = useState(false)

  const applySession = useCallback((normalized) => {
    // normalized = { accessToken, refreshToken, accessTokenExpiresAt, user }
    saveSession(normalized)
    setSession({
      accessToken: normalized.accessToken,
      refreshToken: normalized.refreshToken,
      expiresAt: normalized.accessTokenExpiresAt,
      user: normalized.user,
    })
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const result = await authApi.login({ email, password })
    applySession(result)
    return result
  }, [applySession])

  const register = useCallback(async (payload) => {
    // Step 1 only — sends OTP email. Caller is responsible for calling
    // verifyOtp afterwards (handled in the Register page).
    return authApi.registerRequestOtp(payload)
  }, [])

  const verifyOtp = useCallback(async ({ email, otpCode }) => {
    const result = await authApi.verifyOtp({ email, otpCode })
    applySession(result)
    return result
  }, [applySession])

  const logout = useCallback(async () => {
    const current = loadSession()
    try {
      if (current?.refreshToken) {
        await authApi.logout({ refreshToken: current.refreshToken })
      }
    } catch {
      // Server-side revoke is best-effort; we always clear local state.
    } finally {
      clearSession()
      setSession(null)
    }
  }, [])

  const value = useMemo(() => {
    const user = session?.user ?? null
    const isAuthenticated = Boolean(session?.accessToken)
    const hasRole = (role) => Boolean(user?.roles?.includes(role))

    return {
      bootstrapping,
      isAuthenticated,
      user,
      session,
      login,
      register,
      verifyOtp,
      logout,
      hasRole,
      // True when we should kick off a silent refresh — exposed so route
      // guards can decide to wait instead of bouncing to /login.
      accessTokenExpired: isAccessTokenExpired(session?.expiresAt),
    }
  }, [bootstrapping, session, login, register, verifyOtp, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext