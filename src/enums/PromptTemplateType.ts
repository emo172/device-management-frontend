/**
 * Prompt 模板类型枚举。
 * 该口径直接对齐后端 PromptTemplateType 枚举，便于后续系统管理模块直接复用。
 */
export enum PromptTemplateType {
  INTENT_RECOGNITION = 'INTENT_RECOGNITION',
  INFO_EXTRACTION = 'INFO_EXTRACTION',
  RESULT_FEEDBACK = 'RESULT_FEEDBACK',
  CONFLICT_RECOMMENDATION = 'CONFLICT_RECOMMENDATION',
}

export const PromptTemplateTypeLabel: Record<PromptTemplateType, string> = {
  [PromptTemplateType.INTENT_RECOGNITION]: '意图识别',
  [PromptTemplateType.INFO_EXTRACTION]: '信息提取',
  [PromptTemplateType.RESULT_FEEDBACK]: '结果反馈',
  [PromptTemplateType.CONFLICT_RECOMMENDATION]: '冲突推荐',
}

export const PromptTemplateTypeTagType: Record<PromptTemplateType, StatusTagType> = {
  [PromptTemplateType.INTENT_RECOGNITION]: 'primary',
  [PromptTemplateType.INFO_EXTRACTION]: 'info',
  [PromptTemplateType.RESULT_FEEDBACK]: 'success',
  [PromptTemplateType.CONFLICT_RECOMMENDATION]: 'warning',
}
