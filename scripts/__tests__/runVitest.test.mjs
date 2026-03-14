import test from 'node:test'
import assert from 'node:assert/strict'

import { getExecutionMode, getWorkspaceName, getMirrorDirectory } from '../runVitest.mjs'

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

test('镜像目录会落在 /tmp 下的固定路径', () => {
  const mirrorDirectory = getMirrorDirectory('/mnt/d/WorkSpace/device-management-frontend')

  assert.match(mirrorDirectory, /^\/tmp\/device-management-vitest\//)
  assert.match(mirrorDirectory, /device-management-frontend$/)
})
