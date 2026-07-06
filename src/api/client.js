import axios from 'axios'

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
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client