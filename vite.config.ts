import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

function resolveDevProxyTarget(mode: string): string {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8080'

  return apiBaseUrl.startsWith('http') ? apiBaseUrl : 'http://localhost:8080'
}

// Chunk 1 先把开发代理补齐，保证后续所有业务模块都能通过 /api 与 /files 无感联调后端。
export default defineConfig(({ mode }) => {
  const proxyTarget = resolveDevProxyTarget(mode)

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/files': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
