/**
 * Auth storage — single source of truth for what's in localStorage.
 *
 * Why a tiny module instead of touching localStorage from everywhere:
 *   - One place to change the storage key prefix (and survive a rename)
 *   - One place to JSON.parse / JSON.stringify safely
 *   - The 401-interceptor in api/client.js calls clear() on auth failure,
 *     so it must know the exact same keys the AuthContext writes.
 *
 * Keys (unchanged from the legacy client.js to stay backwards-compatible
 * with whatever was already deployed):
 *   accessToken      — raw JWT bearer
 *   refreshToken     — raw refresh token (rotated on every refresh)
 *   accessTokenExpiresAt — ISO string, used to decide when to refresh
 *   authUser         — JSON: { id, email, fullName, roles: string[] }
 *
 * NOTE: Storing the JWT in localStorage is convenient but XSS-vulnerable.
 * For a capstone/admin dashboard on an internal network this is fine; if
 * this ever ships to a public site, swap to httpOnly cookies.
 */

const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  expiresAt: 'accessTokenExpiresAt',
  user: 'authUser',
}

export function loadSession() {
  const accessToken = localStorage.getItem(KEYS.accessToken)
  const refreshToken = localStorage.getItem(KEYS.refreshToken)
  const expiresAt = localStorage.getItem(KEYS.expiresAt)
  const userRaw = localStorage.getItem(KEYS.user)

  if (!accessToken || !refreshToken) return null

  let user = null
  if (userRaw) {
    try {
      user = JSON.parse(userRaw)
    } catch {
      // Bad JSON in storage — fall through with user = null
    }
  }

  return { accessToken, refreshToken, expiresAt, user }
}

export function saveSession({ accessToken, refreshToken, accessTokenExpiresAt, user }) {
  localStorage.setItem(KEYS.accessToken, accessToken)
  localStorage.setItem(KEYS.refreshToken, refreshToken)
  if (accessTokenExpiresAt) localStorage.setItem(KEYS.expiresAt, accessTokenExpiresAt)
  if (user) localStorage.setItem(KEYS.user, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(KEYS.accessToken)
  localStorage.removeItem(KEYS.refreshToken)
  localStorage.removeItem(KEYS.expiresAt)
  localStorage.removeItem(KEYS.user)
}

export function isAccessTokenExpired(expiresAtIso) {
  if (!expiresAtIso) return true
  const exp = Date.parse(expiresAtIso)
  if (Number.isNaN(exp)) return true
  // Treat as expired 30s before actual expiry so we don't race the clock.
  return Date.now() >= exp - 30_000
}