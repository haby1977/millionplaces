const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, titre, histoire, prenom, ville, lien, photo_url, amount } = req.body

    // Validation
    if (!email || !titre || !photo_url || !amount || amount < 100) {
      return res.status(400).json({ error: 'Missing or invalid fields' })
    }

    // Créer la session Stripe
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
      success_url: `https://millionplaces-3ni7.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://millionplaces-3ni7.vercel.app/cancel.html`,
      customer_email: email,
      metadata: {
        email,
        titre,
        histoire,
        prenom,
        ville: ville || '',
        lien: lien || '',
        photo_url,
      },
    })

    return res.status(200).json({ sessionId: session.id })

  } catch (error) {
    console.error('Stripe error:', error)
    return res.status(500).json({ error: error.message })
  }
}
