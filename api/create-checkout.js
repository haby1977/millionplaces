import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ======================================================================
// CONFIGURATION VERCEL / NEXT.JS
// Augmentation de la limite du corps de la requête pour supporter le Base64
// ======================================================================
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Monté à 10 Mo pour plus de sécurité
    },
  },
};

// ----------------------------------------------------------------------
// 1. INITIALISATION DES SERVICES ET VÉRIFICATION DES CLÉS
// ----------------------------------------------------------------------

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let stripeClient, supabaseClient;

// Initialisation conditionnelle
if (STRIPE_SECRET_KEY && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
        // Client Supabase avec le RÔLE DE SERVICE (Admin)
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Client Stripe
        stripeClient = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2020-08-27',
        });
    } catch (e) {
        console.error("Erreur lors de l'initialisation des clients:", e.message);
    }
} else {
    console.error("ERREUR CRITIQUE: Clés d'environnement (Stripe/Supabase) manquantes.");
}

// ----------------------------------------------------------------------
// 2. FONCTION UTILITAIRE : Décodage Base64
// ----------------------------------------------------------------------

/**
 * Décode la chaîne Base64 en un Buffer (pour l'upload vers Supabase Storage).
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
// 3. HANDLER PRINCIPAL (Route POST)
// ----------------------------------------------------------------------

export default async function handler(req, res) {
    // Vérification initiale des services
    if (!stripeClient || !supabaseClient) {
        return res.status(500).json({ error: "Erreur de configuration serveur. Les clés sont manquantes." });
    }

    if (req.method !== 'POST') {
        // Gestion OPTIONS (Preflight CORS)
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            return res.status(200).end();
        }
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        // Récupération de photo_base64
        const { email, titre, histoire, prenom, ville, lien, photo_base64, amount } = req.body;

        // Validation simple
        if (!email || !titre || !photo_base64 || !amount || amount < 100) {
            return res.status(400).json({ error: 'Champs requis manquants (montant minimum 1€)' });
        }

        let finalPhotoUrl = null;

        // --- UPLOAD SÉCURISÉ SUPABASE STORAGE (avec Service Role Key) ---
        try {
            const { buffer: fileBuffer, mimeType } = decodeBase64Image(photo_base64);
            const fileExtension = mimeType.split('/')[1] || 'webp';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
            const filePath = fileName; 

            // Upload du Buffer binaire vers Supabase Storage
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

            // Récupération de l'URL publique
            const { data: publicUrlData } = supabaseClient.storage
                .from('photos')
                .getPublicUrl(filePath);

            finalPhotoUrl = publicUrlData.publicUrl;

        } catch (uploadOrDecodeError) {
             console.error('Échec de l\'upload de l\'image (Base64/Supabase):', uploadOrDecodeError.message);
             return res.status(422).json({ 
                 error: "Échec de l'upload de l'image ou format Base64 invalide.", 
                 details: uploadOrDecodeError.message 
             });
        }
        
        // --- CRÉATION DE LA SESSION STRIPE ---
        
        // Utilisation de l'origine pour une redirection sécurisée
        const origin = req.headers.origin || 'https://www.onemillionplaces.art';

        const session = await stripeClient.checkout.sessions.create({
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
            // Stocker toutes les métadonnées pour l'insertion DB par le Webhook après paiement
            metadata: {
                email, titre, histoire, prenom,
                ville: ville || '',
                lien: lien || '',
                photo_url: finalPhotoUrl, 
            },
            success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?cancel=1`,
            customer_email: email,
        });

        // Succès : Renvoie l'ID de session au frontend
        return res.status(200).json({ sessionId: session.id });

    } catch (error)