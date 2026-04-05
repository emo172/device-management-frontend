import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const configFilePath = fileURLToPath(import.meta.url)
const repoRoot = dirname(configFilePath)

/**
 * 语音 smoke 默认走 Playwright 自带的浏览器解析能力。
 * 只有 CI 或特殊环境显式传入路径时才覆盖，避免把作者本机缓存目录写死进仓库。
 */
export function resolveChromiumExecutablePath(env = process.env) {
  const executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim()
  return executablePath ? executablePath : null
}

export const voiceSmokeConfig = {
  browserExecutablePath: resolveChromiumExecutablePath(),
  browserLaunchArgs: ['--no-sandbox', '--disable-dev-shm-usage'],
  browserStateKey: '__AI_VOICE_SMOKE__',
  browserStateSeed: {
    audioPlayMode: 'success',
    mediaMode: 'success',
    recordedChunkText: 'voice-smoke-chunk',
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
    historyPlay: 'ai-history-play',
    messagePlay: 'ai-message-play',
    recordToggle: 'ai-voice-record-toggle',
    status: 'ai-voice-status',
  },
}
