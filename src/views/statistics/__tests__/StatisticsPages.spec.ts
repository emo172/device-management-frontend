import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const statisticsViewModules = import.meta.glob('../*.vue')

function readStatisticsViewSource(componentName: string) {
  return readFileSync(resolve(__dirname, `../${componentName}.vue`), 'utf-8')
}

const statisticsState = reactive({
  query: { date: '2026-03-16' } as { date?: string },
  overview: {
    statDate: '2026-03-16',
    totalReservations: 48,
    approvedReservations: 35,
    rejectedReservations: 5,
    cancelledReservations: 4,
    expiredReservations: 4,
    totalBorrows: 28,
    totalReturns: 23,
    totalOverdue: 6,
    totalOverdueHours: 19,
    utilizationRate: 73.5,
  } as Record<string, unknown> | null,
  deviceUtilization: [] as Array<Record<string, unknown>>,
  categoryUtilization: [] as Array<Record<string, unknown>>,
  borrowStatistics: {
    statDate: '2026-03-16',
    totalBorrows: 28,
    totalReturns: 23,
  } as Record<string, unknown> | null,
  overdueStatistics: {
    statDate: '2026-03-16',
    totalOverdue: 6,
    totalOverdueHours: 19,
  } as Record<string, unknown> | null,
  hotTimeSlots: [] as Array<Record<string, unknown>>,
  deviceRanking: [] as Array<Record<string, unknown>>,
  userRanking: [] as Array<Record<string, unknown>>,
  loading: false,
})

const appState = reactive({
  resolvedTheme: 'light' as 'light' | 'dark',
})

const fetchAllMock = vi.fn()

function resetStatisticsState() {
  appState.resolvedTheme = 'light'
  statisticsState.query = { date: '2026-03-16' }
  statisticsState.loading = false
  statisticsState.overview = {
    statDate: '2026-03-16',
    totalReservations: 48,
    approvedReservations: 35,
    rejectedReservations: 5,
    cancelledReservations: 4,
    expiredReservations: 4,
    totalBorrows: 28,
    totalReturns: 23,
    totalOverdue: 6,
    totalOverdueHours: 19,
    utilizationRate: 73.5,
  }
  statisticsState.borrowStatistics = {
    statDate: '2026-03-16',
    totalBorrows: 28,
    totalReturns: 23,
  }
  statisticsState.deviceUtilization = [
    {
      deviceId: 'device-1',
      deviceName: '示波器',
      categoryId: 'category-1',
      categoryName: '测试设备',
      totalReservations: 12,
      totalBorrows: 9,
      utilizationRate: 78.6,
    },
  ]
  statisticsState.categoryUtilization = [
    {
      categoryId: 'category-1',
      categoryName: '测试设备',
      totalReservations: 20,
      totalBorrows: 14,
      utilizationRate: 72.3,
    },
  ]
  statisticsState.overdueStatistics = {
    statDate: '2026-03-16',
    totalOverdue: 6,
    totalOverdueHours: 19,
  }
  statisticsState.hotTimeSlots = [
    {
      timeSlot: '09:00-10:00',
      totalReservations: 11,
      approvedReservations: 8,
    },
  ]
  statisticsState.deviceRanking = [
    {
      deviceId: 'device-1',
      deviceName: '示波器',
      totalBorrows: 9,
      utilizationRate: 78.6,
    },
  ]
  statisticsState.userRanking = [
    {
      userId: 'user-1',
      username: 'zhangsan',
      realName: '张三',
      totalBorrows: 7,
    },
  ]
  fetchAllMock.mockReset()
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, resolve, reject }
}

async function loadStatisticsView(componentName: string) {
  const loader = statisticsViewModules[`../${componentName}.vue`]

  if (!loader) {
    throw new Error(`${componentName}.vue is missing`)
  }

  return (await loader()) as { default: object }
}

vi.mock('@/stores/modules/statistics', () => ({
  useStatisticsStore: () => ({
    get query() {
      return statisticsState.query
    },
    get overview() {
      return statisticsState.overview
    },
    get borrowStatistics() {
      return statisticsState.borrowStatistics
    },
    get deviceUtilization() {
      return statisticsState.deviceUtilization
    },
    get categoryUtilization() {
      return statisticsState.categoryUtilization
    },
    get overdueStatistics() {
      return statisticsState.overdueStatistics
    },
    get hotTimeSlots() {
      return statisticsState.hotTimeSlots
    },
    get deviceRanking() {
      return statisticsState.deviceRanking
    },
    get userRanking() {
      return statisticsState.userRanking
    },
    get loading() {
      return statisticsState.loading
    },
    fetchAll: fetchAllMock,
  }),
}))

vi.mock('@/stores/modules/app', () => ({
  useAppStore: () => ({
    get resolvedTheme() {
      return appState.resolvedTheme
    },
  }),
}))

describe('statistics overview page', () => {
  beforeEach(() => {
    resetStatisticsState()
  })

  it('复用 store.query 的日期口径展示总览卡片与子模块入口', async () => {
    const Overview = (await loadStatisticsView('Overview')).default
    const wrapper = mount(Overview, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :data-to="typeof to === \'string\' ? to : to.path"><slot /></a>',
          },
          StatisticsCard: {
            props: ['title', 'value', 'description', 'trendLabel'],
            template:
              '<article class="statistics-card-stub">' +
              '<strong>{{ title }}</strong>' +
              '<span>{{ value }}</span>' +
              '<p>{{ description }}</p>' +
              '<small>{{ trendLabel }}</small>' +
              '</article>',
          },
          ElDatePicker: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: `<input data-testid="date-picker" :value="modelValue || ''" />`,
          },
          ElButton: {
            template: '<button><slot /></button>',
          },
          ElEmpty: {
            template: '<div><slot /></div>',
          },
          VChart: {
            props: ['option'],
            template: '<div class="chart-stub" :data-series="option?.series?.length || 0"></div>',
          },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(fetchAllMock).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="date-picker"]').element.getAttribute('value')).toBe(
      '2026-03-16',
    )
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-summary-grid').exists()).toBe(true)
    expect(wrapper.find('.statistics-overview-view__nav-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('统计分析总览')
    expect(wrapper.text()).toContain('今日预约数')
    expect(wrapper.text()).toContain('设备利用率')
    expect(wrapper.text()).toContain('借用统计')
    expect(wrapper.find('[data-to="/statistics/device-usage"]').exists()).toBe(true)
    expect(wrapper.findAll('.statistics-card-stub')).toHaveLength(5)
  })

  it('首次加载统计总览时展示 loading 反馈而不是默认 0 值卡片', async () => {
    statisticsState.overview = null
    statisticsState.loading = true

    const Overview = (await loadStatisticsView('Overview')).default
    const wrapper = mount(Overview, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :data-to="typeof to === \'string\' ? to : to.path"><slot /></a>',
          },
          StatisticsCard: {
            props: ['title', 'value', 'description', 'trendLabel'],
            template: '<article class="statistics-card-stub"></article>',
          },
          ElDatePicker: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: `<input data-testid="date-picker" :value="modelValue || ''" />`,
          },
          ElButton: {
            template: '<button><slot /></button>',
          },
          ElEmpty: {
            template: '<div><slot /></div>',
          },
          VChart: {
            props: ['option'],
            template: '<div class="chart-stub"></div>',
          },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(wrapper.find('.console-feedback-surface--loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('统计总览加载中')
    expect(wrapper.find('.statistics-card-stub').exists()).toBe(false)
  })

  it('总览页源码改为消费语义 token，避免 Task 19 遗留浅色 hero 与品牌硬编码', () => {
    const source = readStatisticsViewSource('Overview')

    expect(source).toContain('var(--app-surface-card-strong)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-shadow-card)')
    expect(source).not.toContain('linear-gradient')
    expect(source).not.toContain('app-tone-brand')
    expect(source).not.toMatch(/rgba?\(/)
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

function createStatisticsPageMountOptions() {
  return {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="typeof to === \'string\' ? to : to.path"><slot /></a>',
        },
        SharedChartPanel: {
          props: ['title', 'description', 'option'],
          template: `<section class="shared-chart-panel__surface" :data-primary-color="option?.series?.[0]?.itemStyle?.color || option?.series?.[0]?.lineStyle?.color" :data-axis-label-color="option?.xAxis?.axisLabel?.color || option?.yAxis?.axisLabel?.color" :data-points="option?.series?.[0]?.data?.length || 0" :data-x-axis="Array.isArray(option?.xAxis?.data) ? option.xAxis.data.join('|') : ''"><strong>{{ title }}</strong><p>{{ description }}</p></section>`,
        },
        StatisticsCard: {
          props: ['title', 'value', 'description'],
          template:
            '<article class="statistics-card-stub"><strong>{{ title }}</strong><span>{{ value }}</span><p>{{ description }}</p></article>',
        },
        EmptyState: {
          props: ['title', 'description'],
          template: '<div class="empty-state-stub">{{ title }}{{ description }}</div>',
        },
        ElDatePicker: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input data-testid="statistics-date-picker" :value="modelValue || \'\'" />',
        },
        ElButton: {
          props: ['disabled'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        ElTable: {
          template: '<div class="el-table-stub"><slot /></div>',
        },
        ElTableColumn: {
          template: '<div><slot :row="$attrs.row || {}" /></div>',
        },
      },
      directives: {
        loading: {
          mounted() {},
          updated() {},
        },
      },
    },
  }
}

describe('statistics detail pages', () => {
  beforeEach(() => {
    resetStatisticsState()
  })

  it('设备利用率页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const DeviceUsage = (await loadStatisticsView('DeviceUsage')).default
    const wrapper = mount(DeviceUsage, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.findAll('.shared-chart-panel__surface')).toHaveLength(2)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('设备利用率页在未显式选日期时优先展示最后一次成功数据口径', async () => {
    statisticsState.query = {}

    const DeviceUsage = (await loadStatisticsView('DeviceUsage')).default
    const wrapper = mount(DeviceUsage, createStatisticsPageMountOptions())

    expect(wrapper.text()).toContain('2026-03-16')
    expect(wrapper.text()).not.toContain('沿用总览默认日期')
  })

  it('设备利用率页在主题切换后会重算图表配置', async () => {
    const DeviceUsage = (await loadStatisticsView('DeviceUsage')).default
    const wrapper = mount(DeviceUsage, createStatisticsPageMountOptions())

    const firstPanel = wrapper.findAll('.shared-chart-panel__surface')[0]

    if (!firstPanel) {
      throw new Error('expected at least one shared chart panel')
    }

    expect(firstPanel.attributes('data-primary-color')).toBeTruthy()

    const lightColor = firstPanel.attributes('data-primary-color')
    const lightAxisLabelColor = firstPanel.attributes('data-axis-label-color')

    appState.resolvedTheme = 'dark'
    await nextTick()

    const updatedFirstPanel = wrapper.findAll('.shared-chart-panel__surface')[0]

    if (!updatedFirstPanel) {
      throw new Error('expected at least one shared chart panel after theme switch')
    }

    expect(updatedFirstPanel.attributes('data-primary-color')).not.toBe(lightColor)
    expect(updatedFirstPanel.attributes('data-axis-label-color')).not.toBe(lightAxisLabelColor)
  })

  it('设备利用率页在无序数据下仍选出真实 top 项并只展示 top10 图表', async () => {
    statisticsState.deviceUtilization = Array.from({ length: 12 }, (_, index) => ({
      deviceId: `device-${index + 1}`,
      deviceName: `设备 ${index + 1}`,
      categoryId: 'category-1',
      categoryName: '测试设备',
      totalReservations: index + 3,
      totalBorrows: index + 2,
      utilizationRate: index + 10,
    }))
    statisticsState.deviceUtilization.unshift({
      deviceId: 'device-top',
      deviceName: '峰值设备',
      categoryId: 'category-9',
      categoryName: '峰值分类',
      totalReservations: 42,
      totalBorrows: 31,
      utilizationRate: 99.4,
    })
    statisticsState.categoryUtilization = [
      {
        categoryId: 'category-1',
        categoryName: '普通分类',
        totalReservations: 18,
        totalBorrows: 12,
        utilizationRate: 56.2,
      },
      {
        categoryId: 'category-2',
        categoryName: '峰值分类',
        totalReservations: 24,
        totalBorrows: 19,
        utilizationRate: 88.8,
      },
      {
        categoryId: 'category-3',
        categoryName: '尾部分类',
        totalReservations: 9,
        totalBorrows: 4,
        utilizationRate: 22.1,
      },
    ]

    const DeviceUsage = (await loadStatisticsView('DeviceUsage')).default
    const wrapper = mount(DeviceUsage, createStatisticsPageMountOptions())

    expect(wrapper.text()).toContain('峰值设备')
    expect(wrapper.text()).toContain('峰值分类')

    const chartPanels = wrapper.findAll('.shared-chart-panel__surface')
    expect(chartPanels[0]?.attributes('data-points')).toBe('10')
    expect(chartPanels[1]?.attributes('data-points')).toBe('3')
  })

  it('借用统计页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const BorrowStats = (await loadStatisticsView('BorrowStats')).default
    const wrapper = mount(BorrowStats, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.findAll('.shared-chart-panel__surface').length).toBeGreaterThanOrEqual(1)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('借用统计页切换日期时只在新数据到达后更新统计日期标识', async () => {
    const BorrowStats = (await loadStatisticsView('BorrowStats')).default
    const pendingFetch = createDeferred<Record<string, unknown>>()

    fetchAllMock.mockReturnValueOnce(pendingFetch.promise)

    const wrapper = mount(BorrowStats, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :data-to="typeof to === \'string\' ? to : to.path"><slot /></a>',
          },
          SharedChartPanel: {
            props: ['title', 'description', 'option'],
            template:
              '<section class="shared-chart-panel__surface"><strong>{{ title }}</strong><p>{{ description }}</p></section>',
          },
          EmptyState: {
            props: ['title', 'description'],
            template: '<div class="empty-state-stub">{{ title }}{{ description }}</div>',
          },
          ElDatePicker: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<button class="statistics-date-change" @click="$emit(\'update:modelValue\', \'2026-03-18\')">切换日期</button>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('2026-03-16')

    await wrapper.get('.statistics-date-change').trigger('click')
    await nextTick()

    expect(fetchAllMock).toHaveBeenCalledWith({ date: '2026-03-18' })
    expect(wrapper.text()).toContain('2026-03-16')

    pendingFetch.reject(new Error('network error'))
    await flushPromises()

    expect(wrapper.text()).toContain('2026-03-16')
  })

  it('借用统计页在未显式选日期时优先展示借用统计返回的 statDate', async () => {
    statisticsState.query = {}

    const BorrowStats = (await loadStatisticsView('BorrowStats')).default
    const wrapper = mount(BorrowStats, createStatisticsPageMountOptions())

    expect(wrapper.text()).toContain('2026-03-16')
    expect(wrapper.text()).not.toContain('沿用总览默认日期')
  })

  it('逾期统计页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const OverdueStats = (await loadStatisticsView('OverdueStats')).default
    const wrapper = mount(OverdueStats, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.find('.shared-chart-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('逾期统计页在未显式选日期时优先展示成功数据里的统计日期', async () => {
    statisticsState.query = {}
    statisticsState.overview = {
      ...(statisticsState.overview ?? {}),
      statDate: '2026-03-15',
    }
    statisticsState.overdueStatistics = {
      statDate: '2026-03-20',
      totalOverdue: 6,
      totalOverdueHours: 19,
    }

    const OverdueStats = (await loadStatisticsView('OverdueStats')).default
    const wrapper = mount(OverdueStats, createStatisticsPageMountOptions())
    const metaPills = wrapper.findAll('.statistics-detail-view__meta-pill')

    expect(wrapper.text()).toContain('2026-03-20')
    expect(wrapper.text()).not.toContain('2026-03-15')
    expect(wrapper.text()).not.toContain('沿用总览默认日期')
    expect(metaPills).toHaveLength(3)
    expect(metaPills[1]?.text()).toContain('逾期记录')
    expect(metaPills[1]?.text()).toContain('6')
    expect(metaPills[2]?.text()).toContain('逾期小时')
    expect(metaPills[2]?.text()).toContain('19')
  })

  it('逾期统计页在加载中且没有有效数据时不展示假 0 值卡片与 Hero 摘要', async () => {
    statisticsState.overdueStatistics = null
    statisticsState.loading = true

    const OverdueStats = (await loadStatisticsView('OverdueStats')).default
    const wrapper = mount(OverdueStats, createStatisticsPageMountOptions())
    const metaPills = wrapper.findAll('.statistics-detail-view__meta-pill')

    expect(wrapper.find('.console-feedback-surface--loading').exists()).toBe(true)
    expect(wrapper.findAll('.statistics-card-stub')).toHaveLength(0)
    expect(metaPills).toHaveLength(1)
    expect(metaPills[0]?.text()).toContain('统计日期')
    expect(wrapper.text()).not.toContain('逾期记录0')
    expect(wrapper.text()).not.toContain('逾期小时0')
  })

  it('统计详情页源码改为消费语义 token，避免 hero 与辅助壳层残留浅色硬编码', () => {
    for (const componentName of ['DeviceUsage', 'BorrowStats', 'OverdueStats', 'HotTimeSlots']) {
      const source = readStatisticsViewSource(componentName)

      // 统计详情页的 hero、返回入口、meta pill 与侧栏卡片都要跟随主题 token，不能继续保留浅色玻璃硬编码。
      expect(source).toContain('var(--app-border-soft)')
      expect(source).toContain('var(--app-surface-card)')
      expect(source).toContain('var(--app-surface-card-strong)')
      expect(source).toContain('var(--app-shadow-card)')
      expect(source).not.toContain('linear-gradient')
      expect(source).not.toMatch(/rgba?\(/)
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('热门时段页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const HotTimeSlots = (await loadStatisticsView('HotTimeSlots')).default
    const wrapper = mount(HotTimeSlots, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.find('.shared-chart-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('热门时段页在未显式选日期时不再保留错误默认日期文案', async () => {
    statisticsState.query = {}

    const HotTimeSlots = (await loadStatisticsView('HotTimeSlots')).default
    const wrapper = mount(HotTimeSlots, createStatisticsPageMountOptions())

    expect(wrapper.text()).toContain('2026-03-16')
    expect(wrapper.text()).not.toContain('沿用总览默认日期')
  })

  it('热门时段页在无序数据下仍选出预约量最高的时段', async () => {
    statisticsState.hotTimeSlots = [
      {
        timeSlot: '12:00-13:00',
        totalReservations: 8,
        approvedReservations: 5,
      },
      {
        timeSlot: '09:00-10:00',
        totalReservations: 16,
        approvedReservations: 11,
      },
      {
        timeSlot: '15:00-16:00',
        totalReservations: 12,
        approvedReservations: 9,
      },
    ]

    const HotTimeSlots = (await loadStatisticsView('HotTimeSlots')).default
    const wrapper = mount(HotTimeSlots, createStatisticsPageMountOptions())

    expect(wrapper.text()).toContain('09:00-10:00')
    expect(wrapper.text()).toContain('预约 16 次，通过 11 次。')
  })
})
