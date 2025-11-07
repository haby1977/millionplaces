// api/create-checkout.js (à l'intérieur du dossier 'api')

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// === Configuration Supabase Service Role Key (SECURE) ===
// Les variables d'environnement sont lues directement dans l'environnement Vercel
const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// Initialisation des services
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


// ======================================================================
// HANDLER PRINCIPAL (Route POST)
// Utilisation de module.exports pour une fonction Serverless Vercel standard
// ======================================================================

module.exports = async (req, res) => {
    // Vérification initiale des services (simple)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: "Erreur de configuration serveur. Les clés sont manquantes." });
    }

    if (req.method !== 'POST') {
        // La gestion des OPTIONS (CORS) est souvent gérée automatiquement par Vercel ou via sa config.
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { 
            email, titre, histoire, prenom, ville, lien, amount,
            photo_url // <--- NOUVEAU : On attend l'URL légère d'Uploadcare, PAS photo_base64
        } = req.body;

        // Validation simple
        if (!email || !titre || !photo_url || !amount || amount < 100) {
            return res.status(400).json({ error: 'Champs requis manquants (montant minimum 1€ ou URL de la photo)' });
        }

        // --- 1. CRÉATION DE L'OBJET TEMPORAIRE DANS SUPABASE (Avant Stripe) ---
        
        // On stocke toutes les données (y compris l'URL légère de la photo)
        const { data: dbData, error: dbError } = await supabase
            .from('objets') // Assurez-vous que le nom de la table est 'objets'
            .insert({
                email,
                titre,
                histoire,
                prenom,
                ville,
                lien,
                photo_url: photo_url, // <-- L'URL d'Uploadcare est stockée ici
                montant: amount / 100,
                statut_paiement: 'pending' // En attente de la confirmation Stripe (Webhook)
            })
            .select()
            .single();

        if (dbError) {
            console.error("Erreur Supabase à la création de l'objet temporaire:", dbError);
            return res.status(500).json({ error: 'Erreur de base de données à l\'étape 1.' });
        }
        
        const temporaryObjectId = dbData.id;

        // --- 2. CRÉATION DE LA SESSION STRIPE ---
        
        const origin = req.headers.origin || 'https://onemillionplaces.art';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Participation - ' + titre,
                            description: 'Ajout d\'un objet à la galerie',
                        },
                        unit_amount: amount, // en centimes
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // Stocker l'ID de l'objet temporaire pour que le Webhook puisse le mettre à jour
            metadata: {
                object_id: temporaryObjectId, // ID temporaire de l'objet créé ci-dessus
                // Nous n'avons pas besoin de stocker TOUTES les données (email, photo_url) dans les metadata Stripe, 
                // car elles sont déjà dans l'objet 'pending' de Supabase (dbData).
            },
            success_url: `${origin}/?success=1&id=${temporaryObjectId}`,
            cancel_url: `${origin}/?cancel=1&id=${temporaryObjectId}`,
            customer_email: email,
        });

        // Succès : Renvoie l'ID de session au frontend
        return res.status(200).json({ sessionId: session.id });

    } catch (error) {
        console.error('Erreur du Backend (Stripe ou général):', error);
        return res.status(500).json({ 
            error: 'Une erreur interne est survenue lors de la création de la session de paiement.',
            details: error.message || 'Erreur inconnue.'
        });
    }
};