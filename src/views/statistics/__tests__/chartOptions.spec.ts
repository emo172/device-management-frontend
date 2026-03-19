import { describe, expect, it } from 'vitest'

import { createHotTimeSlotHeatmapOption } from '../chartOptions'

describe('statistics chart options', () => {
  it('将热门时段接口映射为单轴热力图并保留真实预约与通过数', () => {
    const option = createHotTimeSlotHeatmapOption([
      { timeSlot: '08', totalReservations: 3, approvedReservations: 2 },
      { timeSlot: '10', totalReservations: 8, approvedReservations: 6 },
    ])

    expect(option.xAxis?.type).toBe('category')
    expect(option.xAxis?.data).toEqual(['08:00', '10:00'])
    expect(option.series?.[0]?.type).toBe('heatmap')
    expect(option.series?.[0]?.data).toEqual([
      [0, 0, 3, 2],
      [1, 0, 8, 6],
    ])
  })

  it('保留后端已格式化的时段字符串，不重复追加 :00', () => {
    const option = createHotTimeSlotHeatmapOption([
      { timeSlot: '08:00-09:00', totalReservations: 5, approvedReservations: 4 },
    ])

    expect(option.xAxis?.data).toEqual(['08:00-09:00'])
  })
})
