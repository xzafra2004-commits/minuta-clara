import { errorMessage, json } from '../server/http.js'
import { getSupabase } from '../server/supabase.js'

export const maxDuration = 30

export default {
  async fetch(request: Request) {
    try {
      const supabase = getSupabase()

      if (request.method === 'GET') {
        const { data, error } = await supabase
          .from('meeting_minutes')
          .select('id, created_at, title, summary, decisions, tasks, risks')
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        return json({ data: data || [] })
      }

      if (request.method === 'DELETE') {
        const id = new URL(request.url).searchParams.get('id')
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Identificador inválido.' }, 400)

        const { error } = await supabase.from('meeting_minutes').delete().eq('id', id)
        if (error) throw error
        return json({ ok: true })
      }

      return json({ error: 'Método no permitido.' }, 405)
    } catch (error) {
      console.error('Minutes error:', error)
      return json({ error: 'No se pudo acceder al historial.', details: errorMessage(error) }, 500)
    }
  },
}
