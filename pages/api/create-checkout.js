import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------
// 1. CONFIGURATION API (Permet l'envoi d'images Base64 volumineuses)
// ----------------------------------------------------------------------

export const config = {
  api: {
    // Désactive le parser de corps de requête par défaut de Next.js
    bodyParser: {
      sizeLimit: '10mb', // Autorise jusqu'à 10MB pour l'image
    },
  },
};

// ----------------------------------------------------------------------
// 2. INITIALISATION DES SERVICES ET VÉRIFICATION DES CLÉS
// ----------------------------------------------------------------------

// Clés d'environnement (DOIVENT ÊTRE CONFIGURÉES DANS VERCEL)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
// Utilisation de NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let stripeClient, supabaseClient;

// Initialisation des clients (s'ils ne sont pas définis, le handler renverra une erreur 500)
if (STRIPE_SECRET_KEY && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
        // Le client Supabase avec le RÔLE DE SERVICE (Admin)
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Le client Stripe
        stripeClient = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2020-08-27',
        });
    } catch (e) {
        console.error("Erreur lors de l'initialisation des clients:", e.message);
    }
} else {
    console.error("ERREUR CRITIQUE: Une ou plusieurs clés d'environnement (Stripe ou Supabase) sont manquantes.");
}

// ----------------------------------------------------------------------
// 3. FONCTION UTILITAIRE
// ----------------------------------------------------------------------

/**
 * Décode la chaîne Base64 en un Buffer (pour l'upload Supabase).
 */
function decodeBase64Image(dataString) {
    const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Format de donnée image Base64 invalide');
    }
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    return { buffer, mimeType };
}


// ----------------------------------------------------------------------
// 4. HANDLER PRINCIPAL (Route POST)
// ----------------------------------------------------------------------

export default async function handler(req, res) {
    // Vérification initiale des services (au cas où l'initialisation a échoué)
    if (!stripeClient || !supabaseClient) {
        return res.status(500).json({ error: "Erreur de configuration serveur. Les clés Stripe/Supabase sont manquantes." });
    }

    if (req.method !== 'POST') {
        // Gère OPTIONS pour le CORS
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            return res.status(200).end();
        }
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { email, titre, histoire, prenom, ville, lien, photo_base64, amount } = req.body;

        // Validation du montant et des champs requis
        if (!email || !titre || !photo_base64 || !amount || amount < 100) {
            return res.status(400).json({ error: 'Champs manquants ou invalides (email, titre, photo, ou montant minimum 1€ - 100 centimes)' });
        }

        let finalPhotoUrl = null;

        // --- UPLOAD SÉCURISÉ SUPABASE STORAGE ---
        try {
            const { buffer: fileBuffer, mimeType } = decodeBase64Image(photo_base64);
            const fileExtension = mimeType.split('/')[1] || 'webp';
            
            // Nom de fichier unique
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
            const filePath = fileName; 

            console.log(`Tentative d'upload vers Supabase Storage: ${filePath}`);

            const { error: uploadError } = await supabaseClient.storage
                .from('photos')
                .upload(filePath, fileBuffer, {
                    contentType: mimeType,
                    upsert: false, 
                });
            
            if (uploadError) {
                console.error("Erreur d'upload Supabase:", uploadError);
                throw new Error(uploadError.message);
            }

            // Récupérer l'URL publique
            const { data: publicUrlData } = supabaseClient.storage
                .from('photos')
                .getPublicUrl(filePath);

            finalPhotoUrl = publicUrlData.publicUrl;
            console.log("URL Publique de l'image:", finalPhotoUrl);

        } catch (uploadOrDecodeError) {
             console.error('Échec de l\'upload de l\'image (Base64/Supabase):', uploadOrDecodeError.message);
             // 422 Unprocessable Entity si la donnée n'est pas bonne
             return res.status(422).json({ 
                 error: "Échec de l'upload de l'image ou format Base64 invalide.", 
                 details: uploadOrDecodeError.message 
             });
        }
        
        // --- CRÉATION DE LA SESSION STRIPE ---
        
        // Utilisation de l'en-tête d'origine pour des URLs de redirection dynamiques
        const origin = req.headers.origin || 'https://www.onemillionplaces.art';

        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Participation - ' + titre,
                            description: 'Million Places - Ajout d\'un objet',
                        },
                        unit_amount: amount, // en centimes (100 = 1€)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // URLs de redirection dynamiques (évite les URLs en dur)
            success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?cancel=1`,
            customer_email: email,
            metadata: {
                // Toutes les données nécessaires pour l'insertion dans la DB par le webhook
                email,
                titre,
                histoire,
                prenom,
                ville: ville || '',
                lien: lien || '',
                photo_url: finalPhotoUrl, 
            },
        });

        return res.status(200).json({ sessionId: session.id });

    } catch (error) {
        // Erreur Stripe ou autre erreur non gérée
        console.error('Erreur du Backend (Stripe ou général):', error);
        return res.status(500).json({ 
            error: 'Une erreur interne est survenue lors de la création de la session de paiement.',
            details: error.message || 'Erreur inconnue.'
        });
    }
}