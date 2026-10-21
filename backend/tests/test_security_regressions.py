"""Régressions de sécurité exécutées contre un MongoDB en mémoire uniquement."""
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

# server.py valide sa configuration à l'import : ces valeurs de test ne servent jamais en production.
os.environ.setdefault("MONGO_URL", "mongodb://unused-for-mongomock:27017")
os.environ.setdefault("DB_NAME", "golden_pirates_test_security")
os.environ.setdefault("JWT_SECRET", "t" * 64)
os.environ.setdefault("ADMIN_EMAIL", "test-admin@example.test")
os.environ.setdefault("ADMIN_PASSWORD", "test-only-long-password")
os.environ.setdefault("FRONTEND_URL", "http://testserver")
os.environ.setdefault("CORS_ORIGINS", "http://testserver")
os.environ.setdefault("COOKIE_SECURE", "false")

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
import server  # noqa: E402

server.db = AsyncMongoMockClient()[os.environ["DB_NAME"]]


APPLICATION = {
    "pseudo": "Test Corsaire",
    "power": "12M",
    "troops": "Gardiens du vent",
    "activity": "Chaque jour",
    "experience": "Marin motivé",
    "discord": "test-corsaire",
    "contact": "contact-corsaire-test",
    "message": "Je souhaite rejoindre l'équipage Golden Pirates.",
}


def test_private_codes_are_long_and_lookup_is_limited():
    with TestClient(server.app) as client:
        created = client.post("/api/applications", json=APPLICATION)
        assert created.status_code == 200, created.text
        code = created.json()["tracking_code"]
        assert code.startswith("GP-1023-")
        assert len(code) == 20

        tracked = client.get(f"/api/applications/track/{code}")
        assert tracked.status_code == 200
        assert tracked.json()["pseudo"] == APPLICATION["pseudo"]

        weak_recovery = client.post(
            "/api/applications/recover",
            json={"pseudo": APPLICATION["pseudo"], "power": APPLICATION["power"]},
        )
        assert weak_recovery.status_code == 400
        recovered = client.post(
            "/api/applications/recover",
            json={
                "pseudo": APPLICATION["pseudo"],
                "power": APPLICATION["power"],
                "contact": APPLICATION["contact"],
            },
        )
        assert recovered.status_code == 200
        assert recovered.json()["tracking_code"] == code

        for _ in range(server.FAILED_LOOKUPS_PER_HOUR):
            missing = client.get("/api/applications/track/GP-1023-DOESNOTEXIST")
            assert missing.status_code == 404
        blocked = client.get("/api/applications/track/GP-1023-DOESNOTEXIST")
        assert blocked.status_code == 429


def test_receipts_are_long_and_council_rejects_unknown_origins():
    with TestClient(server.app) as client:
        declared = client.post("/api/donations/declare", json={"pseudo": "Donateur test", "amount": 7})
        assert declared.status_code == 200, declared.text
        receipt_id = declared.json()["receipt_id"]
        assert receipt_id.startswith("GPD-1023-")
        assert len(receipt_id) == 21

        status = client.get(f"/api/donations/status/{receipt_id}")
        assert status.status_code == 200
        assert status.json()["status"] == "pending"

        blocked = client.post(
            "/api/admin/login",
            headers={"Origin": "https://untrusted.example"},
            json={"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]},
        )
        assert blocked.status_code == 403

        allowed_preflight = client.options(
            "/api/admin/login",
            headers={
                "Origin": "http://testserver",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert allowed_preflight.status_code == 200
        assert allowed_preflight.headers["access-control-allow-origin"] == "http://testserver"
