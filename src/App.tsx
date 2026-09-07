import { FormEvent, useEffect, useMemo, useState } from 'react'
import { analyzeMeeting, deleteMinute, listMinutes } from './api'
import type { ActionItem, MeetingAnalysis } from './types'

const sampleNotes = `Reunión semanal de lanzamiento - 6 de septiembre
Participaron: Ana, Diego y Lucía.

El lanzamiento se mantiene para el viernes 18. Ana confirmó que el contenido de la página está casi listo, pero falta la revisión legal. Diego enviará el texto a Legal mañana y espera comentarios antes del jueves. Lucía detectó que el formulario de registro no muestra un mensaje de confirmación. Ella lo corregirá antes del martes.

Decidimos usar la versión corta del formulario y dejar la integración con el CRM para una segunda fase. Existe el riesgo de que Legal demore más de dos días. Si no responde el jueves, Ana escalará el caso. Próxima revisión: jueves a las 4 p. m.`

const priorityLabel: Record<ActionItem['priority'], string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function EmptyList({ children }: { children: string }) {
  return <p className="empty-inline">{children}</p>
}

function ResultPanel({ analysis }: { analysis: MeetingAnalysis }) {
  const copyResult = async () => {
    const tasks = analysis.tasks
      .map((item) => `- ${item.task} — ${item.owner} — ${item.deadline}`)
      .join('\n')
    await navigator.clipboard.writeText(
      `${analysis.title}\n\nResumen\n${analysis.summary}\n\nDecisiones\n${analysis.decisions.map((item) => `- ${item}`).join('\n')}\n\nTareas\n${tasks}`,
    )
  }

  return (
    <section className="result" aria-live="polite">
      <div className="result-heading">
        <div>
          <span className="eyebrow dark">Minuta procesada</span>
          <h2>{analysis.title}</h2>
          <p className="result-date">Generada el {formatDate(analysis.created_at)}</p>
        </div>
        <button className="button button-ghost" type="button" onClick={copyResult}>
          <CopyIcon /> Copiar
        </button>
      </div>

      <article className="summary-card">
        <span className="section-number">01</span>
        <div>
          <h3>Resumen ejecutivo</h3>
          <p>{analysis.summary}</p>
        </div>
      </article>

      <div className="result-grid">
        <article className="result-card">
          <div className="card-title">
            <span className="section-number">02</span>
            <h3>Decisiones</h3>
          </div>
          {analysis.decisions.length ? (
            <ul className="clean-list">
              {analysis.decisions.map((decision, index) => (
                <li key={`${decision}-${index}`}><CheckIcon /> <span>{decision}</span></li>
              ))}
            </ul>
          ) : <EmptyList>No se identificaron decisiones.</EmptyList>}
        </article>

        <article className="result-card">
          <div className="card-title">
            <span className="section-number">03</span>
            <h3>Riesgos y bloqueos</h3>
          </div>
          {analysis.risks.length ? (
            <ul className="clean-list risk-list">
              {analysis.risks.map((risk, index) => (
                <li key={`${risk}-${index}`}><AlertIcon /> <span>{risk}</span></li>
              ))}
            </ul>
          ) : <EmptyList>No se identificaron riesgos.</EmptyList>}
        </article>
      </div>

      <article className="tasks-card">
        <div className="card-title tasks-title">
          <div className="title-cluster">
            <span className="section-number">04</span>
            <h3>Próximas acciones</h3>
          </div>
          <span className="task-count">{analysis.tasks.length} tareas</span>
        </div>
        {analysis.tasks.length ? (
          <div className="task-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th>Responsable</th>
                  <th>Fecha</th>
                  <th>Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {analysis.tasks.map((item, index) => (
                  <tr key={`${item.task}-${index}`}>
                    <td>{item.task}</td>
                    <td>{item.owner}</td>
                    <td>{item.deadline}</td>
                    <td><span className={`priority priority-${item.priority}`}>{priorityLabel[item.priority]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyList>No se identificaron tareas.</EmptyList>}
      </article>
    </section>
  )
}

function App() {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null)
  const [history, setHistory] = useState<MeetingAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  const remaining = useMemo(() => 12000 - notes.length, [notes.length])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      setHistory(await listMinutes())
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'No se pudo cargar el historial.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (notes.trim().length < 40) {
      setError('Agrega al menos 40 caracteres para obtener una minuta útil.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await analyzeMeeting(title.trim(), notes.trim())
      setAnalysis(result)
      setHistory((current) => [result, ...current.filter((item) => item.id !== result.id)])
      requestAnimationFrame(() => document.querySelector('.result')?.scrollIntoView({ behavior: 'smooth' }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo analizar la reunión.')
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (id: string) => {
    setError('')
    try {
      await deleteMinute(id)
      setHistory((current) => current.filter((item) => item.id !== id))
      if (analysis?.id === id) setAnalysis(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la minuta.')
    }
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Minuta Clara, inicio">
          <span className="brand-mark"><SparkIcon /></span>
          <span>Minuta <strong>Clara</strong></span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#historial">Historial</a>
        </nav>
        <a className="button button-small button-light" href="#analizar">Crear minuta</a>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="live-dot" /> Impulsado por Ollama</span>
            <h1>De notas sueltas a <em>acciones claras.</em></h1>
            <p className="hero-subtitle">
              Pega las notas de tu reunión. La IA identifica acuerdos, responsables,
              fechas y riesgos en segundos.
            </p>
            <a className="button button-primary" href="#analizar">Organizar mi reunión <ArrowIcon /></a>
            <p className="privacy-note"><LockIcon /> Tus claves nunca llegan al navegador</p>
          </div>

          <div className="hero-visual" aria-label="Vista previa de una minuta organizada">
            <div className="float-card float-card-main">
              <div className="fake-window"><i /><i /><i /></div>
              <p className="fake-label">Resumen semanal</p>
              <h3>Lanzamiento · Equipo producto</h3>
              <div className="fake-row"><CheckIcon /><span>Publicar nueva landing</span><b>Vie 18</b></div>
              <div className="fake-row"><CheckIcon /><span>Validación con Legal</span><b>Mañana</b></div>
              <div className="fake-row muted"><AlertIcon /><span>Bloqueo: integración CRM</span></div>
            </div>
            <div className="float-card float-card-stat"><strong>3</strong><span>acuerdos<br />detectados</span></div>
            <div className="float-card float-card-owner"><span className="avatar">LM</span><span><small>Responsable</small><strong>Lucía M.</strong></span></div>
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
          </div>
        </section>

        <section className="steps" id="como-funciona">
          <span className="eyebrow dark">Simple y directo</span>
          <h2>Tres pasos. Cero caos.</h2>
          <div className="step-grid">
            <article><span>01</span><h3>Pega tus notas</h3><p>Sirven apuntes, una transcripción o ideas sin ordenar.</p></article>
            <article><span>02</span><h3>Ollama las entiende</h3><p>La IA separa resumen, decisiones, tareas y riesgos.</p></article>
            <article><span>03</span><h3>Todos saben qué sigue</h3><p>Obtén una minuta lista para copiar, guardar o compartir.</p></article>
          </div>
        </section>

        <section className="workspace" id="analizar">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow dark">Nueva minuta</span>
              <h2>¿Qué pasó en la reunión?</h2>
            </div>
            <button
              className="sample-button"
              type="button"
              onClick={() => {
                setTitle('Lanzamiento de producto')
                setNotes(sampleNotes)
                setError('')
              }}
            >
              Usar texto de ejemplo
            </button>
          </div>

          <form className="analyze-form" onSubmit={handleSubmit}>
            <label>
              <span>Título de la reunión <small>opcional</small></span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, 120))}
                placeholder="Ej. Seguimiento del lanzamiento"
              />
            </label>
            <label>
              <span>Notas o transcripción</span>
              <textarea
                required
                minLength={40}
                maxLength={12000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Pega aquí todo lo que anotaste. No hace falta que esté ordenado..."
              />
              <small className={remaining < 500 ? 'counter warning' : 'counter'}>{remaining.toLocaleString('es-PE')} caracteres disponibles</small>
            </label>
            {error && <div className="error-banner" role="alert"><AlertIcon /> <span>{error}</span></div>}
            <button className="button button-primary submit-button" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Organizando tu reunión…</> : <>Generar minuta <SparkIcon /></>}
            </button>
          </form>
        </section>

        {analysis && <ResultPanel analysis={analysis} />}

        <section className="history" id="historial">
          <div className="history-heading">
            <div>
              <span className="eyebrow dark">Guardado en Supabase</span>
              <h2>Minutas recientes</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => void loadHistory()} aria-label="Actualizar historial"><RefreshIcon /></button>
          </div>

          {historyLoading ? (
            <div className="history-empty"><span className="spinner dark-spinner" /> Cargando historial…</div>
          ) : history.length ? (
            <div className="history-list">
              {history.map((item) => (
                <article key={item.id} className="history-item">
                  <button className="history-open" type="button" onClick={() => {
                    setAnalysis(item)
                    requestAnimationFrame(() => document.querySelector('.result')?.scrollIntoView({ behavior: 'smooth' }))
                  }}>
                    <span className="history-icon"><DocumentIcon /></span>
                    <span><strong>{item.title}</strong><small>{formatDate(item.created_at)} · {item.tasks.length} tareas</small></span>
                  </button>
                  <button className="delete-button" type="button" onClick={() => void removeItem(item.id)} aria-label={`Eliminar ${item.title}`}><TrashIcon /></button>
                </article>
              ))}
            </div>
          ) : (
            <div className="history-empty"><DocumentIcon /><strong>Aún no hay minutas</strong><span>Tu primer análisis aparecerá aquí.</span></div>
          )}
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#inicio"><span className="brand-mark"><SparkIcon /></span><span>Minuta <strong>Clara</strong></span></a>
        <p>Reuniones que terminan en acciones, no en confusión.</p>
        <span>React · Ollama · Supabase · Vercel</span>
      </footer>
    </>
  )
}

function SparkIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.6 5.3 4.7 9.4 10 10-5.3.6-9.4 4.7-10 10-.6-5.3-4.7-9.4-10-10 5.3-.6 9.4-4.7 10-10Z" /></svg> }
function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg> }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg> }
function AlertIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></svg> }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg> }
function CopyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg> }
function RefreshIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.5-2L20 12M4 12l2.4 5a7 7 0 0 0 11.5-2" /></svg> }
function DocumentIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></svg> }
function TrashIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg> }

export default App
