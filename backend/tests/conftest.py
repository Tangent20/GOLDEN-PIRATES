"""Garde-fou : les tests d'intégration ne doivent jamais viser une prévisualisation ou production."""
import os
from urllib.parse import urlparse

import pytest


def pytest_sessionstart(session):
    if os.getenv("GOLDEN_PIRATES_TEST_MODE") != "1":
        raise pytest.UsageError(
            "Tests d'intégration bloqués. Utilisez GOLDEN_PIRATES_TEST_MODE=1 avec une API et une base locales isolées."
        )

    base_url = os.getenv("VITE_BACKEND_URL", "")
    parsed = urlparse(base_url)
    if parsed.hostname not in {"localhost", "127.0.0.1"}:
        raise pytest.UsageError("VITE_BACKEND_URL doit cibler localhost ou 127.0.0.1 pendant les tests.")

    db_name = os.getenv("DB_NAME", "")
    if not db_name.startswith("golden_pirates_test_"):
        raise pytest.UsageError("DB_NAME doit commencer par golden_pirates_test_ pendant les tests.")
