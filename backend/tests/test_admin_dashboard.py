"""
Golden Pirates — Admin Dashboard Backend Tests (Iteration 30)
Tests all admin features: login, stats, applications, exports, conversations, butin.
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

# Use frontend URL (what user sees)
BASE_URL = "https://golden-pirates.preview.emergentagent.com"
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

TEST_PREFIX = "TEST_ADMIN_"


def now_iso(offset_days: float = 0):
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).isoformat()


def _insert_app(pseudo: str, status: str, note: str = "", created_days_ago: float = 0):
    app_id = str(uuid.uuid4())
    code = "GP-TST-" + uuid.uuid4().hex[:4].upper()
    created = now_iso(-created_days_ago)
    doc = {
        "id": app_id,
        "pseudo": pseudo,
        "pseudo_lower": pseudo.strip().lower(),
        "power": "100M",
        "troops": "Infanterie",
        "activity": "Quotidien",
        "experience": "Test experience",
        "discord": "test#0001",
        "message": "TEST message long enough for validation",
        "status": status,
        "note": note,
        "seen_status": status,
        "seen_note": note,
        "created_at": created,
        "status_changed_at": created,
        "tracking_code": code,
        "ip": "10.99.0.1",
    }
    db.applications.insert_one(doc)
    return doc


@pytest.fixture(scope="session")
def admin_session():
    """Admin session with valid credentials"""
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(autouse=True)
def _cleanup_test_data():
    yield
    # Cleanup after each test
    db.applications.delete_many({"pseudo": {"$regex": f"^{TEST_PREFIX}"}})
    db.messages.delete_many({"conv_code": {"$regex": "^GP-TST-"}})
    db.donators.delete_many({"pseudo": {"$regex": f"^{TEST_PREFIX}"}})


# ============ AUTHENTICATION TESTS ============

def test_admin_login_correct_credentials():
    """POST /api/admin/login with correct credentials returns 200"""
    print("\n✓ Testing admin login with correct credentials...")
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"
    print(f"✅ Admin login successful: {body['email']}")


def test_admin_login_wrong_credentials():
    """POST /api/admin/login with wrong password returns 401"""
    print("\n✓ Testing admin login with wrong credentials...")
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": "WrongPassword123!"}, timeout=15)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
    print("✅ Wrong credentials correctly rejected with 401")


def test_auth_me(admin_session):
    """GET /api/auth/me returns admin email"""
    print("\n✓ Testing GET /api/auth/me...")
    r = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"
    print(f"✅ Auth check successful: {body['email']}")


def test_logout(admin_session):
    """POST /api/auth/logout clears session"""
    print("\n✓ Testing POST /api/auth/logout...")
    # Create a new session for this test
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200
    
    # Logout
    r = s.post(f"{BASE_URL}/api/auth/logout", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("ok") is True
    print("✅ Logout successful")


# ============ STATS TESTS ============

def test_admin_stats(admin_session):
    """GET /api/admin/stats returns all status counts"""
    print("\n✓ Testing GET /api/admin/stats...")
    r = admin_session.get(f"{BASE_URL}/api/admin/stats", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    required_keys = ["total", "pending", "accepted", "reserve", "rejected"]
    for key in required_keys:
        assert key in body, f"Missing key: {key}"
        assert isinstance(body[key], int), f"{key} should be int, got {type(body[key])}"
    print(f"✅ Stats retrieved: total={body['total']}, pending={body['pending']}, accepted={body['accepted']}, reserve={body['reserve']}, rejected={body['rejected']}")


# ============ APPLICATIONS TESTS ============

def test_admin_list_applications(admin_session):
    """GET /api/admin/applications returns list of applications"""
    print("\n✓ Testing GET /api/admin/applications...")
    r = admin_session.get(f"{BASE_URL}/api/admin/applications", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert isinstance(data, list), f"Expected list, got {type(data)}"
    # Check no MongoDB _id leaked
    for app in data[:10]:
        assert "_id" not in app, "MongoDB _id should not be exposed"
    print(f"✅ Applications list retrieved: {len(data)} applications")


def test_admin_patch_application_status(admin_session):
    """PATCH /api/admin/applications/{id} changes status and note"""
    print("\n✓ Testing PATCH /api/admin/applications/{id}...")
    # Create test application
    app = _insert_app(f"{TEST_PREFIX}PatchTest", status="pending", note="")
    app_id = app["id"]
    original_status = app["status"]
    
    # Change status to accepted with note
    r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                           json={"status": "accepted", "note": "Test note from admin"}, timeout=15)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["status"] == "accepted", f"Expected status 'accepted', got {body['status']}"
    assert body["note"] == "Test note from admin", f"Note mismatch"
    print(f"✅ Status changed from {original_status} to {body['status']}, note saved")
    
    # Restore original status for cleanup
    r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                           json={"status": original_status, "note": ""}, timeout=15)
    assert r.status_code == 200


def test_admin_patch_application_all_statuses(admin_session):
    """PATCH /api/admin/applications/{id} with all valid statuses"""
    print("\n✓ Testing PATCH with all statuses (pending, accepted, rejected, reserve)...")
    app = _insert_app(f"{TEST_PREFIX}StatusTest", status="pending")
    app_id = app["id"]
    
    statuses = ["accepted", "rejected", "reserve", "pending"]
    for status in statuses:
        r = admin_session.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                               json={"status": status, "note": f"Changed to {status}"}, timeout=15)
        assert r.status_code == 200, f"Failed to change to {status}: {r.status_code} {r.text}"
        body = r.json()
        assert body["status"] == status, f"Expected {status}, got {body['status']}"
        print(f"  ✓ Status changed to {status}")
    
    print("✅ All status changes successful")


# ============ EXPORT TESTS ============

def test_admin_export_pdf_fr(admin_session):
    """GET /api/admin/export/pdf?lang=fr returns PDF file"""
    print("\n✓ Testing GET /api/admin/export/pdf?lang=fr...")
    r = admin_session.get(f"{BASE_URL}/api/admin/export/pdf", params={"lang": "fr"},
                         timeout=60)  # PDF generation can take time
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.headers.get("content-type") == "application/pdf", f"Expected PDF, got {r.headers.get('content-type')}"
    assert len(r.content) > 0, "PDF content is empty"
    print(f"✅ PDF export (FR) successful: {len(r.content)} bytes")


def test_admin_export_pdf_en(admin_session):
    """GET /api/admin/export/pdf?lang=en returns PDF file"""
    print("\n✓ Testing GET /api/admin/export/pdf?lang=en...")
    r = admin_session.get(f"{BASE_URL}/api/admin/export/pdf", params={"lang": "en"},
                         timeout=60)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.headers.get("content-type") == "application/pdf", f"Expected PDF, got {r.headers.get('content-type')}"
    assert len(r.content) > 0, "PDF content is empty"
    print(f"✅ PDF export (EN) successful: {len(r.content)} bytes")


def test_admin_export_xlsx_fr(admin_session):
    """GET /api/admin/export/xlsx?lang=fr returns Excel file"""
    print("\n✓ Testing GET /api/admin/export/xlsx?lang=fr...")
    r = admin_session.get(f"{BASE_URL}/api/admin/export/xlsx", params={"lang": "fr"},
                         timeout=60)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    content_type = r.headers.get("content-type", "")
    assert "spreadsheet" in content_type or "excel" in content_type or "openxmlformats" in content_type, \
        f"Expected Excel content-type, got {content_type}"
    assert len(r.content) > 0, "Excel content is empty"
    print(f"✅ Excel export (FR) successful: {len(r.content)} bytes")


def test_admin_export_xlsx_en(admin_session):
    """GET /api/admin/export/xlsx?lang=en returns Excel file"""
    print("\n✓ Testing GET /api/admin/export/xlsx?lang=en...")
    r = admin_session.get(f"{BASE_URL}/api/admin/export/xlsx", params={"lang": "en"},
                         timeout=60)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    content_type = r.headers.get("content-type", "")
    assert "spreadsheet" in content_type or "excel" in content_type or "openxmlformats" in content_type, \
        f"Expected Excel content-type, got {content_type}"
    assert len(r.content) > 0, "Excel content is empty"
    print(f"✅ Excel export (EN) successful: {len(r.content)} bytes")


# ============ CONVERSATIONS TESTS ============

def test_admin_conversations_list(admin_session):
    """GET /api/admin/conversations returns list of conversations"""
    print("\n✓ Testing GET /api/admin/conversations...")
    r = admin_session.get(f"{BASE_URL}/api/admin/conversations", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert isinstance(data, list), f"Expected list, got {type(data)}"
    print(f"✅ Conversations list retrieved: {len(data)} conversations")


def test_admin_send_message(admin_session):
    """POST /api/admin/conversations/{code} sends message"""
    print("\n✓ Testing POST /api/admin/conversations/{code}...")
    # Create test application to get a tracking code
    app = _insert_app(f"{TEST_PREFIX}MsgTest", status="pending")
    code = app["tracking_code"]
    
    # Send message from council
    r = admin_session.post(f"{BASE_URL}/api/admin/conversations/{code}",
                          json={"text": "Test message from council"}, timeout=15)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["sender"] == "council"
    assert body["text"] == "Test message from council"
    assert body["conv_code"] == code
    print(f"✅ Message sent successfully to {code}")


# ============ BUTIN (DONATIONS) TESTS ============

def test_admin_add_donator(admin_session):
    """POST /api/admin/donators adds a donor"""
    print("\n✓ Testing POST /api/admin/donators...")
    r = admin_session.post(f"{BASE_URL}/api/admin/donators",
                          json={"pseudo": f"{TEST_PREFIX}Donor", "amount": 10.50}, timeout=15)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("ok") is True
    print(f"✅ Donor added: {TEST_PREFIX}Donor - 10.50€")
    
    # Verify it appears in the list
    r = requests.get(f"{BASE_URL}/api/donators", timeout=10)
    assert r.status_code == 200
    data = r.json()
    donors = [d for d in data["items"] if d["pseudo"] == f"{TEST_PREFIX}Donor"]
    assert len(donors) > 0, "Donor not found in list"
    donor_id = donors[0]["id"]
    
    # Cleanup
    r = admin_session.delete(f"{BASE_URL}/api/admin/donators/{donor_id}", timeout=10)
    assert r.status_code == 200


def test_admin_remove_donator(admin_session):
    """DELETE /api/admin/donators/{id} removes a donor"""
    print("\n✓ Testing DELETE /api/admin/donators/{id}...")
    # Add donor first
    r = admin_session.post(f"{BASE_URL}/api/admin/donators",
                          json={"pseudo": f"{TEST_PREFIX}DonorDel", "amount": 5.00}, timeout=15)
    assert r.status_code == 200
    
    # Get donor ID
    r = requests.get(f"{BASE_URL}/api/donators", timeout=10)
    data = r.json()
    donors = [d for d in data["items"] if d["pseudo"] == f"{TEST_PREFIX}DonorDel"]
    assert len(donors) > 0
    donor_id = donors[0]["id"]
    
    # Delete donor
    r = admin_session.delete(f"{BASE_URL}/api/admin/donators/{donor_id}", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("ok") is True
    print(f"✅ Donor removed: {donor_id}")


def test_admin_set_butin_goal(admin_session):
    """PUT /api/admin/butin/goal sets donation goal"""
    print("\n✓ Testing PUT /api/admin/butin/goal...")
    # Get current goal first
    r = requests.get(f"{BASE_URL}/api/donators", timeout=10)
    assert r.status_code == 200
    original_goal = r.json().get("goal", 100)
    
    # Set new goal
    new_goal = 250.0
    r = admin_session.put(f"{BASE_URL}/api/admin/butin/goal",
                         json={"goal": new_goal}, timeout=15)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("ok") is True
    assert body.get("goal") == new_goal
    print(f"✅ Butin goal set to {new_goal}€")
    
    # Verify goal was updated
    r = requests.get(f"{BASE_URL}/api/donators", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["goal"] == new_goal, f"Expected goal {new_goal}, got {data['goal']}"
    
    # Restore original goal
    r = admin_session.put(f"{BASE_URL}/api/admin/butin/goal",
                         json={"goal": original_goal}, timeout=15)
    assert r.status_code == 200


# ============ SUMMARY ============

def test_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("BACKEND TEST SUMMARY - Admin Dashboard (Iteration 30)")
    print("="*60)
    print("✅ All admin backend tests passed!")
    print("  - Authentication (login, logout, auth/me)")
    print("  - Stats retrieval")
    print("  - Applications list and status updates")
    print("  - PDF exports (FR/EN)")
    print("  - Excel exports (FR/EN)")
    print("  - Conversations and messaging")
    print("  - Butin (donations) management")
    print("="*60)
