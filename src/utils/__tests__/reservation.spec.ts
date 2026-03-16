import { describe, expect, it } from 'vitest'

import {
  buildReservationTimelineItems,
  canCancelReservation,
  canCheckInReservation,
  getReservationCheckInStage,
  shouldShowCancelWindowHint,
  validateReservationTimeRange,
} from '../reservation'

const reservationBase: {
  status: string
  signStatus: string
  startTime: string
  endTime: string
} = {
  status: 'APPROVED',
  signStatus: 'NOT_CHECKED_IN',
  startTime: '2026-03-18T10:00:00',
  endTime: '2026-03-18T11:00:00',
}

describe('reservation utils', () => {
  it('仅在开始前超过 24 小时时允许自助取消', () => {
    expect(canCancelReservation(reservationBase, new Date('2026-03-17T09:59:59'))).toBe(true)
    expect(canCancelReservation(reservationBase, new Date('2026-03-17T10:00:00'))).toBe(false)
  })

  it('仅在未开始且进入 24 小时窗口后显示联系管理员提示', () => {
    expect(shouldShowCancelWindowHint(reservationBase, new Date('2026-03-17T10:00:00'))).toBe(true)
    expect(shouldShowCancelWindowHint(reservationBase, new Date('2026-03-18T10:00:01'))).toBe(false)
  })

  it('签到按钮覆盖边界时间和旧别名状态兼容', () => {
    expect(canCheckInReservation(reservationBase, new Date('2026-03-18T09:30:00'))).toBe(true)
    expect(canCheckInReservation(reservationBase, new Date('2026-03-18T11:00:00'))).toBe(true)
    expect(canCheckInReservation(reservationBase, new Date('2026-03-18T09:29:59'))).toBe(false)
    expect(
      canCheckInReservation(
        {
          ...reservationBase,
          signStatus: 'NOT_SIGNED',
        },
        new Date('2026-03-18T09:45:00'),
      ),
    ).toBe(true)
  })

  it('创建预约时执行本地时间规则校验', () => {
    expect(
      validateReservationTimeRange({
        startTime: '2026-03-18T07:59:00',
        endTime: '2026-03-18T09:00:00',
      }),
    ).toContain('预约时间必须在 08:00-22:00 之间')

    expect(
      validateReservationTimeRange({
        startTime: '2026-03-18T10:00:00',
        endTime: '2026-03-18T10:20:00',
      }),
    ).toContain('预约时长不能少于 30 分钟')

    expect(
      validateReservationTimeRange({
        startTime: '2026-03-18T10:00:00',
        endTime: '2026-03-26T10:30:00',
      }),
    ).toContain('预约时长不能超过 7 天')

    expect(
      validateReservationTimeRange({
        startTime: '2026-03-18T10:00:00',
        endTime: '2026-03-18T09:30:00',
      }),
    ).toContain('结束时间必须晚于开始时间')

    expect(
      validateReservationTimeRange({
        startTime: '2026-03-18T10:00:00',
        endTime: '2026-03-18T11:00:00',
      }),
    ).toEqual([])
  })

  it('基于详情时间字段生成预约状态时间线', () => {
    expect(typeof buildReservationTimelineItems).toBe('function')

    const items = buildReservationTimelineItems({
      createdAt: '2026-03-18T08:00:00',
      deviceApprovedAt: '2026-03-18T08:10:00',
      deviceApprovalRemark: '设备管理员通过',
      systemApprovedAt: '2026-03-18T08:20:00',
      systemApprovalRemark: '系统管理员通过',
      checkedInAt: '2026-03-18T09:05:00',
      cancelTime: null,
      cancelReason: null,
    })

    expect(items).toEqual([
      {
        key: 'created',
        title: '提交预约',
        time: '2026-03-18T08:00:00',
        remark: null,
      },
      {
        key: 'device-approved',
        title: '设备审批通过',
        time: '2026-03-18T08:10:00',
        remark: '设备管理员通过',
      },
      {
        key: 'system-approved',
        title: '系统审批通过',
        time: '2026-03-18T08:20:00',
        remark: '系统管理员通过',
      },
      {
        key: 'checked-in',
        title: '完成签到',
        time: '2026-03-18T09:05:00',
        remark: null,
      },
    ])
  })

  it('区分正常签到、超时签到与已过期提示', () => {
    expect(typeof getReservationCheckInStage).toBe('function')

    expect(
      getReservationCheckInStage(
        {
          ...reservationBase,
          checkedInAt: null,
        },
        new Date('2026-03-18T09:40:00'),
      ),
    ).toBe('normal')

    expect(
      getReservationCheckInStage(
        {
          ...reservationBase,
          checkedInAt: null,
        },
        new Date('2026-03-18T10:40:00'),
      ),
    ).toBe('late')

    expect(
      getReservationCheckInStage(
        {
          ...reservationBase,
          checkedInAt: null,
        },
        new Date('2026-03-18T11:01:00'),
      ),
    ).toBe('expired')
  })
})
