import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const configFilePath = fileURLToPath(import.meta.url)
const repoRoot = dirname(configFilePath)

/**
 * task 7 只需要最小本地冒烟能力。
 * 这里优先复用本机已缓存的 Playwright Chromium，避免因为外网波动再次阻塞 smoke 验证。
 */
function resolveChromiumExecutablePath() {
  const cachedBrowserRoot = join(homedir(), '.cache', 'ms-playwright')

  if (!existsSync(cachedBrowserRoot)) {
    throw new Error(`未找到 Playwright 浏览器缓存目录：${cachedBrowserRoot}`)
  }

  const chromiumCandidates = readdirSync(cachedBrowserRoot)
    .filter((entry) => entry.startsWith('chromium-'))
    .sort()
    .reverse()

  for (const candidate of chromiumCandidates) {
    const chromiumRoot = join(cachedBrowserRoot, candidate)
    const linux64Path = join(chromiumRoot, 'chrome-linux64', 'chrome')
    const legacyLinuxPath = join(chromiumRoot, 'chrome-linux', 'chrome')

    if (existsSync(linux64Path)) {
      return linux64Path
    }

    if (existsSync(legacyLinuxPath)) {
      return legacyLinuxPath
    }
  }

  throw new Error(`未在 ${cachedBrowserRoot} 下找到可执行的 Chromium 浏览器`)
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
