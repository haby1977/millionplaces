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
const SUPABASE_URL = 'https://krioqbogdddqxgzhqzh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaW9xYm9nb2RkcXhxenpoZ3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzY0NzQsImV4cCI6MjA3Nzg1MjQ3NH0.VWCNPqGIVoHsp9u8LY-ZYNtCi0n7oTiSyj1JNo_L_W4'
const STRIPE_PUBLIC_KEY = 'pk_test_51SQ3OW7s0vK70XRfZl8ltQQLFshEVNDgkDJHaz7ZLE6iAC2BTPeoloTbLgesCfWJJPzqV6AW5YpLhn45tlrVnEMJ00oQRzKe5y'

// Client Supabase UNIQUEMENT pour Storage (lecture seule/galerie)
// Le client est géré par la librairie incluse dans votre HTML (window.supabase)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const stripe = Stripe(STRIPE_PUBLIC_KEY) // Initialisation de Stripe

// ============================================
// VARIABLE GLOBALE POUR L'IMAGE OPTIMISÉE
// ============================================
let optimizedImageFile = null

// ============================================
// LOADER → SITE
// ============================================
function enterSite() {
  document.getElementById('loaderPage').classList.add('hidden')
  document.getElementById('mainSite').classList.remove('hidden')
  loadGallery()
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
  zoomBtn.textContent = currentZoomIndex === 0 ? '+' : '−'
}

// ============================================
// SHUFFLE + LOAD GALLERY (DIRECT SUPABASE)
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
    // APPEL DIRECT À SUPABASE - PAS DE PROXY
    const { data: objets, error } = await supabase
      .from('objets')
      .select('*')

    if (error) throw error

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
// IMAGE OPTIMIZATION — CROP CARRÉ CENTRÉ
// ============================================
function optimizeAndPreview(file, cb) {
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 1080
      const MIN = 800
      if (img.width < MIN && img.height < MIN) {
        showAlert(`Image trop petite (min ${MIN}px sur un côté)`, 'ERROR')
        return cb(null)
      }
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      c.width = SIZE
      c.height = SIZE
      const minDim = Math.min(img.width, img.height)
      const cropX = (img.width - minDim) / 2
      const cropY = (img.height - minDim) / 2
      ctx.drawImage(img, cropX, cropY, minDim, minDim, 0, 0, SIZE, SIZE)
      const previewUrl = c.toDataURL('image/webp', 0.85)
      c.toBlob(b => {
        if (!b) {
          showAlert('Erreur pendant la compression', 'ERROR')
          return cb(null)
        }
        const optFile = new File([b], 'opt.webp', { type: 'image/webp' })
        cb(optFile, previewUrl)
      }, 'image/webp', 0.85)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// ============================================
// GESTIONNAIRE INPUT FILE
// ============================================
document.getElementById('photoUpload')?.addEventListener('change', e => {
  const file = e.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showAlert('Fichier doit être une image', 'ERROR')
    return
  }
  optimizeAndPreview(file, (optFile, previewUrl) => {
    if (!optFile) return
    optimizedImageFile = optFile
    const preview = document.getElementById('imagePreview')
    if (preview) {
      preview.src = previewUrl
      preview.classList.remove('hidden')
    }
    const sizeKB = (optFile.size / 1024).toFixed(0)
    showAlert(`Image optimisée (${sizeKB} KB, format carré 1080×1080)`, 'SUCCESS')
  })
})

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
    if (el) el.textContent = `€${a}`
  })
}
// ============================================
// SUBMIT (FIXED: Base64 to Backend)
// ============================================
let isSubmitting = false
document.getElementById('uploadForm')?.addEventListener('submit', async e => {
  e.preventDefault()
  if (isSubmitting) return
  if (!optimizedImageFile) {
        showAlert('Image requise', 'ERROR');
        resetBtn(); // 💡 Correction: Assurez-vous d'appeler resetBtn() ici
        return;
    }
  isSubmitting = true
  const btn = document.querySelector('.btn-submit')
  btn.disabled = true
  btn.textContent = 'UPLOAD & PAY...'
  btn.classList.add('loading')

  const email = document.getElementById('email').value.trim()
  const titre = document.getElementById('titre').value.trim()
  const histoire = document.getElementById('histoire').value.trim()
  const prenom = document.getElementById('prenom').value.trim()
  const country = document.getElementById('country').value.trim()
  let lien = document.getElementById('lien').value.trim()
  if (lien && !/^https?:\/\//i.test(lien)) lien = 'https://' + lien
  const price = parseFloat(document.getElementById('selectedPrice').value)
  if (price < 1) {
        showAlert('Min €1', 'ERROR');
        resetBtn(); // 💡 Correction: Assurez-vous d'appeler resetBtn() ici
        return;
    }

  // 1. Vérifier si l'email existe déjà (DIRECT SUPABASE - CORRIGÉ)
  try {
    const { data: existing, error } = await supabase
      .from('objets')
      .select('email')
      .eq('email', email)
      .limit(1)
    
    if (error) throw error
    if (existing && existing.length > 0) {
      showAlert('Déjà participé !', 'ERROR'); // Affiche l'alerte
      resetBtn(); // Réinitialise le bouton après l'alerte
      return; // Arrête la fonction ici
    }
  } catch (err) {
    console.error('Erreur vérification email:', err);
    // 💡 Correction: Si l'API Supabase plante ici (cause CORS), l'utilisateur
    // est bloqué. On l'avertit, on réinitialise et on arrête la soumission.
    showAlert('Erreur de vérification. Réessayez.', 'ERROR'); 
    resetBtn();
    return; 
  }

  // 2. Conversion en Base64 et Paiement via Backend (CORS FIX)
  try {
    // ÉTAPE CRUCIALE: Convertir le fichier optimisé en Base64
    const photoBase64 = await fileToBase64(optimizedImageFile);

    // Appel à l'API Vercel /api/create-checkout, qui gère maintenant l'upload sécurisé
    const res = await fetch('/api/create-checkout', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, titre, histoire, prenom, ville: country, lien, 
        photo_base64: photoBase64, // <-- ENVOIE LA CHAÎNE BASE64
        amount: Math.round(price * 100)
      })
    })
    
    // Vérification explicite du statut 
    if (!res.ok) {
        // Le serveur a répondu avec 4xx ou 5xx
        const errorJson = await res.json();
        throw new Error(errorJson.error || `Erreur serveur: ${res.status}`);
    }

    const { sessionId } = await res.json()
    if (!sessionId) throw new Error("Session ID manquant.")
    
    // Redirection Stripe
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
    // Nettoyer l'URL
    window.history.replaceState({}, '', window.location.pathname)
    // Recharger la galerie après un délai
    setTimeout(loadGallery, 2000)
  } else if (urlParams.get('cancel') === '1') {
    showAlert('Paiement annulé.', 'ERROR')
    window.history.replaceState({}, '', window.location.pathname)
  }
}

// ============================================
// ALERTES
// ============================================
function showAlert(msg, type = 'INFO') {
  const icons = { ERROR: 'X', SUCCESS: '✓', INFO: 'i' }
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
// FONCTION UTILITAIRE BASE64 (AJOUT)
// ============================================
/**
 * Lit un objet File et retourne une promesse qui se résout en chaîne Base64.
 * @param {File} file L'objet File sélectionné.
 * @returns {Promise<string>} Promesse résolue avec la chaîne Base64 (incluant l'en-tête MIME).
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("Aucun fichier fourni."));
        }
        
        const reader = new FileReader();
        
        // Convertit le fichier en Base64
        reader.readAsDataURL(file); 
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ============================================
// ESC + INIT
// ============================================
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeObjectModal(); closeUploadModal() } })
document.addEventListener('DOMContentLoaded', () => {
  console.log('Ready. Click ENTER.')
  handlePaymentReturn() // Gérer les retours de paiement
})