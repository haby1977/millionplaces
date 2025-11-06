const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// ----------------------------------------------------------------------
// 1. CONFIGURATION POUR TRAITER LES FICHIERS
// ----------------------------------------------------------------------

// Par défaut, Next.js / Vercel limite la taille du corps de la requête.
// Nous désactivons le parser de corps de requête par défaut pour permettre
// l'envoi de fichiers volumineux (comme une image encodée en base64).
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Autorise jusqu'à 10MB pour l'image
    },
  },
};
// ----------------------------------------------------------------------

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialisation du client Supabase avec la CLÉ ADMIN (SERVICE_ROLE)
  // Cela permet d'outrepasser les règles de sécurité RLS/CORS pour l'upload Server-to-Server.
  // Assurez-vous que SUPABASE_URL est défini dans vos variables d'environnement Vercel.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY // Clé ADMIN configurée dans Vercel
  );


  try {
    // Les champs du formulaire (y compris l'image en base64)
    const { email, titre, histoire, prenom, ville, lien, photo_base64, amount } = req.body;

    // Validation des champs requis pour le paiement
    if (!email || !titre || !photo_base64 || !amount || amount < 100) {
      return res.status(400).json({ error: 'Missing or invalid fields (email, titre, photo, amount minimum 100)' });
    }

    // Déclaration de l'URL de l'image (sera remplie après l'upload)
    let finalPhotoUrl = null;

    // ----------------------------------------------------------------------
    // 2. LOGIQUE D'UPLOAD SÉCURISÉ (SERVER-TO-SERVER)
    // ----------------------------------------------------------------------
    
    // photo_base64 doit contenir les données encodées (par exemple: "data:image/jpeg;base64,...")
    const matches = photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid Base64 string format');
    }

    const fileBuffer = Buffer.from(matches[2], 'base64');
    const mimeType = matches[1]; // Ex: image/jpeg
    const fileExtension = mimeType.split('/')[1];
    
    // Générer un nom de fichier unique
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `photos/${fileName}`;

    console.log(`Tentative d'upload vers Supabase Storage: ${filePath}`);

    // UPLOAD vers Supabase Storage (Server-to-Server)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos') // Votre bucket est nommé 'photos'
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false, // Ne pas écraser si le fichier existe déjà
      });
      
    if (uploadError) {
        console.error("Erreur d'upload Supabase:", uploadError);
        // Si l'upload échoue, nous arrêtons le processus Stripe
        return res.status(500).json({ 
            error: "Erreur lors de l'upload de l'image",
            details: uploadError.message 
        });
    }

    // Récupérer l'URL publique de l'image (nécessite que le bucket soit public)
    const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

    finalPhotoUrl = publicUrlData.publicUrl;
    console.log("URL Publique de l'image:", finalPhotoUrl);
    
    // ----------------------------------------------------------------------
    // 3. CRÉATION DE LA SESSION STRIPE (Comme avant)
    // ----------------------------------------------------------------------
    
    const session = await stripe.checkout.sessions.create({
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
      // VRAIES URLs avec 3ni7
      success_url: `https://millionplaces-3ni7-main-hakin-abelis-projects.vercel.app/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://millionplaces-3ni7-main-hakin-abelis-projects.vercel.app/?cancel=1`,
      customer_email: email,
      metadata: {
        email,
        titre,
        histoire,
        prenom,
        ville: ville || '',
        lien: lien || '',
        photo_url: finalPhotoUrl, // Utilisation de l'URL sécurisée
      },
    });

    return res.status(200).json({ sessionId: session.id });

  } catch (error) {
    console.error('Erreur du Backend (Stripe ou Supabase):', error);
    return res.status(500).json({ error: error.message || 'Une erreur inconnue est survenue.' });
  }
};