import request from '@/api/request'

import type {
  AiChatRequest,
  AiChatResponse,
  AiHistoryDetailResponse,
  AiHistorySummaryResponse,
  AiSpeechTranscriptionResponse,
} from './types'

export type {
  AiChatRequest,
  AiChatResponse,
  AiHistoryDetailResponse,
  AiHistorySummaryResponse,
  AiSpeechTranscriptionResponse,
} from './types'

/**
 * 发起 AI 文本对话。
 * 对应 `POST /api/ai/chat`，仅普通用户可访问，前端只负责透传消息与可选会话 ID。
 */
export function chatWithAi(data: AiChatRequest) {
  return request.post<AiChatResponse, AiChatRequest>('/ai/chat', data)
}

/**
 * 上传录音文件并换取中文转写文本。
 * 对应 `POST /api/ai/speech/transcriptions`，前端只把浏览器产出的录音以 multipart/form-data 透传给后端，
 * 不直连 Azure 等语音供应商。
 */
export function transcribeAiSpeech(file: Blob | File) {
  const formData = new FormData()
  const filename = file instanceof File && file.name ? file.name : 'voice.webm'

  formData.append('file', file, filename)

  return request.post<AiSpeechTranscriptionResponse, FormData>('/ai/speech/transcriptions', formData)
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

/**
 * 拉取当前用户拥有的 AI 历史回复语音。
 * 对应 `GET /api/ai/history/{id}/speech`，必须走二进制 blob，避免把受保护音频能力退化成公开 URL。
 */
export function getAiHistorySpeech(historyId: string) {
  return request.get<Blob>(`/ai/history/${historyId}/speech`, {
    responseType: 'blob',
  })
}
