// pages/api/supabase-proxy.js

// Assurez-vous que ces variables d'environnement sont définies
// dans les paramètres de votre projet Vercel (elles contiennent l'URL et la clé Supabase)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // Chemin de l'API REST Supabase que votre frontend tentait d'appeler
  const PATH = '/rest/v1/objets?select=*'; 
  const apiUrl = `${SUPABASE_URL}${PATH}`;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Erreur: Variables Supabase non définies sur Vercel.");
    return res.status(500).json({ error: 'Configuration serveur Supabase manquante.' });
  }
  
  try {
    // 1. Appel Serveur-à-Serveur (ignorant le CORS)
    const supabaseResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // 2. Traitement de la réponse de Supabase
    const data = await supabaseResponse.json();

    if (!supabaseResponse.ok) {
        // Renvoie l'erreur Supabase si elle existe
        return res.status(supabaseResponse.status).json({ error: data.message || 'Erreur Supabase.' });
    }

    // 3. Renvoyer la réponse au navigateur (CORS résolu)
    res.status(200).json(data);
  } catch (error) {
    console.error("Erreur dans le proxy Supabase:", error);
    res.status(500).json({ error: 'Échec de la récupération des données via proxy.' });
  }
}// JavaScript Document