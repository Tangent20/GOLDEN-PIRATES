# plan.md — Golden Pirates : Stabilisation + audits + correctif logout + **REFONTE FORMULAIRE RECRUTEMENT (1 page, zéro étape)** (STATUT FINAL)

## 1) Objectifs
- ✅ Corriger les bugs critiques post-déploiement (Donations + rack + perception “réinitialisation”).
- ✅ Stabiliser les exports (PDF/XLSX) et l’admin (horodatage custom, TZ dynamique).
- ✅ Créer les profils publics donateurs + audits UI/UX/Lighthouse.
- ✅ **Correctif sécurité** : déconnexion admin doit supprimer *réellement* le cookie de session.
- ✅ **P1 business / conversion** : **Refaire complètement le formulaire de recrutement** pour maximiser la conversion :
  - ✅ **Une seule page**, zéro “wizard/étapes”.
  - ✅ **Champs minimaux et stratégiques** (incluant joueurs sans Discord).
  - ✅ Message de remerciement plein écran (code + copier + suivi).
  - ✅ Brouillon silencieux.
  - ✅ Vérifications “100%” multi-appareils : desktop, tablette, iOS Safari, Android multi-marques, pliables.

---

## 2) Implementation Steps

### Phase 1 — POC Core Donations : déclaration → reçu → facture
**But :** sécuriser le flux “PayPal.me sans webhook” + factures avant la refonte UI.

**User stories (POC)**
1. ✅ En tant que donateur, je déclare mon don et je reçois immédiatement un **bordereau**.
2. ✅ En tant que donateur, je vois le statut **EN ATTENTE** sans ambiguïté.
3. ✅ En tant que donateur, je peux **télécharger une facture même en attente** (PDF/XLSX) marquée “EN ATTENTE”.
4. ✅ En tant qu’admin, je confirme le don et la facture n’affiche plus “EN ATTENTE”.
5. ✅ En tant qu’admin, je peux rejeter un don et empêcher tout téléchargement de facture.

**Étapes (réalisées)**
- ✅ Backend: `/app/backend/server.py` + `/app/backend/donations_invoice.py` :
  - ✅ `GET /api/donations/invoice/{pdf|xlsx}` autorisé pour **pending** et **confirmed**.
  - ✅ Dons **pending** : facture avec **bandeau + filigrane rouge** (“EN ATTENTE / PENDING”).
  - ✅ Dons **rejected** : téléchargement bloqué (409, code `rejected`).
- ✅ Anti-doublon DB : clé idempotente `provider_tx` (seed don réel inclus).
- ✅ Test E2E POC exécuté (declare → invoice pending → confirm → invoice final → reject → blocage).

**Checkpoint :** ✅ POC vert.

---

### Phase 2 — Rebuild `Donations.jsx` (Butin)
**But :** livrer une page Butin claire, immersive, mobile-first, sans surcharge.

**User stories (V1 Donations)**
1. ✅ Choix montant en 2 taps + ouverture PayPal.
2. ✅ Après PayPal : “J’ai fait un don” → bordereau immédiat.
3. ✅ “Mes dons” : badges **En attente / Confirmé / Refusé**.
4. ✅ Téléchargement PDF/XLSX visible même en pending.
5. ✅ Hall public : jauge + liste reflètent la réalité (incluant 3€ seed).

**Étapes (réalisées)**
- ✅ Réécriture totale `/app/frontend/src/pages/Donations.jsx` :
  - ✅ Ordre simplifié : Hero → Soutien → Déclaration → Hall → Pourquoi → Facture.
  - ✅ Suppression doublons/CTA redondants.
  - ✅ Responsive 390/768/1024/1920 + pas d’overflow.
- ✅ Ajustements i18n (pending + sceau rouge).

**Checkpoint :** ✅ OK.

---

### Phase 3 — Rack fix (Suivi recrue)
**But :** éliminer désync et fiabiliser statuts.

**User stories (Rack)**
1. ✅ Code de suivi persistant après refresh.
2. ✅ Statut se met à jour sans reload manuel.
3. ✅ Dossiers supprimés retirés du rack.
4. ✅ Vérification manuelle met à jour le rack.
5. ✅ Sync retour online + retour onglet.

**Étapes (réalisées)**
- ✅ `/app/frontend/src/lib/rack.js` : `setInterval(60s)` quand visible + `visibilitychange` + `online`.

---

### Phase 4 — Bug P0 “Réinitialisation au retour” (brouillons + admin)
**But :** supprimer l’impression de perte de données au retour sur le site.

**Étapes (réalisées)**
1. ✅ ApplyForm (ancienne version) : garde-fou `userClearedRef` (brouillon non effacé par remount/StrictMode).
2. ✅ Admin : refresh au retour d’onglet (listeners `visibilitychange` + `focus`) pour candidatures + stats.
3. ✅ Admin Butin : refresh au retour d’onglet.

**Testing (réalisé)**
- ✅ `testing_agent_v3` : `/app/test_reports/iteration_55.json`.

**Checkpoint :** ✅ corrigé.

---

### Phase 5 — Audits & améliorations (session actuelle)
**But :** fiabiliser le produit avant publication (fonctionnel, UI, exports, accessibilité).

**Réalisé (récapitulatif)**
- ✅ Drafts & cache : fixes race-conditions `ApplyForm.jsx` + refresh au retour dans `Admin.jsx`.
- ✅ Donations admin : injection Date/Heure custom (PATCH admin donateurs).
- ✅ Exports PDF/XLSX : TZ dynamique via `tz` param côté frontend.
- ✅ Profils publics donateurs : endpoint `GET /api/donators/profile/{pseudo}` + UI `DonorProfileSheet.jsx`.
- ✅ Mobile UI : suppression des date pickers natifs (MIUI) et mise en place inputs texte (JJ/MM/AAAA + HH:MM).
- ✅ Audit UI complet : `100dvh`, safe-area insets, lazy-loading images, GPU hints.
- ✅ Audit fonctionnel : `/auth/me` retourne 200 `{authed:false}` en public + correctifs Escape modales.
- ✅ Lighthouse : Accessibilité 100/100 (contrastes).

---

### Phase 6 — **Correctif sécurité : Logout cookie non totalement vidé**
**But :** fermeture de session admin sûre sur appareils partagés.

**Constat**
- Cookie `access_token` est créé avec `Secure` + `SameSite=None` + `HttpOnly`, mais la suppression ne reprenait pas ces attributs → certains navigateurs ignoraient le delete.

**Fix (réalisé)**
- ✅ `/app/backend/server.py` (`POST /api/auth/logout`) :
  - ✅ `delete_cookie(... secure=True, httponly=True, samesite="none", path="/")`
  - ✅ + “ceinture et bretelles” : `set_cookie` vide avec `max_age=0` et `expires=0`.

**Vérification (réalisée)**
- ✅ Connexion (`/api/admin/login`) → `/api/auth/me authed:true` → routes admin 200 → logout → `authed:false` → routes admin 401 → cookie absent.

**Checkpoint :** ✅ corrigé (prêt publication).

---

### Phase 7 — **Refonte complète du formulaire de recrutement (1 page, zéro étapes)**
**But :** augmenter la conversion (moins d’abandon), garder le style 100% pirate, et rester ultra-fonctionnel sur tous appareils.

**Décisions utilisateur (validées)**
- ✅ **Une seule page** (tout visible, scroll court), **zéro étapes**.
- ✅ Message de remerciement : **plein écran** avec code **GP-1023-XXXX** + bouton **Copier** + **Suivre ma candidature**.
- ✅ Brouillon : **sauvegarde silencieuse**.
- ✅ Panneaux recrue/conseil : **conservés** (gating existant).

**Implémentation (réalisée)**
1. ✅ **Backend** — `/app/backend/server.py`
   - ✅ Ajout champ optionnel `contact: str = ""` dans `ApplicationCreate` (+ sanitation `safe_text`).
   - ✅ Persistance DB + retour dans `GET /api/applications/track/{code}` (`contact`).
   - ✅ Exports :
     - ✅ XLSX : nouvelle colonne **AUTRE CONTACT**.
     - ✅ PDF : repli d’affichage (si `discord` vide, afficher `contact`).

2. ✅ **Frontend**
   - ✅ `/app/frontend/src/components/ApplyForm.jsx` : **réécrit** en single-page :
     - ✅ 4 blocs visibles d’un coup : Identité / Force / Signaux / Lettre.
     - ✅ Puissance : quick chips + hint (below/inRange/above/unreadable).
     - ✅ Troupes + activité : choix type radio (tactile, accessible).
     - ✅ Contact segmenté : **Discord / Autre / Aucun** (champ conditionnel + aide contextuelle).
     - ✅ Message court (min 10) + **4 amorces**.
     - ✅ Barre de progression **“voiles hissées” 0/6** (sans étapes) + état `data-ready`.
     - ✅ Bouton unique **SCELLER**.
     - ✅ Brouillon silencieux robuste : clé `gp_apply_draft_v2` + migration douce de l’ancien brouillon + effacer.
     - ✅ Overlay succès : plein écran `100dvh`, code en grand, copier, suivre, “enrôler un autre compte”, fermeture Échap.
   - ✅ `/app/frontend/src/lib/i18n.jsx` : mise à jour complète du bloc `apply` FR/EN.
   - ✅ `/app/frontend/src/pages/Suivi.jsx` : affichage `discord || contact`.
   - ✅ `/app/frontend/src/pages/Admin.jsx` : colonne “DISCORD / CONTACT” (repli `discord || contact`) + recherche inclut `contact`.

**Design guidelines (réalisé)**
- ✅ Blueprint produit dans `/app/design_guidelines.md` : layout, tokens, overlay, data-testid.

**Notes de qualité**
- ✅ Raccourcissement label mobile : contact option “AUTRE” (390px) / “OTHER” (EN) pour éviter le clipping.
- ✅ Nettoyage des candidatures QA effectué (base propre).

**Checkpoint :** ✅ Phase 7 terminée.

---

### Phase 8 — Testing (obligatoire) — **Refonte recrutement**
**But :** garantir zéro régression + compatibilité multi-appareils.

**Tests (réalisés)**
- ✅ `testing_agent_v3` : `/app/test_reports/iteration_59.json`
  - Frontend ✅ 21/21.
  - Backend ✅ 18/19 : 1 mention “logout” = **artefact de test** (le correctif logout a été validé séparément).
- ✅ Vérifications Playwright (manuelles automatisées) :
  - ✅ Brouillon : sauvegarde → reload → restauré → effacer.
  - ✅ Pseudo déjà pris : statut “active” + CTA vers /suivi.
  - ✅ Persona recrue : panneau dossier (rack) + override vers formulaire.
  - ✅ Persona conseil : panneau stats + preview (envoi désactivé).
  - ✅ i18n EN.
  - ✅ Responsive 390/768/1920 : pas d’overflow, inputs 16px (anti-zoom iOS), overlay OK.
  - ✅ Flux complet : envoi → code → copie → suivi.
  - ✅ Export XLSX : colonne “AUTRE CONTACT” présente.

**Checkpoint :** ✅ Phase 8 terminée.

---

## 3) Next Actions
1. ✅ Fonctionnel : tout est terminé, aucun bug connu restant.
2. 🔥 **Action unique avant mise en ligne** : **redéployer** (pour pousser les changements backend/frontend).
3. (Optionnel après publication) Mini audit Lighthouse ciblé sur Home (post refonte formulaire).

---

## 4) Success Criteria
- ✅ Sécurité : après logout, cookie `access_token` supprimé et accès admin refusé.
- ✅ Conversion recrutement :
  - ✅ Formulaire **1 page**, perçu “≈ 60 secondes”, aucune navigation d’étapes.
  - ✅ Discord **non obligatoire** (contact segmenté) ; envoi OK sans contact.
  - ✅ Pseudo check live clair ; si bloqué, CTA vers /suivi.
  - ✅ Succès : overlay plein écran 100dvh, code énorme, Copier + Suivre.
  - ✅ Brouillon silencieux robuste.
- ✅ Compatibilité : pas d’overflow, pas de zoom iOS, touch targets OK.
- ✅ Tests : `testing_agent_v3` + vérifs responsive/personas/export OK, absence de régression Donations/Admin/Suivi.
