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
import type { ResolvedTheme } from '@/utils/themeMode'

function formatPercent(value: number) {
  return `${Number(value).toFixed(1)}%`
}

export interface ChartThemeTokens {
  palette: [string, string, string, string]
  heatmapColors: [string, string, string]
  axisLabelColor: string
  axisLineColor: string
  splitLineColor: string
  legendTextColor: string
  tooltipBackgroundColor: string
  tooltipBorderColor: string
  tooltipTextColor: string
}

/**
 * 统计图表必须跟随全局主题切换，否则深色壳层下会出现“图表仍是浅色文案”的割裂感。
 * 因此把 palette 与坐标轴/tooltip 语义统一收口到同一个 token 工厂，避免每个 option 再散落硬编码颜色。
 */
export function getChartThemeTokens(theme: ResolvedTheme): ChartThemeTokens {
  return theme === 'dark'
    ? {
        palette: ['#2dd4bf', '#60a5fa', '#fb923c', '#f87171'],
        heatmapColors: ['#143046', '#0f766e', '#2dd4bf'],
        axisLabelColor: '#cbd5e1',
        axisLineColor: 'rgba(148, 163, 184, 0.42)',
        splitLineColor: 'rgba(148, 163, 184, 0.18)',
        legendTextColor: '#e2e8f0',
        tooltipBackgroundColor: 'rgba(15, 23, 34, 0.94)',
        tooltipBorderColor: 'rgba(148, 163, 184, 0.24)',
        tooltipTextColor: '#f8fafc',
      }
    : {
        palette: ['#0f766e', '#2563eb', '#f97316', '#ef4444'],
        heatmapColors: ['#e0f2fe', '#38bdf8', '#0f766e'],
        axisLabelColor: '#526277',
        axisLineColor: 'rgba(17, 38, 54, 0.18)',
        splitLineColor: 'rgba(17, 38, 54, 0.08)',
        legendTextColor: '#31465a',
        tooltipBackgroundColor: 'rgba(255, 255, 255, 0.96)',
        tooltipBorderColor: 'rgba(148, 163, 184, 0.24)',
        tooltipTextColor: '#112636',
      }
}

function createBaseCartesianOption(theme: ResolvedTheme) {
  const tokens = getChartThemeTokens(theme)

  return {
    textStyle: {
      color: tokens.axisLabelColor,
    },
    tooltip: {
      backgroundColor: tokens.tooltipBackgroundColor,
      borderColor: tokens.tooltipBorderColor,
      textStyle: {
        color: tokens.tooltipTextColor,
      },
    },
    legend: {
      textStyle: {
        color: tokens.legendTextColor,
      },
    },
    xAxis: {
      axisLine: {
        lineStyle: {
          color: tokens.axisLineColor,
        },
      },
      axisLabel: {
        color: tokens.axisLabelColor,
      },
    },
    yAxis: {
      axisLine: {
        lineStyle: {
          color: tokens.axisLineColor,
        },
      },
      axisLabel: {
        color: tokens.axisLabelColor,
      },
      splitLine: {
        lineStyle: {
          color: tokens.splitLineColor,
        },
      },
    },
  }
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
  theme: ResolvedTheme,
) {
  const tokens = getChartThemeTokens(theme)

  return {
    ...createBaseCartesianOption(theme),
    tooltip: {
      ...createBaseCartesianOption(theme).tooltip,
      trigger: 'axis',
      valueFormatter: (value: number) => formatPercent(value),
    },
    grid: { left: 48, right: 24, top: 56, bottom: 48 },
    xAxis: {
      type: 'category',
      data: records.map((item) => ('deviceName' in item ? item.deviceName : item.categoryName)),
      axisLabel: { color: tokens.axisLabelColor, interval: 0, rotate: 18 },
    },
    yAxis: {
      ...createBaseCartesianOption(theme).yAxis,
      type: 'value',
      axisLabel: { color: tokens.axisLabelColor, formatter: (value: number) => `${value}%` },
    },
    series: [
      {
        name: title,
        type: 'bar',
        barMaxWidth: 42,
        itemStyle: {
          borderRadius: [12, 12, 4, 4],
          color: tokens.palette[0],
        },
        data: records.map((item) => Number(item.utilizationRate)),
      },
    ],
  }
}

export function createBorrowComparisonOption(
  record: BorrowStatisticsResponse | null,
  theme: ResolvedTheme,
) {
  const statDate = record?.statDate ? formatDate(record.statDate) : '当前日期'
  const tokens = getChartThemeTokens(theme)

  return {
    ...createBaseCartesianOption(theme),
    tooltip: { ...createBaseCartesianOption(theme).tooltip, trigger: 'axis' },
    legend: { ...createBaseCartesianOption(theme).legend, top: 12 },
    grid: { left: 48, right: 24, top: 64, bottom: 42 },
    xAxis: {
      ...createBaseCartesianOption(theme).xAxis,
      type: 'category',
      data: [statDate],
    },
    yAxis: { ...createBaseCartesianOption(theme).yAxis, type: 'value' },
    series: [
      {
        name: '借出',
        type: 'line',
        smooth: true,
        lineStyle: { width: 3, color: tokens.palette[0] },
        itemStyle: { color: tokens.palette[0] },
        data: [record?.totalBorrows ?? 0],
      },
      {
        name: '归还',
        type: 'line',
        smooth: true,
        lineStyle: { width: 3, color: tokens.palette[1] },
        itemStyle: { color: tokens.palette[1] },
        data: [record?.totalReturns ?? 0],
      },
    ],
  }
}

/**
 * 设备排行榜图表配置。
 * 排行接口已经按设备维度聚合借用次数，因此这里直接映射设备名与借用次数，不再前端重复排序或扩展额外评分口径。
 */
export function createDeviceRankingOption(records: DeviceRankingResponse[], theme: ResolvedTheme) {
  const tokens = getChartThemeTokens(theme)

  return {
    ...createBaseCartesianOption(theme),
    tooltip: {
      ...createBaseCartesianOption(theme).tooltip,
      trigger: 'axis',
      valueFormatter: (value: number) => `${value}`,
    },
    grid: { left: 48, right: 24, top: 36, bottom: 64 },
    xAxis: {
      type: 'category',
      data: records.map((item) => item.deviceName),
      axisLabel: { color: tokens.axisLabelColor, interval: 0, rotate: 24 },
    },
    yAxis: { ...createBaseCartesianOption(theme).yAxis, type: 'value' },
    series: [
      {
        name: '借用次数',
        type: 'bar',
        barMaxWidth: 40,
        itemStyle: {
          borderRadius: [12, 12, 4, 4],
          color: tokens.palette[0],
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
export function createUserRankingOption(records: UserRankingResponse[], theme: ResolvedTheme) {
  const tokens = getChartThemeTokens(theme)

  return {
    ...createBaseCartesianOption(theme),
    tooltip: { ...createBaseCartesianOption(theme).tooltip, trigger: 'axis' },
    grid: { left: 48, right: 24, top: 36, bottom: 64 },
    xAxis: {
      ...createBaseCartesianOption(theme).xAxis,
      type: 'category',
      data: records.map((item) => item.realName || item.username),
      axisLabel: { color: tokens.axisLabelColor, interval: 0, rotate: 24 },
    },
    yAxis: { ...createBaseCartesianOption(theme).yAxis, type: 'value' },
    series: [
      {
        name: '借用次数',
        type: 'bar',
        barMaxWidth: 40,
        itemStyle: {
          borderRadius: [12, 12, 4, 4],
          color: tokens.palette[1],
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
export function createOverdueSummaryOption(
  record: OverdueStatisticsResponse | null,
  theme: ResolvedTheme,
) {
  const statDate = record?.statDate ? formatDate(record.statDate) : '当前日期'
  const tokens = getChartThemeTokens(theme)

  return {
    ...createBaseCartesianOption(theme),
    tooltip: { ...createBaseCartesianOption(theme).tooltip, trigger: 'axis' },
    legend: { ...createBaseCartesianOption(theme).legend, top: 12 },
    grid: { left: 48, right: 56, top: 64, bottom: 42 },
    xAxis: {
      ...createBaseCartesianOption(theme).xAxis,
      type: 'category',
      data: [statDate],
    },
    yAxis: [
      {
        ...createBaseCartesianOption(theme).yAxis,
        type: 'value',
        name: '记录数',
      },
      {
        ...createBaseCartesianOption(theme).yAxis,
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
          color: tokens.palette[2],
        },
        data: [record?.totalOverdue ?? 0],
      },
      {
        name: '逾期小时数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { width: 3, color: tokens.palette[3] },
        itemStyle: { color: tokens.palette[3] },
        data: [record?.totalOverdueHours ?? 0],
      },
    ],
  }
}

/**
 * 热门时段接口只返回固定时段维度，因此用单轴热力图表达“每个小时段”的预约热度，
 * 不额外捏造日期或星期维度。
 */
export function createHotTimeSlotHeatmapOption(
  records: TimeSlotStatisticsResponse[],
  theme: ResolvedTheme,
) {
  const tokens = getChartThemeTokens(theme)

  return {
    tooltip: {
      backgroundColor: tokens.tooltipBackgroundColor,
      borderColor: tokens.tooltipBorderColor,
      textStyle: {
        color: tokens.tooltipTextColor,
      },
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
      axisLabel: {
        color: tokens.axisLabelColor,
      },
      axisLine: {
        lineStyle: {
          color: tokens.axisLineColor,
        },
      },
    },
    yAxis: {
      type: 'category',
      data: ['预约量'],
      axisLabel: {
        color: tokens.axisLabelColor,
      },
      axisLine: {
        lineStyle: {
          color: tokens.axisLineColor,
        },
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(...records.map((item) => item.totalReservations), 1),
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      calculable: true,
      textStyle: {
        color: tokens.legendTextColor,
      },
      inRange: {
        color: tokens.heatmapColors,
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
