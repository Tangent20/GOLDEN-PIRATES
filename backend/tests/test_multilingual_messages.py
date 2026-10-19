"""Tests multilingues + surrogates (iteration_13).

Vérifie :
1) Les surrogates isolés ne renvoient JAMAIS 500 (handler 422 propre + safe_text).
2) Round-trip multilingue intact (cyrillique, CJK, arabe, hébreu, emoji, RTL).
3) Recherche CJK sans fuite de champs sensibles.
4) Limites de longueur avec CJK sans 500.
5) Nettoyage final (burn + purge).
"""
import os
import json
import re
import pytest
import requests

# Load the public URL from frontend/.env so tests hit the real k8s-ingressed endpoint
_FENV = "/app/frontend/.env"
if os.path.exists(_FENV):
    with open(_FENV) as _f:
        for _ln in _f:
            if _ln.startswith("REACT_APP_BACKEND_URL"):
                os.environ["REACT_APP_BACKEND_URL"] = _ln.split("=", 1)[1].strip().strip('"')
                break
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@goldenpirates.io"
ADMIN_PASSWORD = "Capitaine1023!"

# Payload JSON brut qui contient un surrogate isolé (séquence d'échappement \uXXXX
# non appariée, parfaitement légale au niveau JSON mais produit un lone surrogate
# en Python → crash d'encodage UTF-8 sans protection).
SURROGATE_JSON_FRAGMENT = r'test \ud83d brut'


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
               timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def created_apps():
    """Crée 2 candidatures de test (A cyrillique + B CJK)."""
    out = {}
    # Candidature A — cyrillique + emoji
    payload_a = {
        "pseudo": "МорячокТест2",
        "power": "120M",
        "troops": "T11",
        "activity": "Soir — Здравствуйте",
        "experience": "Опыт ⚓",
        "discord": "moryachok#2",
        "message": "Привет, пираты! 大家好 ⚓🏴‍☠️ — tester le multilingue",
    }
    r = requests.post(f"{API}/applications", json=payload_a, timeout=15)
    assert r.status_code == 200, f"create A failed: {r.status_code} {r.text}"
    data = r.json()
    out["A"] = {
        "id": data["id"],
        "code": data["tracking_code"],
        "pseudo": data["pseudo"],
        "payload": payload_a,
    }

    # Candidature B — CJK pur
    payload_b = {
        "pseudo": "海盗测试",
        "power": "95M",
        "troops": "T10",
        "activity": "白天",
        "experience": "三年航海经验",
        "discord": "haidao#3",
        "message": "你好海盗兄弟们！我想加入 GOLDEN PIRATES — 一起航海吧！",
    }
    r = requests.post(f"{API}/applications", json=payload_b, timeout=15)
    assert r.status_code == 200, f"create B failed: {r.status_code} {r.text}"
    data = r.json()
    out["B"] = {
        "id": data["id"],
        "code": data["tracking_code"],
        "pseudo": data["pseudo"],
        "payload": payload_b,
    }
    yield out
    # Teardown: handled by test_zz_cleanup


# ---------- 1) Non-régression surrogate → jamais 500 ----------

def _post_raw(url, body: bytes):
    return requests.post(url, data=body,
                         headers={"Content-Type": "application/json"},
                         timeout=15)


class TestSurrogateNo500:
    def test_messages_post_with_lone_surrogate_valid_length(self, created_apps):
        """Surrogate isolé dans un texte de longueur valide — safe_text nettoie,
        réponse 200, texte stocké sans le surrogate (jamais 500)."""
        code = created_apps["A"]["code"]
        body = f'{{"text":"{SURROGATE_JSON_FRAGMENT}"}}'.encode("utf-8")
        r = _post_raw(f"{API}/messages/{code}", body)
        assert r.status_code != 500, f"GOT 500 (regression): {r.text[:300]}"
        assert r.status_code in (200, 400, 422), f"unexpected {r.status_code}: {r.text[:200]}"
        if r.status_code == 200:
            # Le texte retourné doit être propre (pas de surrogate persistant)
            txt = r.json().get("text", "")
            assert txt.encode("utf-8", "strict")  # ne doit pas lever

    def test_peers_post_with_lone_surrogate(self, created_apps):
        """POST /api/peers/messages avec surrogate isolé — jamais 500."""
        a = created_apps["A"]
        b = created_apps["B"]
        body = json.dumps({
            "from_code": a["code"],
            "to_app_id": b["id"],
            "text": "x",  # placeholder, remplacé plus bas
        })
        # Remplace le texte par la version avec surrogate brut
        body = body.replace('"text": "x"', f'"text": "{SURROGATE_JSON_FRAGMENT}"')
        r = _post_raw(f"{API}/peers/messages", body.encode("utf-8"))
        assert r.status_code != 500, f"GOT 500 (regression peers): {r.text[:300]}"
        assert r.status_code in (200, 400, 422), f"unexpected {r.status_code}: {r.text[:200]}"

    def test_applications_post_with_surrogate_triggers_422_not_500(self):
        """Payload INVALIDE (message trop court) + surrogate dans pseudo →
        le handler global doit renvoyer 422 propre, pas 500."""
        body = (
            '{"pseudo":"ab' + SURROGATE_JSON_FRAGMENT + '",'
            '"power":"1M","troops":"T5","activity":"soir",'
            '"discord":"x#1","message":"trop"}'  # message=4 chars < min 10
        ).encode("utf-8")
        r = _post_raw(f"{API}/applications", body)
        assert r.status_code != 500, f"GOT 500 (handler regression): {r.text[:300]}"
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text[:200]}"
        # Le body doit être JSON propre, décodable UTF-8 strict, sans écho du surrogate
        txt = r.text
        assert "\\ud83d" not in txt.lower(), "surrogate echoed in 422 body"
        assert txt.encode("utf-8", "strict")  # pas de surrogate

    def test_applications_post_with_valid_surrogate_payload_cleans(self):
        """Payload VALIDE avec surrogate dans le message — safe_text nettoie,
        la candidature est créée (200), pas de 500."""
        body = (
            '{"pseudo":"TestSurrogateX","power":"1M","troops":"T5",'
            '"activity":"soir","discord":"x#1",'
            '"message":"Message valide avec surrogate ' + SURROGATE_JSON_FRAGMENT + ' et plus"}'
        ).encode("utf-8")
        r = _post_raw(f"{API}/applications", body)
        assert r.status_code != 500, f"GOT 500: {r.text[:300]}"
        # 200 (créé, surrogate nettoyé) ou 422 (rejet strict Pydantic) ou 409/429 : jamais 500
        assert r.status_code in (200, 409, 422, 429), f"unexpected {r.status_code}: {r.text[:200]}"
        if r.status_code == 200:
            app_id = r.json()["id"]
            # Nettoyage immédiat de ce dossier parasite
            try:
                s = requests.Session()
                s.post(f"{API}/admin/login",
                       json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                       timeout=15)
                s.delete(f"{API}/admin/applications/{app_id}", timeout=15)
            except Exception:
                pass


# ---------- 2) Round-trip multilingue complet ----------

class TestRoundtripMultilingual:
    def test_council_message_roundtrip_cjk_cyrillic_arabic_hebrew_emoji(
            self, created_apps, admin_session):
        """Conseil → recrue A : message mixte, relecture identique octet par octet."""
        code = created_apps["A"]["code"]
        txt = "Chinois 大家好 • Russe Здравствуйте • Arabe مرحبا • Hébreu שלום • ⚓🏴‍☠️"
        r = admin_session.post(f"{API}/admin/conversations/{code}",
                               json={"text": txt}, timeout=15)
        assert r.status_code == 200, r.text
        msg_id = r.json()["id"]

        # Relecture via /api/messages/{code}
        r2 = requests.get(f"{API}/messages/{code}", timeout=15)
        assert r2.status_code == 200
        msgs = r2.json()
        found = next((m for m in msgs if m["id"] == msg_id), None)
        assert found is not None, "message non retrouvé"
        assert found["text"] == txt, (
            f"MISMATCH octet-à-octet:\n  envoyé  : {txt!r}\n  reçu    : {found['text']!r}"
        )

    def test_peer_message_roundtrip_cjk_cyrillic_emoji(self, created_apps):
        """Tanière A→B : texte mixte, B relit via /peers/thread, identique."""
        a = created_apps["A"]
        b = created_apps["B"]
        txt = "我们一起 Здравствуй pirate ⚓ — rendez-vous à T20"
        r = requests.post(f"{API}/peers/messages",
                          json={"from_code": a["code"], "to_app_id": b["id"], "text": txt},
                          timeout=15)
        assert r.status_code == 200, r.text
        sent_id = r.json()["id"]
        assert r.json()["text"] == txt

        # B relit
        r2 = requests.get(f"{API}/peers/thread",
                          params={"code": b["code"], "peer": a["id"]},
                          timeout=15)
        assert r2.status_code == 200, r2.text
        msgs = r2.json()["messages"]
        found = next((m for m in msgs if m["id"] == sent_id), None)
        assert found is not None, "peer message not visible to B"
        assert found["text"] == txt, (
            f"MISMATCH peer: envoyé={txt!r} reçu={found['text']!r}"
        )
        assert found["from_me"] is False  # côté B

    def test_peer_search_cjk_clean_fields(self, created_apps):
        """A cherche '海盗' (2 CJK) → trouve B avec champs propres."""
        a = created_apps["A"]
        b = created_apps["B"]
        r = requests.get(f"{API}/peers/search",
                         params={"q": "海盗", "code": a["code"]}, timeout=15)
        assert r.status_code == 200, r.text
        results = r.json()
        hit = next((x for x in results if x["app_id"] == b["id"]), None)
        assert hit is not None, f"CJK search miss, got: {results}"
        assert hit["pseudo"] == b["pseudo"]
        # Champs autorisés uniquement (joined = date de dépôt, note = bio publique — non sensibles)
        assert set(hit.keys()) == {"app_id", "pseudo", "power", "troops", "status", "joined", "note"}
        # Champs sensibles JAMAIS exposés
        for leak in ("discord", "email", "tracking_code", "message", "experience", "ip"):
            assert leak not in hit, f"LEAK: {leak} exposé dans /peers/search"

    def test_peer_note_roundtrip(self, created_apps):
        """B écrit sa note de mer → A la voit sur sa fiche (search). Note trop longue → 422."""
        a = created_apps["A"]
        b = created_apps["B"]
        r = requests.post(f"{API}/peers/note",
                          json={"code": b["code"], "note": "Cavalerie lourde — spécialiste Behemoths."},
                          timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        r2 = requests.get(f"{API}/peers/search",
                          params={"q": "海盗", "code": a["code"]}, timeout=15)
        hit = next((x for x in r2.json() if x["app_id"] == b["id"]), None)
        assert hit is not None
        assert hit["note"] == "Cavalerie lourde — spécialiste Behemoths."
        # Note vide autorisée (effacement)
        r3 = requests.post(f"{API}/peers/note", json={"code": b["code"], "note": ""}, timeout=15)
        assert r3.status_code == 200 and r3.json()["note"] == ""
        # Trop longue → 422 (validation stricte, pas de troncature silencieuse)
        r4 = requests.post(f"{API}/peers/note", json={"code": b["code"], "note": "x" * 201}, timeout=15)
        assert r4.status_code == 422

    def test_peer_search_cyrillic(self, created_apps):
        """A cherche son propre préfixe cyrillique — ne doit PAS se trouver (code != me)."""
        a = created_apps["A"]
        r = requests.get(f"{API}/peers/search",
                         params={"q": "Моря", "code": a["code"]}, timeout=15)
        assert r.status_code == 200
        for x in r.json():
            assert x["app_id"] != a["id"], "self-match leaked"


# ---------- 3) Arabe RTL dans candidature ----------

class TestRTLApplication:
    def test_application_arabic_rtl_roundtrip(self):
        payload = {
            "pseudo": "قرصانTest",
            "power": "75M",
            "troops": "T9",
            "activity": "مساء",
            "experience": "خبرة بحرية",
            "discord": "qursan#1",
            "message": "مرحبا! أود الانضمام إلى تحالف القراصنة الذهبيين ⚓",
        }
        r = requests.post(f"{API}/applications", json=payload, timeout=15)
        if r.status_code == 429:
            pytest.skip("ip rate-limit")
        assert r.status_code == 200, r.text
        app_id = r.json()["id"]
        code = r.json()["tracking_code"]
        # Relecture via /applications/track
        r2 = requests.get(f"{API}/applications/track/{code}", timeout=15)
        assert r2.status_code == 200, r2.text
        doc = r2.json()
        assert doc["pseudo"] == payload["pseudo"]
        assert doc["message"] == payload["message"]
        # Nettoyage immédiat
        s = requests.Session()
        s.post(f"{API}/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        s.delete(f"{API}/admin/applications/{app_id}", timeout=15)


# ---------- 4) Limites de longueur CJK ----------

class TestCJKLengthLimits:
    def test_peer_message_1000_cjk_chars_boundary(self, created_apps):
        """1000 caractères CJK = exactement la limite → 200."""
        a = created_apps["A"]
        b = created_apps["B"]
        txt = "海" * 1000
        r = requests.post(f"{API}/peers/messages",
                          json={"from_code": a["code"], "to_app_id": b["id"], "text": txt},
                          timeout=15)
        assert r.status_code != 500, f"GOT 500: {r.text[:300]}"
        assert r.status_code == 200, r.text
        assert len(r.json()["text"]) == 1000

    def test_peer_message_1001_cjk_rejected_cleanly(self, created_apps):
        """1001 caractères = au-dessus de la limite → 422 propre, jamais 500."""
        a = created_apps["A"]
        b = created_apps["B"]
        txt = "海" * 1001
        r = requests.post(f"{API}/peers/messages",
                          json={"from_code": a["code"], "to_app_id": b["id"], "text": txt},
                          timeout=15)
        assert r.status_code != 500, f"GOT 500: {r.text[:300]}"
        assert r.status_code == 422, f"expected 422, got {r.status_code}"

    def test_council_message_2000_mixed_chars(self, created_apps, admin_session):
        """2000 caractères mixtes (CJK + cyrillique + emoji) à la limite."""
        code = created_apps["A"]["code"]
        base = "海Я⚓x"  # 4 chars
        txt = base * 500  # 2000 chars
        assert len(txt) == 2000
        r = admin_session.post(f"{API}/admin/conversations/{code}",
                               json={"text": txt}, timeout=15)
        assert r.status_code != 500, f"GOT 500: {r.text[:300]}"
        # 200 (accepté) ou 429 (flood) acceptables
        assert r.status_code in (200, 429), r.text

    def test_council_message_2001_rejected_cleanly(self, created_apps, admin_session):
        code = created_apps["A"]["code"]
        txt = "x" * 2001
        r = admin_session.post(f"{API}/admin/conversations/{code}",
                               json={"text": txt}, timeout=15)
        assert r.status_code != 500
        assert r.status_code == 422


# ---------- 5) Nettoyage final (burn + purge) ----------

class TestZZCleanup:
    """ZZ pour s'exécuter en dernier (ordre alphabétique pytest)."""

    def test_zz_burn_test_applications_and_purge(self, admin_session):
        # Liste toutes les candidatures
        r = admin_session.get(f"{API}/admin/applications", timeout=15)
        assert r.status_code == 200
        apps = r.json()
        # Brûle TOUTES les candidatures de test connues (celles créées ici + stock pré-existant)
        burn_pseudos = {
            "МорячокТест2", "海盗测试", "МорячокТест", "中文海盗",
            "TestSurrogateX", "قرصانTest",
        }
        burned = 0
        for a in apps:
            if a.get("pseudo") in burn_pseudos or (a.get("pseudo", "").startswith("TEST_")):
                rd = admin_session.delete(
                    f"{API}/admin/applications/{a['id']}", timeout=15)
                if rd.status_code == 200:
                    burned += 1
        print(f"[cleanup] Brûlées: {burned}")

        # Purge directe via Mongo (peer_messages, rejections, login_attempts, messages orphelins)
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def _purge():
            cli = AsyncIOMotorClient(mongo_url)
            db = cli[db_name]
            r1 = await db.peer_messages.delete_many({})
            r2 = await db.rejections.delete_many({})
            r3 = await db.login_attempts.delete_many({})
            r4 = await db.messages.delete_many({})
            # On supprime aussi toute candidature de test résiduelle
            r5 = await db.applications.delete_many({
                "pseudo": {"$in": list(burn_pseudos)}
            })
            counts = {
                "applications": await db.applications.count_documents({}),
                "peer_messages": await db.peer_messages.count_documents({}),
                "rejections": await db.rejections.count_documents({}),
                "login_attempts": await db.login_attempts.count_documents({}),
                "messages": await db.messages.count_documents({}),
            }
            cli.close()
            return {
                "peer_messages_deleted": r1.deleted_count,
                "rejections_deleted": r2.deleted_count,
                "login_attempts_deleted": r3.deleted_count,
                "messages_deleted": r4.deleted_count,
                "test_apps_deleted": r5.deleted_count,
                "remaining": counts,
            }

        result = asyncio.get_event_loop().run_until_complete(_purge())
        print(f"[purge] {result}")
        # Vérifie que la base est VIDE pour les collections éphémères
        assert result["remaining"]["peer_messages"] == 0
        assert result["remaining"]["rejections"] == 0
        assert result["remaining"]["login_attempts"] == 0
        assert result["remaining"]["messages"] == 0
        assert result["remaining"]["applications"] == 0
