import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

import { chromium } from 'playwright-core'

import { voiceSmokeConfig } from '../playwright.voice-smoke.config.mjs'

const SMOKE_USER = {
  email: 'voice-smoke@example.com',
  phone: '13800138000',
  realName: '语音冒烟用户',
  role: 'USER',
  userId: 'voice-smoke-user',
  username: 'voice-smoke',
}

function createApiEnvelope(data, message = 'ok') {
  return {
    code: 0,
    data,
    message,
  }
}

function createApiFailure(message) {
  return {
    code: 1,
    data: null,
    message,
  }
}

function createDeferred() {
  let resolvePromise

  const promise = new Promise((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve() {
      resolvePromise?.()
    },
  }
}

function createSmokeScenario(overrides = {}) {
  return {
    chatRequests: [],
    historyDetails: {},
    historyList: [],
    speechResponses: {},
    transcriptionResponses: [],
    ...overrides,
  }
}

async function waitForServer(baseURL, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL)

      if (response.ok) {
        return
      }

      lastError = new Error(`开发服务器返回异常状态：${response.status}`)
    } catch (error) {
      lastError = error
    }

    await delay(500)
  }

  throw new Error(
    `等待开发服务器超时：${baseURL}${lastError instanceof Error ? `，最后一次错误：${lastError.message}` : ''}`,
  )
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.killed || serverProcess.exitCode !== null) {
    return
  }

  serverProcess.kill('SIGTERM')

  await Promise.race([
    new Promise((resolve) => {
      serverProcess.once('exit', resolve)
    }),
    delay(5_000).then(() => {
      if (serverProcess.exitCode === null) {
        serverProcess.kill('SIGKILL')
      }
    }),
  ])
}

function startServer() {
  const stdoutLogs = []
  const stderrLogs = []
  const { baseURL, readyTimeoutMs, spawnArgs, spawnCommand } = voiceSmokeConfig.server

  const serverProcess = spawn(spawnCommand, spawnArgs, {
    cwd: voiceSmokeConfig.repoRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  serverProcess.stdout?.on('data', (chunk) => {
    stdoutLogs.push(String(chunk))
  })
  serverProcess.stderr?.on('data', (chunk) => {
    stderrLogs.push(String(chunk))
  })

  return {
    async ready() {
      try {
        await waitForServer(baseURL, readyTimeoutMs)
      } catch (error) {
        await stopServer(serverProcess)

        const stdout = stdoutLogs.join('').trim()
        const stderr = stderrLogs.join('').trim()
        const logSuffix = [stdout ? `stdout:\n${stdout}` : '', stderr ? `stderr:\n${stderr}` : '']
          .filter(Boolean)
          .join('\n\n')

        throw new Error(
          `${error instanceof Error ? error.message : '开发服务器启动失败'}${logSuffix ? `\n\n${logSuffix}` : ''}`,
        )
      }
    },
    async stop() {
      await stopServer(serverProcess)
    },
  }
}

function resolveHistoryIdFromSpeechPath(pathname) {
  const prefix = '/api/ai/history/'
  const suffix = '/speech'

  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null
  }

  return pathname.slice(prefix.length, pathname.length - suffix.length)
}

function resolveHistoryIdFromDetailPath(pathname) {
  const prefix = '/api/ai/history/'

  if (!pathname.startsWith(prefix)) {
    return null
  }

  const suffix = pathname.slice(prefix.length)

  if (!suffix || suffix.includes('/')) {
    return null
  }

  return suffix
}

async function registerApiStubs(page, scenario) {
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { method, pathname } = { method: request.method(), pathname: url.pathname }

    if (!pathname.startsWith('/api/')) {
      await route.continue()
      return
    }

    if (method === 'GET' && pathname === '/api/auth/me') {
      await route.fulfill({
        body: JSON.stringify(createApiEnvelope(SMOKE_USER)),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (method === 'GET' && pathname === '/api/notifications/unread-count') {
      await route.fulfill({
        body: JSON.stringify(createApiEnvelope({ unreadCount: 0 })),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (method === 'POST' && pathname === '/api/ai/speech/transcriptions') {
      const nextResponse = scenario.transcriptionResponses.shift()

      if (!nextResponse) {
        throw new Error('未为语音转写请求配置响应')
      }

      if (nextResponse.delay) {
        await nextResponse.delay
      }

      if (nextResponse.type === 'error') {
        await route.fulfill({
          body: JSON.stringify(createApiFailure(nextResponse.message)),
          contentType: 'application/json',
          status: nextResponse.status ?? 400,
        })
        return
      }

      await route.fulfill({
        body: JSON.stringify(createApiEnvelope(nextResponse.data)),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (method === 'POST' && pathname === '/api/ai/chat') {
      const payload = request.postDataJSON()
      scenario.chatRequests.push(payload)

      assert.equal(typeof payload?.message, 'string', 'AI chat 请求必须带上 message 字段')

      await route.fulfill({
        body: JSON.stringify(createApiEnvelope(scenario.chatResponse)),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (method === 'GET' && pathname === '/api/ai/history') {
      await route.fulfill({
        body: JSON.stringify(createApiEnvelope(scenario.historyList)),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (method === 'GET' && pathname.endsWith('/speech')) {
      const historyId = resolveHistoryIdFromSpeechPath(pathname)

      if (!historyId) {
        throw new Error(`无法解析历史语音请求：${pathname}`)
      }

      const speechResponse = scenario.speechResponses[historyId]

      if (!speechResponse) {
        throw new Error(`未为历史语音 ${historyId} 配置响应`)
      }

      if (speechResponse.type === 'error') {
        await route.fulfill({
          body: JSON.stringify(createApiFailure(speechResponse.message)),
          contentType: 'application/json',
          status: speechResponse.status ?? 500,
        })
        return
      }

      await route.fulfill({
        body: Buffer.from(speechResponse.body),
        contentType: speechResponse.contentType,
        status: 200,
      })
      return
    }

    if (method === 'GET') {
      const historyId = resolveHistoryIdFromDetailPath(pathname)

      if (historyId) {
        const historyDetail = scenario.historyDetails[historyId]

        if (!historyDetail) {
          throw new Error(`未为历史详情 ${historyId} 配置响应`)
        }

        await route.fulfill({
          body: JSON.stringify(createApiEnvelope(historyDetail)),
          contentType: 'application/json',
          status: 200,
        })
        return
      }
    }

    await route.fulfill({
      body: JSON.stringify(createApiFailure(`未配置的冒烟请求：${method} ${pathname}`)),
      contentType: 'application/json',
      status: 500,
    })
  })
}

async function setBrowserSmokeState(page, partialState) {
  await page.evaluate(
    ({ key, partialState: statePatch }) => {
      const currentState = window[key]

      if (!currentState || typeof currentState !== 'object') {
        throw new Error('浏览器冒烟状态尚未初始化')
      }

      Object.assign(currentState, statePatch)
    },
    { key: voiceSmokeConfig.browserStateKey, partialState },
  )
}

async function createSmokePage(browser, scenario) {
  const context = await browser.newContext()
  const seededUserInfo = JSON.stringify(SMOKE_USER)

  await context.addInitScript(
    ({ browserStateKey, browserStateSeed, seededUserInfo, storage }) => {
      window[browserStateKey] = {
        ...browserStateSeed,
      }

      localStorage.setItem(storage.accessTokenKey, 'voice-smoke-access-token')
      localStorage.setItem(storage.refreshTokenKey, 'voice-smoke-refresh-token')
      localStorage.setItem(storage.userInfoKey, seededUserInfo)

      const smokeState = window[browserStateKey]

      class FakeMediaRecorder extends EventTarget {
        static isTypeSupported(type) {
          return type === 'audio/webm;codecs=opus' || type === 'audio/webm'
        }

        constructor(stream, options = {}) {
          super()
          this.mimeType = options.mimeType || 'audio/webm'
          this.state = 'inactive'
          this.stream = stream
        }

        start() {
          this.state = 'recording'
        }

        stop() {
          if (this.state === 'inactive') {
            return
          }

          this.state = 'inactive'

          const chunkEvent = new Event('dataavailable')
          chunkEvent.data = new Blob([smokeState.recordedChunkText], { type: this.mimeType })
          this.dispatchEvent(chunkEvent)
          this.dispatchEvent(new Event('stop'))
        }
      }

      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: FakeMediaRecorder,
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          async getUserMedia() {
            if (smokeState.mediaMode === 'denied') {
              throw new DOMException('Permission denied', 'NotAllowedError')
            }

            return {
              getTracks() {
                return [
                  {
                    stop() {},
                  },
                ]
              },
            }
          },
        },
      })

      HTMLMediaElement.prototype.play = async function play() {
        if (smokeState.audioPlayMode === 'reject') {
          throw new Error('NotAllowedError')
        }

        return undefined
      }
    },
    {
      browserStateKey: voiceSmokeConfig.browserStateKey,
      browserStateSeed: voiceSmokeConfig.browserStateSeed,
      seededUserInfo,
      storage: voiceSmokeConfig.storage,
    },
  )

  const page = await context.newPage()
  page.setDefaultNavigationTimeout(voiceSmokeConfig.timeouts.navigationMs)
  page.setDefaultTimeout(voiceSmokeConfig.timeouts.assertionMs)

  await registerApiStubs(page, scenario)

  return {
    context,
    page,
  }
}

async function waitForText(page, selector, expectedText) {
  await page.waitForFunction(
    ({ expectedText, selector }) => {
      const element = document.querySelector(selector)
      return typeof element?.textContent === 'string' && element.textContent.includes(expectedText)
    },
    { expectedText, selector },
  )
}

async function waitForButtonLabel(page, selector, expectedText) {
  await waitForText(page, selector, expectedText)
}

async function runHappyPath(browser) {
  const transcriptGate = createDeferred()
  const happyHistoryId = 'history-voice-1'
  const transcriptText = '帮我预约明天上午的示波器'
  const assistantResponseText = '已为你整理明天上午的预约建议。'
  const scenario = createSmokeScenario({
    chatResponse: {
      aiResponse: assistantResponseText,
      executeResult: 'SUCCESS',
      id: happyHistoryId,
      intent: 'RESERVE',
      sessionId: 'voice-session-1',
    },
    historyDetails: {
      [happyHistoryId]: {
        aiResponse: assistantResponseText,
        createdAt: '2026-04-04T12:00:00',
        errorMessage: null,
        executeResult: 'SUCCESS',
        extractedInfo: '{"deviceName":"示波器"}',
        id: happyHistoryId,
        intent: 'RESERVE',
        llmModel: 'smoke-model',
        responseTimeMs: 120,
        sessionId: 'voice-session-1',
        userInput: transcriptText,
      },
    },
    historyList: [
      {
        createdAt: '2026-04-04T12:00:00',
        executeResult: 'SUCCESS',
        id: happyHistoryId,
        intent: 'RESERVE',
        sessionId: 'voice-session-1',
        userInput: transcriptText,
      },
    ],
    speechResponses: {
      [happyHistoryId]: {
        body: 'happy-audio',
        contentType: 'audio/mpeg',
        type: 'success',
      },
    },
    transcriptionResponses: [
      {
        data: {
          locale: 'zh-CN',
          provider: 'smoke-provider',
          transcript: transcriptText,
        },
        delay: transcriptGate.promise,
        type: 'success',
      },
    ],
  })

  const { context, page } = await createSmokePage(browser, scenario)
  const recordToggleSelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.recordToggle}"]`
  const statusSelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.status}"]`
  const messagePlaySelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.messagePlay}"]`
  const historyPlaySelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.historyPlay}"]`

  try {
    await page.goto(`${voiceSmokeConfig.server.baseURL}/ai`)
    await waitForText(page, statusSelector, '点击开始录音，最长 60 秒；转写成功后会自动发送。')

    await page.click(recordToggleSelector)
    await waitForText(page, statusSelector, '正在录音，最多 60 秒后自动提交。')
    await waitForButtonLabel(page, recordToggleSelector, '停止录音')

    await page.click(recordToggleSelector)
    await waitForText(page, statusSelector, '正在转写语音并发送，请稍候。')
    await waitForButtonLabel(page, recordToggleSelector, '转写中')

    transcriptGate.resolve()

    await page.waitForFunction(
      (assistantResponseText) => document.body.textContent?.includes(assistantResponseText) ?? false,
      assistantResponseText,
    )
    await waitForButtonLabel(page, recordToggleSelector, '开始录音')

    assert.equal(scenario.chatRequests.length, 1, 'happy path 应只发送一次 AI chat 请求')
    assert.equal(scenario.chatRequests[0]?.message, transcriptText, 'chat 请求应复用转写文本发送')

    await page.waitForSelector(messagePlaySelector)
    await page.click(messagePlaySelector)
    await waitForButtonLabel(page, messagePlaySelector, '停止播放')

    await page.goto(`${voiceSmokeConfig.server.baseURL}/ai/history`)
    await page.waitForSelector(`[data-history-id="${happyHistoryId}"]`)
    await page.click(`[data-history-id="${happyHistoryId}"]`)
    await page.waitForSelector(historyPlaySelector)
    await page.click(historyPlaySelector)
    await waitForButtonLabel(page, historyPlaySelector, '停止播放')
  } finally {
    await context.close()
  }
}

async function runErrorPath(browser) {
  const errorHistoryId = 'history-error-1'
  const scenario = createSmokeScenario({
    chatResponse: {
      aiResponse: '当前可借设备有示波器。',
      executeResult: 'SUCCESS',
      id: errorHistoryId,
      intent: 'QUERY',
      sessionId: 'voice-session-error',
    },
    speechResponses: {
      [errorHistoryId]: {
        message: '语音播放服务暂时不可用',
        status: 500,
        type: 'error',
      },
    },
    transcriptionResponses: [
      {
        message: '语音功能未开启',
        status: 400,
        type: 'error',
      },
    ],
  })

  const { context, page } = await createSmokePage(browser, scenario)
  const recordToggleSelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.recordToggle}"]`
  const statusSelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.status}"]`
  const errorSelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.error}"]`
  const messagePlaySelector = `[data-testid="${voiceSmokeConfig.voiceTestIds.messagePlay}"]`

  try {
    await page.goto(`${voiceSmokeConfig.server.baseURL}/ai`)

    await setBrowserSmokeState(page, { mediaMode: 'denied' })
    await page.click(recordToggleSelector)
    await waitForText(page, statusSelector, '麦克风权限未开启，可继续输入文字消息。')
    await waitForText(page, errorSelector, '麦克风权限被拒绝，请在浏览器设置中允许访问后重试。')

    await setBrowserSmokeState(page, { mediaMode: 'success' })
    await page.click(recordToggleSelector)
    await waitForButtonLabel(page, recordToggleSelector, '停止录音')
    await page.click(recordToggleSelector)
    await waitForText(page, errorSelector, '语音功能未开启')
    await waitForButtonLabel(page, recordToggleSelector, '开始录音')

    await page.locator('textarea').fill('帮我查看今天可借设备')
    await page.getByRole('button', { name: '发送消息' }).click()
    await page.waitForFunction(
      () => document.body.textContent?.includes('当前可借设备有示波器。') ?? false,
    )

    await page.waitForSelector(messagePlaySelector)
    await page.click(messagePlaySelector)
    await page.waitForFunction(
      () =>
        document.body.textContent?.includes('语音播放服务暂时不可用') ?? false,
    )
    await waitForButtonLabel(page, messagePlaySelector, '播放语音')
  } finally {
    await context.close()
  }
}

async function main() {
  const server = startServer()

  await server.ready()

  const browser = await chromium.launch({
    args: voiceSmokeConfig.browserLaunchArgs,
    executablePath: voiceSmokeConfig.browserExecutablePath,
    headless: true,
  })

  try {
    console.log('▶ 运行 happy-path 语音冒烟')
    await runHappyPath(browser)
    console.log('✓ happy-path 语音冒烟通过')

    console.log('▶ 运行 error-path 语音冒烟')
    await runErrorPath(browser)
    console.log('✓ error-path 语音冒烟通过')
  } finally {
    await browser.close()
    await server.stop()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  console.error(`✗ task 7 语音冒烟失败\n${message}`)
  process.exitCode = 1
})
