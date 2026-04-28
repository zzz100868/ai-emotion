<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="status-page">
    <section class="status-card">
      <p class="eyebrow">404</p>
      <h1>没有找到这页记录</h1>
      <p>这个地址不在 MoodFlow 的路由表里。回到工作台后可以继续查看会话和报告。</p>
      <RouterLink to="/chat">
        <el-button type="primary">回到工作台</el-button>
      </RouterLink>
    </section>
  </main>
</template>
