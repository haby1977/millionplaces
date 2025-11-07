# Guide de Déploiement - Million Places

Ce guide vous accompagne dans le déploiement de Million Places sur Vercel avec Supabase et Stripe.

## 📋 Prérequis

- Compte [Vercel](https://vercel.com)
- Compte [Supabase](https://supabase.com)
- Compte [Stripe](https://stripe.com)
- [Vercel CLI](https://vercel.com/cli) (optionnel)
- Node.js 18+ et npm

---

## 🗄️ Étape 1: Configuration Supabase

### 1.1 Créer le projet Supabase

1. Connectez-vous à [app.supabase.com](https://app.supabase.com)
2. Créez un nouveau projet
3. Notez votre **Project URL** et **Service Role Key** (Settings > API)

### 1.2 Créer la table `objets`

Exécutez ce SQL dans l'éditeur SQL de Supabase:

```sql
-- Créer la table objets
CREATE TABLE objets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  titre TEXT NOT NULL,
  histoire TEXT,
  prenom TEXT,
  ville TEXT,
  lien TEXT,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter un index sur l'email pour les recherches rapides
CREATE INDEX idx_objets_email ON objets(email);

-- Activer Row Level Security (RLS)
ALTER TABLE objets ENABLE ROW LEVEL SECURITY;

-- Politique: Lecture publique
CREATE POLICY "Lecture publique des objets"
  ON objets FOR SELECT
  TO public
  USING (true);

-- Politique: Insertion uniquement via Service Role (backend)
-- (Pas de politique INSERT pour anon, seulement via Service Role Key)
```

### 1.3 Créer le bucket de stockage `photos`

1. Allez dans **Storage** dans le dashboard Supabase
2. Créez un nouveau bucket appelé `photos`
3. Configurez-le comme **Public** (lecture publique)
4. Désactivez le RLS pour permettre les uploads via Service Role

---

## 💳 Étape 2: Configuration Stripe

### 2.1 Obtenir les clés API

1. Connectez-vous à [dashboard.stripe.com](https://dashboard.stripe.com)
2. Allez dans **Developers > API keys**
3. Notez votre **Secret key** (commence par `sk_test_...` en mode test)

### 2.2 Configurer le webhook

1. Allez dans **Developers > Webhooks**
2. Cliquez sur **Add endpoint**
3. URL du endpoint: `https://votre-domaine.vercel.app/api/webhook`
   - Remplacez `votre-domaine` par votre domaine Vercel (vous l'obtiendrez après le déploiement)
4. Écoutez l'événement: `checkout.session.completed`
5. Notez votre **Webhook signing secret** (commence par `whsec_...`)

### 2.3 Configuration du checkout

Les clés publiques sont déjà configurées dans `js/main.js:22`.

⚠️ **Important**: Après le déploiement, mettez à jour le webhook URL avec votre domaine de production!

---

## 🚀 Étape 3: Déploiement sur Vercel

### Option A: Déploiement via Vercel Dashboard (Recommandé)

1. **Connectez votre repository Git**
   - Allez sur [vercel.com/new](https://vercel.com/new)
   - Importez votre repository GitHub/GitLab/Bitbucket
   - Sélectionnez le projet `millionplaces`

2. **Configurez les variables d'environnement**

   Dans **Settings > Environment Variables**, ajoutez:

   ```
   STRIPE_SECRET_KEY=sk_test_votre_cle_stripe
   STRIPE_WEBHOOK_SECRET=whsec_votre_secret_webhook
   SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
   ```

3. **Déployez**
   - Cliquez sur **Deploy**
   - Attendez la fin du build (1-2 minutes)
   - Votre site est en ligne! 🎉

### Option B: Déploiement via CLI

1. **Installez Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Connectez-vous**
   ```bash
   vercel login
   ```

3. **Déployez**
   ```bash
   vercel
   ```

   Suivez les instructions interactives pour configurer le projet.

4. **Ajoutez les variables d'environnement**
   ```bash
   vercel env add STRIPE_SECRET_KEY production
   vercel env add STRIPE_WEBHOOK_SECRET production
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```

5. **Redéployez avec les variables**
   ```bash
   vercel --prod
   ```

---

## 🔧 Étape 4: Configuration finale

### 4.1 Mettre à jour le webhook Stripe

1. Retournez dans [dashboard.stripe.com](https://dashboard.stripe.com/webhooks)
2. Éditez votre endpoint webhook
3. Mettez à jour l'URL avec votre domaine Vercel:
   ```
   https://votre-domaine-vercel.app/api/webhook
   ```

### 4.2 Vérifier les clés publiques

Ouvrez `js/main.js` et vérifiez que les clés publiques sont correctes:

```javascript
// Ligne 21
const supabase = createClient(
  'https://krioqbogdddqxgzhqzh.supabase.co', // Votre URL Supabase
  'votre-anon-key' // Votre clé publique (anon key)
);

// Ligne 22
const stripePublicKey = 'pk_test_votre_cle_publique'; // Votre clé publique Stripe
```

### 4.3 Tester le workflow complet

1. Visitez votre site déployé
2. Ajoutez un objet avec une photo
3. Sélectionnez un montant (1-20€)
4. Complétez le paiement test avec la carte: `4242 4242 4242 4242`
5. Vérifiez que l'objet apparaît dans la galerie
6. Vérifiez dans Supabase que la ligne a été insérée

---

## 🔍 Vérification et debugging

### Logs Vercel
```bash
vercel logs
```
Ou consultez les logs dans le dashboard: **Deployments > [votre-deployment] > Logs**

### Vérifier les variables d'environnement
```bash
vercel env ls
```

### Tester les API en local
```bash
npm install
vercel dev
```
Le site sera accessible sur `http://localhost:3000`

### Problèmes courants

**Erreur 500 sur `/api/create-checkout`**
- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez les logs Vercel pour plus de détails

**Erreur 422 lors de l'upload**
- Vérifiez que le bucket `photos` existe dans Supabase
- Vérifiez que le bucket est public
- Vérifiez la `SUPABASE_SERVICE_ROLE_KEY`

**Le webhook ne s'exécute pas**
- Vérifiez l'URL du webhook dans Stripe
- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- Consultez les logs Stripe: **Developers > Webhooks > [votre-webhook] > Recent events**

**L'objet ne s'affiche pas dans la galerie**
- Vérifiez que la politique RLS permet la lecture publique
- Vérifiez que l'insertion a réussi dans la table `objets`
- Ouvrez la console du navigateur pour voir les erreurs

---

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Stripe](https://stripe.com/docs)
- [Guide Stripe Webhooks](https://stripe.com/docs/webhooks)

---

## 🔐 Sécurité

**Ne commitez JAMAIS:**
- Les fichiers `.env` ou `.env.local`
- Les clés secrètes Stripe
- La Service Role Key de Supabase

**Fichiers déjà ignorés dans `.gitignore`:**
- `.env*`
- `.vercel/`
- `node_modules/`

---

## 🎯 Checklist de déploiement

- [ ] Table `objets` créée dans Supabase
- [ ] Bucket `photos` créé et public dans Supabase
- [ ] Clés API Stripe récupérées
- [ ] Webhook Stripe configuré avec la bonne URL
- [ ] Variables d'environnement ajoutées dans Vercel
- [ ] Site déployé sur Vercel
- [ ] Clés publiques mises à jour dans `js/main.js`
- [ ] Test complet effectué (ajout d'objet + paiement)
- [ ] Logs vérifiés (pas d'erreur)

---

**Bon déploiement! 🚀**
