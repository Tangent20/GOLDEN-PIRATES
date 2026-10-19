"""
Golden Pirates — Backend regression tests for the anti-spam re-application strategy.
Covers: duplicate_active, already_accepted, cooldown, ip_limit, track/reapply_at,
plus smoke of admin flows (login, patch status_changed_at, delete).

We touch MongoDB directly to seed test fixtures so that we do NOT consume the
real per-IP quota (3/day) via multiple real POSTs. Only ip_limit test uses the
real endpoint.
"""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("/app/backend/.env"))

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") \
    if os.environ.get("REACT_APP_BACKEND_URL") \
    else "https://golden-pirates.preview.emergentagent.com"

# Load frontend .env to prefer that URL (that's what the user sees)
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
except Exception:
    pass

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]

ADMIN_EMAIL = "admin@goldenpirates.io"
ADMIN_PASSWORD = "Capitaine1023!"

TEST_PREFIX = "TEST_"


def now_iso(offset_days: float = 0):
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).isoformat()


def _insert_app(pseudo: str, status: str, created_days_ago: float = 0,
                status_changed_days_ago: float | None = None, ip: str = "10.99.0.1"):
    app_id = str(uuid.uuid4())
    code = "GP-TST-" + uuid.uuid4().hex[:4].upper()
    created = now_iso(-created_days_ago)
    sc = now_iso(-(status_changed_days_ago if status_changed_days_ago is not None else created_days_ago))
    doc = {
        "id": app_id,
        "pseudo": pseudo,
        "pseudo_lower": pseudo.strip().lower(),
        "power": "100M",
        "troops": "Infanterie",
        "activity": "Quotidien",
        "experience": "",
        "discord": "test#0001",
        "message": "TEST message long enough",
        "status": status,
        "note": "",
        "seen_status": status,
        "seen_note": "",
        "created_at": created,
        "status_changed_at": sc,
        "tracking_code": code,
        "ip": ip,
    }
    db.applications.insert_one(doc)
    return doc


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(autouse=True)
def _cleanup_test_data():
    yield
    # Cleanup after each test: wipe any TEST_ pseudo + GP-TST codes we inserted
    db.applications.delete_many({"$or": [
        {"pseudo": {"$regex": f"^{TEST_PREFIX}"}},
        {"pseudo_lower": {"$regex": f"^{TEST_PREFIX.lower()}"}},
        {"tracking_code": {"$regex": "^GP-TST-"}},
    ]})
    db.rejections.delete_many({"pseudo_lower": {"$regex": f"^{TEST_PREFIX.lower()}"}})


# ---------------- Health ----------------

def test_root_api_ok():
    r = requests.get(f"{BASE_URL}/api/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------------- Guard: duplicate_active ----------------

def test_duplicate_active_pending_blocks_new_application():
    pseudo = f"{TEST_PREFIX}DupPending"
    _insert_app(pseudo, status="pending")
    payload = {
        "pseudo": pseudo.lower(),  # case-insensitive
        "power": "120M", "troops": "Cavalerie", "activity": "Quotidien",
        "experience": "", "discord": "x#0002",
        "message": "TEST retry duplicate pending",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 409, r.text
    detail = r.json().get("detail", {})
    assert detail.get("code") == "duplicate_active"


def test_duplicate_active_reserve_blocks_new_application():
    pseudo = f"{TEST_PREFIX}DupReserve"
    _insert_app(pseudo, status="reserve")
    payload = {
        "pseudo": pseudo.upper(),
        "power": "120M", "troops": "Cavalerie", "activity": "Quotidien",
        "experience": "", "discord": "x#0003",
        "message": "TEST retry duplicate reserve",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "duplicate_active"


# ---------------- Guard: already_accepted ----------------

def test_already_accepted_blocks_new_application():
    pseudo = f"{TEST_PREFIX}Accepted"
    _insert_app(pseudo, status="accepted")
    payload = {
        "pseudo": pseudo,
        "power": "120M", "troops": "Cavalerie", "activity": "Quotidien",
        "experience": "", "discord": "x#0004",
        "message": "TEST retry already accepted",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "already_accepted"


# ---------------- Guard: cooldown (rejected < 30 days) ----------------

def test_cooldown_blocks_when_rejected_recently():
    pseudo = f"{TEST_PREFIX}Cooldown"
    _insert_app(pseudo, status="rejected", created_days_ago=5, status_changed_days_ago=5)
    payload = {
        "pseudo": pseudo,
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#0005",
        "message": "TEST reapply during cooldown",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 429
    detail = r.json()["detail"]
    assert detail["code"] == "cooldown"
    assert "retry_at" in detail
    # retry_at must be approx. status_changed_at + 30 days ≈ now + 25d
    retry = datetime.fromisoformat(detail["retry_at"])
    delta_days = (retry - datetime.now(timezone.utc)).total_seconds() / 86400
    assert 24 <= delta_days <= 26, f"Unexpected retry_at delta: {delta_days}"


def test_cooldown_allows_after_30_days():
    # Rejected 31 days ago → should be allowed. We seed a rejected one, then POST.
    pseudo = f"{TEST_PREFIX}CooldownOver"
    _insert_app(pseudo, status="rejected",
                created_days_ago=31, status_changed_days_ago=31,
                ip="10.99.0.2")  # distinct IP to avoid IP noise
    payload = {
        "pseudo": pseudo,
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#0006",
        "message": "TEST reapply after cooldown expired",
    }
    # Use a header to simulate a different IP via x-forwarded-for
    r = requests.post(f"{BASE_URL}/api/applications",
                      json=payload,
                      headers={"X-Forwarded-For": "203.0.113.77"},
                      timeout=15)
    # Should succeed (201/200). The server returns 200.
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["pseudo"].lower() == pseudo.lower()
    assert body["tracking_code"].startswith("GP-1023-")
    # cleanup the newly created doc
    db.applications.delete_one({"id": body["id"]})


# ---------------- Guard: ip_limit (6 per 24h) ----------------

def test_cooldown_survives_burn(admin_session):
    """Le Conseil brûle un dossier refusé : le délai de 30 jours SURVIT au
    brûlage (pas de re-postulation instantanée qui réouvrirait le spam).
    Le pardon passe par REMETTRE EN EXAMEN, pas par la corbeille."""
    pseudo = f"{TEST_PREFIX}Burned"
    payload = {
        "pseudo": pseudo,
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#burn",
        "message": "TEST dossier refusé puis brûlé — le cooldown doit survivre",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    app_id = r.json()["id"]
    r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                            json={"status": "rejected", "note": ""}, timeout=15)
    assert r.status_code == 200, r.text
    r = admin_session.delete(f"{BASE_URL}/api/admin/applications/{app_id}", timeout=15)
    assert r.status_code == 200, r.text
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 429, r.text
    assert r.json()["detail"]["code"] == "cooldown"


def test_cooldown_lifted_by_explicit_pardon(admin_session):
    """Pardon explicite : REMETTRE EN EXAMEN lève le sanctuaire — après
    brûlage du dossier pardonné, la recrue peut reposter immédiatement."""
    pseudo = f"{TEST_PREFIX}Pardon"
    payload = {
        "pseudo": pseudo,
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#pardon",
        "message": "TEST refusé puis pardonné — repostage immédiat attendu",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    app_id = r.json()["id"]
    r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                            json={"status": "rejected", "note": ""}, timeout=15)
    assert r.status_code == 200, r.text
    r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                            json={"status": "pending", "note": ""}, timeout=15)
    assert r.status_code == 200, r.text
    r = admin_session.delete(f"{BASE_URL}/api/admin/applications/{app_id}", timeout=15)
    assert r.status_code == 200, r.text
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    db.applications.delete_one({"id": r.json()["id"]})


def test_cooldown_sanctuary_allows_after_30_days():
    """Après l'expiration du délai (source : sanctuaire), la recrue n'est plus
    bloquée : repostage accepté — rien ne reste figé."""
    pseudo = f"{TEST_PREFIX}SanctuaryOver"
    old_iso = (datetime.now(timezone.utc) - timedelta(days=31)).isoformat()
    db.rejections.update_one(
        {"pseudo_lower": pseudo.lower()},
        {"$set": {"pseudo_lower": pseudo.lower(), "rejected_at": old_iso}},
        upsert=True,
    )
    payload = {
        "pseudo": pseudo,
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#sanct",
        "message": "TEST repostage apres expiration du sanctuaire",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload,
                      headers={"X-Forwarded-For": "203.0.113.78"}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["tracking_code"].startswith("GP-1023-")
    db.applications.delete_one({"id": r.json()["id"]})


def test_cooldown_sanctuary_still_blocks_before_expiry():
    """Juste avant l'expiration (29 jours), le sanctuaire bloque toujours."""
    pseudo = f"{TEST_PREFIX}SanctuaryNear"
    near_iso = (datetime.now(timezone.utc) - timedelta(days=29)).isoformat()
    db.rejections.update_one(
        {"pseudo_lower": pseudo.lower()},
        {"$set": {"pseudo_lower": pseudo.lower(), "rejected_at": near_iso}},
        upsert=True,
    )
    payload = {
        "pseudo": pseudo,
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#snear",
        "message": "TEST repostage juste avant expiration du sanctuaire",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload,
                      headers={"X-Forwarded-For": "203.0.113.79"}, timeout=15)
    assert r.status_code == 429, r.text
    assert r.json()["detail"]["code"] == "cooldown"


# ---------------- Guard: ip_limit (6 per 24h) ----------------

def test_ip_limit_blocks_after_six_from_same_ip():
    """We can't spoof the client IP (ingress rewrites x-forwarded-for), so we
    first discover the IP the backend actually sees via a canary POST, then
    seed 6 recent applications matching that IP, then expect the next POST to
    be rejected with 429 ip_limit. Finally restore the previous state by
    removing our seeds + canary so the real quota is preserved."""
    # Canary POST — small but valid; it will consume 1 slot of the real pod IP.
    # We'll delete it immediately after reading the resulting stored IP.
    canary = {
        "pseudo": f"{TEST_PREFIX}Canary",
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#can",
        "message": "TEST canary to detect pod IP",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=canary, timeout=15)
    if r.status_code == 429 and r.json()["detail"].get("code") == "ip_limit":
        # Already saturated — that itself validates ip_limit works. Skip the rest.
        return
    assert r.status_code == 200, r.text
    canary_id = r.json()["id"]
    stored = db.applications.find_one({"id": canary_id})
    real_ip = stored["ip"]
    db.applications.delete_one({"id": canary_id})

    # If 5 more fake entries from same IP → we'd be at 6 → next POST = 429.
    for i in range(5):
        _insert_app(f"{TEST_PREFIX}IP{i}", status="pending",
                    created_days_ago=0.01, ip=real_ip)

    # Also count existing real entries from that IP in the last 24h; if there
    # are already some, add fewer. We want exactly 6 at POST time.
    day_ago_iso = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    existing = db.applications.count_documents({"ip": real_ip, "created_at": {"$gte": day_ago_iso}})
    # Normalise: delete any TEST_IP seeds to only keep what's needed
    while existing > 6:
        # we don't delete non-test real docs — just abort gracefully
        return
    # Top up with more TEST_IP seeds if existing < 6
    i = 5
    while existing < 6:
        _insert_app(f"{TEST_PREFIX}IPX{i}", status="pending",
                    created_days_ago=0.01, ip=real_ip)
        existing += 1
        i += 1

    payload = {
        "pseudo": f"{TEST_PREFIX}IPFourth",
        "power": "100M", "troops": "Marine", "activity": "Quotidien",
        "experience": "", "discord": "x#0007",
        "message": "TEST fourth from same IP should fail",
    }
    r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
    assert r.status_code == 429, r.text
    assert r.json()["detail"]["code"] == "ip_limit"


# ---------------- Track endpoint reapply_at ----------------

def test_track_returns_reapply_at_for_rejected():
    pseudo = f"{TEST_PREFIX}TrackRej"
    doc = _insert_app(pseudo, status="rejected", created_days_ago=2, status_changed_days_ago=2)
    r = requests.get(f"{BASE_URL}/api/applications/track/{doc['tracking_code']}", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "rejected"
    assert body["reapply_at"] is not None
    reapply = datetime.fromisoformat(body["reapply_at"])
    delta_days = (reapply - datetime.now(timezone.utc)).total_seconds() / 86400
    assert 27 <= delta_days <= 29


def test_track_reapply_at_null_for_non_rejected():
    for status in ("pending", "reserve", "accepted"):
        pseudo = f"{TEST_PREFIX}Track_{status}"
        doc = _insert_app(pseudo, status=status)
        r = requests.get(f"{BASE_URL}/api/applications/track/{doc['tracking_code']}", timeout=10)
        assert r.status_code == 200
        assert r.json()["reapply_at"] is None, f"status={status}"


def test_track_404_on_unknown_code():
    r = requests.get(f"{BASE_URL}/api/applications/track/GP-TST-NONE", timeout=10)
    assert r.status_code == 404


# ---------------- Admin flows ----------------

def test_admin_login_wrong_password(admin_session):
    # Use fresh session to not break admin cookie
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": "wrong-pwd-xxx"}, timeout=15)
    assert r.status_code == 401


def test_admin_me(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_admin_patch_updates_status_changed_at_only_on_change(admin_session):
    pseudo = f"{TEST_PREFIX}PatchDate"
    doc = _insert_app(pseudo, status="pending", created_days_ago=10, status_changed_days_ago=10)
    app_id = doc["id"]
    old_sc = doc["status_changed_at"]

    # Patch note only, no status change → status_changed_at must stay the same
    r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                            json={"status": "pending", "note": "same status"}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["status_changed_at"] == old_sc

    # Patch status to rejected → status_changed_at must bump to ~now
    r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                            json={"status": "rejected", "note": "nope"}, timeout=15)
    assert r.status_code == 200
    new_sc = r.json()["status_changed_at"]
    assert new_sc != old_sc
    new_dt = datetime.fromisoformat(new_sc)
    assert abs((datetime.now(timezone.utc) - new_dt).total_seconds()) < 30


def test_admin_stats(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/stats", timeout=10)
    assert r.status_code == 200
    body = r.json()
    for key in ("total", "pending", "accepted", "reserve", "rejected"):
        assert key in body and isinstance(body[key], int)


def test_admin_list_applications_no_mongo_id(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/applications", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    for d in data[:20]:
        assert "_id" not in d
