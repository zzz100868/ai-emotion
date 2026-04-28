// localStorage 读写封装：统一处理 JSON 序列化/反序列化，失败时返回 fallback

export function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value || fallback
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeItem(key) {
  localStorage.removeItem(key)
}
