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

  it('ConsoleFilterPanel 提供稳定壳层结构，并在空插槽场景保留字段区与操作区容器', async () => {
    const ConsoleFilterPanel = (await import('../ConsoleFilterPanel.vue')).default
    const wrapper = mount(ConsoleFilterPanel, {
      props: {
        title: '设备筛选',
      },
    })

    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-filter-panel__header').exists()).toBe(true)
    expect(wrapper.find('.console-filter-panel__body').exists()).toBe(true)
    expect(wrapper.find('.console-filter-panel__fields').exists()).toBe(true)
    expect(wrapper.find('.console-filter-panel__actions').exists()).toBe(true)
    expect(wrapper.get('.console-filter-panel__eyebrow').text()).toBe('筛选与操作')
    expect(wrapper.get('.console-filter-panel__title').text()).toBe('设备筛选')
    expect(wrapper.find('.console-filter-panel__description').exists()).toBe(false)
    expect(wrapper.get('.console-filter-panel__fields').text()).toBe('')
    expect(wrapper.get('.console-filter-panel__actions').text()).toBe('')
  })

  it('ConsoleFilterPanel 支持字段区和 actions 插槽渲染', async () => {
    const ConsoleFilterPanel = (await import('../ConsoleFilterPanel.vue')).default
    const wrapper = mount(ConsoleFilterPanel, {
      props: {
        eyebrow: 'Device Console',
        title: '预约列表',
        description: '统一承接列表顶部筛选条件与批量操作。',
      },
      slots: {
        default: '<div class="panel-field">状态筛选</div>',
        actions: '<button class="panel-action">导出</button>',
      },
    })

    expect(wrapper.get('.console-filter-panel__eyebrow').text()).toBe('Device Console')
    expect(wrapper.get('.console-filter-panel__description').text()).toBe(
      '统一承接列表顶部筛选条件与批量操作。',
    )
    expect(wrapper.find('.panel-field').exists()).toBe(true)
    expect(wrapper.find('.panel-action').exists()).toBe(true)
    expect(wrapper.get('.console-filter-panel__actions').text()).toContain('导出')
  })

  it('ConsoleFilterPanel 的 body 容器保持普通布局节点，避免把无标题区误标记为 section', () => {
    const filterPanelSource = readLayoutSource('ConsoleFilterPanel')

    expect(filterPanelSource).toContain('<div class="console-filter-panel__body">')
    expect(filterPanelSource).not.toContain('<section class="console-filter-panel__body">')
  })

  it('ConsoleFilterPanel 持续使用主题 token，避免回退到硬编码颜色', () => {
    const filterPanelSource = readLayoutSource('ConsoleFilterPanel')

    expect(filterPanelSource).toContain("@use '@/assets/styles/console-shell' as shell;")
    expect(filterPanelSource).toContain('@include shell.console-surface();')
    expect(filterPanelSource).toContain('color: var(--app-accent-amber);')
    expect(filterPanelSource).toContain('color: var(--app-text-primary);')
    expect(filterPanelSource).toContain('color: var(--app-text-secondary);')
    expect(filterPanelSource).not.toMatch(/color:\s*#[0-9a-fA-F]{3,8}/)
    expect(filterPanelSource).not.toMatch(new RegExp('rgb\\s*\\(', 'i'))
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

  it('ConsoleTableSection 主体区必须限制横向预算，避免内部宽内容把主布局整体撑宽', () => {
    const tableSource = readLayoutSource('ConsoleTableSection')

    expect(tableSource).toContain('.console-table-section__body')
    expect(tableSource).toMatch(
      /\.console-table-section__body\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/,
    )
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
