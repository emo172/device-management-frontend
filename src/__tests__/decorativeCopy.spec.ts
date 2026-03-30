import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

interface ForbiddenCopyCase {
  filePath: string
  forbiddenTexts: string[]
}

function readSource(filePath: string) {
  return readFileSync(resolve(process.cwd(), filePath), 'utf-8')
}

const heroEyebrowCases: ForbiddenCopyCase[] = [
  {
    filePath: 'src/views/dashboard/UserDashboard.vue',
    forbiddenTexts: ['eyebrow="User Workspace"'],
  },
  {
    filePath: 'src/views/dashboard/AdminDashboard.vue',
    forbiddenTexts: ['eyebrow="Admin Console"'],
  },
  { filePath: 'src/views/device/List.vue', forbiddenTexts: ['eyebrow="Device Console"'] },
  { filePath: 'src/views/device/Detail.vue', forbiddenTexts: ['eyebrow="Device Detail"'] },
  { filePath: 'src/views/device/Create.vue', forbiddenTexts: ['eyebrow="Device Create"'] },
  { filePath: 'src/views/device/Edit.vue', forbiddenTexts: ['eyebrow="Device Edit"'] },
  {
    filePath: 'src/views/device/category/List.vue',
    forbiddenTexts: ['eyebrow="Category Console"'],
  },
  {
    filePath: 'src/views/reservation/List.vue',
    forbiddenTexts: ['eyebrow="Reservation Console"'],
  },
  {
    filePath: 'src/views/reservation/Detail.vue',
    forbiddenTexts: ['eyebrow="Reservation Detail"'],
  },
  {
    filePath: 'src/views/reservation/Create.vue',
    forbiddenTexts: ['eyebrow="Reservation Create"'],
  },
  {
    filePath: 'src/views/reservation/CheckIn.vue',
    forbiddenTexts: ['eyebrow="Reservation Check In"'],
  },
  {
    filePath: 'src/views/reservation/manage/Pending.vue',
    forbiddenTexts: ['eyebrow="Reservation Review"'],
  },
  {
    filePath: 'src/views/reservation/manage/History.vue',
    forbiddenTexts: ['eyebrow="Reservation History"'],
  },
  { filePath: 'src/views/borrow/List.vue', forbiddenTexts: ['eyebrow="Borrow Ledger"'] },
  { filePath: 'src/views/borrow/Detail.vue', forbiddenTexts: ['eyebrow="Borrow Detail"'] },
  {
    filePath: 'src/views/borrow/Confirm.vue',
    forbiddenTexts: ['eyebrow="Confirm Borrow"'],
  },
  { filePath: 'src/views/borrow/Return.vue', forbiddenTexts: ['eyebrow="Confirm Return"'] },
  { filePath: 'src/views/overdue/List.vue', forbiddenTexts: ['eyebrow="Overdue Board"'] },
  { filePath: 'src/views/overdue/Detail.vue', forbiddenTexts: ['eyebrow="Overdue Detail"'] },
  {
    filePath: 'src/views/overdue/Handle.vue',
    forbiddenTexts: ['eyebrow="Process Overdue"'],
  },
  {
    filePath: 'src/views/notification/List.vue',
    forbiddenTexts: ['eyebrow="Notification Center"'],
  },
  {
    filePath: 'src/views/statistics/Overview.vue',
    forbiddenTexts: ['eyebrow="Statistics Console"'],
  },
  {
    filePath: 'src/views/statistics/DeviceUsage.vue',
    forbiddenTexts: ['eyebrow="Utilization"'],
  },
  {
    filePath: 'src/views/statistics/BorrowStats.vue',
    forbiddenTexts: ['eyebrow="Borrow Analytics"'],
  },
  {
    filePath: 'src/views/statistics/OverdueStats.vue',
    forbiddenTexts: ['eyebrow="Overdue Risk"'],
  },
  {
    filePath: 'src/views/statistics/HotTimeSlots.vue',
    forbiddenTexts: ['eyebrow="Hot Time Slots"'],
  },
  { filePath: 'src/views/user/List.vue', forbiddenTexts: ['eyebrow="System / Users"'] },
  {
    filePath: 'src/views/user/Detail.vue',
    forbiddenTexts: ['eyebrow="System / User Detail"'],
  },
  { filePath: 'src/views/user/Profile.vue', forbiddenTexts: ['eyebrow="User / Profile"'] },
  {
    filePath: 'src/views/admin/RolePermission.vue',
    forbiddenTexts: ['eyebrow="System / Role Access"'],
  },
  {
    filePath: 'src/views/admin/PromptTemplate.vue',
    forbiddenTexts: ['eyebrow="System / Prompt Assets"'],
  },
  {
    filePath: 'src/views/auth/ForgotPassword.vue',
    forbiddenTexts: ['eyebrow="Auth / Forgot Password"'],
  },
  {
    filePath: 'src/views/auth/ResetPassword.vue',
    forbiddenTexts: ['eyebrow="Auth / Reset Password"'],
  },
]

const localDecorativeCopyCases: ForbiddenCopyCase[] = [
  {
    filePath: 'src/layouts/AuthLayout.vue',
    forbiddenTexts: [
      'Unified Device Workspace',
      'Create Account',
      'Recover Access',
      'Reset Credentials',
    ],
  },
  {
    filePath: 'src/components/layout/AppSidebar.vue',
    forbiddenTexts: ['Device Console'],
  },
  {
    filePath: 'src/components/business/OverdueAlert.vue',
    forbiddenTexts: ['Overdue Radar'],
  },
  {
    filePath: 'src/views/auth/Login.vue',
    forbiddenTexts: ['Auth / Login'],
  },
  {
    filePath: 'src/views/auth/Register.vue',
    forbiddenTexts: ['Auth / Register'],
  },
  {
    filePath: 'src/views/dashboard/UserDashboard.vue',
    forbiddenTexts: ['Check-in Focus', 'AI Assistant', 'Recent Reservations'],
  },
  {
    filePath: 'src/views/dashboard/AdminDashboard.vue',
    forbiddenTexts: ['Approval Reminder', 'Quick Actions'],
  },
  {
    filePath: 'src/views/dashboard/index.vue',
    forbiddenTexts: ['<p class="dashboard-entry-pending__eyebrow">Dashboard</p>'],
  },
  {
    filePath: 'src/views/borrow/List.vue',
    forbiddenTexts: ['Filter'],
  },
  {
    filePath: 'src/views/borrow/Confirm.vue',
    forbiddenTexts: ['Candidates', 'Selection'],
  },
  {
    filePath: 'src/views/borrow/Return.vue',
    forbiddenTexts: [
      '<p class="borrow-return-view__eyebrow">Borrowed</p>',
      '<p class="borrow-return-view__eyebrow">Selection</p>',
    ],
  },
  {
    filePath: 'src/views/overdue/List.vue',
    forbiddenTexts: ['Filter'],
  },
  {
    filePath: 'src/views/overdue/Detail.vue',
    forbiddenTexts: [
      '<p class="overdue-detail-view__eyebrow">Processing</p>',
      '<p class="overdue-detail-view__eyebrow">Method</p>',
    ],
  },
  {
    filePath: 'src/views/overdue/Handle.vue',
    forbiddenTexts: ['Snapshot', 'Decision'],
  },
  {
    filePath: 'src/views/statistics/DeviceUsage.vue',
    forbiddenTexts: ['Date Scope'],
  },
  {
    filePath: 'src/views/statistics/BorrowStats.vue',
    forbiddenTexts: ['Date Scope'],
  },
  {
    filePath: 'src/views/statistics/OverdueStats.vue',
    forbiddenTexts: ['Date Scope'],
  },
  {
    filePath: 'src/views/statistics/HotTimeSlots.vue',
    forbiddenTexts: ['Date Scope'],
  },
  {
    filePath: 'src/views/user/RoleAssign.vue',
    forbiddenTexts: ['Role Assignment'],
  },
  {
    filePath: 'src/views/user/Freeze.vue',
    forbiddenTexts: ['Freeze Control'],
  },
  {
    filePath: 'src/views/ai/Chat.vue',
    forbiddenTexts: ['AI Assistant'],
  },
  {
    filePath: 'src/views/ai/History.vue',
    forbiddenTexts: ['Conversation History'],
  },
]

describe('decorative copy cleanup', () => {
  it.each(heroEyebrowCases)(
    '页面 Hero 不再保留装饰性英文眉标：$filePath',
    ({ filePath, forbiddenTexts }) => {
      const source = readSource(filePath)

      for (const forbiddenText of forbiddenTexts) {
        expect(source).not.toContain(forbiddenText)
      }
    },
  )

  it.each(localDecorativeCopyCases)(
    '局部标题与辅助文案改为中文或必要术语：$filePath',
    ({ filePath, forbiddenTexts }) => {
      const source = readSource(filePath)

      for (const forbiddenText of forbiddenTexts) {
        expect(source).not.toContain(forbiddenText)
      }
    },
  )
})
