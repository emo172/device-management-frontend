import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const businessComponentModules = import.meta.glob('../*.vue')

async function loadComponent(componentName: string) {
  const loader = businessComponentModules[`../${componentName}.vue`]

  if (!loader) {
    return {
      module: null,
      error: new Error(`${componentName}.vue is missing`),
    }
  }

  try {
    return {
      module: (await loader()) as { default: object },
      error: null,
    }
  } catch (error) {
    return {
      module: null,
      error,
    }
  }
}

describe('ReservationTimeline', () => {
  it('基于预约详情关键时间渲染状态流转节点', async () => {
    const { module, error } = await loadComponent('ReservationTimeline')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        reservation: {
          id: 'reservation-1',
          batchId: null,
          userId: 'user-1',
          userName: 'demo-user',
          createdBy: 'user-1',
          createdByName: 'demo-user',
          reservationMode: 'SELF',
          deviceId: 'device-1',
          deviceName: '示波器',
          deviceNumber: 'DEV-001',
          deviceStatus: 'AVAILABLE',
          startTime: '2026-03-18T09:00:00',
          endTime: '2026-03-18T10:00:00',
          purpose: '课程实验',
          remark: '请提前准备',
          status: 'APPROVED',
          signStatus: 'CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
          deviceApproverId: 'device-admin-1',
          deviceApproverName: '设备管理员',
          deviceApprovedAt: '2026-03-18T08:20:00',
          deviceApprovalRemark: '设备通过',
          systemApproverId: 'system-admin-1',
          systemApproverName: '系统管理员',
          systemApprovedAt: '2026-03-18T08:40:00',
          systemApprovalRemark: '系统通过',
          cancelReason: null,
          cancelTime: null,
          checkedInAt: '2026-03-18T09:05:00',
          createdAt: '2026-03-18T08:00:00',
          updatedAt: '2026-03-18T09:05:00',
        },
      },
      global: {
        stubs: {
          ElTimeline: { template: '<div><slot /></div>' },
          ElTimelineItem: {
            props: ['timestamp'],
            template: '<section><span>{{ timestamp }}</span><slot /></section>',
          },
          EmptyState: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('提交预约')
    expect(wrapper.text()).toContain('设备审批通过')
    expect(wrapper.text()).toContain('系统审批通过')
    expect(wrapper.text()).toContain('完成签到')
    expect(wrapper.text()).toContain('设备通过')
  })
})
