import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
    put: putMock,
  },
}))

import {
  createPromptTemplate,
  getPromptTemplateDetail,
  getPromptTemplateList,
  updatePromptTemplate,
} from '../prompt-templates'

describe('prompt-templates api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    putMock.mockReset()
  })

  it('loads prompt template list and detail', async () => {
    const listResponse = [{ id: 'template-1', code: 'intent-recognition' }]
    const detailResponse = { id: 'template-1', type: 'INTENT_RECOGNITION' }
    getMock.mockResolvedValueOnce(listResponse)
    getMock.mockResolvedValueOnce(detailResponse)

    await expect(getPromptTemplateList()).resolves.toBe(listResponse)
    await expect(getPromptTemplateDetail('template-1')).resolves.toBe(detailResponse)

    expect(getMock).toHaveBeenNthCalledWith(1, '/ai/prompts')
    expect(getMock).toHaveBeenNthCalledWith(2, '/ai/prompts/template-1')
  })

  it('creates and updates prompt templates without delete endpoint assumptions', async () => {
    const response = { id: 'template-1', version: '1.0.0' }
    postMock.mockResolvedValueOnce(response)
    putMock.mockResolvedValueOnce(response)

    const payload = {
      name: '意图识别模板',
      code: 'intent-recognition',
      content: '请识别用户意图',
      type: 'INTENT_RECOGNITION',
      description: '用于识别 AI 对话意图',
      variables: '{"message":"用户输入"}',
      active: true,
      version: '1.0.0',
    }

    await expect(createPromptTemplate(payload)).resolves.toBe(response)
    await expect(updatePromptTemplate('template-1', payload)).resolves.toBe(response)

    expect(postMock).toHaveBeenNthCalledWith(1, '/ai/prompts', payload)
    expect(putMock).toHaveBeenNthCalledWith(1, '/ai/prompts/template-1', payload)
  })
})
