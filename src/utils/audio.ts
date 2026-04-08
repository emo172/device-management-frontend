export const AI_VOICE_WAV_MIME_TYPE = 'audio/wav'
export const AI_VOICE_TARGET_SAMPLE_RATE = 16_000
export const AI_VOICE_MAX_DURATION_MS = 60_000

/**
 * 多声道输入统一先下混为单声道，避免浏览器实际给到立体声时直接把双通道原样写进 WAV。
 */
export function downMixToMono(channels: Float32Array[]) {
  if (channels.length === 0) {
    return new Float32Array()
  }

  const firstChannel = channels[0]!

  if (channels.length === 1) {
    return firstChannel.slice()
  }

  const frameCount = firstChannel.length
  const monoChannel = new Float32Array(frameCount)

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    let sampleTotal = 0

    for (const channel of channels) {
      sampleTotal += channel[frameIndex] ?? 0
    }

    monoChannel[frameIndex] = sampleTotal / channels.length
  }

  return monoChannel
}

export function mergeFloat32Chunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((length, chunk) => length + chunk.length, 0)
  const merged = new Float32Array(totalLength)

  let offset = 0

  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  return merged
}

function clampSample(sample: number) {
  return Math.max(-1, Math.min(1, sample))
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

/**
 * 录音导出优先复用 Web Audio 的离线渲染重采样；若测试环境或当前浏览器缺少能力，再退回线性插值，
 * 保证桌面 Chrome / Edge 之外也不会因为工具链环境缺能力而直接中断单测。
 */
async function resampleWithOfflineAudioContext(
  samples: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
) {
  const OfflineAudioContextConstructor = globalThis.OfflineAudioContext

  if (!OfflineAudioContextConstructor) {
    return null
  }

  const targetFrameCount = Math.max(
    1,
    Math.round((samples.length * targetSampleRate) / sourceSampleRate),
  )
  const offlineContext = new OfflineAudioContextConstructor(1, targetFrameCount, targetSampleRate)
  const sourceBuffer = offlineContext.createBuffer(1, samples.length, sourceSampleRate)

  sourceBuffer.getChannelData(0).set(samples)

  const bufferSource = offlineContext.createBufferSource()
  bufferSource.buffer = sourceBuffer
  bufferSource.connect(offlineContext.destination)
  bufferSource.start(0)

  const renderedBuffer = await offlineContext.startRendering()

  return renderedBuffer.getChannelData(0).slice()
}

function resampleLinearly(
  samples: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
) {
  const targetFrameCount = Math.max(
    1,
    Math.round((samples.length * targetSampleRate) / sourceSampleRate),
  )
  const resampled = new Float32Array(targetFrameCount)
  const sampleStep = sourceSampleRate / targetSampleRate

  for (let frameIndex = 0; frameIndex < targetFrameCount; frameIndex += 1) {
    const sourceIndex = frameIndex * sampleStep
    const leftIndex = Math.floor(sourceIndex)
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1)
    const interpolationWeight = sourceIndex - leftIndex
    const leftSample = samples[leftIndex] ?? 0
    const rightSample = samples[rightIndex] ?? leftSample

    resampled[frameIndex] = leftSample + (rightSample - leftSample) * interpolationWeight
  }

  return resampled
}

export async function resampleToTargetSampleRate(
  samples: Float32Array,
  sourceSampleRate: number,
  targetSampleRate = AI_VOICE_TARGET_SAMPLE_RATE,
) {
  if (!samples.length) {
    return new Float32Array()
  }

  if (sourceSampleRate <= 0 || targetSampleRate <= 0 || sourceSampleRate === targetSampleRate) {
    return samples.slice()
  }

  try {
    const resampled = await resampleWithOfflineAudioContext(
      samples,
      sourceSampleRate,
      targetSampleRate,
    )

    if (resampled) {
      return resampled
    }
  } catch {
    // 测试环境或极少数浏览器缺少离线渲染能力时，允许回退到纯函数重采样，避免语音链路彻底失效。
  }

  return resampleLinearly(samples, sourceSampleRate, targetSampleRate)
}

export function encodePcm16Wav(samples: Float32Array, sampleRate = AI_VOICE_TARGET_SAMPLE_RATE) {
  const wavBuffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(wavBuffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44

  for (const sample of samples) {
    const normalizedSample = clampSample(sample)
    const pcmSample = normalizedSample < 0 ? normalizedSample * 0x8000 : normalizedSample * 0x7fff

    view.setInt16(offset, Math.round(pcmSample), true)
    offset += 2
  }

  return new Blob([wavBuffer], { type: AI_VOICE_WAV_MIME_TYPE })
}

/**
 * 浏览器采样率并不可信，因此导出前统一做“合并 -> 重采样 -> PCM16 WAV 封装”，
 * 让上传契约稳定落在 16k / 16bit / 单声道。
 */
export async function createPcm16WavBlob(
  chunks: Float32Array[],
  sourceSampleRate: number,
  targetSampleRate = AI_VOICE_TARGET_SAMPLE_RATE,
) {
  const mergedSamples = mergeFloat32Chunks(chunks)
  const resampledSamples = await resampleToTargetSampleRate(
    mergedSamples,
    sourceSampleRate,
    targetSampleRate,
  )

  return encodePcm16Wav(resampledSamples, targetSampleRate)
}
