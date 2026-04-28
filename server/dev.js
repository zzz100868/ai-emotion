import { spawn } from 'node:child_process'
import './index.js'

// 开发启动脚本：同时启动 API 服务（index.js）和 Vite 前端开发服务器
const vite = spawn('npm', ['run', 'dev:client', '--', '--host', '127.0.0.1'], {
  stdio: 'inherit',
  shell: false,
})

function shutdown() {
  vite.kill('SIGTERM')
  process.exit(0)
}

// 捕获 Ctrl+C 或进程终止信号，优雅关闭 Vite 子进程
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
