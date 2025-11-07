# 🔔 Guide Complet: Configuration du Webhook Stripe

## Prérequis
- ✅ Compte Stripe créé (https://dashboard.stripe.com)
- ✅ Application déployée sur Vercel
- ✅ URL Vercel disponible (ex: https://millionplaces.vercel.app)

---

## 📋 ÉTAPE PAR ÉTAPE

### 1️⃣ Accéder aux Webhooks dans Stripe

**Navigation dans le Dashboard:**

```
Dashboard Stripe
    ↓
Cliquez sur "Developers" (en haut à droite)
    ↓
Dans le menu de gauche, cliquez sur "Webhooks"
    ↓
Vous arrivez sur la page "Webhooks"
```

**URL directe en mode TEST:**
```
https://dashboard.stripe.com/test/webhooks
```

**URL directe en mode LIVE:**
```
https://dashboard.stripe.com/webhooks
```

---

### 2️⃣ Créer un Nouveau Endpoint

1. **Cliquez sur le bouton:** `+ Add endpoint` (en haut à droite)

2. **Formulaire à remplir:**

   **Endpoint URL:**
   ```
   https://VOTRE-DOMAINE-VERCEL.vercel.app/api/webhook
   ```

   **Exemples:**
   ```
   https://millionplaces.vercel.app/api/webhook
   https://millionplaces-git-main-username.vercel.app/api/webhook
   https://votre-projet.vercel.app/api/webhook
   ```

   ⚠️ **IMPORTANT:**
   - Remplacez `VOTRE-DOMAINE-VERCEL` par votre vraie URL Vercel
   - L'URL doit se terminer par `/api/webhook`
   - Pas d'espace, pas de slash à la fin après "webhook"

3. **Description:** (optionnel)
   ```
   Million Places - Payment Completion Handler
   ```

4. **Listen to:** Sélectionnez
   ```
   ○ Events on your account  ← COCHEZ CETTE OPTION
   ```

5. **Select events to listen to:**

   Dans la barre de recherche, tapez:
   ```
   checkout.session.completed
   ```

   Puis **cochez** la case:
   ```
   ☑ checkout.session.completed
   ```

   **C'est le seul événement nécessaire!**

6. **Cliquez sur:** `Add endpoint`

---

### 3️⃣ Récupérer le Signing Secret

**Après avoir cliqué sur "Add endpoint", vous verrez votre nouveau webhook dans la liste.**

1. **Cliquez sur le webhook** que vous venez de créer

2. Vous verrez une section **"Signing secret"**

3. **Cliquez sur "Reveal"** ou **"Click to reveal"**

4. Vous verrez une clé qui commence par:
   ```
   whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

5. **Cliquez sur l'icône de copie** (📋) pour copier la clé

6. **GARDEZ CETTE CLÉ** - vous en aurez besoin pour Vercel!

---

### 4️⃣ Ajouter le Secret dans Vercel

1. **Allez sur:** https://vercel.com/dashboard

2. **Sélectionnez votre projet** (millionplaces)

3. **Cliquez sur:** `Settings` (en haut)

4. **Dans le menu de gauche, cliquez sur:** `Environment Variables`

5. **Ajoutez une nouvelle variable:**

   **Variable name:**
   ```
   STRIPE_WEBHOOK_SECRET
   ```

   **Value:**
   ```
   whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   (Collez la clé que vous avez copiée depuis Stripe)

   **Environments:**
   ```
   ☑ Production
   ☑ Preview
   ☑ Development
   ```
   (Cochez les 3)

6. **Cliquez sur:** `Save`

---

### 5️⃣ Redéployer pour Appliquer les Variables

**Les nouvelles variables d'environnement ne sont actives qu'après un redéploiement!**

**Option A: Via le Dashboard Vercel**
```
1. Allez dans l'onglet "Deployments"
2. Cliquez sur les 3 points (...) du dernier déploiement
3. Cliquez sur "Redeploy"
4. Confirmez "Redeploy"
```

**Option B: Via CLI**
```bash
vercel --prod
```

**Option C: Via Git Push**
```bash
git add .
git commit -m "Update env variables"
git push
```

---

### 6️⃣ Vérifier que Tout Fonctionne

#### Test 1: Vérifier le Webhook dans Stripe

1. Retournez sur **Stripe Dashboard → Developers → Webhooks**
2. **Cliquez sur votre webhook**
3. Allez dans l'onglet **"Testing"**
4. Cliquez sur **"Send test webhook"**
5. Dans "Event type", sélectionnez: `checkout.session.completed`
6. Cliquez sur **"Send test webhook"**

**Résultat attendu:**
```
✓ Status: 200
✓ Response: {"received": true}
```

Si vous voyez une erreur 500 ou 400:
- Vérifiez que vous avez redéployé sur Vercel
- Vérifiez que STRIPE_WEBHOOK_SECRET est bien configuré
- Vérifiez les logs Vercel (Deployments → Logs)

#### Test 2: Test Complet avec un Vrai Paiement

1. **Allez sur votre site:**
   ```
   https://votre-domaine.vercel.app
   ```

2. **Cliquez sur ENTER**

3. **Cliquez sur le panier** (bouton en haut à droite)

4. **Remplissez le formulaire:**
   - Email: `test@example.com`
   - Uploadez une image (min 800x800px)
   - Titre: `Test Place`
   - Histoire: `Testing webhook`
   - Nom: `Test User`
   - Pays: `France`

5. **Sélectionnez un prix:** €1

6. **Cliquez sur:** `CONTINUE TO PAYMENT`

7. **Sur la page Stripe, utilisez la carte de test:**
   ```
   Numéro de carte: 4242 4242 4242 4242
   Date d'expiration: 12/34 (n'importe quelle date future)
   CVC: 123 (n'importe quel 3 chiffres)
   ```

8. **Cliquez sur:** `Pay`

9. **Vous serez redirigé vers votre site** avec le message: "Paiement réussi"

10. **Attendez 2-3 secondes** et **l'objet doit apparaître dans la galerie!**

---

## 🔍 Debugging: Si ça ne Marche Pas

### Vérifier les Logs Stripe

1. **Stripe Dashboard → Developers → Webhooks**
2. **Cliquez sur votre webhook**
3. **Onglet "Recent events"** ou **"Logs"**
4. Vous verrez tous les événements envoyés et les réponses

**Codes d'erreur courants:**

| Code | Signification | Solution |
|------|---------------|----------|
| 200 | ✅ Succès | Tout va bien! |
| 400 | Signature invalide | Vérifiez STRIPE_WEBHOOK_SECRET dans Vercel |
| 404 | Endpoint introuvable | Vérifiez l'URL du webhook (doit finir par /api/webhook) |
| 500 | Erreur serveur | Vérifiez les logs Vercel, problème dans api/webhook.js |

### Vérifier les Logs Vercel

1. **Vercel Dashboard → Votre projet → Deployments**
2. **Cliquez sur le dernier déploiement**
3. **Onglet "Functions"**
4. **Cliquez sur "webhook"**
5. Vous verrez les logs en temps réel

### Vérifier Supabase

1. **Allez sur:** https://app.supabase.com
2. **Sélectionnez votre projet**
3. **Table Editor → table "objets"**
4. Vérifiez si les lignes sont insérées

---

## 📝 Checklist Complète

Avant de tester, vérifiez que vous avez bien:

- [ ] Créé un compte Stripe
- [ ] Activé le mode Test
- [ ] Créé un webhook pointant vers `https://VOTRE-URL.vercel.app/api/webhook`
- [ ] Sélectionné l'événement `checkout.session.completed`
- [ ] Copié le Signing Secret (whsec_xxx)
- [ ] Ajouté `STRIPE_WEBHOOK_SECRET` dans Vercel
- [ ] Ajouté aussi ces variables dans Vercel:
  - [ ] `STRIPE_SECRET_KEY` (sk_test_xxx)
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Redéployé l'application après avoir ajouté les variables
- [ ] Créé la table `objets` dans Supabase
- [ ] Créé le bucket `photos` dans Supabase Storage

---

## 🎯 Résumé en 3 étapes

```
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
   URL: https://votre-domaine.vercel.app/api/webhook
   Event: checkout.session.completed

2. Copier le Signing Secret (whsec_xxx)

3. Vercel → Settings → Environment Variables
   Ajouter: STRIPE_WEBHOOK_SECRET = whsec_xxx
   Puis: Redéployer
```

**C'est tout! Votre webhook est configuré.** 🎉

---

## 🔗 Liens Utiles

- Dashboard Stripe (Test): https://dashboard.stripe.com/test/webhooks
- Dashboard Stripe (Live): https://dashboard.stripe.com/webhooks
- Documentation Stripe Webhooks: https://stripe.com/docs/webhooks
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Cartes de test Stripe: https://stripe.com/docs/testing

---

**Besoin d'aide?** Vérifiez les logs dans Stripe et Vercel!
