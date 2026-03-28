import { describe, expect, it } from 'vitest'

import {
  createBorrowComparisonOption,
  createDeviceRankingOption,
  createHotTimeSlotHeatmapOption,
  createOverdueSummaryOption,
  createUserRankingOption,
  createUtilizationBarOption,
  getChartThemeTokens,
} from '../chartOptions'

describe('statistics chart options', () => {
  it('为浅色与深色主题返回不同的图表色板', () => {
    const light = getChartThemeTokens('light')
    const dark = getChartThemeTokens('dark')

    expect(light.palette).not.toEqual(dark.palette)
    expect(light.axisLabelColor).not.toBe(dark.axisLabelColor)
  })

  it('让各图表配置消费统一主题色板，而不是继续写死颜色', () => {
    const light = getChartThemeTokens('light')
    const dark = getChartThemeTokens('dark')

    expect(
      createUtilizationBarOption('设备利用率', [], 'light').series?.[0]?.itemStyle?.color,
    ).toBe(light.palette[0])
    expect(createBorrowComparisonOption(null, 'dark').series?.[0]?.lineStyle?.color).toBe(
      dark.palette[0],
    )
    expect(createBorrowComparisonOption(null, 'dark').series?.[1]?.itemStyle?.color).toBe(
      dark.palette[1],
    )
    expect(createDeviceRankingOption([], 'dark').series?.[0]?.itemStyle?.color).toBe(
      dark.palette[0],
    )
    expect(createUserRankingOption([], 'dark').series?.[0]?.itemStyle?.color).toBe(dark.palette[1])
    expect(createOverdueSummaryOption(null, 'dark').series?.[0]?.itemStyle?.color).toBe(
      dark.palette[2],
    )
    expect(createOverdueSummaryOption(null, 'dark').series?.[1]?.lineStyle?.color).toBe(
      dark.palette[3],
    )
    expect(createHotTimeSlotHeatmapOption([], 'dark').visualMap?.inRange?.color).toEqual(
      dark.heatmapColors,
    )
  })

  it('将热门时段接口映射为单轴热力图并保留真实预约与通过数', () => {
    const option = createHotTimeSlotHeatmapOption(
      [
        { timeSlot: '08', totalReservations: 3, approvedReservations: 2 },
        { timeSlot: '10', totalReservations: 8, approvedReservations: 6 },
      ],
      'light',
    )

    expect(option.xAxis?.type).toBe('category')
    expect(option.xAxis?.data).toEqual(['08:00', '10:00'])
    expect(option.series?.[0]?.type).toBe('heatmap')
    expect(option.series?.[0]?.data).toEqual([
      [0, 0, 3, 2],
      [1, 0, 8, 6],
    ])
  })

  it('保留后端已格式化的时段字符串，不重复追加 :00', () => {
    const option = createHotTimeSlotHeatmapOption(
      [{ timeSlot: '08:00-09:00', totalReservations: 5, approvedReservations: 4 }],
      'light',
    )

    expect(option.xAxis?.data).toEqual(['08:00-09:00'])
  })
})
