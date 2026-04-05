/**
 * AI 对话请求 DTO。
 * 对应后端 `AiChatRequest`，主对话接口仍只接收文本消息，语音录音需先转写后再复用该接口续接会话。
 */
export interface AiChatRequest {
  sessionId?: string
  message: string
}

/**
 * AI 语音转写响应 DTO。
 * 对应后端 `AiSpeechTranscriptionResponse`，只承载转写文本和语音服务元信息，
 * 前端随后仍需复用既有文本对话接口完成整轮聊天，不把语音链路塞回文本响应模型。
 */
export interface AiSpeechTranscriptionResponse {
  transcript: string
  locale: string
  provider: string
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
 * 对应后端 `AiHistoryDetailResponse`，保留结构化信息与错误信息；其中 `aiResponse` 同时作为历史语音按需合成的数据源。
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
