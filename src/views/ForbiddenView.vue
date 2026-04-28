<script setup>
// 403 无权限页：当普通用户尝试访问管理员专属路由时被重定向到此处
import { LockKeyhole, MessageCircle } from 'lucide-vue-next'
</script>

<template>
  <main class="status-page">
    <section class="status-card">
      <LockKeyhole :size="34" />
      <p class="eyebrow">403</p>
      <h1>这个工作区只向管理员开放</h1>
      <p>当前账号没有访问看板或会话管理的权限，可以回到对话页继续使用情绪复盘功能。</p>
      <RouterLink class="primary-btn" to="/chat">
        <MessageCircle :size="18" />
        返回 AI 对话
      </RouterLink>
    </section>
  </main>
</template>
