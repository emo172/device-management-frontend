import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveChromiumExecutablePath } from '../../playwright.voice-smoke.config.mjs'

test('未配置覆盖变量时不强依赖作者本机的 Chromium 路径', () => {
  assert.equal(resolveChromiumExecutablePath({}), null)
})

test('显式配置环境变量时允许外部注入 Chromium 可执行路径', () => {
  assert.equal(
    resolveChromiumExecutablePath({
      PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/tmp/playwright/chromium/chrome',
    }),
    '/tmp/playwright/chromium/chrome',
  )
})
