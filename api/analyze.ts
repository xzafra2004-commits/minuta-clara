import { generateMinute } from '../server/ollama.js'
import { errorMessage, json } from '../server/http.js'
import { getSupabase } from '../server/supabase.js'

export const maxDuration = 120

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

    try {
      const body = await request.json() as { title?: unknown; notes?: unknown }
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
      const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

      if (notes.length < 40) return json({ error: 'Las notas deben tener al menos 40 caracteres.' }, 400)
      if (notes.length > 12000) return json({ error: 'Las notas no pueden superar los 12,000 caracteres.' }, 400)

      const minute = await generateMinute(notes, title)
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('meeting_minutes')
        .insert({
          title: minute.title,
          original_notes: notes,
          summary: minute.summary,
          decisions: minute.decisions,
          tasks: minute.tasks,
          risks: minute.risks,
        })
        .select('id, created_at, title, summary, decisions, tasks, risks')
        .single()

      if (error) throw new Error(`No se pudo guardar en Supabase: ${error.message}`)
      return json(data, 201)
    } catch (error) {
      console.error('Analyze error:', error)
      return json({ error: 'No se pudo generar la minuta.', details: errorMessage(error) }, 500)
    }
  },
}
