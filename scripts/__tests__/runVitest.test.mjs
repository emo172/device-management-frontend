import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

import {
  getExecutionMode,
  getWorkspaceName,
  getMirrorDirectory,
  getCommandInvocation,
} from '../runVitest.mjs'

test('在 WSL 挂载目录下切换为镜像执行模式', () => {
  assert.equal(getExecutionMode('/mnt/d/WorkSpace/device-management-frontend'), 'mirrored')
})

test('在 Linux 原生目录下保持直接执行模式', () => {
  assert.equal(getExecutionMode('/tmp/device-management-frontend'), 'direct')
})

test('工作区名称会剔除特殊字符', () => {
  assert.equal(
    getWorkspaceName('/mnt/d/WorkSpace/device-management-frontend'),
    'mnt-d-WorkSpace-device-management-frontend',
  )
})

test('镜像目录会落在系统临时目录下的固定路径', () => {
  const mirrorDirectory = getMirrorDirectory('/mnt/d/WorkSpace/device-management-frontend')
  const expectedPrefix = path.join(os.tmpdir(), 'device-management-vitest')

  assert.ok(mirrorDirectory.startsWith(expectedPrefix))
  assert.match(mirrorDirectory, /device-management-frontend$/)
})

test('Windows 下会通过 cmd.exe 包装 npm/npx 调用', () => {
  assert.deepEqual(getCommandInvocation('npx', ['vitest', '--version'], 'win32', 'cmd.exe'), {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', 'npx vitest --version'],
    options: {
      windowsHide: true,
    },
  })

  assert.deepEqual(getCommandInvocation('npx', ['vitest', '--version'], 'linux', 'cmd.exe'), {
    command: 'npx',
    args: ['vitest', '--version'],
    options: {
      windowsHide: false,
    },
  })
})
