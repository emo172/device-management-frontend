import { onBeforeUnmount, ref } from 'vue'

import { getAiHistorySpeech } from '@/api/ai'

interface PlaybackViewState {
  isLoading: boolean
  isPlaying: boolean
  errorMessage: string | null
}

function resolveResponseMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string' &&
    error.response.data.message
  ) {
    return error.response.data.message
  }

  return null
}

function resolvePlaybackFetchError(error: unknown) {
  if (
    typeof error === 'object' &&
    error &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response &&
    'status' in error.response &&
    error.response.status === 401
  ) {
    return '登录已过期，请重新登录后再试'
  }

  const responseMessage = resolveResponseMessage(error)

  if (responseMessage) {
    return responseMessage
  }

  if (error instanceof Error && error.message && error.message !== 'Request failed with status code 401') {
    return error.message
  }

  return 'AI 历史语音播放失败，请稍后重试'
}

function resolvePlayRejectionMessage() {
  return '浏览器拒绝播放语音，请检查播放权限后重试'
}

export function useAiSpeechPlayback() {
  const playingHistoryId = ref<string | null>(null)
  const loadingHistoryId = ref<string | null>(null)
  const errorHistoryId = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)

  let playbackRequestToken = 0
  let audioElement: HTMLAudioElement | null = null
  let currentObjectUrl: string | null = null

  function clearErrorState() {
    errorHistoryId.value = null
    errorMessage.value = null
  }

  function revokeObjectUrl() {
    if (!currentObjectUrl) {
      return
    }

    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }

  function resetAudioElement() {
    if (!audioElement) {
      return
    }

    audioElement.pause()
    audioElement.currentTime = 0
    audioElement.src = ''
    audioElement.load?.()
  }

  function handlePlaybackEnded() {
    playingHistoryId.value = null
    loadingHistoryId.value = null
    resetAudioElement()
    revokeObjectUrl()
  }

  function ensureAudioElement() {
    if (!audioElement) {
      audioElement = new Audio()
      audioElement.preload = 'auto'
      audioElement.addEventListener('ended', handlePlaybackEnded)
    }

    return audioElement
  }

  function stopPlayback(options: { clearError?: boolean } = {}) {
    const { clearError = true } = options

    playbackRequestToken += 1
    playingHistoryId.value = null
    loadingHistoryId.value = null

    if (clearError) {
      clearErrorState()
    }

    resetAudioElement()
    revokeObjectUrl()
  }

  async function togglePlayback(historyId: string) {
    if (!historyId) {
      return
    }

    if (loadingHistoryId.value === historyId) {
      return
    }

    if (playingHistoryId.value === historyId) {
      stopPlayback()
      return
    }

    const currentToken = playbackRequestToken + 1
    playbackRequestToken = currentToken
    loadingHistoryId.value = historyId
    playingHistoryId.value = null
    clearErrorState()

    resetAudioElement()
    revokeObjectUrl()

    try {
      const audioBlob = await getAiHistorySpeech(historyId)

      if (currentToken !== playbackRequestToken) {
        return
      }

      currentObjectUrl = URL.createObjectURL(audioBlob)

      const currentAudioElement = ensureAudioElement()
      currentAudioElement.src = currentObjectUrl
      currentAudioElement.currentTime = 0

      try {
        await currentAudioElement.play()
      } catch (error) {
        if (currentToken !== playbackRequestToken) {
          return
        }

        resetAudioElement()
        revokeObjectUrl()
        errorHistoryId.value = historyId
        errorMessage.value = resolvePlayRejectionMessage()
        return
      }

      if (currentToken !== playbackRequestToken) {
        return
      }

      playingHistoryId.value = historyId
    } catch (error) {
      if (currentToken !== playbackRequestToken) {
        return
      }

      errorHistoryId.value = historyId
      errorMessage.value = resolvePlaybackFetchError(error)
    } finally {
      if (currentToken === playbackRequestToken && loadingHistoryId.value === historyId) {
        loadingHistoryId.value = null
      }
    }
  }

  function getPlaybackState(historyId?: string | null): PlaybackViewState {
    return {
      isLoading: Boolean(historyId) && loadingHistoryId.value === historyId,
      isPlaying: Boolean(historyId) && playingHistoryId.value === historyId,
      errorMessage: historyId && errorHistoryId.value === historyId ? errorMessage.value : null,
    }
  }

  onBeforeUnmount(() => {
    stopPlayback({ clearError: false })
    audioElement?.removeEventListener('ended', handlePlaybackEnded)
  })

  return {
    getPlaybackState,
    stopPlayback,
    togglePlayback,
  }
}
