<script setup>
// 404 页面：路由未匹配时展示
import { Home } from 'lucide-vue-next'
</script>

<template>
  <main class="status-page">
    <section class="status-card">
      <p class="eyebrow">404</p>
      <h1>没有找到这页记录</h1>
      <p>这个地址不在 MoodFlow 的路由表里。回到工作台后可以继续查看会话和报告。</p>
      <RouterLink class="primary-btn" to="/chat">
        <Home :size="18" />
        回到工作台
      </RouterLink>
    </section>
  </main>
</template>
