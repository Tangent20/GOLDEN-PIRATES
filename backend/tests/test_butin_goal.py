"""Tests de l'objectif de butin : PUT /api/admin/butin/goal + GET /api/donators."""
import os
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

MONGO = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(autouse=True)
def cleanup_goal():
    """Remet l'objectif par défaut (suppression du réglage) après chaque test."""
    yield
    MONGO.site_settings.delete_one({"_id": "butin"})


def test_goal_default_100():
    MONGO.site_settings.delete_one({"_id": "butin"})
    r = requests.get(f"{BASE_URL}/api/donators")
    assert r.status_code == 200
    assert r.json()["goal"] == 100.0


def test_goal_set_and_visible_public(admin_session):
    r = admin_session.put(f"{BASE_URL}/api/admin/butin/goal", json={"goal": 150})
    assert r.status_code == 200 and r.json()["goal"] == 150.0
    pub = requests.get(f"{BASE_URL}/api/donators").json()
    assert pub["goal"] == 150.0
    doc = MONGO.site_settings.find_one({"_id": "butin"})
    assert doc and doc["goal"] == 150.0


def test_goal_requires_auth():
    r = requests.put(f"{BASE_URL}/api/admin/butin/goal", json={"goal": 150})
    assert r.status_code == 401


@pytest.mark.parametrize("bad", [0, -3, "abc", 100001])
def test_goal_invalid_rejected_cleanly(admin_session, bad):
    r = admin_session.put(f"{BASE_URL}/api/admin/butin/goal", json={"goal": bad})
    assert r.status_code == 422, r.text


def test_goal_max_boundary_ok(admin_session):
    r = admin_session.put(f"{BASE_URL}/api/admin/butin/goal", json={"goal": 100000})
    assert r.status_code == 200 and r.json()["goal"] == 100000.0
