// pages/api/supabase/[...path].js
import { createClient } from '@supabase/supabase-js'

// Client Supabase avec clé service_role (bypass RLS + pas de CORS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Récupère le chemin après /api/supabase/
  const { path } = req.query
  if (!path || path.length === 0) {
    return res.status(400).json({ error: 'Table manquante' })
  }

  // Construit l'URL REST
  const table = path[0]
  const restPath = path.slice(1).join('/')
  let url = `https://${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '')}/rest/v1/${table}`
  if (restPath) url += `/${restPath}`

  // Récupère les query params (ex: ?select=*,id=eq.5)
  const queryString = req.url.split('?')[1]
  if (queryString) url += `?${queryString}`

  // Headers PostgREST
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }

  // Corps pour POST/PATCH
  const body = ['POST', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined

  try {
    const response = await fetch(url, {
      method: req.method,
      headers,
      body
    })

    const data = await response.json()

    // Réponse au frontend
    res.status(response.status).json(data)
  } catch (error) {
    console.error('Erreur proxy Supabase:', error)
    res.status(500).json({ error: 'Erreur interne' })
  }
}