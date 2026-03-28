import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NavigationFailureType } from 'vue-router'

import { useAppStore } from '@/stores/modules/app'

const errorViewModules = import.meta.glob('../*.vue')
const pushMock = vi.fn()

function readError500ViewSource() {
  return readFileSync(resolve(__dirname, '../500.vue'), 'utf-8')
}

async function loadError500View() {
  const loader = errorViewModules['../500.vue']

  if (!loader) {
    throw new Error('500.vue is missing')
  }

  return (await loader()) as { default: object }
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    isNavigationFailure: (value: unknown) =>
      Boolean(value && typeof value === 'object' && 'type' in value),
    useRouter: () => ({ push: pushMock }),
  }
})

describe('500 error page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pushMock.mockReset()
  })

  it('renders fatal error details and supports retry plus go-home actions', async () => {
    const store = useAppStore()
    store.setFatalError({
      source: 'request',
      title: '服务暂时不可用',
      description: '设备详情加载失败，请稍后重试。',
      retryTarget: {
        path: '/devices/device-1',
        retryable: true,
      },
    })

    const ErrorPage = (await loadError500View()).default
    const wrapper = mount(ErrorPage)

    expect(wrapper.find('.error-view__surface').exists()).toBe(true)
    expect(wrapper.find('.error-view__action').exists()).toBe(true)
    expect(wrapper.text()).toContain('服务暂时不可用')
    expect(wrapper.text()).toContain('设备详情加载失败，请稍后重试。')
    expect(wrapper.text()).toContain('错误来源：request')
    expect(wrapper.text()).toContain('返回首页')
    expect(wrapper.text()).toContain('重试')

    await wrapper.get('[data-testid="retry-action"]').trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/devices/device-1')

    await wrapper.get('[data-testid="go-home-action"]').trigger('click')
    expect(pushMock).toHaveBeenLastCalledWith('/dashboard')
    expect(store.fatalError).toBeNull()
  })

  it('keeps fatal error snapshot when retry navigation fails', async () => {
    const store = useAppStore()
    const fatalError = {
      source: 'router' as const,
      title: '目标页面恢复失败',
      description: '请稍后重试或联系管理员。',
      retryTarget: {
        path: '/devices/device-2',
        retryable: true as const,
      },
    }

    store.setFatalError(fatalError)
    pushMock.mockRejectedValueOnce(new Error('navigation failed'))

    const ErrorPage = (await loadError500View()).default
    const wrapper = mount(ErrorPage)

    await wrapper.get('[data-testid="retry-action"]').trigger('click')
    await Promise.resolve()

    expect(pushMock).toHaveBeenCalledWith('/devices/device-2')
    expect(store.fatalError).toEqual(fatalError)
  })

  it('keeps fatal error snapshot when retry navigation resolves a navigation failure', async () => {
    const store = useAppStore()
    const fatalError = {
      source: 'router' as const,
      title: '目标页面恢复失败',
      description: '导航被中止时仍需保留排障上下文。',
      retryTarget: {
        path: '/devices/device-3',
        retryable: true as const,
      },
    }

    store.setFatalError(fatalError)
    pushMock.mockResolvedValueOnce({
      type: NavigationFailureType.aborted,
      to: { path: '/devices/device-3' },
      from: { path: '/500' },
    })

    const ErrorPage = (await loadError500View()).default
    const wrapper = mount(ErrorPage)

    await wrapper.get('[data-testid="retry-action"]').trigger('click')
    await Promise.resolve()

    expect(pushMock).toHaveBeenCalledWith('/devices/device-3')
    expect(store.fatalError).toEqual(fatalError)
  })

  it('keeps fatal error snapshot when go-home navigation resolves a navigation failure', async () => {
    const store = useAppStore()
    const fatalError = {
      source: 'main' as const,
      title: '应用运行异常',
      description: '返回首页被取消时不能丢失当前错误快照。',
      retryTarget: {
        retryable: false as const,
      },
    }

    store.setFatalError(fatalError)
    pushMock.mockResolvedValueOnce({
      type: NavigationFailureType.cancelled,
      to: { path: '/dashboard' },
      from: { path: '/500' },
    })

    const ErrorPage = (await loadError500View()).default
    const wrapper = mount(ErrorPage)

    await wrapper.get('[data-testid="go-home-action"]').trigger('click')
    await Promise.resolve()

    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    expect(store.fatalError).toEqual(fatalError)
  })

  it('falls back to generic copy and hides retry when current error is not retryable', async () => {
    const ErrorPage = (await loadError500View()).default
    const wrapper = mount(ErrorPage)

    expect(wrapper.text()).toContain('系统暂时无法完成当前操作')
    expect(wrapper.text()).toContain('请返回首页后重新进入目标模块')
    expect(wrapper.find('[data-testid="retry-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-home-action"]').exists()).toBe(true)
  })

  it('500 页面源码改为消费主题 token，避免暗色主题下残留浅色次级按钮与浅色说明文案', () => {
    const source = readError500ViewSource()

    // 500 页既要保留错误来源提示，也要同时承载主次动作，源码必须直接绑定深浅两套 token，避免暗色下出现浅底按钮和浅色说明文字。
    expect(source).toContain('var(--app-text-secondary)')
    expect(source).toContain('var(--app-color-primary)')
    expect(source).toContain('var(--app-tone-info-surface)')
    expect(source).toContain('var(--app-text-primary)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?:white|black|transparent)\b/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
