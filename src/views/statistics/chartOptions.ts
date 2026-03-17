import { formatDate } from '@/utils'

import type {
  BorrowStatisticsResponse,
  CategoryUtilizationResponse,
  DeviceRankingResponse,
  DeviceUtilizationResponse,
  OverdueStatisticsResponse,
  TimeSlotStatisticsResponse,
  UserRankingResponse,
} from '@/api/statistics'

function formatPercent(value: number) {
  return `${Number(value).toFixed(1)}%`
}

export function formatTimeSlotLabel(timeSlot: string) {
  if (/^\d{2}$/.test(timeSlot)) {
    return `${timeSlot}:00`
  }

  return timeSlot
}

/**
 * 设备与分类利用率都来自单日聚合结果，因此统一用柱状图对比，避免前端伪造不存在的时间序列。
 */
export function createUtilizationBarOption(
  title: string,
  records: Array<DeviceUtilizationResponse | CategoryUtilizationResponse>,
) {
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => formatPercent(value),
    },
    grid: { left: 48, right: 24, top: 56, bottom: 48 },
    xAxis: {
      type: 'category',
      data: records.map((item) => ('deviceName' in item ? item.deviceName : item.categoryName)),
      axisLabel: { interval: 0, rotate: 18 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `${value}%` },
    },
    series: [
      {
        name: title,
        type: 'bar',
        barMaxWidth: 42,
        itemStyle: {
          borderRadius: [12, 12, 4, 4],
          color: 'rgba(15, 118, 110, 0.82)',
        },
        data: records.map((item) => Number(item.utilizationRate)),
      },
    ],
  }
}

/**
 * 借用统计接口只有单日聚合，没有多日期趋势。
 * 这里用单日双折线对比借出与归还，明确告诉用户当前图表是“当日对比”而不是伪造的长周期趋势。
 */
export function createBorrowComparisonOption(record: BorrowStatisticsResponse | null) {
  const statDate = record?.statDate ? formatDate(record.statDate) : '当前日期'

  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 12 },
    grid: { left: 48, right: 24, top: 64, bottom: 42 },
    xAxis: {
      type: 'category',
      data: [statDate],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '借出',
        type: 'line',
        smooth: true,
        lineStyle: { width: 3, color: '#0f766e' },
        itemStyle: { color: '#0f766e' },
        data: [record?.totalBorrows ?? 0],
      },
      {
        name: '归还',
        type: 'line',
        smooth: true,
        lineStyle: { width: 3, color: '#f59e0b' },
        itemStyle: { color: '#f59e0b' },
        data: [record?.totalReturns ?? 0],
      },
    ],
  }
}

/**
 * 设备排行榜图表配置。
 * 排行接口已经按设备维度聚合借用次数，因此这里直接映射设备名与借用次数，不再前端重复排序或扩展额外评分口径。
 */
export function createDeviceRankingOption(records: DeviceRankingResponse[]) {
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => `${value}`,
    },
    grid: { left: 48, right: 24, top: 36, bottom: 64 },
    xAxis: {
      type: 'category',
      data: records.map((item) => item.deviceName),
      axisLabel: { interval: 0, rotate: 24 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '借用次数',
        type: 'bar',
        barMaxWidth: 40,
        itemStyle: {
          borderRadius: [12, 12, 4, 4],
          color: '#0f766e',
        },
        data: records.map((item) => item.totalBorrows),
      },
    ],
  }
}

/**
 * 用户排行榜图表配置。
 * 排行接口直接返回用户借用次数，因此这里保持“人名/用户名 -> 借用次数”的简单映射，不追加前端推测的活跃度评分。
 */
export function createUserRankingOption(records: UserRankingResponse[]) {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 36, bottom: 64 },
    xAxis: {
      type: 'category',
      data: records.map((item) => item.realName || item.username),
      axisLabel: { interval: 0, rotate: 24 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '借用次数',
        type: 'bar',
        barMaxWidth: 40,
        itemStyle: {
          borderRadius: [12, 12, 4, 4],
          color: '#3b82f6',
        },
        data: records.map((item) => item.totalBorrows),
      },
    ],
  }
}

/**
 * 逾期摘要图表配置。
 * 逾期接口只有记录数和小时数两个聚合字段，因此这里使用双轴图并行展示，避免把不同量纲误读成同一总量占比。
 */
export function createOverdueSummaryOption(record: OverdueStatisticsResponse | null) {
  const statDate = record?.statDate ? formatDate(record.statDate) : '当前日期'

  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 12 },
    grid: { left: 48, right: 56, top: 64, bottom: 42 },
    xAxis: {
      type: 'category',
      data: [statDate],
    },
    yAxis: [
      {
        type: 'value',
        name: '记录数',
      },
      {
        type: 'value',
        name: '小时数',
      },
    ],
    series: [
      {
        name: '逾期记录数',
        type: 'bar',
        barMaxWidth: 40,
        itemStyle: {
          borderRadius: [12, 12, 4, 4],
          color: '#f97316',
        },
        data: [record?.totalOverdue ?? 0],
      },
      {
        name: '逾期小时数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { width: 3, color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
        data: [record?.totalOverdueHours ?? 0],
      },
    ],
  }
}

/**
 * 热门时段接口只返回固定时段维度，因此用单轴热力图表达“每个小时段”的预约热度，
 * 不额外捏造日期或星期维度。
 */
export function createHotTimeSlotHeatmapOption(records: TimeSlotStatisticsResponse[]) {
  return {
    tooltip: {
      formatter: (params: { data: [number, number, number, number] }) => {
        const [slotIndex, , totalReservations, approvedReservations] = params.data
        const label = formatTimeSlotLabel(records[slotIndex]?.timeSlot ?? '--')
        return `${label}<br/>预约总数：${totalReservations}<br/>通过数：${approvedReservations}`
      },
    },
    grid: { left: 48, right: 24, top: 32, bottom: 52 },
    xAxis: {
      type: 'category',
      data: records.map((item) => formatTimeSlotLabel(item.timeSlot)),
    },
    yAxis: {
      type: 'category',
      data: ['预约量'],
    },
    visualMap: {
      min: 0,
      max: Math.max(...records.map((item) => item.totalReservations), 1),
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      calculable: true,
      inRange: {
        color: ['#e0f2fe', '#38bdf8', '#0f766e'],
      },
    },
    series: [
      {
        type: 'heatmap',
        label: {
          show: true,
          formatter: (params: { data: [number, number, number] }) => `${params.data[2]}`,
        },
        data: records.map((item, index) => [
          index,
          0,
          item.totalReservations,
          item.approvedReservations,
        ]),
      },
    ],
  }
}
