import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

import { chromium } from '@playwright/test'

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
    capabilities: {
      chatEnabled: true,
      speechEnabled: true,
    },
    chatRequests: [],
    historyDetails: {},
    historyList: [],
    requestOrder: [],
    transcriptionResponses: [],
    transcriptionRequests: [],
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

    if (method === 'GET' && pathname === '/api/ai/capabilities') {
      await route.fulfill({
        body: JSON.stringify(createApiEnvelope(scenario.capabilities)),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (method === 'POST' && pathname === '/api/ai/speech/transcriptions') {
      const multipartBodyText = request.postDataBuffer()?.toString('utf8') ?? ''

      scenario.requestOrder.push('transcription')
      scenario.transcriptionRequests.push({ bodyText: multipartBodyText })

      assert.match(multipartBodyText, /filename="voice\.wav"/, '语音转写上传必须使用 voice.wav 文件名')
      assert.match(multipartBodyText, /Content-Type: audio\/wav/i, '语音转写上传必须声明 audio/wav')
      assert.doesNotMatch(multipartBodyText, /audio\/webm/i, '语音转写上传不应残留 audio/webm 契约')

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

      scenario.requestOrder.push('chat')
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

      class FakeAudioBuffer {
        constructor(channels) {
          this.channels = channels
          this.numberOfChannels = channels.length
        }

        getChannelData(index) {
          return this.channels[index] ?? new Float32Array()
        }
      }

      class FakeAudioNode {
        connect() {
          return undefined
        }

        disconnect() {
          return undefined
        }
      }

      class FakeGainNode extends FakeAudioNode {
        gain = { value: 1 }
      }

      class FakeScriptProcessorNode extends FakeAudioNode {
        onaudioprocess = null

        emitChunk() {
          this.onaudioprocess?.({
            inputBuffer: new FakeAudioBuffer([
              new Float32Array([0, 0.25, -0.25, 0.5]),
              new Float32Array([0, -0.25, 0.25, -0.5]),
            ]),
          })
        }
      }

      class FakeMediaStreamAudioSourceNode extends FakeAudioNode {
        connect(target) {
          if (target instanceof FakeScriptProcessorNode) {
            target.emitChunk()
          }

          return undefined
        }
      }

      class FakeAudioContext {
        sampleRate = 48_000
        destination = new FakeAudioNode()

        async resume() {
          return undefined
        }

        createMediaStreamSource() {
          return new FakeMediaStreamAudioSourceNode()
        }

        createScriptProcessor() {
          return new FakeScriptProcessorNode()
        }

        createGain() {
          return new FakeGainNode()
        }

        async close() {
          return undefined
        }
      }

      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        writable: true,
        value: FakeAudioContext,
      })

      Object.defineProperty(window, 'webkitAudioContext', {
        configurable: true,
        writable: true,
        value: FakeAudioContext,
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          async getUserMedia() {
            if (smokeState.mediaMode === 'denied') {
              throw new DOMException('Permission denied', 'NotAllowedError')
            }

            return {
              getAudioTracks() {
                return [
                  {
                    stop() {},
                    getSettings() {
                      return { sampleRate: 48_000 }
                    },
                  },
                ]
              },
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
    transcriptionResponses: [
      {
        data: {
          locale: 'zh-CN',
          provider: 'iflytek',
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

  try {
    await page.goto(`${voiceSmokeConfig.server.baseURL}/ai`)
    await waitForText(page, statusSelector, '点击开始录音，最长 60 秒；转写后回填输入框，请确认后发送。')

    await page.click(recordToggleSelector)
    await waitForText(page, statusSelector, '正在录音，最多 60 秒后自动停止并转写。')
    await waitForButtonLabel(page, recordToggleSelector, '停止录音')

    await page.click(recordToggleSelector)
    await waitForText(page, statusSelector, '正在转写语音，请稍候。转写后回填输入框，请确认后发送。')
    await waitForButtonLabel(page, recordToggleSelector, '转写中')

    assert.deepEqual(scenario.requestOrder, ['transcription'], '录音结束后必须先发起转写请求')
    assert.equal(scenario.chatRequests.length, 0, '转写进行中不应提前触发 AI chat 请求')

    transcriptGate.resolve()

    await page.waitForFunction(
      (transcriptText) => {
        const textarea = document.querySelector('textarea')
        return textarea instanceof HTMLTextAreaElement && textarea.value === transcriptText
      },
      transcriptText,
    )
    await waitForText(page, statusSelector, '转写后回填输入框，请确认后发送。')
    await page.waitForFunction(
      () => document.body.textContent?.includes('发送消息') ?? false,
    )
    await waitForButtonLabel(page, recordToggleSelector, '开始录音')

    assert.deepEqual(scenario.requestOrder, ['transcription'], '转写成功后仍不应自动触发 AI chat 请求')
    assert.equal(scenario.chatRequests.length, 0, '转写成功只应回填草稿，不应自动发送')

    await page.getByRole('button', { name: '发送消息' }).click()
    await page.waitForFunction(
      (assistantResponseText) => document.body.textContent?.includes(assistantResponseText) ?? false,
      assistantResponseText,
    )

    assert.deepEqual(scenario.requestOrder, ['transcription', 'chat'], '显式点击发送后才应触发 AI chat 请求')
    assert.equal(scenario.chatRequests.length, 1, 'happy path 应只发送一次 AI chat 请求')
    assert.equal(scenario.chatRequests[0]?.message, transcriptText, 'chat 请求应使用用户确认后的草稿文本')

    await page.goto(`${voiceSmokeConfig.server.baseURL}/ai/history`)
    await page.waitForSelector(`[data-history-id="${happyHistoryId}"]`)
    await page.click(`[data-history-id="${happyHistoryId}"]`)
    await page.waitForFunction(
      (assistantResponseText) => document.body.textContent?.includes(assistantResponseText) ?? false,
      assistantResponseText,
    )
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

  try {
    await page.goto(`${voiceSmokeConfig.server.baseURL}/ai`)

    await setBrowserSmokeState(page, { mediaMode: 'denied' })
    await page.click(recordToggleSelector)
    await waitForText(page, statusSelector, '麦克风权限未开启，可继续输入文字消息。')
    await waitForText(page, errorSelector, '麦克风权限被拒绝，请在浏览器设置中允许访问后重试。')
    assert.deepEqual(scenario.requestOrder, [], '麦克风权限被拒绝时不应触发转写或聊天请求')

    await setBrowserSmokeState(page, { mediaMode: 'success' })
    await page.click(recordToggleSelector)
    await waitForButtonLabel(page, recordToggleSelector, '停止录音')
    await page.click(recordToggleSelector)
    await waitForText(page, errorSelector, '语音功能未开启')
    await waitForButtonLabel(page, recordToggleSelector, '开始录音')
    assert.deepEqual(scenario.requestOrder, ['transcription'], '转写失败路径也必须先只命中转写接口')
    assert.equal(scenario.chatRequests.length, 0, '转写失败不应被误判为已发送聊天请求')

    await page.locator('textarea').fill('帮我查看今天可借设备')
    await page.getByRole('button', { name: '发送消息' }).click()
    await page.waitForFunction(
      () => document.body.textContent?.includes('当前可借设备有示波器。') ?? false,
    )

    assert.deepEqual(scenario.requestOrder, ['transcription', 'chat'], '显式发送文字草稿后才应出现 AI chat 请求')
    assert.equal(scenario.chatRequests[0]?.message, '帮我查看今天可借设备', '错误回退后应发送手动输入的草稿内容')
  } finally {
    await context.close()
  }
}

async function main() {
  const server = startServer()

  await server.ready()

  const browser = await chromium.launch({
    args: voiceSmokeConfig.browserLaunchArgs,
    headless: true,
    ...(voiceSmokeConfig.browserExecutablePath
      ? { executablePath: voiceSmokeConfig.browserExecutablePath }
      : {}),
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
  console.error(`✗ task 10 语音冒烟失败\n${message}`)
  process.exitCode = 1
})
