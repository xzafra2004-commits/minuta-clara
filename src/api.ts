import type { ApiError, MeetingAnalysis } from './types'

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({
    error: 'El servidor devolvió una respuesta inválida.',
  }))) as T | ApiError

  if (!response.ok) {
    const problem = payload as ApiError
    throw new Error(problem.details || problem.error || 'No se pudo completar la solicitud.')
  }

  return payload as T
}

export async function analyzeMeeting(title: string, notes: string): Promise<MeetingAnalysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, notes }),
  })

  return readResponse<MeetingAnalysis>(response)
}

export async function listMinutes(): Promise<MeetingAnalysis[]> {
  const response = await fetch('/api/minutes')
  const result = await readResponse<{ data: MeetingAnalysis[] }>(response)
  if (!Array.isArray(result.data)) {
    throw new Error('El historial no está disponible. Inicia la aplicación con “npm run dev”.')
  }
  return result.data
}

export async function deleteMinute(id: string): Promise<void> {
  const response = await fetch(`/api/minutes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  await readResponse<{ ok: true }>(response)
}
