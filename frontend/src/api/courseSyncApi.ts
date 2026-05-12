import type { Course } from '../types'

function getDeviceId(): string {
  const key = 'praxis_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export async function fetchAllCoursesFromServer(): Promise<Course[]> {
  const res = await fetch('/api/courses')
  if (!res.ok) throw new Error('Failed to fetch courses from server')
  return res.json()
}

export async function pushCourseToServer(course: Course): Promise<Course> {
  const res = await fetch(`/api/courses/${course.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': getDeviceId(),
    },
    body: JSON.stringify(course),
  })
  if (!res.ok) throw new Error('Failed to push course to server')
  return res.json()
}

export async function deleteCourseOnServer(id: string): Promise<void> {
  await fetch(`/api/courses/${id}`, {
    method: 'DELETE',
    headers: { 'X-Device-Id': getDeviceId() },
  })
}
