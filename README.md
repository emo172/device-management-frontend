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

- 后端 `speech.enabled` 是语音总开关，关闭时聊天页会继续保留文字对话与历史查看，不把不可用状态伪装成故障
- v1 语音 provider 仅对接 Azure Speech，部署前至少需要准备 `SPEECH_AZURE_REGION` 与 `SPEECH_AZURE_KEY`
- 当前发布阻塞浏览器矩阵仅覆盖桌面版 Chrome / Edge，不要把 Safari 或移动端写成已正式支持
- 语音转写会经过第三方云语音服务处理，但原始录音不做持久化存储
- 历史播放会按需基于 `chat_history.aiResponse` 生成，不预存整段历史音频
- 第三方云语音的合规 / 隐私审批是上线前置条件，当前仓库文档不代表审批已经完成

## 验证命令

```bash
npm run type-check
npm run build
npm run test:unit
```

需要一次性执行完整前端校验时，可直接运行：

```bash
npm run type-check && npm run build && npm run test:unit
```

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
