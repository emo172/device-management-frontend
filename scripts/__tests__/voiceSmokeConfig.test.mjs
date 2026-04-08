import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveChromiumExecutablePath } from '../../playwright.voice-smoke.config.mjs'

const KNOWN_FALLBACK_PATHS = [
  '/opt/google/chrome/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

test('显式配置环境变量时允许外部注入 Chromium 可执行路径', () => {
  assert.equal(
    resolveChromiumExecutablePath({
      PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/tmp/playwright/chromium/chrome',
    }),
    '/tmp/playwright/chromium/chrome',
  )
})

test('未配置覆盖变量时只会返回已知回退路径或 null', () => {
  const resolvedPath = resolveChromiumExecutablePath({})

  assert.ok(resolvedPath === null || KNOWN_FALLBACK_PATHS.includes(resolvedPath))
})
