<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="status-page">
    <section class="status-card">
      <p class="eyebrow">403</p>
      <h1>这个工作区只向管理员开放</h1>
      <p>当前账号没有访问看板或会话管理的权限，可以回到对话页继续使用情绪复盘功能。</p>
      <RouterLink to="/chat">
        <el-button type="primary">返回 AI 对话</el-button>
      </RouterLink>
    </section>
  </main>
</template>
