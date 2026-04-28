# MoodFlow 架构说明

## 1. 项目定位

MoodFlow 是一个 AI 情绪复盘工作台。它不是通用聊天机器人，而是把“对话输入、AI 回复、结构化情绪分析、后台趋势观察”串成完整链路。

## 2. 分层结构

```text
用户操作层
  ↓
Vue 页面组件
  ↓
Pinia 状态层
  ↓
services 请求层
  ↓
Node 本地 API / 浏览器 localStorage
  ↓
模型服务或本地规则兜底
```

对应文件：

```text
页面层
  src/views/LoginView.vue
  src/views/ChatView.vue
  src/views/DashboardView.vue
  src/views/SessionsView.vue

状态层
  src/stores/auth.js
  src/stores/mood.js

服务层
  src/services/httpClient.js
  src/services/authService.js
  src/services/aiService.js

接口层
  server/index.js

样式层
  src/styles/main.scss
  src/styles/base/*.scss
  src/styles/views/*.scss
```

## 3. 登录与权限链路

```text
用户输入账号密码
  ↓
LoginView.submitLogin()
  ↓
authStore.login(credentials)
  ↓
authService.loginWithPassword()
  ↓
httpClient.post('/login')
  ↓
server/index.js handleLogin()
  ↓
返回 user/token
  ↓
authStore.persist()
  ↓
router.beforeEach 根据 role 放行或拦截
```

关键点：

1. Axios 只负责普通 HTTP 请求。
2. token 保存在 `moodflow_auth`，刷新页面后可恢复登录态。
3. `adminOnly` 路由由 Vue Router 守卫统一判断。

## 4. AI 对话链路

```text
用户发送消息
  ↓
ChatView.send()
  ↓
moodStore.sendMessage()
  ↓
创建 user 消息和 assistant 占位消息
  ↓
streamAssistantReply()
  ↓
fetch('/api/chat') + ReadableStream
  ↓
逐段解析 SSE token
  ↓
增量写入 assistant.content
  ↓
完成后触发 analyzeEmotionReport()
```

这里没有使用 Axios 处理流式回复，因为浏览器原生 `fetch` 更适合读取 `response.body.getReader()`。

## 5. 情绪分析链路

```text
AI 回复完成
  ↓
analyzeEmotionReport({ messages })
  ↓
POST /api/analyze
  ↓
Node 代理请求模型服务
  ↓
模型返回 JSON 报告
  ↓
normalizeReport()
  ↓
写入 session.report
  ↓
localStorage 持久化
  ↓
Dashboard / Sessions 自动更新
```

如果模型接口失败，前端会使用本地规则生成报告，避免演示链路中断。

## 6. 看板数据链路

```text
localStorage 会话数据
  ↓
moodStore.sessions
  ↓
filters 筛选条件
  ↓
filteredSessions / filteredReports
  ↓
stats / keywordRank
  ↓
MetricCard / TrendChart / 最近报告
```

Dashboard 不直接维护图表数据，而是从 Pinia getter 派生，这样会话管理页和看板页可以共享同一组筛选条件。

## 7. SCSS 样式组织

```text
src/styles/main.scss
  ↓
base/_tokens.scss       设计变量、颜色、阴影、字体
base/_base.scss         全局重置、基础排版
base/_layout.scss       应用外壳、侧边栏、登录页布局
base/_components.scss   按钮、表单、卡片、标签等通用组件
views/_chat.scss        聊天页和报告面板
views/_dashboard.scss   看板、筛选、会话表、设置页
base/_responsive.scss   响应式布局
```

这样拆分后，后续继续优化页面质感时，可以按职责定位样式，而不需要在单个大 CSS 文件里修改。
