import { useContext } from 'react'
import AuthContext from './AuthContext'

/**
 * useAuth — consumer hook for the AuthContext.
 * Lives in its own file so the Provider file (AuthContext.jsx) only
 * exports components, which keeps Vite Fast Refresh happy.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return ctx
}