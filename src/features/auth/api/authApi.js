/**
 * Auth API — /api/auth
 *
 * Backend endpoints (AuthController.cs):
 *   POST /api/auth/register        → { fullName, email, phone?, password }    → 200 { message }
 *   POST /api/auth/verify-otp      → { email, otpCode }                       → 200 AuthResponseDto
 *   POST /api/auth/resend-otp      → { email }                                → 200 { message }
 *   POST /api/auth/login           → { email, password }                      → 200 AuthResponseDto
 *   POST /api/auth/refresh         → { refreshToken }                         → 200 AuthResponseDto
 *   POST /api/auth/logout [Authorize] → { refreshToken }                       → 200 { message }
 *
 * AuthResponseDto:
 *   { accessToken, refreshToken, accessTokenExpiresAt, userId, email, fullName, roles: string[] }
 *
 * Token storage is owned by `features/auth/authStorage.js`. This file only
 * deals with HTTP — callers persist the token via `setSession(...)` from the
 * AuthContext (see features/auth/AuthContext.jsx).
 *
 * Notes:
 * - Login + VerifyOtp return tokens; caller must call setSession on success.
 * - Register returns only a message (no token yet) — the BE creates the row +
 *   sends an OTP email; FE then calls verifyOtp to actually log the user in.
 * - Refresh rotates the refresh token (BE revokes the old one), so the new
 *   token must replace the old in storage.
 */

import client from '../../../api/client'

const ENDPOINT = '/auth'

// ── Public types (shape only — JS at runtime) ────────────────────────
// AuthSession {
//   accessToken: string
//   refreshToken: string
//   accessTokenExpiresAt: string (ISO)
//   user: { id: number, email: string, fullName: string|null, roles: string[] }
// }

export const login = async ({ email, password }) => {
  const res = await client.post(`${ENDPOINT}/login`, { email, password })
  return normalizeAuthResponse(res.data)
}

export const registerRequestOtp = async ({ fullName, email, phone, password }) => {
  const res = await client.post(`${ENDPOINT}/register`, {
    fullName,
    email,
    phone: phone || undefined,
    password,
  })
  // BE returns { message } only
  return res.data ?? { message: 'Đã gửi yêu cầu.' }
}

export const verifyOtp = async ({ email, otpCode }) => {
  const res = await client.post(`${ENDPOINT}/verify-otp`, { email, otpCode })
  return normalizeAuthResponse(res.data)
}

export const resendOtp = async ({ email }) => {
  const res = await client.post(`${ENDPOINT}/resend-otp`, { email })
  return res.data ?? { message: 'Đã gửi lại OTP.' }
}

export const refreshTokens = async ({ refreshToken }) => {
  const res = await client.post(`${ENDPOINT}/refresh`, { refreshToken })
  return normalizeAuthResponse(res.data)
}

export const logout = async ({ refreshToken }) => {
  const res = await client.post(`${ENDPOINT}/logout`, { refreshToken })
  return res.data ?? { message: 'Đã đăng xuất.' }
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Normalize BE's AuthResponseDto (PascalCase, plain arrays) into the FE's
 * internal shape (camelCase, nested `user` object). BE serializer is already
 * camelCase per Program.cs:23, but the field names line up so we mostly
 * re-arrange.
 */
function normalizeAuthResponse(raw) {
  if (!raw) throw new Error('Empty auth response from server.')
  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    accessTokenExpiresAt: raw.accessTokenExpiresAt,
    user: {
      id: raw.userId,
      email: raw.email,
      fullName: raw.fullName ?? null,
      roles: Array.isArray(raw.roles) ? raw.roles : [],
    },
  }
}