import request from '@/api/request'

import type {
  AiChatRequest,
  AiChatResponse,
  AiHistoryDetailResponse,
  AiHistorySummaryResponse,
} from './types'

export type {
  AiChatRequest,
  AiChatResponse,
  AiHistoryDetailResponse,
  AiHistorySummaryResponse,
} from './types'

/**
 * 发起 AI 文本对话。
 * 对应 `POST /api/ai/chat`，仅普通用户可访问，前端只负责透传消息与可选会话 ID。
 */
export function chatWithAi(data: AiChatRequest) {
  return request.post<AiChatResponse, AiChatRequest>('/ai/chat', data)
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
