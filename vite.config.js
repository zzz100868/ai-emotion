import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 构建配置
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 配置路径别名，代码中可用 @/xxx 代替相对路径
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 开发时把 /api 请求代理到本地 Node 服务（默认端口 8787）
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // 将第三方库按类别拆分成独立 chunk，避免单个文件过大
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) {
            return 'vue'
          }
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'charts'
          }
          if (id.includes('node_modules/markdown-it')) {
            return 'markdown'
          }
          if (id.includes('node_modules/lucide-vue-next')) {
            return 'icons'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
