import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const configFilePath = fileURLToPath(import.meta.url)
const repoRoot = dirname(configFilePath)

/**
 * 语音 smoke 默认走 Playwright 自带的浏览器解析能力。
 * 若当前环境没有安装 Playwright 自带浏览器，再回退到常见的系统 Chrome/Chromium 路径，避免把本机缓存目录写死进仓库。
 */
const FALLBACK_CHROMIUM_EXECUTABLE_PATHS = [
  '/opt/google/chrome/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

export function resolveChromiumExecutablePath(env = process.env) {
  const executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim()

  if (executablePath) {
    return executablePath
  }

  return FALLBACK_CHROMIUM_EXECUTABLE_PATHS.find((filePath) => existsSync(filePath)) ?? null
}

export const voiceSmokeConfig = {
  browserExecutablePath: resolveChromiumExecutablePath(),
  browserLaunchArgs: ['--no-sandbox', '--disable-dev-shm-usage'],
  browserStateKey: '__AI_VOICE_SMOKE__',
  browserStateSeed: {
    mediaMode: 'success',
  },
  repoRoot,
  server: {
    baseURL: 'http://127.0.0.1:4173',
    readyTimeoutMs: 60_000,
    spawnArgs: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
    spawnCommand: 'npm',
  },
  storage: {
    accessTokenKey: 'access_token',
    refreshTokenKey: 'refresh_token',
    userInfoKey: 'user_info',
  },
  timeouts: {
    assertionMs: 15_000,
    navigationMs: 20_000,
  },
  voiceTestIds: {
    error: 'ai-voice-error',
    recordToggle: 'ai-voice-record-toggle',
    status: 'ai-voice-status',
  },
}
