/**
 * AI 固定意图枚举。
 * 该集合必须与后端规则引擎口径一致，避免前后端对同一条消息产生不同意图解释。
 */
export enum AiIntentType {
  RESERVE = 'RESERVE',
  QUERY = 'QUERY',
  CANCEL = 'CANCEL',
  HELP = 'HELP',
  UNKNOWN = 'UNKNOWN',
}

export const AiIntentTypeLabel: Record<AiIntentType, string> = {
  [AiIntentType.RESERVE]: '预约',
  [AiIntentType.QUERY]: '查询',
  [AiIntentType.CANCEL]: '取消',
  [AiIntentType.HELP]: '帮助',
  [AiIntentType.UNKNOWN]: '未知',
}

export const AiIntentTypeTagType: Record<AiIntentType, StatusTagType> = {
  [AiIntentType.RESERVE]: 'primary',
  [AiIntentType.QUERY]: 'info',
  [AiIntentType.CANCEL]: 'warning',
  [AiIntentType.HELP]: 'success',
  [AiIntentType.UNKNOWN]: 'danger',
}
