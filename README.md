# Minuta Clara

Minuta Clara convierte notas desordenadas de reuniones en un resumen, decisiones, tareas con responsables y riesgos. Es un proyecto funcional construido con el stack solicitado: **React, Ollama, Supabase y Vercel**.

## Problema que resuelve

Después de una reunión, los acuerdos suelen quedar dispersos entre apuntes y mensajes. Minuta Clara transforma ese texto en una minuta accionable y guarda el historial para consultarlo después.

## Stack

- **React + Vite:** interfaz web responsiva.
- **Ollama:** análisis de notas con un modelo de lenguaje.
- **Supabase:** persistencia del historial en PostgreSQL.
- **Vercel:** hosting y funciones serverless que protegen las claves.

## Configuración local

Requisitos: Node.js 20 o superior, una cuenta de Supabase y Ollama Cloud o una instancia de Ollama accesible desde el servidor.

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en Supabase y ejecuta [`supabase/schema.sql`](./supabase/schema.sql) en el SQL Editor.

3. Copia `.env.example` a `.env.local` y completa las variables:

   ```env
   OLLAMA_BASE_URL=https://ollama.com/api
   OLLAMA_API_KEY=tu_clave_de_ollama
   OLLAMA_MODEL=gpt-oss:120b
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SECRET_KEY=tu_secret_key
   ```

4. Levanta el proyecto completo:

   ```bash
   npm run dev
   ```

`npm run dev:ui` sirve únicamente la interfaz; las rutas `/api` requieren `vercel dev`.

### Usar Ollama local

Puedes cambiar `OLLAMA_BASE_URL` por `http://localhost:11434/api` y omitir `OLLAMA_API_KEY`. Esto funciona en desarrollo, pero no desde Vercel porque `localhost` apuntaría al servidor remoto. Para el despliegue utiliza Ollama Cloud o una instancia pública protegida.

## Despliegue en Vercel

1. Sube este proyecto a un repositorio público de GitHub.
2. Importa el repositorio en Vercel.
3. Agrega las cinco variables de `.env.example` en **Project Settings → Environment Variables**.
4. Ejecuta el despliegue. Vercel detectará Vite y publicará las funciones de `/api`.
5. Abre la URL pública, carga el texto de ejemplo y genera una minuta para comprobar el flujo completo.

## Seguridad

La clave `SUPABASE_SECRET_KEY` y la clave de Ollama se usan exclusivamente en las funciones serverless. La tabla tiene Row Level Security habilitado y no expone políticas públicas. Para un producto abierto a Internet conviene agregar autenticación y límites por IP antes de compartirlo ampliamente.

## Estructura

```text
api/                 Funciones serverless de Vercel
server/              Integración segura con Ollama y Supabase
src/                 Aplicación React
supabase/schema.sql  Esquema de base de datos
vercel.json          Configuración de despliegue
```
