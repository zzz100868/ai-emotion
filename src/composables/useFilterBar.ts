import { computed } from 'vue'
import type { MoodFilters } from '@/types'
import { useMoodStore } from '@/stores/mood'

export function useFilterBar() {
  const mood = useMoodStore()

  const filters = computed(() => mood.filters)

  function setFilters(partial: Partial<MoodFilters>): void {
    mood.setFilters(partial)
  }

  function resetFilters(): void {
    mood.resetFilters()
  }

  return { filters, setFilters, resetFilters }
}
