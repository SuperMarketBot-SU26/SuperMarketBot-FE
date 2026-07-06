import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all VITE_* vars from .env files so we can pick the proxy target here.
  const env = loadEnv(mode, process.cwd(), '')
  const activeBackend = (env.VITE_ACTIVE_BACKEND || 'local').toLowerCase()
  const proxyTarget =
    activeBackend === 'ngrok' && env.VITE_NGROK_API_URL
      ? env.VITE_NGROK_API_URL
      : env.VITE_LOCAL_API_URL || 'http://localhost:5000'

  // Only attach the ngrok interstitial-bypass header when actually proxying to ngrok.
  const isNgrok = activeBackend === 'ngrok' && !!env.VITE_NGROK_API_URL

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
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
        },
      },
    },
  }
})