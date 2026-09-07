import analyzeHandler from '../api/analyze.js'

const notes = `Prueba de integración de Minuta Clara. Participaron Ana, Luis y Marta.
El equipo decidió publicar la primera versión el viernes. Ana revisará el texto
mañana y Luis corregirá el formulario antes del jueves. Marta indicó que falta
la aprobación del área legal; si no responde el miércoles, escalará el caso.`

const request = new Request('http://localhost/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Prueba de integración', notes }),
})

const response = await analyzeHandler.fetch(request)
const result = await response.json() as Record<string, unknown>

if (!response.ok) {
  console.error(JSON.stringify({ ok: false, status: response.status, error: result.error, details: result.details }))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({
    ok: true,
    status: response.status,
    saved: typeof result.id === 'string',
    title: result.title,
    decisions: Array.isArray(result.decisions) ? result.decisions.length : 0,
    tasks: Array.isArray(result.tasks) ? result.tasks.length : 0,
    risks: Array.isArray(result.risks) ? result.risks.length : 0,
  }))
}
