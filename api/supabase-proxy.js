// Début du fichier api/supabase-proxy.js

// 1. IMPORTATION DE LA LIBRAIRIE FETCH (CORRECTION CRITIQUE)
// Cela résout l'échec de la connexion Vercel->Supabase.
const fetch = require('node-fetch'); 

// 2. RÉCUPÉRATION DES VARIABLES D'ENVIRONNEMENT
// Nous utilisons le nom de variable défini sur Vercel : SUPABASE_URL et SUPABASE_ANON_KEY.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

module.exports = async (req, res) => {
    
    // Vérification de la configuration (pour le débogage Vercel)
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error("ERREUR CRITIQUE: Configuration Vercel manquante pour Supabase.");
        return res.status(500).json({ error: 'Configuration serveur manquante. Veuillez vérifier les variables ENV sur Vercel.' });
    }

    // Chemin de l'API REST pour la table 'objets'
    // Assurez-vous que votre table s'appelle bien 'objets'
    const PATH = '/rest/v1/objets?select=*';    
    const apiUrl = `${SUPABASE_URL}${PATH}`;

    try {
        // Tentative de connexion à l'API Supabase
        const supabaseResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const text = await supabaseResponse.text(); 
        
        // 3. Gestion des Erreurs HTTP de Supabase (Statut 4xx/5xx)
        if (!supabaseResponse.ok) {
            console.error("Erreur de Supabase (Statut:", supabaseResponse.status, ") Réponse:", text);
            // Renvoie une erreur de Supabase, pas une erreur générique de Vercel
            return res.status(supabaseResponse.status).json({ error: 'Supabase Error: ' + text });
        }

        // 4. Analyse JSON de la Réponse
        try {
            const data = JSON.parse(text);
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(data);
        } catch (parseError) {
            console.error("Échec du JSON.parse (Réponse OK non-JSON?):", text);
            return res.status(500).json({ error: 'Réponse illisible de Supabase.' });
        }

    } catch (error) {
        // Ceci capture les erreurs réseau (pas de DNS, timeout)
        console.error("Erreur de connexion Vercel->Supabase:", error);
        res.status(500).json({ error: 'Proxy Vercel échec de connexion. (Erreur réseau)' });
    }
};
// Fin du fichier api/supabase-proxy.js