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

function readLayoutSource(componentName: string) {
  return readFileSync(resolve(process.cwd(), `src/components/layout/${componentName}.vue`), 'utf-8')
}

describe('Console shell components', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
    routeState.name = 'Login'
    routeState.path = '/login'
    routeState.meta = {
      title: '登录',
    }
  })

  it('ConsolePageHero 渲染 eyebrow、标题和描述', async () => {
    const ConsolePageHero = (await import('../ConsolePageHero.vue')).default
    const wrapper = mount(ConsolePageHero, {
      props: {
        eyebrow: 'Device Console',
        title: '设备中心',
        description: '用于统一承接控制台页面首屏摘要。',
      },
    })

    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.text()).toContain('Device Console')
    expect(wrapper.text()).toContain('设备中心')
    expect(wrapper.text()).toContain('用于统一承接控制台页面首屏摘要。')
  })

  it('ConsolePageHero 支持 actions 插槽', async () => {
    const ConsolePageHero = (await import('../ConsolePageHero.vue')).default
    const wrapper = mount(ConsolePageHero, {
      props: {
        title: '统计分析',
      },
      slots: {
        actions: '<button class="hero-action">刷新数据</button>',
      },
    })

    expect(wrapper.find('.hero-action').exists()).toBe(true)
    expect(wrapper.text()).toContain('刷新数据')
  })

  it('ConsoleSummaryGrid 提供摘要网格壳层', async () => {
    const ConsoleSummaryGrid = (await import('../ConsoleSummaryGrid.vue')).default
    const wrapper = mount(ConsoleSummaryGrid, {
      slots: {
        default: '<article>摘要卡片</article>',
      },
    })

    expect(wrapper.find('.console-summary-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('摘要卡片')
  })

  it('共享壳层标题改用主题主文字 token，避免暗色主题继续沿用固定深色字', () => {
    const heroSource = readLayoutSource('ConsolePageHero')
    const asideSource = readLayoutSource('ConsoleAsidePanel')
    const tableSource = readLayoutSource('ConsoleTableSection')

    expect(heroSource).toContain('color: var(--app-text-primary);')
    expect(asideSource).toContain('color: var(--app-text-primary);')
    expect(tableSource).toContain('color: var(--app-text-primary);')

    expect(heroSource).not.toContain('color: var(--app-ink-950);')
    expect(asideSource).not.toContain('color: var(--app-ink-950);')
    expect(tableSource).not.toContain('color: var(--app-ink-950);')
  })

  it('ConsoleFeedbackSurface 在 loading 态渲染对应类名', async () => {
    const ConsoleFeedbackSurface = (await import('../ConsoleFeedbackSurface.vue')).default
    useAppStore().setThemePreference('dark')
    const wrapper = mount(ConsoleFeedbackSurface, {
      props: {
        state: 'loading',
      },
      slots: {
        loading: '<p>正在加载</p>',
      },
    })

    expect(wrapper.find('.console-feedback-surface--loading').exists()).toBe(true)
    expect(wrapper.get('.console-feedback-surface').attributes('data-resolved-theme')).toBe('dark')
    expect(wrapper.text()).toContain('正在加载')
  })

  it('ConsoleFeedbackSurface 在挂载后仍会响应主题变化，避免只读取首次渲染结果', async () => {
    const ConsoleFeedbackSurface = (await import('../ConsoleFeedbackSurface.vue')).default
    const appStore = useAppStore()
    const feedbackWrapper = mount(ConsoleFeedbackSurface, {
      slots: {
        default: '<p>反馈内容</p>',
      },
    })

    expect(feedbackWrapper.get('.console-feedback-surface').attributes('data-resolved-theme')).toBe(
      'light',
    )

    appStore.setThemePreference('dark')
    await nextTick()

    expect(feedbackWrapper.get('.console-feedback-surface').attributes('data-resolved-theme')).toBe(
      'dark',
    )
  })

  it('ConsoleTableSection 在 count 为自带单位的字符串时不重复追加文案', async () => {
    const ConsoleTableSection = (await import('../ConsoleTableSection.vue')).default
    const wrapper = mount(ConsoleTableSection, {
      props: {
        title: '批量预约结果',
        count: '12 条 / 3 批',
      },
    })

    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('12 条 / 3 批')
    expect(wrapper.text()).not.toContain('12 条 / 3 批 条')
  })

  it('ConversationShell 支持 footer 插槽', async () => {
    const ConversationShell = (await import('../ConversationShell.vue')).default
    const wrapper = mount(ConversationShell, {
      slots: {
        default: '<section>主会话区</section>',
        footer: '<footer>输入区</footer>',
      },
    })

    expect(wrapper.find('.conversation-shell__footer').exists()).toBe(true)
    expect(wrapper.text()).toContain('主会话区')
    expect(wrapper.text()).toContain('输入区')
  })
})
