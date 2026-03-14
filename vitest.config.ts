import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // 这里保留 Node 原生测试给测试包装脚本使用，避免被 Vitest 当成套件再次执行。
      exclude: [...configDefaults.exclude, 'e2e/**', 'scripts/__tests__/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
