export interface User {
  id: string
  username: string
  color: string
  createdAt: number
}

export interface FileTemplate {
  path: string        // e.g. "main.py", "src/utils.py"
  content: string
  readOnly?: boolean  // файлы-заготовки от преподавателя, которые студент не меняет
}

export interface TestCase {
  id: string
  description: string
  input: string           // stdin для программы
  expectedOutput: string  // ожидаемый stdout
  isHidden: boolean       // скрытые тесты: студент видит только ✓/✗
}

export interface LabRole {
  id: string           // 'a' | 'b' | ...
  label: string        // "Студент А — реализует алгоритм"
  description: string  // роль-специфичное задание (Markdown)
  ownedFiles: string[] // пути файлов, доступных только этой роли
}

export interface Lab {
  id: string
  title: string
  description: string   // Markdown
  language: string      // id компилятора: 'python', 'javascript', etc.
  files: FileTemplate[]
  testCases: TestCase[]
  order: number
  roles?: LabRole[]     // если задан → совместная лаба, нельзя решить в одиночку
}

export interface Course {
  id: string
  title: string
  description: string
  authorId: string
  authorName: string
  labs: Lab[]
  isPublic: boolean
  createdAt: number
  updatedAt: number
}

export interface Session {
  id: string          // roomId для SignalR
  labId: string
  courseId: string
  labTitle: string
  courseTitle: string
  language: string
  createdAt: number
  lastActive: number
}

export type ParticipantRole = 'owner' | 'teacher' | 'student'

export interface Participant {
  userId: string
  username: string
  role: ParticipantRole
  color: string
}
