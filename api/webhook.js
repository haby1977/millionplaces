const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Traiter l'événement
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // Récupérer les métadonnées
    const { email, titre, histoire, prenom, ville, lien, photo_url } = session.metadata

    try {
      // Insérer dans Supabase
      const { data, error } = await supabase
        .from('objets')
        .insert([
          {
            email,
            titre,
            histoire,
            prenom,
            ville: ville || null,
            lien: lien || null,
            photo_url,
            created_at: new Date().toISOString()
          }
        ])

      if (error) throw error

      console.log('Object inserted successfully:', data)
    } catch (err) {
      console.error('Error inserting into Supabase:', err)
      return res.status(500).json({ error: 'Database error' })
    }
  }

  res.status(200).json({ received: true })
}
