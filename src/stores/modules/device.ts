import { defineStore } from 'pinia'

import * as deviceApi from '@/api/devices'

interface DeviceState {
  list: deviceApi.DeviceResponse[]
  total: number
  query: deviceApi.GetDeviceListParams
  currentDevice: deviceApi.DeviceDetailResponse | null
  loading: boolean
}

function createDefaultQuery(): deviceApi.GetDeviceListParams {
  return {
    page: 1,
    size: 10,
  }
}

function createDefaultState(): DeviceState {
  return {
    list: [],
    total: 0,
    query: createDefaultQuery(),
    currentDevice: null,
    loading: false,
  }
}

/**
 * 设备域状态。
 * 负责承接设备分页、当前详情与写操作后的最新回显，避免页面分别维护同一台设备的列表态和详情态。
 */
export const useDeviceStore = defineStore('device', {
  state: (): DeviceState => createDefaultState(),

  actions: {
    /**
     * 列表查询条件收敛到 Store，保证分页组件、筛选栏和刷新按钮共用同一口径。
     */
    async fetchDeviceList(query: deviceApi.GetDeviceListParams = createDefaultQuery()) {
      this.loading = true
      this.query = { ...query }

      try {
        const result = await deviceApi.getDeviceList(query)
        this.list = result.records
        this.total = result.total
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 详情数据单独缓存，供设备详情页、编辑弹窗和图片上传后的即时回显复用。
     */
    async fetchDeviceDetail(deviceId: string) {
      const detail = await deviceApi.getDeviceDetail(deviceId)
      this.currentDevice = detail
      return detail
    },

    /**
     * 创建设备后把新记录放到当前缓存前部，便于后续页面在不重新请求列表时也能看到最新结果。
     */
    async createDevice(payload: deviceApi.CreateDeviceRequest) {
      const device = await deviceApi.createDevice(payload)
      this.list = [device, ...this.list]
      this.total += 1
      return device
    },

    /**
     * 更新基础信息后同步列表与详情，避免同一设备在不同视图里出现不一致字段。
     */
    async updateDevice(deviceId: string, payload: deviceApi.UpdateDeviceRequest) {
      const device = await deviceApi.updateDevice(deviceId, payload)
      this.replaceDeviceInList(device)

      if (this.currentDevice?.id === deviceId) {
        this.currentDevice = {
          ...this.currentDevice,
          ...device,
        }
      }

      return device
    },

    /**
     * 状态变更必须复用专用接口，以保留后端状态日志；Store 负责把结果回写到列表和详情。
     */
    async updateStatus(deviceId: string, payload: deviceApi.UpdateDeviceStatusRequest) {
      const device = await deviceApi.updateDeviceStatus(deviceId, payload)
      this.replaceDeviceInList(device)

      if (this.currentDevice?.id === deviceId) {
        this.currentDevice = {
          ...this.currentDevice,
          ...device,
        }
      }

      return device
    },

    /**
     * 软删除成功后直接从当前列表移除，保持表格与后端可见数据一致。
     */
    async deleteDevice(deviceId: string) {
      const device = await deviceApi.deleteDevice(deviceId)
      this.list = this.list.filter((item) => item.id !== deviceId)
      this.total = Math.max(0, this.total - 1)

      if (this.currentDevice?.id === deviceId) {
        this.currentDevice = null
      }

      return device
    },

    /**
     * 图片上传完成后以后端返回的完整详情覆盖当前详情，避免前端自行拼接文件地址导致口径漂移。
     */
    async uploadDeviceImage(deviceId: string, file: File) {
      const detail = await deviceApi.uploadDeviceImage(deviceId, file)
      this.currentDevice = detail
      this.replaceDeviceInList(detail)
      return detail
    },

    /**
     * 列表里的设备对象统一按主键覆盖，减少每个写动作各自维护索引更新逻辑。
     */
    replaceDeviceInList(device: deviceApi.DeviceResponse) {
      this.list = this.list.map((item) => (item.id === device.id ? { ...item, ...device } : item))
    },

    /**
     * 详情页退出时主动清理当前设备，避免切换路由后短暂闪现上一台设备的数据。
     */
    resetCurrentDevice() {
      this.currentDevice = null
    },
  },
})
