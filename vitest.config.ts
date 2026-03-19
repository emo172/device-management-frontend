import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig(({ mode }) => {
  const resolvedViteConfig =
    typeof viteConfig === 'function'
      ? viteConfig({
          command: 'serve',
          mode,
          isSsrBuild: false,
          isPreview: false,
        })
      : viteConfig

  return mergeConfig(
    resolvedViteConfig,
    defineConfig({
      test: {
        // 轻玻璃方案需要在单测里读取运行时样式，因此这里显式开启 CSS/SCSS 处理链路。
        css: true,
        environment: 'jsdom',
        // 这里保留 Node 原生测试给测试包装脚本使用，避免被 Vitest 当成套件再次执行。
        exclude: [...configDefaults.exclude, 'e2e/**', 'scripts/__tests__/**'],
        root: fileURLToPath(new URL('./', import.meta.url)),
      },
    }),
  )
})
