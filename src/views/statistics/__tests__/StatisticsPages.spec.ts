import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const statisticsViewModules = import.meta.glob('../*.vue')

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

const fetchAllMock = vi.fn()

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

describe('statistics overview page', () => {
  beforeEach(() => {
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
          template:
            '<section class="shared-chart-panel__surface"><strong>{{ title }}</strong><p>{{ description }}</p></section>',
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
  it('设备利用率页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const DeviceUsage = (await loadStatisticsView('DeviceUsage')).default
    const wrapper = mount(DeviceUsage, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.findAll('.shared-chart-panel__surface')).toHaveLength(2)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('借用统计页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const BorrowStats = (await loadStatisticsView('BorrowStats')).default
    const wrapper = mount(BorrowStats, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.findAll('.shared-chart-panel__surface').length).toBeGreaterThanOrEqual(1)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('逾期统计页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const OverdueStats = (await loadStatisticsView('OverdueStats')).default
    const wrapper = mount(OverdueStats, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.find('.shared-chart-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('热门时段页使用工具条、图表面板和侧栏摘要壳层', async () => {
    const HotTimeSlots = (await loadStatisticsView('HotTimeSlots')).default
    const wrapper = mount(HotTimeSlots, createStatisticsPageMountOptions())

    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.find('.shared-chart-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })
})
