import request from '@/api/request'

import type {
  AiCapabilitiesResponse,
  AiChatRequest,
  AiChatResponse,
  AiHistoryDetailResponse,
  AiHistorySummaryResponse,
  AiSpeechTranscriptionResponse,
} from './types'

export type {
  AiCapabilitiesResponse,
  AiChatRequest,
  AiChatResponse,
  AiHistoryDetailResponse,
  AiHistorySummaryResponse,
  AiSpeechTranscriptionResponse,
} from './types'

/**
 * 查询当前用户的 AI 能力开关。
 * 对应 `GET /api/ai/capabilities`，前端只读取文本对话与语音能力布尔值，
 * 若请求失败则上层必须保持 fail-closed，不能把未知状态当成默认可用。
 */
export function getAiCapabilities() {
  return request.get<AiCapabilitiesResponse>('/ai/capabilities')
}

/**
 * 发起 AI 文本对话。
 * 对应 `POST /api/ai/chat`，仅普通用户可访问，前端只负责透传消息与可选会话 ID。
 */
export function chatWithAi(data: AiChatRequest) {
  return request.post<AiChatResponse, AiChatRequest>('/ai/chat', data)
}

/**
 * 上传录音文件并换取中文转写文本。
 * 对应 `POST /api/ai/speech/transcriptions`，前端只把浏览器产出的 WAV 录音以 multipart/form-data 透传给后端，
 * 不直连第三方语音供应商；当调用方未提供可复用文件名时，也统一回退成 `voice.wav`，避免 helper 层残留旧 WebM 语义。
 */
export function transcribeAiSpeech(file: Blob | File) {
  const formData = new FormData()
  const fallbackFilename = 'voice.wav'
  const filename = file instanceof File && file.name ? file.name : fallbackFilename

  formData.append('file', file, filename)

  return request.post<AiSpeechTranscriptionResponse, FormData>(
    '/ai/speech/transcriptions',
    formData,
  )
}

/**
 * 查询 AI 历史列表。
 * 对应 `GET /api/ai/history`，后端只返回当前登录用户自己的历史。
 */
export function getAiHistoryList() {
  return request.get<AiHistorySummaryResponse[]>('/ai/history')
}

/**
 * 查询 AI 历史详情。
 * 对应 `GET /api/ai/history/{id}`，用于查看单次对话的完整执行结果。
 */
export function getAiHistoryDetail(historyId: string) {
  return request.get<AiHistoryDetailResponse>(`/ai/history/${historyId}`)
}
