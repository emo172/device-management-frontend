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
    build: {
      rollupOptions: {
        output: {
          /**
           * 当前项目已经接入 Element Plus、Vue Router、Pinia 与 Axios。
           * 若不做 vendor 拆包，这些基础依赖会被压进单个入口 chunk，导致主包过大并触发构建告警。
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined
            }

            if (id.includes('element-plus')) {
              return 'vendor-element-plus'
            }

            if (id.includes('@element-plus/icons-vue')) {
              return 'vendor-element-icons'
            }

            if (id.includes('vue') || id.includes('@vue')) {
              return 'vendor-vue'
            }

            if (id.includes('vue-router') || id.includes('pinia')) {
              return 'vendor-state-router'
            }

            if (id.includes('axios') || id.includes('nprogress')) {
              return 'vendor-network'
            }

            return 'vendor-misc'
          },
        },
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
