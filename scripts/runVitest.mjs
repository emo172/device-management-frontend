import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const MIRROR_ROOT = path.join(os.tmpdir(), 'device-management-vitest')
const MANIFEST_NAME = '.mirror-manifest.json'

/**
 * 在 WSL 的 /mnt 挂载目录下运行 vitest 会触发 Bus error。
 * 这里把测试命令切换到 Linux 原生目录执行，避免开发者在挂载目录里直接跑单测时再次踩到环境问题。
 */
export function getExecutionMode(cwd) {
  return cwd.startsWith('/mnt/') ? 'mirrored' : 'direct'
}

/**
 * 镜像目录名需要稳定且可读，避免同一台机器上多个仓库互相覆盖。
 */
export function getWorkspaceName(cwd) {
  return cwd.replace(/^\/+/, '').replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function getMirrorDirectory(cwd) {
  return path.join(MIRROR_ROOT, getWorkspaceName(cwd))
}

function escapeWindowsCommandArgument(argument) {
  if (!argument) {
    return '""'
  }

  if (!/[\s"]/u.test(argument)) {
    return argument
  }

  return `"${argument.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1')}"`
}

/**
 * Windows 下的 npm/npx 实际是 `.cmd` 启动脚本，需要显式交给 `cmd.exe /c` 执行。
 * 这样既兼容本地 VSCode 的 Windows Node 运行时，也避免 `shell: true` 带来的额外噪音。
 */
export function getCommandInvocation(
  command,
  args,
  platform = process.platform,
  commandShell = process.env.ComSpec || 'cmd.exe',
) {
  if (platform !== 'win32') {
    return {
      command,
      args,
      options: {
        windowsHide: false,
      },
    }
  }

  return {
    command: commandShell,
    args: ['/d', '/s', '/c', [command, ...args].map(escapeWindowsCommandArgument).join(' ')],
    options: {
      windowsHide: true,
    },
  }
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex')
}

async function readManifest(mirrorDirectory) {
  const manifestPath = path.join(mirrorDirectory, MANIFEST_NAME)

  if (!existsSync(manifestPath)) {
    return null
  }

  return JSON.parse(await readFile(manifestPath, 'utf8'))
}

async function writeManifest(mirrorDirectory, manifest) {
  await writeFile(path.join(mirrorDirectory, MANIFEST_NAME), JSON.stringify(manifest, null, 2))
}

async function syncRepository(sourceDirectory, mirrorDirectory) {
  await mkdir(mirrorDirectory, { recursive: true })

  const entries = await readdir(mirrorDirectory, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === MANIFEST_NAME) {
      continue
    }

    await rm(path.join(mirrorDirectory, entry.name), { recursive: true, force: true })
  }

  await cp(sourceDirectory, mirrorDirectory, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    filter: (sourcePath) => {
      const relativePath = path.relative(sourceDirectory, sourcePath)

      if (!relativePath) {
        return true
      }

      const normalizedPath = relativePath.split(path.sep).join('/')
      return ![
        '.git',
        'node_modules',
        'dist',
        'dist-ssr',
        'coverage',
        '.vitest-cache',
        '.mirror-manifest.json',
      ].some((blocked) => normalizedPath === blocked || normalizedPath.startsWith(`${blocked}/`))
    },
  })
}

async function ensureDependencies(sourceDirectory, mirrorDirectory) {
  const packageJson = await readFile(path.join(sourceDirectory, 'package.json'), 'utf8')
  const packageLock = await readFile(path.join(sourceDirectory, 'package-lock.json'), 'utf8')
  const nextManifest = {
    packageJsonHash: hashContent(packageJson),
    packageLockHash: hashContent(packageLock),
  }
  const currentManifest = await readManifest(mirrorDirectory)
  const shouldInstall =
    !existsSync(path.join(mirrorDirectory, 'node_modules')) ||
    !currentManifest ||
    currentManifest.packageJsonHash !== nextManifest.packageJsonHash ||
    currentManifest.packageLockHash !== nextManifest.packageLockHash

  if (shouldInstall) {
    await runCommand('npm', ['install'], { cwd: mirrorDirectory })
    await writeManifest(mirrorDirectory, nextManifest)
  }
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const invocation = getCommandInvocation(command, args)
    const child = spawn(invocation.command, invocation.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
      ...invocation.options,
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          `命令执行失败: ${command} ${args.join(' ')} (code=${String(code)}, signal=${String(signal)})`,
        ),
      )
    })
  })
}

async function prepareMirror(sourceDirectory) {
  const mirrorDirectory = getMirrorDirectory(sourceDirectory)

  await mkdir(MIRROR_ROOT, { recursive: true })
  await syncRepository(sourceDirectory, mirrorDirectory)
  await ensureDependencies(sourceDirectory, mirrorDirectory)

  return mirrorDirectory
}

async function runVitest() {
  const sourceDirectory = process.cwd()
  const executionMode = getExecutionMode(sourceDirectory)
  const vitestArgs = process.argv.slice(2)

  if (executionMode === 'direct') {
    await runCommand('npx', ['vitest', ...vitestArgs], { cwd: sourceDirectory })
    return
  }

  const mirrorDirectory = await prepareMirror(sourceDirectory)

  /**
   * 把原仓库路径透传给子进程，给后续自定义 reporter 或排障脚本保留可读取的源目录上下文。
   */
  await runCommand('npx', ['vitest', ...vitestArgs], {
    cwd: mirrorDirectory,
    env: {
      DEVICE_MANAGEMENT_SOURCE_ROOT: sourceDirectory,
    },
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runVitest().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
