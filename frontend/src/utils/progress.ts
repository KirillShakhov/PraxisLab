const key = (courseId: string) => `praxis_progress_${courseId}`

export function getCompletedLabs(courseId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(courseId))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function markLabComplete(courseId: string, labId: string): void {
  const completed = getCompletedLabs(courseId)
  if (completed.has(labId)) return
  completed.add(labId)
  localStorage.setItem(key(courseId), JSON.stringify([...completed]))
}

export function isLabComplete(courseId: string, labId: string): boolean {
  return getCompletedLabs(courseId).has(labId)
}
