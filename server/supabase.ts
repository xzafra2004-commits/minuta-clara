import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !secretKey) {
    throw new Error('Falta configurar Supabase en las variables de entorno.')
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
