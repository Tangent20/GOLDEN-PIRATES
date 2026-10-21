# GOLDEN PIRATES — Portail de recrutement

Portail React + FastAPI + MongoDB pour l'alliance GOLDEN PIRATES du royaume 1023 de *Call of Dragons*. Il comprend une candidature, le suivi privé par code, la messagerie, les dons, et un espace Conseil protégé.

## Architecture

- `frontend/` : SPA React/Vite, responsive (mobile, tablette, bureau), avec PWA et i18n FR/EN.
- `backend/` : FastAPI/MongoDB, authentification Conseil par cookie HttpOnly, exports PDF/XLSX et règles anti-abus.
- `docker-compose.yml` : environnement local complet avec MongoDB, API et reverse proxy web.

Les nouveaux codes de suivi et bordereaux font 12 caractères après leur préfixe (`GP-1023-…` et `GPD-1023-…`). Les anciens codes courts restent consultables.

## Démarrage local avec Docker

1. Copiez `backend/.env.example` vers `backend/.env` et remplacez **toutes** les valeurs d'exemple, particulièrement les secrets et le mot de passe administrateur.
2. Lancez `docker compose up --build`.
3. Ouvrez `http://localhost:3000`. L'API est disponible via le même domaine sous `/api`.
4. Vérifiez `http://localhost:8000/api/healthz` puis `http://localhost:8000/api/readyz`.

`COOKIE_SECURE=false` n'est acceptable qu'en HTTP local. En production HTTPS, définissez `COOKIE_SECURE=true`, `FRONTEND_URL` et `CORS_ORIGINS` sur les origines publiques exactes. Activez `TRUST_PROXY_HEADERS=true` seulement derrière un proxy qui contrôle `X-Forwarded-For`.

## Lancement sans Docker

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
python3 -m venv .venv && . .venv/bin/activate
pip install -r backend/requirements.txt
(cd backend && uvicorn server:app --host 0.0.0.0 --port 8000)
(cd frontend && yarn install --frozen-lockfile && yarn start)
```

Dans ce mode, configurez `FRONTEND_URL=http://localhost:3000`, `CORS_ORIGINS=http://localhost:3000` et `VITE_BACKEND_URL=http://localhost:8000`.

## Vérifications

```bash
cd frontend && yarn install --frozen-lockfile && yarn build
python3 -m compileall -q backend
```

Les tests d'intégration modifient des données. Ils sont volontairement bloqués hors d'un environnement explicitement isolé : définissez `GOLDEN_PIRATES_TEST_MODE=1`, utilisez `VITE_BACKEND_URL` local (`127.0.0.1` ou `localhost`) et un `DB_NAME` commençant par `golden_pirates_test_`.

## Sécurité et exploitation

Ne stockez aucun secret dans Git. Si un mot de passe ou jeton a déjà été partagé dans l'historique du dépôt, changez-le dans tous les environnements avant tout déploiement. Utilisez une base MongoDB distincte pour les tests, configurez le cron avec son en-tête `Authorization: Bearer <WEBHOOK_CRON_SECRET>` et vérifiez son retour `2xx` dans les journaux de l'hébergeur.
