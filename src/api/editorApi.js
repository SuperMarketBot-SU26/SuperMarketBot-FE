/**
 * Map Editor API — endpoints consumed by the standalone map editor HTML.
 * The HTML runs inside an iframe and talks to the parent Vite app's API proxy.
 *
 * In dev:   parent origin → Vite proxy → http://localhost:5000
 * In prod:  parent origin → same-origin /api → ABSOLUTE_BASE_URL
 *
 * All requests include the Bearer token from localStorage (same as the React app).
 */

import axios from 'axios'
import { getErrorMessage } from './client'

// All requests below include the full `/api/v1/...` path, so we keep baseURL
// empty and let axios pass them through unchanged. The Vite proxy handles
// forwarding `/api/v1/...` to the backend on http://localhost:5000 in dev.
const BASE = ''

const editorClient = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every request
editorClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Maps ───────────────────────────────────────────────────────────────────

/** GET /v1/maps/latest?floorId= */
export const getLatestMap = async ({ floorId } = {}) => {
  const res = await editorClient.get('/api/v1/maps/latest', { params: { floorId } })
  return res.data
}

/** POST /v1/maps/sync */
export const syncMap = async (payload) => {
  const res = await editorClient.post('/api/v1/maps/sync', payload)
  return res.data
}

/** POST /v1/maps/{mapId}/upload-image (multipart) */
export const uploadMapImage = async (mapId, formData) => {
  // Override axios instance default `application/json`. Axios adds boundary.
  const res = await editorClient.post(`/api/v1/maps/${mapId}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/** GET /v1/routes?mapId=&zoneId=&routeType= */
export const getRoutes = async ({ mapId, zoneId, routeType } = {}) => {
  const res = await editorClient.get('/api/v1/routes', { params: { mapId, zoneId, routeType } })
  return res.data ?? []
}

/** GET /v1/routes/{routeId} */
export const getRoute = async (routeId) => {
  const res = await editorClient.get(`/api/v1/routes/${routeId}`)
  return res.data
}

/** POST /v1/routes */
export const createRoute = async (payload) => {
  const res = await editorClient.post('/api/v1/routes', payload)
  return res.data
}

/** PUT /v1/routes/{routeId} */
export const updateRoute = async (routeId, payload) => {
  const res = await editorClient.put(`/api/v1/routes/${routeId}`, payload)
  return res.data
}

/** DELETE /v1/routes/{routeId} */
export const deleteRoute = async (routeId) => {
  const res = await editorClient.delete(`/api/v1/routes/${routeId}`)
  return res.status === 204
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/** POST /Navigation/route — Dijkstra, does NOT send to robot */
export const planRoute = async ({ startNodeId, endNodeId }) => {
  const res = await editorClient.post('/Navigation/route', { startNodeId, endNodeId })
  return res.data ?? {}
}

/** POST /Navigation/navigate — Dijkstra + MQTT publish */
export const navigateRobot = async (payload) => {
  const res = await editorClient.post('/Navigation/navigate', payload)
  return res.data
}

// ─── Robots ──────────────────────────────────────────────────────────────────

/** GET /Robots/{robotCode}/pose */
export const getRobotPose = async (robotCode) => {
  const res = await editorClient.get(`/Robots/${encodeURIComponent(robotCode)}/pose`)
  return res.data
}

/** GET /Robots */
export const getRobots = async () => {
  const res = await editorClient.get('/Robots')
  return res.data
}

/** POST /Robots/command */
export const publishRobotCommand = async (payload) => {
  const res = await editorClient.post('/Robots/command', payload)
  return res.data
}

export { getErrorMessage }
