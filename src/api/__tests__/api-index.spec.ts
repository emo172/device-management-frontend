import { describe, expect, it } from 'vitest'

import * as api from '..'

describe('api index exports', () => {
  it('re-exports chunk 2 api modules for store consumption', () => {
    expect(api.confirmBorrow).toBeTypeOf('function')
    expect(api.getOverdueRecordList).toBeTypeOf('function')
    expect(api.getNotificationList).toBeTypeOf('function')
    expect(api.getStatisticsOverview).toBeTypeOf('function')
    expect(api.chatWithAi).toBeTypeOf('function')
    expect(api.getPromptTemplateList).toBeTypeOf('function')
    expect(api.updateUserStatus).toBeTypeOf('function')
    expect(api.getRoleList).toBeTypeOf('function')
  })
})
