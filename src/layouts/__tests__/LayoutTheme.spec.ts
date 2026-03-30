import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppPinia } from '@/stores'
import { useAppStore } from '@/stores/modules/app'

const routeState = {
  name: 'Login',
  path: '/login',
  meta: {
    title: '登录',
  },
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
  }
})

/**
 * 布局测试单独放在 layouts 目录下，避免组件壳层测试同时背负布局透传与公开页路由回退职责，
 * 这样失败时可以更快定位是布局母版问题还是 layout 组件内部壳层问题。
 */
function readLayoutSource(componentName: string) {
  return readFileSync(resolve(process.cwd(), `src/layouts/${componentName}.vue`), 'utf-8')
}

describe('Layout theme forwarding', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
    routeState.name = 'Login'
    routeState.path = '/login'
    routeState.meta = {
      title: '登录',
    }
  })

  it('DefaultLayout / AuthLayout / BlankLayout 都把当前主题态透传到布局根节点', async () => {
    const DefaultLayout = (await import('../DefaultLayout.vue')).default
    const AuthLayout = (await import('../AuthLayout.vue')).default
    const BlankLayout = (await import('../BlankLayout.vue')).default
    useAppStore().setThemePreference('dark')

    const defaultWrapper = mount(DefaultLayout, {
      slots: {
        default: '<section>业务内容</section>',
      },
      global: {
        stubs: {
          AppHeader: { template: '<header>头部</header>' },
          AppSidebar: { template: '<aside>侧栏</aside>' },
        },
      },
    })
    const authWrapper = mount(AuthLayout, {
      slots: {
        default: '<form>登录表单</form>',
      },
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })
    const blankWrapper = mount(BlankLayout, {
      slots: {
        default: '<section>错误页</section>',
      },
    })

    expect(defaultWrapper.get('.default-layout').attributes('data-resolved-theme')).toBe('dark')
    expect(authWrapper.get('.auth-layout').attributes('data-resolved-theme')).toBe('dark')
    expect(blankWrapper.get('.blank-layout').attributes('data-resolved-theme')).toBe('dark')
  })

  it('布局挂载后仍会响应主题变化，避免只读取首次渲染结果', async () => {
    const DefaultLayout = (await import('../DefaultLayout.vue')).default
    const AuthLayout = (await import('../AuthLayout.vue')).default
    const BlankLayout = (await import('../BlankLayout.vue')).default
    const appStore = useAppStore()
    const defaultWrapper = mount(DefaultLayout, {
      shallow: true,
      slots: {
        default: '<section>业务内容</section>',
      },
    })
    const authWrapper = mount(AuthLayout, {
      shallow: true,
      slots: {
        default: '<form>认证表单</form>',
      },
    })
    const blankWrapper = mount(BlankLayout, {
      slots: {
        default: '<section>错误页</section>',
      },
    })

    expect(defaultWrapper.get('.default-layout').attributes('data-resolved-theme')).toBe('light')
    expect(authWrapper.get('.auth-layout').attributes('data-resolved-theme')).toBe('light')
    expect(blankWrapper.get('.blank-layout').attributes('data-resolved-theme')).toBe('light')

    appStore.setThemePreference('dark')
    await nextTick()

    expect(defaultWrapper.get('.default-layout').attributes('data-resolved-theme')).toBe('dark')
    expect(authWrapper.get('.auth-layout').attributes('data-resolved-theme')).toBe('dark')
    expect(blankWrapper.get('.blank-layout').attributes('data-resolved-theme')).toBe('dark')
  })

  it('AuthLayout 遇到未识别路由名时回退到登录口径，避免公开页左栏失焦', async () => {
    routeState.name = 'UnrecognizedAuthRoute'
    const AuthLayout = (await import('../AuthLayout.vue')).default
    const wrapper = mount(AuthLayout, {
      slots: {
        default: '<form>认证表单</form>',
      },
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    expect(wrapper.text()).toContain('智能设备管理系统')
    expect(wrapper.text()).toContain('设备信息集中查看')
  })

  it('DefaultLayout 主内容壳不再用 fit-content 撑宽，避免局部宽表把横滚冒泡到整页', () => {
    const source = readLayoutSource('DefaultLayout')

    expect(source).toContain('.default-layout__main-shell')
    expect(source).toContain('width: 100%;')
    expect(source).toContain('max-width: 100%;')
    expect(source).not.toContain('width: fit-content;')
  })
})
