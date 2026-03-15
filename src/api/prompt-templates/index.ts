import request from '@/api/request'

import type { PromptTemplateRequest, PromptTemplateResponse } from './types'

export type { PromptTemplateRequest, PromptTemplateResponse } from './types'

/**
 * 查询 Prompt 模板列表。
 * 对应 `GET /api/ai/prompts`，当前真实契约没有删除接口，前端先聚焦列表、详情、创建与更新闭环。
 */
export function getPromptTemplateList() {
  return request.get<PromptTemplateResponse[]>('/ai/prompts')
}

/**
 * 查询 Prompt 模板详情。
 * 对应 `GET /api/ai/prompts/{id}`，编辑前必须按模板 ID 拉取完整配置。
 */
export function getPromptTemplateDetail(templateId: string) {
  return request.get<PromptTemplateResponse>(`/ai/prompts/${templateId}`)
}

/**
 * 创建 Prompt 模板。
 * 对应 `POST /api/ai/prompts`，仅系统管理员可访问。
 */
export function createPromptTemplate(data: PromptTemplateRequest) {
  return request.post<PromptTemplateResponse, PromptTemplateRequest>('/ai/prompts', data)
}

/**
 * 更新 Prompt 模板。
 * 对应 `PUT /api/ai/prompts/{id}`，沿用与创建相同 DTO，避免前端拼装两套写入字段。
 */
export function updatePromptTemplate(templateId: string, data: PromptTemplateRequest) {
  return request.put<PromptTemplateResponse, PromptTemplateRequest>(
    `/ai/prompts/${templateId}`,
    data,
  )
}
