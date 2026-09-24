import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const cleanUrl = (url) => {
  if (!url) return ''
  return url.replace(/\/scalar.*$/i, '').replace(/\/+$/, '')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all VITE_* vars from .env files so we can pick the proxy target here.
  const env = loadEnv(mode, process.cwd(), '')
  const activeBackend = (env.VITE_ACTIVE_BACKEND || 'local').toLowerCase()

  let proxyTarget = cleanUrl(env.VITE_LOCAL_API_URL) || 'http://localhost:5000'
  if (env.VITE_API_BASE_URL) {
    proxyTarget = cleanUrl(env.VITE_API_BASE_URL)
  } else if (activeBackend === 'azure' || activeBackend === 'cloud' || activeBackend === 'prod' || activeBackend === 'production') {
    proxyTarget = cleanUrl(env.VITE_AZURE_API_URL) || 'https://smartmarketbot-api-d3achkeqhdcbfudw.southeastasia-01.azurewebsites.net'
  } else if (activeBackend === 'ngrok' && env.VITE_NGROK_API_URL) {
    proxyTarget = cleanUrl(env.VITE_NGROK_API_URL)
  }

  // Only attach the ngrok interstitial-bypass header when actually proxying to ngrok.
  const isNgrok = activeBackend === 'ngrok' && !!env.VITE_NGROK_API_URL

  // The FE sends `/api/v1/...` and the BE is also mounted at `/api/v1/...`,
  // so we forward the path verbatim — no rewrite needed.
  const proxyConfig = {
    target: proxyTarget,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path,
    ...(isNgrok && {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('ngrok-skip-browser-warning', 'true')
        })
      },
    }),
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      watch: {
        // Exclude stitch-skills-main (a plugin toolkit dropped into the project root)
        // from the file watcher so Vite never tries to watch its locked .gitignore.
        ignored: ['**/stitch-skills-main/**'],
      },
      proxy: {
        '/api': proxyConfig,
        '/uploads': proxyConfig,
        '/storage': proxyConfig,
        '/hubs': {
          ...proxyConfig,
          ws: true,
        },
      },
    },
  }
})