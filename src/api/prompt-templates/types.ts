/**
 * Prompt 模板写入 DTO。
 * 对应后端 `PromptTemplateRequest`，创建和更新复用同一结构，`active` 映射后端布尔启停状态。
 */
export interface PromptTemplateRequest {
  name: string
  code: string
  content: string
  type: string
  description?: string | null
  variables?: string | null
  active: boolean
  version: string
}

/**
 * Prompt 模板响应 DTO。
 * 对应后端 `PromptTemplateResponse`，模板管理页列表与详情均可复用。
 */
export interface PromptTemplateResponse {
  id: string
  name: string
  code: string
  content: string
  type: string
  description: string | null
  variables: string | null
  active: boolean
  version: string
  createdAt: string
  updatedAt: string
}
