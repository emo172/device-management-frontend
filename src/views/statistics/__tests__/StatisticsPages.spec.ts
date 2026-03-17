import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  deviceUtilization: [],
  categoryUtilization: [],
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
  hotTimeSlots: [],
  deviceRanking: [],
  userRanking: [],
  loading: false,
})

const fetchAllMock = vi.fn()

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
    get overdueStatistics() {
      return statisticsState.overdueStatistics
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
    statisticsState.overdueStatistics = {
      statDate: '2026-03-16',
      totalOverdue: 6,
      totalOverdueHours: 19,
    }
    fetchAllMock.mockReset()
  })

  it('复用 store.query 的日期口径展示总览卡片与子模块入口', async () => {
    const Overview = (await import('../Overview.vue')).default
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
    expect(wrapper.text()).toContain('统计分析总览')
    expect(wrapper.text()).toContain('今日预约数')
    expect(wrapper.text()).toContain('设备利用率')
    expect(wrapper.text()).toContain('借用统计')
    expect(wrapper.find('[data-to="/statistics/device-usage"]').exists()).toBe(true)
    expect(wrapper.findAll('.statistics-card-stub')).toHaveLength(5)
  })
})
