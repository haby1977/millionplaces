const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { buffer } = require('micro'); // Nécessaire pour lire le corps brut pour Stripe

// ============================================
// 1. INITIALISATION SUPABASE (SERVICE ROLE)
// ============================================
// Utilisation de la clé SERVICE_ROLE pour l'accès backend (ignore RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// 2. CONFIGURATION NEXT.JS/VERCEL
// ============================================
// Désactive le parsing automatique du corps de la requête.
// CRUCIAL pour Stripe, qui a besoin du corps sous forme de buffer.
exports.config = {
  api: {
    bodyParser: false,
  },
};

// ============================================
// 3. GESTIONNAIRE WEBHOOK
// ============================================
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // A. Lire le Corps Brut pour la Sécurité
  const rawBody = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // B. Vérification de la Signature
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // C. Traitement de l'événement
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Récupérer les métadonnées envoyées depuis votre frontend
    const { email, titre, histoire, prenom, ville, lien, photo_url } = session.metadata;

    try {
      // Insertion dans Supabase
      const { data, error } = await supabase
        .from('objets')
        .insert([
          {
            email,
            titre,
            histoire,
            prenom,
            // Assurez-vous que 'ville' est bien la colonne cible pour 'country'
            ville: ville || null,
            lien: lien || null,
            photo_url,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      console.log('✅ Object inserted successfully:', data);
    } catch (err) {
      console.error('❌ Error inserting into Supabase:', err);
      // Répondre 200 à Stripe pour éviter les retries, même en cas d'erreur DB
      return res.status(200).json({ received: true, db_error: err.message });
    }
  }

  // D. Réponse Finale à Stripe
  res.status(200).json({ received: true });
};
