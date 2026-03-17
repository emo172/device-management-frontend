<script setup lang="ts">
import { BarChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { use } from 'echarts/core'
import VChart from 'vue-echarts'

use([
  BarChart,
  CanvasRenderer,
  GridComponent,
  HeatmapChart,
  LegendComponent,
  LineChart,
  PieChart,
  TooltipComponent,
  VisualMapComponent,
])

/**
 * 统计图表面板。
 * 统一承接标题、说明和 VChart 容器，避免每个统计页反复编写同样的图表边框与布局样式。
 */
defineProps<{
  /** 标题由页面层按当前业务域传入，例如“设备利用率柱状图”。 */
  title: string
  /** 说明文字用于解释图表口径，避免管理端误解图表是前端估算结果。 */
  description: string
  /** 图表配置对象由 `chartOptions.ts` 统一生成，页面层只负责选择正确的业务映射函数。 */
  option: Record<string, unknown>
  /** 高度默认由组件兜底，个别图表需要更高画布时可由页面显式覆盖。 */
  height?: string
}>()
</script>

<template>
  <section class="shared-chart-panel">
    <div class="shared-chart-panel__header">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
    </div>

    <VChart
      class="shared-chart-panel__chart"
      :option="option"
      :style="{ height: height || '320px' }"
      autoresize
    />
  </section>
</template>

<style scoped lang="scss">
.shared-chart-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  padding: 22px;
}

.shared-chart-panel__header h2,
.shared-chart-panel__header p {
  margin: 0;
}

.shared-chart-panel__header p {
  margin-top: 8px;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.shared-chart-panel__chart {
  margin-top: 18px;
}
</style>
