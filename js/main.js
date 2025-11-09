document.body.classList.add('no-scroll'); // ⬅️ VERROUILLAGE DÈS LE DÉPART

// ============================================
// ANTI-ZOOM ULTRA-RENFORCÉ (MOBILE + DESKTOP)
// ============================================

// 1. DOUBLE TAP (iOS/Android)
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// 2. PINCH TO ZOOM (multi-touch)
document.addEventListener('touchstart', e => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// 3. GESTURESTART/GESTURECHANGE/GESTUREEND (Safari iOS)
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });

// 4. CTRL + SCROLL (Desktop)
document.addEventListener('wheel', e => {
  if (e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

// 5. CTRL/CMD + ou - ou 0 (Keyboard)
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '0', '=', '_'].includes(e.key)) {
    e.preventDefault();
  }
});

// 6. FORCE LE VIEWPORT (renforce le meta viewport)
const metaViewport = document.querySelector('meta[name="viewport"]');
if (metaViewport) {
  metaViewport.setAttribute('content', 
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  );
}

// 7. RESET DU ZOOM AU FOCUS (empêche le zoom auto sur les inputs iOS)
document.addEventListener('focusin', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }, 0);
  }
});

// 8. DÉSACTIVATION COMPLÈTE DU ZOOM CSS
document.body.style.touchAction = 'pan-y pan-x';
document.documentElement.style.touchAction = 'pan-y pan-x';

// ============================================
// CONFIGURATION SUPABASE
// ============================================
const SUPABASE_URL = 'https://stbnonxmyrvucauvdhzo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Ym5vbnhteXJ2dWNhdXZkaHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODc3MzYsImV4cCI6MjA3ODE2MzczNn0.rJL2ZfFSVTQOS8uy6UuO0Lidqk48Zal6k2qSAqfHGFo'

// Client Supabase pour la galerie et l'upload
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// VARIABLE GLOBALE POUR L'IMAGE OPTIMISÉE
// ============================================
let optimizedImageFile = null

// ============================================
// LOADER
// ============================================
function enterSite() {
  const loader = document.getElementById('loaderPage')
  const site = document.getElementById('mainSite')
  
  // Fade out du loader
  loader.classList.add('fade-out')
  
  // Enlever hidden du site et démarrer fade in
  site.classList.remove('hidden')
  
  // Petit délai pour que le CSS prenne effet
  setTimeout(() => {
    site.classList.add('fade-in')
    loadGallery()
  }, 50)
  
  // Cacher définitivement le loader après la transition
  setTimeout(() => {
    loader.classList.add('hidden')
    // ⬅️ DÉVERROUILLAGE du scroll après la fin de la transition du loader
    document.body.classList.remove('no-scroll'); 
  }, 1500)
}

// ============================================
// ZOOM ALLER-RETOUR (4 NIVEAUX)
// ============================================
let currentZoomIndex = 0
let zoomDirection = 1
const zoomLevels = [20, 10, 5, 1]

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
      
      // 🚨 GESTION D'ERREUR pour diagnostiquer les images non chargées
      img.addEventListener('error', () => {
          console.error(`Erreur de chargement de l'image pour: ${o.titre}. URL: ${o.photo_url}. Vérifiez les permissions Supabase (RLS).`)
          item.style.display = 'none'; // Cache l'élément si l'image est brisée
      })
      
      const desc = Object.assign(document.createElement('div'), { className: 'item-description' })
      // Affichage adapté (Nom du lieu, Prénom, Pays, Année)
      desc.innerHTML = `<h3>${o.titre.toUpperCase()}</h3><p>${o.ville ? `? ${o.prenom}, ${o.ville}` : `? ${o.prenom}`}</p>${o.year ? `<p>${o.year}</p>` : ''}`
      
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
const openUploadModal = () => {
    document.getElementById('uploadModal').classList.remove('hidden');
    // ⬅️ VERROUILLAGE du scroll à l'ouverture de la modale
    document.body.classList.add('no-scroll'); 
}
const closeUploadModal = () => {
    document.getElementById('uploadModal').classList.add('hidden');
    // ⬅️ DÉVERROUILLAGE du scroll à la fermeture de la modale
    document.body.classList.remove('no-scroll'); 
}

// ============================================
// IMAGE OPTIMIZATION / CROP CARRÉ CENTRÉ
// ============================================
function optimizeAndPreview(file, cb) {
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 1080
      const MIN = 800
      if (img.width < MIN && img.height < MIN) {
        showAlert(`Image trop petite (min ${MIN}px)`, 'ERROR')
        return cb(null)
      }
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      c.width = SIZE
      c.height = SIZE
      const minDim = Math.min(img.width, img.height)
      const cropX = (img.width - minDim) / 2
      const cropY = (img.height - minDim) / 2
      ctx.filter = 'grayscale(100%)'
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
    const container = document.getElementById('previewContainer')
    
    if (preview) {
      preview.src = previewUrl
      preview.classList.remove('hidden')
    }
    
    // Affiche le container avec l'image et le bouton submit
    if (container) {
      container.classList.remove('hidden')
    }
    
    const sizeKB = (optFile.size / 1024).toFixed(0)
    showAlert('SUCCESS')
  })
})

// ============================================
// SUBMIT (FINAL - SANS EMAIL NI LIEN)
// ============================================
let isSubmitting = false
document.getElementById('uploadForm')?.addEventListener('submit', async e => {
  e.preventDefault()
  if (isSubmitting) return
  if (!optimizedImageFile) {
    showAlert('Sélectionnez une image', 'ERROR')
    return
  }
  isSubmitting = true
  const btn = document.querySelector('.btn-submit')
  btn.disabled = true
  btn.textContent = 'UPLOADING...'
  btn.classList.add('loading')

  // LECTURE DES CHAMPS MINIMALE
  const prenom = document.getElementById('prenom').value.trim()
  const titre = document.getElementById('titre').value.trim()
  const country = document.getElementById('country')?.value.trim() || '' 
  const year = document.getElementById('year').value.trim()

  try {
    // AUCUNE VÉRIFICATION D'UNICITÉ PAR EMAIL

    // 1. Upload de l'image vers Supabase Storage
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.webp`
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, optimizedImageFile, {
        contentType: 'image/webp',
        upsert: false
      })
    
    if (uploadError) throw uploadError

    // 2. Récupérer l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    const photo_url = publicUrlData.publicUrl

    // 3. Insérer dans la base de données (EMAIL ET LIEN SONT OMIS)
    const { error: insertError } = await supabase
      .from('objets')
      .insert([{
        prenom,
        titre,
        ville: country, // Mappé à la colonne 'ville'
        year,
        photo_url,
        created_at: new Date().toISOString()
      }])

    if (insertError) throw insertError

    // 4. Succès !
    showAlert('Votre lieu a été ajouté avec succès !', 'SUCCESS')
    closeUploadModal()
    
    // Réinitialiser le formulaire
    document.getElementById('uploadForm').reset()
    const preview = document.getElementById('imagePreview')
    const container = document.getElementById('previewContainer')
    if (preview) preview.classList.add('hidden')
    if (container) container.classList.add('hidden')
    optimizedImageFile = null
    
    // Recharger la galerie
    setTimeout(loadGallery, 1500)
    
  } catch (err) {
    console.error('Erreur upload:', err)
    showAlert('Upload Failed. Check console.', 'ERROR')
  } finally {
    resetBtn()
  }

  function resetBtn() {
    btn.disabled = false
    btn.textContent = 'SUBMIT YOUR PLACE'
    btn.classList.remove('loading')
    isSubmitting = false
  }
})

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
// ESC + INIT
// ============================================
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeUploadModal() } })
document.addEventListener('DOMContentLoaded', () => {
  console.log('Ready. Click ENTER.')
})// JavaScript Document