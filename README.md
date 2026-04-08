# 智能设备管理系统前端

## 项目简介

本项目是“智能设备管理系统”前端，采用 Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus 实现。

当前首轮已对齐的主链路范围如下：

- 登录鉴权
- 设备与分类
- 预约 / 审批 / 签到
- 借还 / 逾期 / 通知
- AI 对话与语音辅助链路

首轮仍不包含统计、Prompt 模板和批量预约结果页。

## 联调真相源

- 后端实际 Controller / DTO / 枚举代码
- 工作区根目录 `device_management.sql`
- 统一响应壳：`{ code, message, data }`，且 `code === 0` 才表示成功
- 主键统一为 `string` UUID
- 时间统一使用 ISO 格式：`yyyy-MM-ddTHH:mm:ss`

## 环境要求

- Node.js `^20.19.0 || >=22.12.0`
- npm 10+
- 已启动的后端服务（默认 `http://localhost:8080`）

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 准备后端联调环境

请先在工作区根目录导入数据库脚本，并启动后端：

```bash
mysql -u<user> -p < /mnt/d/WorkSpace/device_management.sql
cd <当前后端仓库目录>
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

更完整的联调顺序、smoke 账号策略与人工冒烟步骤见当前后端仓库 `docs/mainline-integration-notes.md`。

### 3. 启动前端

```bash
npm run dev
```

默认访问地址：`http://localhost:5173`

## 开发代理与联调约定

- 开发环境会把 `/api` 和 `/files` 代理到后端，默认目标为 `http://localhost:8080`
- 如需切换到其他后端地址，可设置 `VITE_API_BASE_URL`
- 设备图片统一走 `/files/devices/**`
- 借还、逾期、通知页面遵循“名称优先、缺失回退 ID”，不在前端伪造后端未返回的名字字段
- 前端主展示与写接口统一使用 `DEVICE_ONLY` / `DEVICE_THEN_SYSTEM`、`SELF` / `ON_BEHALF`、`NOT_CHECKED_IN` / `CHECKED_IN` / `CHECKED_IN_TIMEOUT`；旧别名只保留在兼容解析入口

## AI 语音 v1 边界

- 后端 `speech.enabled` / `speechEnabled` 只表示语音输入转写是否可用；关闭时聊天页会继续保留文字对话与历史查看，不把历史播放能力也绑定到这个字段
- 正式上传合同固定为 `audio/wav`（16k / 16bit / 单声道 PCM），单次录音时长上限固定为 60 秒；后续录音实现必须按这个口径导出
- 语音只做转写，转写后回填输入框，请确认后发送；历史页只保留文字记录，不提供音频回放入口
- 前端公共联调只依赖 capability 字段与上传合同，不依赖具体 provider 名称或云厂商配置
- 前端不持有第三方云语音密钥，也不直连第三方云语音服务
- 当前发布阻塞浏览器矩阵仅覆盖桌面版 Chrome / Edge，不要把 Safari 或移动端写成已正式支持
- 语音转写会经过第三方云语音服务处理，但原始录音不做持久化存储
- 第三方云语音的合规 / 隐私审批是上线前置条件，当前仓库文档不代表审批已经完成

## 验证命令

reservation-create 的当前主说明位于后端仓库 `docs/mainline-integration-notes.md`；该文档中的固定主顺序仍是“后端测试 → 前端 type-check/build/unit → 浏览器 E2E”。这里仅镜像保留前端侧快捷命令与本轮真实结果。

```bash
./mvnw clean verify
npm run type-check && npm run build && npm run test:unit
node scripts/e2e/seed-reservation-create.mjs --scenario happy-path
node scripts/e2e/seed-reservation-create.mjs --scenario atomic-failure
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test e2e/reservation-create.spec.ts --config=playwright.reservation.config.mjs
```

- `seed-reservation-create.mjs` 现在会直接调用真实 backend internal seed 入口，并在当前环境下自动启动或复用可用的 backend 实例；按计划执行上述命令时，不需要再额外补跑计划外的手动 backend 启动命令。
- 当前环境的浏览器验证必须显式带上 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome`。

### 最新自动验证记录

- 2026-04-07：后端 `./mvnw clean verify` 通过。
- 2026-04-07：前端 `npm run type-check && npm run build && npm run test:unit` 通过。
- 2026-04-07：`npm run type-check && npm run build` 通过。
- 2026-04-07：`node scripts/e2e/seed-reservation-create.mjs --scenario happy-path` 通过，真实 backend seed/startup 复用 `http://localhost:18080`。
- 2026-04-07：`node scripts/e2e/seed-reservation-create.mjs --scenario atomic-failure` 通过，复用同一 backend 并返回真实冲突设备信息。
- 2026-04-07：`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test e2e/reservation-create.spec.ts --config=playwright.reservation.config.mjs` 通过，汇总为 `2 passed`。

如需补做桌面版 Chrome / Edge 的语音冒烟，可额外运行：

```bash
npm run test:smoke:voice
```

## WSL2 说明

- 在 WSL2 的 `/mnt/*` 挂载目录下直接启动 `vitest` 可能触发 `Bus error (core dumped)`
- 当前 `npm run test:unit` 已包装为兼容脚本：检测到 `/mnt/*` 路径时，会把仓库同步到 Linux 原生临时目录后再执行测试
- 如需单独验证这层兼容逻辑，可运行：

```bash
npm run test:runner
```

## 文档补充

- 后端联调说明：当前后端仓库 `docs/mainline-integration-notes.md`
- 当前会话计划：`/mnt/d/WorkSpace/docs/superpowers/plans/2026-03-19-device-management-mainline-integration.md`
