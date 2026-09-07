export interface GeneratedTask {
  task: string
  owner: string
  deadline: string
  priority: 'alta' | 'media' | 'baja'
}

export interface GeneratedMinute {
  title: string
  summary: string
  decisions: string[]
  tasks: GeneratedTask[]
  risks: string[]
}

function parseModelJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new Error('Ollama no devolvió un resultado que se pudiera interpretar.')
  }
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 12)
}

function normalizeResult(value: unknown, fallbackTitle: string): GeneratedMinute {
  if (!value || typeof value !== 'object') throw new Error('La respuesta de Ollama no tiene la estructura esperada.')
  const input = value as Record<string, unknown>
  const tasks = Array.isArray(input.tasks)
    ? input.tasks.slice(0, 15).flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const task = item as Record<string, unknown>
        if (typeof task.task !== 'string' || !task.task.trim()) return []
        const priority: GeneratedTask['priority'] = task.priority === 'alta' || task.priority === 'baja' ? task.priority : 'media'
        return [{
          task: task.task.trim(),
          owner: typeof task.owner === 'string' && task.owner.trim() ? task.owner.trim() : 'Por definir',
          deadline: typeof task.deadline === 'string' && task.deadline.trim() ? task.deadline.trim() : 'Sin fecha',
          priority,
        }]
      })
    : []

  const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
  if (!summary) throw new Error('Ollama no generó un resumen válido.')

  return {
    title: typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 120) : fallbackTitle,
    summary,
    decisions: textArray(input.decisions),
    tasks,
    risks: textArray(input.risks),
  }
}

export async function generateMinute(notes: string, title: string): Promise<GeneratedMinute> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'https://ollama.com/api').replace(/\/$/, '')
  const apiKey = process.env.OLLAMA_API_KEY
  const model = process.env.OLLAMA_MODEL || 'gpt-oss:120b'

  if (baseUrl.includes('ollama.com') && !apiKey) {
    throw new Error('Falta configurar OLLAMA_API_KEY para usar Ollama Cloud.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 110_000)

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content: `Eres un asistente experto en convertir notas de reuniones en minutas accionables. Responde únicamente con JSON válido, sin markdown ni explicaciones. Usa exactamente esta estructura: {"title":"string","summary":"string","decisions":["string"],"tasks":[{"task":"string","owner":"string","deadline":"string","priority":"alta|media|baja"}],"risks":["string"]}. No inventes acuerdos, nombres o fechas. Cuando falte un responsable usa "Por definir" y cuando falte una fecha usa "Sin fecha". Escribe todo en español, con frases breves y claras.`,
          },
          {
            role: 'user',
            content: `Título proporcionado: ${title || 'No proporcionado'}\n\nNotas de la reunión:\n${notes}`,
          },
        ],
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const details = await response.text()
      throw new Error(`Ollama respondió con estado ${response.status}: ${details.slice(0, 240)}`)
    }

    const payload = await response.json() as { message?: { content?: string } }
    const content = payload.message?.content
    if (!content) throw new Error('Ollama devolvió una respuesta vacía.')
    return normalizeResult(parseModelJson(content), title || 'Reunión sin título')
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Ollama tardó demasiado en responder. Intenta nuevamente.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
