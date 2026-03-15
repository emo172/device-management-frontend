/**
 * AI 对话请求 DTO。
 * 对应后端 `AiChatRequest`，当前仅支持文本消息，`sessionId` 可为空以开启新会话。
 */
export interface AiChatRequest {
  sessionId?: string
  message: string
}

/**
 * AI 对话响应 DTO。
 * 对应后端 `AiChatResponse`，返回历史记录 ID、意图识别结果与最终回复文案。
 */
export interface AiChatResponse {
  id: string
  sessionId: string
  intent: string
  executeResult: string
  aiResponse: string
}

/**
 * AI 历史列表项 DTO。
 * 对应后端 `AiHistorySummaryResponse`，供历史侧边栏或列表页使用。
 */
export interface AiHistorySummaryResponse {
  id: string
  sessionId: string
  userInput: string
  intent: string
  executeResult: string
  createdAt: string
}

/**
 * AI 历史详情 DTO。
 * 对应后端 `AiHistoryDetailResponse`，保留结构化信息与错误信息，便于后续详情抽屉扩展。
 */
export interface AiHistoryDetailResponse {
  id: string
  sessionId: string
  userInput: string
  aiResponse: string
  intent: string
  extractedInfo: string | null
  executeResult: string
  errorMessage: string | null
  llmModel: string | null
  responseTimeMs: number | null
  createdAt: string
}
