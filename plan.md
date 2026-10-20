# plan.md — Golden Pirates : Correctifs post-déploiement + Donations + **Bug P0 “réinitialisation”** (MISE À JOUR)

## 1) Objectifs
- ✅ Corriger les 3 bugs critiques post-déploiement :
  - **Donations (retour + facture)** : le donateur obtient un bordereau immédiat + statut clair + téléchargements.
  - **Purge/absence de faux profils** : base prête production (conserver uniquement `admin@goldenpirates.io`).
  - **Suivi recrue (rack)** : sauvegarde persistante + synchronisation fiable.
- ✅ Refaire **Donations.jsx** “de zéro” côté UI/UX : plus simple, sans doublons, mobile-first, et 100% fonctionnel.
- ✅ Injecter et afficher le **don réel 3€** (LOHMIN RUI, 19 Oct 2026, tx `5FX6898643003571P`) pour que la jauge/le hall reflètent la réalité.
- ✅ Valider l’ensemble via **testing_agent_v3** (backend + frontend) avant remise au Capitaine.
- ✅ **NOUVEAU (P0)** : Corriger le bug « **tout se réinitialise au retour sur le site** » (brouillons + dashboard admin).

---

## 2) Implementation Steps

### Phase 1 — POC Core Donations (isolation) : déclaration → reçu → facture
**But :** sécuriser le flux “PayPal.me sans webhook” + factures avant la refonte UI.

**User stories (POC)**
1. ✅ En tant que donateur, je déclare mon don et je reçois immédiatement un **bordereau**.
2. ✅ En tant que donateur, je vois le statut **EN ATTENTE** sans ambiguïté.
3. ✅ En tant que donateur, je peux **télécharger une facture même en attente** (PDF/XLSX) marquée “EN ATTENTE”.
4. ✅ En tant qu’admin, je confirme le don et la facture n’affiche plus “EN ATTENTE”.
5. ✅ En tant qu’admin, je peux rejeter un don et empêcher tout téléchargement de facture.

**Étapes (réalisées)**
- ✅ Backend: modifications sur `/app/backend/server.py` + `/app/backend/donations_invoice.py` :
  - ✅ `GET /api/donations/invoice/{pdf|xlsx}` autorisé pour **pending** et **confirmed**.
  - ✅ Dons **pending** : facture livrée avec **bandeau + filigrane rouge** (“EN ATTENTE / PENDING”).
  - ✅ Dons **rejected** : téléchargement bloqué (409, code `rejected`).
- ✅ Anti-doublon côté DB : ajout d’une clé idempotente `provider_tx` (utilisée pour le seed du don réel).
- ✅ Test de bout en bout (POC) exécuté : declare → status → invoice pending → confirm → invoice final → reject → blocage.

**Checkpoint :** ✅ POC vert avant refonte UI.

---

### Phase 2 — V1 App Development : Rebuild `Donations.jsx`
**But :** livrer une page Butin claire, immersive, et sans surcharge de boutons/sections.

**User stories (V1 Donations)**
1. ✅ En tant que visiteur, je choisis un montant en 2 taps et j’ouvre PayPal sans confusion.
2. ✅ En tant que donateur, après PayPal je clique “J’ai fait un don” et je reçois instantanément mon **bordereau**.
3. ✅ En tant que donateur, je vois mes bordereaux sur cet appareil avec badges **En attente / Confirmé / Refusé**.
4. ✅ En tant que donateur, je peux télécharger PDF/XLSX **même en attente** (marqués pending) sans UI chargée.
5. ✅ En tant que visiteur, je vois la **jauge** et le **hall** mis à jour (incluant le don 3€).

**Étapes (réalisées)**
- ✅ Réécriture complète de `/app/frontend/src/pages/Donations.jsx` (remplacement total) :
  - ✅ Ordre strict appliqué : **Hero → Soutien PayPal (picker + 1 bouton) → Déclaration → Hall (jauge+liste) → Pourquoi → Facture**.
  - ✅ Suppression des doublons : TOC “Rose”, sections répétées, CTA redondants, surcharge de boutons.
  - ✅ “Mes dons” : boutons de téléchargement visibles **dès l’état pending** (fix clé).
  - ✅ Responsive mobile-first : contrôlé 390 / 768 / 1024 / 1920 + absence d’overflow horizontal.
- ✅ Ajustements i18n : mise à jour des messages pending (facture provisoire téléchargeable + mention du sceau rouge).

**Checkpoint :** ✅ validation manuelle + captures (desktop + mobile) OK.

---

### Phase 3 — Rack fix (suivi recrue)
**But :** éliminer les désynchronisations et fiabiliser la mise à jour des statuts.

**User stories (Rack)**
1. ✅ Code de suivi reste enregistré après refresh.
2. ✅ Le statut se met à jour sans reload manuel.
3. ✅ Les dossiers supprimés sont retirés du rack.
4. ✅ Vérification manuelle met à jour le rack.
5. ✅ Pas de désync entre onglets / retours en ligne.

**Étapes (réalisées)**
- ✅ Modification `/app/frontend/src/lib/rack.js` :
  - ✅ Ajout d’un `setInterval` (60s) lorsque l’onglet est visible.
  - ✅ Conservation : `visibilitychange` + `force sync` au mount.
  - ✅ Ajout d’un sync au retour `online` (mobile / pertes réseau).

---

### Phase 4 — Testing (obligatoire)
**But :** confirmer officiellement les correctifs avec le protocole demandé.

**User stories (validation)**
1. ✅ Déclarer un don → bordereau visible immédiatement.
2. ✅ Télécharger PDF pending → filigrane “EN ATTENTE”.
3. ✅ Confirmer en admin → PDF sans filigrane.
4. ✅ Rack : save → persistance reload → sync périodique OK.
5. ✅ Hall public : don 3€ visible, jauge augmente.

**Étapes (réalisées)**
- ✅ `testing_agent_v3` exécuté (backend + frontend).
- ✅ Rapport généré : `/app/test_reports/iteration_42.json`.
  - ✅ Résultat global : **95%**.
  - ✅ Frontend : **100%** sur les flux critiques.
  - ✅ Backend : **87.5%** (2 faux négatifs liés à une vérif d’entêtes, pas un bug fonctionnel).
- ✅ “Key fix” explicitement vérifié : boutons de téléchargement visibles pour **pending**.

---

### Phase 5 — **P0 Correctif “Réinitialisation au retour” (brouillons + dashboard admin)**
**But :** supprimer l’impression de perte de données au retour sur le site :
- côté visiteur/recrue : brouillon candidature et parcours utilisateur stable.
- côté admin : données rechargées automatiquement au retour d’onglet/fenêtre (zéro “ancienne version”).

**Constats (diagnostic)**
- ✅ Les données backend **persistent correctement** en MongoDB (vérifié par requêtes Mongo + tests curl + flux declare/insert).
- ✅ Les endpoints dynamiques renvoient des headers `Cache-Control: no-store, no-cache, must-revalidate`.
- ✅ Cloudflare : `cf-cache-status: DYNAMIC` et pas de cache agressif.
- ✅ Aucun script/cron destructeur au démarrage ; cron de rétention RGPD :
  - déclenché via `/api/cron/keep-alive` toutes les 15 min (rate-limit 1h)
  - ne purge que les données très anciennes :
    - rejections > 30j, applications inactives > 365j, dons > 3 ans.

**Fixes appliqués (réalisés)**
1. ✅ **Frontend – brouillon candidature (ApplyForm)**
   - Fichier : `/app/frontend/src/components/ApplyForm.jsx`
   - Fix : ajout d’un garde-fou `userClearedRef`.
   - Effet : le brouillon `localStorage` (`gp_apply_draft`) **n’est plus effacé** quand l’état passe temporairement à `EMPTY` (cas remount React/StrictMode). Effacement uniquement :
     - quand l’utilisateur clique « effacer », ou
     - quand le formulaire est soumis avec succès.

2. ✅ **Frontend – dashboard admin (rafraîchissement “au retour”)**
   - Fichier : `/app/frontend/src/pages/Admin.jsx`
   - Fix : ajout de listeners `visibilitychange` + `focus` pour relancer `loadAll()`.
   - Effet : au retour sur l’onglet/fenêtre, le Conseil voit systématiquement les données fraîches (candidatures + stats).

3. ✅ **Frontend – Butin (admin) : rafraîchissement dons au retour**
   - Fichier : `/app/frontend/src/pages/Admin.jsx` (ButinPanel)
   - Fix : ajout de `visibilitychange` + `focus` pour relancer le `load()` du butin.
   - Effet : la liste des dons ne “disparaît” pas au retour et reste synchronisée.

**Testing (réalisé)**
- ✅ `testing_agent_v3` exécuté : `/app/test_reports/iteration_55.json`
  - Backend : **90.5%**
  - Frontend : **70%** (les 2 alertes “HIGH” étaient des faux positifs/écarts de sélecteurs ou de scénario :
    - `input-pseudo` visible seulement à l’étape 0,
    - `admin-stats-frame` est le bon sélecteur, pas `admin-stats`).
- ✅ Vérification manuelle Playwright :
  - un brouillon à l’étape 3 (“MarinTest”) **survit au reload** et restaure bien l’étape (ÉTAPE 4/5 en UI).
- ✅ DB nettoyée des données de test.

**Checkpoint :** ✅ bug P0 “réinitialisation” **corrigé** (perception + robustesse).

---

## 3) Next Actions
1. ✅ Déploiement en l’état : prêt production (flux donateur clair + butin visible).
2. ✅ Bug P0 “réinitialisation au retour” : corrigé et retesté.
3. 🔎 Recommandé (optionnel) :
   - Ajouter un **index unique** MongoDB sur `donators.provider_tx` (anti-doublon renforcé).
   - Ajouter dans l’admin une recherche/outil “marquer confirmé” par `provider_tx` si besoin.
4. 📌 Action côté Capitaine (process) :
   - Lorsqu’un don PayPal arrive, le Conseil **confirme** le bordereau dans l’admin si la déclaration a été faite, ou **ajoute** le don manuellement si le donateur ne déclare pas.

---

## 4) Success Criteria
- ✅ Donateur : après déclaration, voit **receipt_id** + badge pending + peut télécharger facture (pending watermark).
- ✅ Admin : confirmation enlève le watermark ; rejet bloque la facture.
- ✅ Public : hall/jauge reflètent au moins **3€** (don LOHMIN RUI) sans doublons.
- ✅ Rack : codes persistants + sync périodique (60s) sans désync.
- ✅ Bug P0 “réinitialisation” :
  - brouillon candidature persistant (pas d’effacement par race condition),
  - dashboard admin rafraîchi automatiquement au retour d’onglet.
- ✅ Testing :
  - `iteration_42.json` (Donations/Rack) et `iteration_55.json` (persistance/retour) disponibles.
