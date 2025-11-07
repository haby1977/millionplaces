// ============================================
// ANTI-ZOOM (TOUS LES VIEWPORTS)
// ============================================
document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault() }, { passive: false })
let lastTouchEnd = 0
document.addEventListener('touchend', e => {
  const now = Date.now()
  if (now - lastTouchEnd <= 300) e.preventDefault()
  lastTouchEnd = now
}, false)
document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault() }, { passive: false })
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '0'].includes(e.key)) e.preventDefault()
})

// ============================================
// CONFIGURATION
// ============================================
const STRIPE_PUBLIC_KEY = 'pk_test_51SQ3OW7s0vK70XRfZl8ltQQLFshEVNDgkDJHaz7ZLE6iAC2BTPeoloTbLgesCfWJJPzqV6AW5YpLhn45tlrVnEMJ00oQRzKe5y'
const stripe = Stripe(STRIPE_PUBLIC_KEY) // Initialisation de Stripe

// ============================================
// VARIABLE GLOBALE POUR L'IMAGE OPTIMISÉE
// ============================================
// RÉTIRÉ : Cette variable n'est plus nécessaire. Uploadcare gère le fichier.
// let optimizedImageFile = null

// ============================================
// LOADER ? SITE
// ============================================
function enterSite() {
  document.getElementById('loaderPage').classList.add('hidden')
  document.getElementById('mainSite').classList.remove('hidden')
  // ATTENTION : Désactivation temporaire pour éviter l'erreur de proxy !
  // loadGallery()
}

// ============================================
// ZOOM ALLER-RETOUR
// ============================================
let currentZoomIndex = 0
let zoomDirection = 1
const zoomLevels = [20, 10, 1]
function toggleZoom() {
  const gallery = document.getElementById('gallery')
  const zoomBtn = document.getElementById('zoomBtn')
  currentZoomIndex += zoomDirection
  if (currentZoomIndex >= zoomLevels.length - 1) {
    currentZoomIndex = zoomLevels.length - 1
    zoomDirection = -1
  } else if (currentZoomIndex <= 0) {
    currentZoomIndex = 0
    zoomDirection = 1
  }
  gallery.setAttribute('data-columns', zoomLevels[currentZoomIndex])
  zoomBtn.textContent = currentZoomIndex === 0 ? '+' : '-'
}

// ============================================
// SHUFFLE + LOAD GALLERY (MAINTENANT DÉSACTIVÉ)
// ============================================
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function loadGallery() {
  try {
    // Désactivation temporaire pour éviter l'erreur de proxy
    document.getElementById('gallery').innerHTML = '<div class="loading-text">Archive loading...</div>'
    const response = await fetch('/api/supabase-proxy'); // L'appel reste ici si vous voulez le réactiver plus tard

    if (!response.ok) {
        const errorJson = await response.json().catch(() => ({ error: 'Unknown Proxy Error' }));
        throw new Error(errorJson.error || `Erreur proxy Vercel: ${response.status}`);
    }

    const objets = await response.json();
    const gallery = document.getElementById('gallery')
    gallery.innerHTML = ''

    if (!objets || !objets.length) {
      gallery.innerHTML = '<div class="loading-text">No objects yet. Be the first!</div>'
      return
    }

    document.getElementById('objectCount').textContent = objets.length

    shuffleArray(objets).forEach((o, i) => {
      const item = Object.assign(document.createElement('div'), { className: 'grid-item' })
      const img = Object.assign(document.createElement('img'), {
        src: o.photo_url, alt: o.titre, loading: 'lazy'
      })
      if (i < 60) img.style.animationDelay = `${i * 0.03}s`
      const desc = Object.assign(document.createElement('div'), { className: 'item-description' })
      desc.innerHTML = `<h3>${o.titre.toUpperCase()}</h3><p><em>"${o.histoire}"</em></p><p>${o.ville ? `— ${o.prenom}, ${o.ville}` : `— ${o.prenom}`}</p>`
      item.onclick = () => openObjectModal(o)
      item.append(img, desc)
      gallery.appendChild(item)
    })
  } catch (e) {
    console.error('Erreur loadGallery:', e)
    document.getElementById('gallery').innerHTML = '<div class="loading-text">Error. Refresh.</div>'
  }
}

// ============================================
// MODALS
// ============================================
function openObjectModal(o) {
  document.getElementById('modalImg').src = o.photo_url
  document.getElementById('modalTitle').textContent = o.titre.toUpperCase()
  document.getElementById('modalStory').textContent = `"${o.histoire}"`
  document.getElementById('modalAuthor').textContent = o.ville ? `— ${o.prenom}, ${o.ville}` : `— ${o.prenom}`
  const link = document.getElementById('modalLink')
  if (o.lien) {
    link.href = o.lien
    link.classList.remove('hidden')
    try { document.getElementById('modalLinkText').textContent = new URL(o.lien).hostname.replace('www.', '') }
    catch { document.getElementById('modalLinkText').textContent = o.lien }
  } else link.classList.add('hidden')
  document.getElementById('objectModal').classList.remove('hidden')
}
const closeObjectModal = () => document.getElementById('objectModal').classList.add('hidden')
const openUploadModal = () => document.getElementById('uploadModal').classList.remove('hidden')
const closeUploadModal = () => document.getElementById('uploadModal').classList.add('hidden')

// ============================================
// IMAGE OPTIMIZATION (RÉTIRÉE)
// L'optimisation est gérée par Uploadcare (data-image-shrink="1080x1080")
// Les fonctions optimizeAndPreview, fileToBase64 et le gestionnaire d'input file sont retirés
// ============================================
// Suppression du gestionnaire input file car nous utilisons Uploadcare (via index.html)
/*
document.getElementById('photoUpload')?.addEventListener('change', e => {
    // ... code d'optimisation retiré ...
})
*/

// ============================================
// PRIX EN EUROS
// ============================================
let selectedPrice = 1
function selectPrice(a, e) {
  selectedPrice = a
  document.getElementById('selectedPrice').value = a
  document.getElementById('customPrice').value = ''
  updatePriceDisplays(a)
  document.querySelectorAll('.btn-price').forEach(b => b.classList.remove('selected'))
  e.target.closest('.btn-price')?.classList.add('selected')
}
document.getElementById('customPrice')?.addEventListener('input', e => {
  const v = parseFloat(e.target.value)
  if (v >= 1) {
    selectedPrice = v
    document.getElementById('selectedPrice').value = v
    updatePriceDisplays(v)
    document.querySelectorAll('.btn-price').forEach(b => b.classList.remove('selected'))
  }
})
function updatePriceDisplays(a) {
  ;['displayPrice', 'displayPrice2', 'displayPrice3'].forEach(id => {
    const el = document.getElementById(id)
    // CORRECTION FINALE : Syntaxe correcte pour le symbole Euro
    if (el) el.textContent = `€${a}`
  })
}

// ============================================
// SUBMIT (UPLOADCARE + PAIEMENT)
// ============================================
let isSubmitting = false
document.getElementById('uploadForm')?.addEventListener('submit', async e => {
  e.preventDefault()
  if (isSubmitting) return

  isSubmitting = true
  const btn = document.querySelector('.btn-submit')
  btn.disabled = true
  btn.textContent = 'PAYMENT...'
  btn.classList.add('loading')

  const email = document.getElementById('email').value.trim()
  const titre = document.getElementById('titre').value.trim()
  const histoire = document.getElementById('histoire').value.trim()
  const prenom = document.getElementById('prenom').value.trim()
  const country = document.getElementById('country').value.trim()
  let lien = document.getElementById('lien').value.trim()
  if (lien && !/^https?:\/\//i.test(lien)) lien = 'https://' + lien
  const price = parseFloat(document.getElementById('selectedPrice').value)
  
  // NOUVEAU: Récupération de l'URL d'Uploadcare depuis l'input caché
  const photoUrl = document.getElementById('photoUploadCare')?.value.trim()

  if (price < 1 || !photoUrl) {
    showAlert(price < 1 ? 'Min €1' : 'Image requise.', 'ERROR');
    resetBtn();
    return;
  }

  // Paiement via Backend avec l'URL légère
  try {
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, titre, histoire, prenom, ville: country, lien,
        photo_url: photoUrl, // ENVOI DE L'URL (LÉGÈRE)
        amount: Math.round(price * 100)
      })
    })

    if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || `Erreur serveur: ${res.status}`);
    }

    const { sessionId } = await res.json()
    if (!sessionId) throw new Error("Session ID manquant.")

    await stripe.redirectToCheckout({ sessionId })

  } catch (err) {
    console.error('Erreur upload/paiement:', err)
    showAlert('Erreur. Réessayez.', 'ERROR')
    resetBtn()
  }

  function resetBtn() {
    btn.disabled = false
    btn.textContent = 'CONTINUE TO PAYMENT'
    btn.classList.remove('loading')
    isSubmitting = false
  }
})

// ============================================
// GESTION RETOUR PAIEMENT
// ============================================
function handlePaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('success') === '1') {
    showAlert('Paiement réussi ! Votre objet va apparaître.', 'SUCCESS')
    window.history.replaceState({}, '', window.location.pathname)
    // Réactiver la galerie si elle est réparée
    // setTimeout(loadGallery, 2000)
  } else if (urlParams.get('cancel') === '1') {
    showAlert('Paiement annulé.', 'ERROR')
    window.history.replaceState({}, '', window.location.pathname)
  }
}

// ============================================
// ALERTES
// ============================================
function showAlert(msg, type = 'INFO') {
  const icons = { ERROR: 'X', SUCCESS: '?', INFO: 'i' } // Utilisation du symbole de coche pour SUCCESS
  const div = document.createElement('div')
  div.innerHTML = `<strong>${icons[type] || ''} ${type}:</strong> ${msg}`
  div.style.cssText = `
    position:fixed;top:20px;left:50%;transform:translateX(-50%);
    background:${type.includes('ERROR')?'#ef4444':type.includes('SUCCESS')?'#10b981':'#3b82f6'};
    color:white;padding:12px 24px;border-radius:8px;z-index:10000;
    font-family:system-ui;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.2);
    animation:fadeIn .3s;
  `
  document.body.appendChild(div)
  setTimeout(() => div.remove(), 3000)
}
const style = document.createElement('style')
style.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%)}}`
document.head.appendChild(style)

// ============================================
// FONCTION UTILITAIRE BASE64 (RÉTIRÉE)
// ============================================
/*
function fileToBase64(file) {
  // Fonction Base64 retirée car Uploadcare gère l'upload
}
*/

// ============================================
// ESC + INIT
// ============================================
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeObjectModal(); closeUploadModal() } })
document.addEventListener('DOMContentLoaded', () => {
  console.log('Ready. Click ENTER.')
  handlePaymentReturn() // Gérer les retours de paiement
  // L'appel à loadGallery() est maintenant géré par enterSite (ou désactivé)
})