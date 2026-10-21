# Vérification de l’authentification

Les identifiants administrateur ne sont jamais enregistrés dans le dépôt. Configurez `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `backend/.env` à partir de `backend/.env.example`, puis testez exclusivement une instance locale ou de préproduction isolée.

Les tests d’intégration demandent `GOLDEN_PIRATES_TEST_MODE=1`, une URL localhost et une base dont le nom commence par `golden_pirates_test_`.
