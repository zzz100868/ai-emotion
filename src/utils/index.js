// 通用工具函数集合

// 生成带前缀的唯一 ID：格式为 prefix_时间戳36进制_随机数
export function createId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// 以今天为基准，偏移指定天数后返回时间戳（时分秒固定为一个固定值，避免随机性干扰演示）
export function todayOffset(day) {
  const date = new Date()
  date.setDate(date.getDate() + day)
  date.setHours(10 + Math.abs(day), 30, 0, 0)
  return date.getTime()
}

// 将时间戳格式化为中文月日时分
export function formatDate(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

// 将风险等级枚举转换为中文可读文本
export function riskText(level) {
  return {
    low: '低风险',
    medium: '需关注',
    high: '高风险',
  }[level] || '低风险'
}
