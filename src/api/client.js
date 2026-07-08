import axios from 'axios'
import { clearSession } from '../features/auth/authStorage'

// Pick the active backend URL from env.
// `VITE_ACTIVE_BACKEND` selects between `local` and `ngrok`; the actual
// base URL is read from the matching `VITE_<MODE>_API_URL` variable.
const ACTIVE_BACKEND = (import.meta.env.VITE_ACTIVE_BACKEND || 'local').toLowerCase()
const LOCAL_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:5000'
const NGROK_URL = import.meta.env.VITE_NGROK_API_URL || ''

const ABSOLUTE_BASE_URL =
  ACTIVE_BACKEND === 'ngrok' && NGROK_URL ? NGROK_URL : LOCAL_URL

// In dev, always go through the Vite proxy (`/api`) so the `ngrok-skip-browser-warning`
// header can be injected server-side. In a production build there is no proxy, so we
// call the absolute URL directly. You can force absolute mode by setting
// `VITE_API_BASE_URL` directly.
const DEV_PROXY_BASE = '/api'
const EXPLICIT_BASE = import.meta.env.VITE_API_BASE_URL

export const ACTIVE_BACKEND_MODE = ACTIVE_BACKEND
export const ACTIVE_BACKEND_URL = ABSOLUTE_BASE_URL

const baseURL =
  EXPLICIT_BASE ||
  (import.meta.env.DEV ? DEV_PROXY_BASE : ABSOLUTE_BASE_URL)

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Endpoints that should NEVER trigger a token-clear on 401 — they're the
// auth flow itself. If login itself bounces, we want the Login page to
// surface the error, not be redirected away mid-form.
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/face-login',
  '/auth/login-face',
]

function isPublicAuthPath(url = '') {
  // Strip query string + any base prefix
  const path = url.split('?')[0]
  return PUBLIC_PATHS.some((p) => path.endsWith(p))
}

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Ngrok's free tier shows a browser-warning interstitial unless the
    // request carries this header. The Vite proxy adds it in dev; in a
    // production build we have to add it client-side when targeting ngrok.
    if (!import.meta.env.DEV && ACTIVE_BACKEND === 'ngrok') {
      config.headers['ngrok-skip-browser-warning'] = 'true'
    }
    return config
  },
  (error) => Promise.reject(error)
)

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''

    // Token-bearing endpoint rejected the access token → session is dead.
    // Wipe storage and bounce to login so the user can re-auth.
    if (status === 401 && !isPublicAuthPath(url)) {
      clearSession()
      // Avoid clobbering an in-progress login/register screen.
      const onAuthPage = ['/login', '/register'].some((p) =>
        window.location.pathname.startsWith(p)
      )
      if (!onAuthPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client