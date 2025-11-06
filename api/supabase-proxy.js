// api/supabase-proxy.vc.js

// IMPORTANT : Assurez-vous que vos variables Vercel sont nommées
// NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY pour la meilleure compatibilité.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

module.exports = async (req, res) => {
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("ERREUR CRITIQUE: Configuration Vercel manquante pour Supabase.");
    // Renvoie une erreur JSON claire
    return res.status(500).json({ error: 'Configuration serveur manquante.' });
  }

  // Chemin de l'API REST pour la table 'objets'
  const PATH = '/rest/v1/objets?select=*'; 
  const apiUrl = `${SUPABASE_URL}${PATH}`;

  try {
    const supabaseResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await supabaseResponse.text(); // Lisez d'abord comme texte
    
    // Si la réponse n'est pas OK, renvoyez l'erreur pour la déboguer dans la console Vercel
    if (!supabaseResponse.ok) {
        console.error("Erreur de Supabase (Statut:", supabaseResponse.status, ") Réponse:", text);
        return res.status(supabaseResponse.status).json({ error: 'Supabase Error: ' + text });
    }

    // Tentez l'analyse JSON uniquement si la réponse est OK
    try {
        const data = JSON.parse(text);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (parseError) {
        console.error("Échec du JSON.parse (Réponse OK non-JSON?):", text);
        return res.status(500).json({ error: 'Réponse illisible de Supabase.' });
    }

  } catch (error) {
    console.error("Erreur de connexion Vercel->Supabase:", error);
    res.status(500).json({ error: 'Proxy Vercel échec de connexion.' });
  }
};