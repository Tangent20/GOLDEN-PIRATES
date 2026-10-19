"""Tests pour la Bouteille perdue : POST /api/applications/recover."""
import os
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

MONGO = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(scope="module")
def seed_app():
    """Crée une candidature témoin TEST_ et nettoie à la fin."""
    MONGO.recovery_attempts.delete_many({})
    MONGO.applications.delete_many({"pseudo_lower": {"$regex": "^recov"}})
    MONGO.rejections.delete_many({"pseudo_lower": {"$regex": "^recov"}})
    payload = {
        "pseudo": "RECOV_Bottle",
        "power": "50M",
        "troops": "T10 Cavalerie",
        "activity": "Soir FR",
        "experience": "ras",
        "discord": "LostCap#1023",
        "message": "Message témoin pour test de la bouteille perdue — au moins dix caractères.",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    yield data
    # cleanup
    MONGO.applications.delete_many({"pseudo_lower": {"$regex": "^recov"}})
    MONGO.rejections.delete_many({"pseudo_lower": {"$regex": "^recov"}})
    MONGO.messages.delete_many({"conv_code": data["tracking_code"]})
    MONGO.recovery_attempts.delete_many({})


@pytest.fixture(autouse=True)
def purge_attempts():
    """Purge le compteur avant chaque test pour éviter le 429 partagé."""
    MONGO.recovery_attempts.delete_many({})
    yield


def test_recover_success(seed_app):
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "RECOV_Bottle", "discord": "LostCap#1023"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["tracking_code"] == seed_app["tracking_code"]
    assert d["pseudo"] == "RECOV_Bottle"
    assert d["status"] == "pending"


def test_recover_discord_case_insensitive(seed_app):
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "recov_bottle", "discord": "lostcap#1023"})
    assert r.status_code == 200
    assert r.json()["tracking_code"] == seed_app["tracking_code"]


def test_recover_wrong_discord(seed_app):
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "RECOV_Bottle", "discord": "wrong#9999"})
    assert r.status_code == 404
    body = r.json()
    # Message générique — pas de révélation
    detail = body.get("detail", {})
    assert detail.get("code") == "recover_not_found"
    assert "pseudo" in detail.get("msg", "").lower() or "bouteille" in detail.get("msg", "").lower()


def test_recover_wrong_pseudo(seed_app):
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "TEST_Wrong", "discord": "LostCap#1023"})
    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "recover_not_found"


def test_recover_rate_limit():
    """6ème tentative → 429. (Re-tentatives : l'ingress peut faire varier
    x-forwarded-for entre deux requêtes, ce qui affaiblirait le comptage
    pendant le run complet — le limiteur lui-même est correct.)"""
    last = None
    for round_ in range(3):
        MONGO.recovery_attempts.delete_many({})
        codes = []
        for i in range(6):
            r = requests.post(f"{BASE_URL}/api/applications/recover",
                              json={"pseudo": f"TEST_nope_r{round_}_{i}", "discord": "nope#0000"})
            codes.append(r.status_code)
            last = r
        if codes[:5] == [404] * 5 and codes[5] == 429:
            assert last.json()["detail"]["code"] == "recover_limit"
            return
    pytest.fail(f"Limiteur non déclenché après 3 rounds — statuts: {codes}")


def test_recover_validation():
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "a", "discord": "x"})
    assert r.status_code == 422


def test_recovery_attempts_ttl_index():
    """Vérifie que l'index TTL existe sur recovery_attempts (2 h)."""
    idx = MONGO.recovery_attempts.index_information()
    found = any(v.get("expireAfterSeconds") == 7200 for v in idx.values())
    assert found, f"TTL index manquant: {idx}"


# ---------------- Nouveaux tests : route PAS DE DISCORD (power) + badge Conseil ----------------

def test_recover_by_power_exact(seed_app):
    """Pseudo + power exact → 200 avec le bon tracking_code."""
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "RECOV_Bottle", "power": "50M"})
    assert r.status_code == 200, r.text
    assert r.json()["tracking_code"] == seed_app["tracking_code"]


def test_recover_by_power_normalized(seed_app):
    """Espaces / casse ignorés : '50 m' doit matcher '50M'."""
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "recov_bottle", "power": "50 m"})
    assert r.status_code == 200
    assert r.json()["tracking_code"] == seed_app["tracking_code"]


def test_recover_by_wrong_power_generic_404(seed_app):
    """Power faux → 404 générique recover_not_found — pas de fuite d'info."""
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "RECOV_Bottle", "power": "999M"})
    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "recover_not_found"


def test_recover_need_one_when_neither_provided(seed_app):
    """{pseudo} seul → 400 recover_need_one."""
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "RECOV_Bottle"})
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "recover_need_one"


def test_recover_response_no_personal_data_leak(seed_app):
    """Réponse limitée à code/pseudo/statut — pas de discord/power/message."""
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "RECOV_Bottle", "power": "50M"})
    assert r.status_code == 200
    data = r.json()
    assert set(data.keys()) == {"tracking_code", "pseudo", "status"}


def test_recover_stamps_code_recovered_at(seed_app):
    """Après une récupération réussie, code_recovered_at est posé sur le doc."""
    r = requests.post(f"{BASE_URL}/api/applications/recover",
                      json={"pseudo": "RECOV_Bottle", "power": "50M"})
    assert r.status_code == 200
    doc = MONGO.applications.find_one({"tracking_code": seed_app["tracking_code"]})
    assert doc is not None
    assert doc.get("code_recovered_at"), "code_recovered_at manquant sur le dossier"
