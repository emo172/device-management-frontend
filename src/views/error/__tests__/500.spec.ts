import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NavigationFailureType } from 'vue-router'

import { useAppStore } from '@/stores/modules/app'

const pushMock = vi.fn()

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

    const ErrorPage = (await import('../500.vue')).default
    const wrapper = mount(ErrorPage)

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

    const ErrorPage = (await import('../500.vue')).default
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

    const ErrorPage = (await import('../500.vue')).default
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

    const ErrorPage = (await import('../500.vue')).default
    const wrapper = mount(ErrorPage)

    await wrapper.get('[data-testid="go-home-action"]').trigger('click')
    await Promise.resolve()

    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    expect(store.fatalError).toEqual(fatalError)
  })

  it('falls back to generic copy and hides retry when current error is not retryable', async () => {
    const ErrorPage = (await import('../500.vue')).default
    const wrapper = mount(ErrorPage)

    expect(wrapper.text()).toContain('系统暂时无法完成当前操作')
    expect(wrapper.text()).toContain('请返回首页后重新进入目标模块')
    expect(wrapper.find('[data-testid="retry-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-home-action"]').exists()).toBe(true)
  })
})
