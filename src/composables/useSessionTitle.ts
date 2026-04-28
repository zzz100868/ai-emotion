export function useSessionTitle() {
  function displayTitle(title: string, isPrivate: boolean): string {
    if (!isPrivate) return title
    return title.length > 6 ? `${title.slice(0, 2)}···${title.slice(-2)}` : '隐私会话'
  }

  return { displayTitle }
}
