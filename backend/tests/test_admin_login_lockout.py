"""Backend login lockout & auth tests (iteration 12)."""
import os
import time
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://golden-pirates.preview.emergentagent.com"
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@goldenpirates.io"
ADMIN_PW = "Capitaine1023!"
FAKE_EMAIL = f"pirate-fantome-{int(time.time())}@test.com"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_health_me_unauth(session):
    # /auth/me without cookie should be 401
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401, r.text


def test_admin_login_bad_pw_returns_401(session):
    r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "WRONG_" + str(time.time())})
    assert r.status_code == 401
    data = r.json()
    assert "detail" in data


def test_admin_login_success(session):
    s = requests.Session()
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"
    # cookie set
    assert any(c.name == "access_token" for c in s.cookies)
    # /auth/me works
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == ADMIN_EMAIL
    # logout
    lo = s.post(f"{API}/auth/logout")
    assert lo.status_code == 200


def test_bruteforce_lockout_fake_email(session):
    # 5 bad attempts on fake email -> 5th should return 429
    s = requests.Session()
    statuses = []
    for i in range(5):
        r = s.post(f"{API}/admin/login", json={"email": FAKE_EMAIL, "password": f"wrong{i}"})
        statuses.append(r.status_code)
    # First 4 should be 401 (or earlier 429 at 5th). The 5th attempt: backend increments then checks fails>=5 and sets lock.
    # On the current implementation the 5th still returns 401 because lock is set in same request. The 6th attempt returns 429.
    r6 = s.post(f"{API}/admin/login", json={"email": FAKE_EMAIL, "password": "wrong6"})
    print("statuses:", statuses, "6th:", r6.status_code, r6.text)
    assert r6.status_code == 429, f"Expected lockout on 6th attempt, got {r6.status_code}: {r6.text}"
    assert "15" in r6.json().get("detail", "") or "minutes" in r6.json().get("detail", "").lower()


def test_real_admin_still_works_after_fake_lockout(session):
    # Lockout is per {ip}:{email} so real admin should still login
    s = requests.Session()
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    s.post(f"{API}/auth/logout")


def test_cleanup_fake_login_attempts():
    # best-effort cleanup via mongo
    try:
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = MongoClient(mongo_url)
        db = client[db_name]
        res = db.login_attempts.delete_many({"identifier": {"$regex": FAKE_EMAIL}})
        print(f"Purged {res.deleted_count} fake login_attempts for {FAKE_EMAIL}")
    except Exception as e:
        print(f"Cleanup skipped: {e}")
