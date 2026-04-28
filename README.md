# MoodFlow

MoodFlow 是一个基于 Vue3 的 AI 情绪复盘与会话分析工作台。项目围绕“用户通过对话记录状态，系统生成结构化情绪报告，管理员通过看板观察趋势”这一条业务链路展开。

## 核心功能

- 账号登录：通过 Axios 请求本地 `/api/login`，返回用户身份和 token。
- 权限路由：用户访问对话、复盘与设置；管理员访问情绪看板、会话管理和设置。
- AI 对话：支持多会话、流式回复、中断生成、重新生成。
- 情绪分析：对话结束后生成结构化报告，包含情绪标签、评分、关键词、风险等级、摘要和建议。
- 数据看板：管理员基于用户会话报告观察整体情绪趋势、风险队列和高频触发词。
- 会话管理：管理员按用户、关键词、情绪、风险、处理状态和时间范围管理具体个案。
- 本地持久化：使用 localStorage 保存登录状态、token、会话和分析报告。
- 接口降级：AI 服务不可用时回退本地规则，保证核心演示链路可用。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端框架 | Vue3 + Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 普通 HTTP 请求 | Axios |
| AI 流式请求 | Fetch + ReadableStream |
| 可视化 | ECharts |
| 样式工程 | SCSS |
| Markdown 渲染 | markdown-it |
| 本地 API 代理 | Node.js HTTP Server |

## 演示账号

| 身份 | 账号 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员 | `admin` | `MoodFlow@2026Admin` | 看板、会话管理、设置 |
| 用户 陈然 | `user` | `MoodFlow@2026Chen` | 对话、复盘、设置 |
| 用户 林溪 | `lin` | `MoodFlow@2026Lin` | 对话、复盘、设置 |
| 用户 周宁 | `zhou` | `MoodFlow@2026Zhou` | 对话、复盘、设置 |

登录接口为本地模拟鉴权，目的是展示 Axios 请求封装、token 持久化和角色权限控制。

## 本地运行

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动本地 API 代理和 Vite 开发服务。前端通过 Vite proxy 请求 `/api`，默认代理到 `http://127.0.0.1:8787`。

## 接入真实模型

复制 `.env.example` 为 `.env.local`，填入模型服务配置：

```bash
cp .env.example .env.local
```

```text
MOODFLOW_API_KEY=你的密钥
MOODFLOW_API_BASE_URL=https://api.moonshot.cn/v1
MOODFLOW_MODEL=moonshot-v1-auto
MOODFLOW_API_PORT=8787
```

`.env.local` 已被 `.gitignore` 忽略，不要提交真实密钥。

## 项目结构

```text
src/
  components/        通用展示组件、图表组件、情绪标签
  layouts/           应用侧边栏和页面外壳
  router/            路由配置和角色守卫
  services/          Axios 客户端、鉴权服务、AI 服务
  stores/            Pinia 登录状态和会话状态
  styles/            SCSS 样式分层
    base/            tokens、基础样式、布局、组件、响应式
    views/           聊天页、看板页等页面样式
  utils/             ID、时间、风险文案工具
  views/             登录、聊天、看板、会话管理、设置
server/
  index.js           本地 API 代理、登录接口、AI 转发接口
  dev.js             同时启动 API 代理和 Vite
```

## 请求与数据链路

```text
账号密码
  ↓
LoginView
  ↓
authStore.login()
  ↓
authService.loginWithPassword()
  ↓
Axios httpClient
  ↓
POST /api/login
  ↓
Node 本地 API 校验账号
  ↓
返回 user/token
  ↓
localStorage 持久化
  ↓
Vue Router 根据 role 控制访问权限
```

AI 对话流式响应单独保留 `fetch + ReadableStream`，因为它需要逐段读取 token；Axios 用于登录、健康检查和后续普通 JSON API。

## 构建

```bash
npm run build
```

## 已知限制

- 登录接口是本地模拟鉴权，不连接真实用户数据库。
- 会话和报告保存在浏览器 localStorage，刷新后可保留，但不支持跨设备同步。
- AI 接口失败时会回退本地规则，适合演示，不等同于真实心理健康评估。

## Roadmap

- 将会话和报告抽象到独立数据访问层。
- 增加真实后端持久化和用户表。
- 拆分图表与导出模块，降低首包体积。
- 增加端到端测试覆盖登录、对话、分析和权限路由。
