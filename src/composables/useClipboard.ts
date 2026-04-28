import { ref } from 'vue'

export function useClipboard(timeout = 1400) {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(text: string): Promise<void> {
    if (!text) return
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, timeout)
  }

  return { copied, copy }
}
