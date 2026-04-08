import { computed, onBeforeUnmount, ref } from 'vue'

import {
  AI_VOICE_MAX_DURATION_MS,
  createPcm16WavBlob,
  downMixToMono,
} from '@/utils/audio'

type AudioContextConstructor = new (contextOptions?: AudioContextOptions) => AudioContext

interface RecorderSession {
  stream: MediaStream
  audioContext: AudioContext
  sourceNode: MediaStreamAudioSourceNode
  processorNode: ScriptProcessorNode
  silentGainNode: GainNode
  processingSampleRate: number
  chunks: Float32Array[]
}

interface UseAiVoiceRecorderOptions {
  maxDurationMs?: number
  onRecorded?: (audioBlob: Blob) => Promise<void> | void
}

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: AudioContextConstructor
}

function resolveAudioContextConstructor() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext || null
}

function stopMediaTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function resolveRecorderErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) {
    return '无法启动录音，请稍后重试或直接输入文字。'
  }

  switch (error.name) {
    case 'NotAllowedError':
      return '麦克风权限被拒绝，请在浏览器设置中允许访问后重试。'
    case 'NotFoundError':
      return '未检测到可用麦克风，请检查设备后重试。'
    case 'NotReadableError':
      return '麦克风当前不可读，请关闭占用它的应用后重试。'
    case 'OverconstrainedError':
      return '当前麦克风不满足录音条件，请切换设备后重试。'
    default:
      return '无法启动录音，请稍后重试或直接输入文字。'
  }
}

async function closeAudioContext(audioContext: AudioContext | null) {
  if (!audioContext) {
    return
  }

  try {
    await audioContext.close()
  } catch {
    // 关闭失败不会改变当前页面降级策略，直接吞掉即可，避免清理阶段反向打断文字聊天。
  }
}

export function useAiVoiceRecorder(options: UseAiVoiceRecorderOptions = {}) {
  const { maxDurationMs = AI_VOICE_MAX_DURATION_MS, onRecorded } = options

  const errorMessage = ref<string | null>(null)
  const permissionDenied = ref(false)
  const isRecording = ref(false)
  const isSupported = computed(() => {
    if (typeof navigator === 'undefined') {
      return false
    }

    return (
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      Boolean(resolveAudioContextConstructor())
    )
  })

  let recordingTimer: number | null = null
  let activeSession: RecorderSession | null = null
  let stopPromise: Promise<void> | null = null

  function clearError() {
    errorMessage.value = null
    permissionDenied.value = false
  }

  function clearRecordingTimer() {
    if (recordingTimer !== null) {
      window.clearTimeout(recordingTimer)
      recordingTimer = null
    }
  }

  async function releaseSession(session: RecorderSession) {
    try {
      session.sourceNode.disconnect()
    } catch {
      // 节点可能已经在手动停止与自动停止竞态里断开，这里保持幂等清理即可。
    }

    session.processorNode.onaudioprocess = null

    try {
      session.processorNode.disconnect()
    } catch {
      // ScriptProcessorNode 重复 disconnect 时浏览器实现差异较大，这里统一吞掉清理异常。
    }

    try {
      session.silentGainNode.disconnect()
    } catch {
      // 静音节点只承担驱动采样的职责，重复断开不应影响页面继续输入文字。
    }

    stopMediaTracks(session.stream)
    await closeAudioContext(session.audioContext)
  }

  async function discardActiveSession() {
    const session = activeSession

    if (!session) {
      return
    }

    activeSession = null
    isRecording.value = false
    clearRecordingTimer()
    await releaseSession(session)
  }

  async function stopRecording() {
    if (stopPromise) {
      return stopPromise
    }

    const session = activeSession

    if (!session) {
      return undefined
    }

    activeSession = null
    isRecording.value = false
    clearRecordingTimer()

    stopPromise = (async () => {
      const recordedChunks = session.chunks.map((chunk) => chunk.slice())
      const sourceSampleRate = session.processingSampleRate

      await releaseSession(session)

      if (!recordedChunks.length) {
        errorMessage.value = '未采集到有效录音，请重试或直接输入文字。'
        return
      }

      try {
        const audioBlob = await createPcm16WavBlob(recordedChunks, sourceSampleRate)

        if (!audioBlob.size) {
          errorMessage.value = '未采集到有效录音，请重试或直接输入文字。'
          return
        }

        await onRecorded?.(audioBlob)
      } catch {
        errorMessage.value = '录音处理失败，请重试或直接输入文字。'
      }
    })().finally(() => {
      stopPromise = null
    })

    return stopPromise
  }

  async function startRecording() {
    if (isRecording.value || stopPromise) {
      return
    }

    clearError()

    const AudioContextCtor = resolveAudioContextConstructor()

    if (!AudioContextCtor || typeof navigator === 'undefined') {
      errorMessage.value = '当前浏览器不支持录音，请继续使用文字输入。'
      return
    }

    let stream: MediaStream | null = null
    let audioContext: AudioContext | null = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContext = new AudioContextCtor()
      await audioContext.resume()

      const sourceNode = audioContext.createMediaStreamSource(stream)
      const processorNode = audioContext.createScriptProcessor(4096, 2, 1)
      const silentGainNode = audioContext.createGain()

      /**
       * `onaudioprocess` 里拿到的是 Web Audio 图处理后的 PCM，因此导出 WAV 时必须使用 AudioContext 的采样率。
       * 这里不能回退到 `MediaStreamTrack.getSettings().sampleRate`，否则两者不一致时会把时长和音高一起拉偏。
       */
      const processingSampleRate = audioContext.sampleRate
      const chunks: Float32Array[] = []

      silentGainNode.gain.value = 0
      processorNode.onaudioprocess = (event) => {
        const channels: Float32Array[] = []

        for (let channelIndex = 0; channelIndex < event.inputBuffer.numberOfChannels; channelIndex += 1) {
          channels.push(event.inputBuffer.getChannelData(channelIndex).slice())
        }

        if (!channels.length) {
          return
        }

        const monoChunk = downMixToMono(channels)

        if (monoChunk.length > 0) {
          chunks.push(monoChunk)
        }
      }

      sourceNode.connect(processorNode)
      processorNode.connect(silentGainNode)
      silentGainNode.connect(audioContext.destination)

      activeSession = {
        stream,
        audioContext,
        sourceNode,
        processorNode,
        silentGainNode,
        processingSampleRate,
        chunks,
      }
      isRecording.value = true

      // 只有麦克风流和音频节点都建立完成后，60 秒上限才开始计时，避免授权弹窗时间被错误计入录音时长。
      recordingTimer = window.setTimeout(() => {
        void stopRecording()
      }, maxDurationMs)
    } catch (error) {
      permissionDenied.value = error instanceof DOMException && error.name === 'NotAllowedError'
      errorMessage.value = resolveRecorderErrorMessage(error)
      stopMediaTracks(stream)
      await closeAudioContext(audioContext)
    }
  }

  onBeforeUnmount(() => {
    void discardActiveSession()
  })

  return {
    errorMessage,
    permissionDenied,
    isRecording,
    isSupported,
    clearError,
    startRecording,
    stopRecording,
  }
}
