import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

describe('Console shell components', () => {
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

  it('ConsoleFeedbackSurface 在 loading 态渲染对应类名', async () => {
    const ConsoleFeedbackSurface = (await import('../ConsoleFeedbackSurface.vue')).default
    const wrapper = mount(ConsoleFeedbackSurface, {
      props: {
        state: 'loading',
      },
      slots: {
        loading: '<p>正在加载</p>',
      },
    })

    expect(wrapper.find('.console-feedback-surface--loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('正在加载')
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
