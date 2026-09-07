export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada'

export interface ActionItem {
  task: string
  owner: string
  deadline: string
  priority: 'alta' | 'media' | 'baja'
  status?: TaskStatus
}

export interface MeetingAnalysis {
  id: string
  created_at: string
  title: string
  original_notes?: string
  summary: string
  decisions: string[]
  tasks: ActionItem[]
  risks: string[]
}

export interface ApiError {
  error: string
  details?: string
}
