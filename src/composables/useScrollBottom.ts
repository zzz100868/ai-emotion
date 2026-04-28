import { nextTick, ref } from 'vue'

export function useScrollBottom() {
  const scrollRef = ref<HTMLElement | null>(null)
  const isNearBottom = ref(true)
  const hasUnreadBelow = ref(false)

  function updateScrollState(): void {
    if (!scrollRef.value) return
    const distance = scrollRef.value.scrollHeight - scrollRef.value.scrollTop - scrollRef.value.clientHeight
    isNearBottom.value = distance < 96
    if (isNearBottom.value) hasUnreadBelow.value = false
  }

  async function scrollBottom(behavior: ScrollBehavior = 'smooth'): Promise<void> {
    await nextTick()
    if (!scrollRef.value) return
    scrollRef.value.scrollTo({
      top: scrollRef.value.scrollHeight,
      behavior,
    })
    hasUnreadBelow.value = false
    setTimeout(updateScrollState, 80)
  }

  async function handleMessagesChanged(didInitialScroll: boolean): Promise<void> {
    if (!didInitialScroll) return
    if (isNearBottom.value) {
      await scrollBottom('smooth')
      return
    }
    hasUnreadBelow.value = true
  }

  function resetScroll(): void {
    isNearBottom.value = true
    hasUnreadBelow.value = false
  }

  return {
    scrollRef,
    isNearBottom,
    hasUnreadBelow,
    updateScrollState,
    scrollBottom,
    handleMessagesChanged,
    resetScroll,
  }
}
