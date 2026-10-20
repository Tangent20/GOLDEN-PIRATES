#!/usr/bin/env python3
"""
GOLDEN PIRATES — Backend API Test Suite (Iteration 57)
Verifies P0 fixes: /api/auth/me always returns 200, frontend auth check reads r.data.authed
"""
import requests
import sys
from datetime import datetime

BASE_URL = "https://golden-pirates.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@goldenpirates.io"
ADMIN_PASSWORD = "Capitaine1023!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class APITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log(self, msg, color=Colors.RESET):
        print(f"{color}{msg}{Colors.RESET}")

    def test(self, name, method, endpoint, expected_status=None, data=None, check_fn=None, cookies=None):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        self.tests_run += 1
        self.log(f"\n🔍 Test #{self.tests_run}: {name}", Colors.BLUE)
        
        try:
            if method == 'GET':
                response = self.session.get(url, cookies=cookies)
            elif method == 'POST':
                response = self.session.post(url, json=data, cookies=cookies)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, cookies=cookies)
            elif method == 'DELETE':
                response = self.session.delete(url, cookies=cookies)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Check status code if expected
            if expected_status is not None:
                if response.status_code != expected_status:
                    self.log(f"❌ FAILED - Expected status {expected_status}, got {response.status_code}", Colors.RED)
                    self.log(f"   Response: {response.text[:200]}", Colors.RED)
                    return False, None

            # Run custom check function
            if check_fn:
                try:
                    result = check_fn(response)
                    if not result:
                        self.log(f"❌ FAILED - Custom check failed", Colors.RED)
                        return False, None
                except Exception as e:
                    self.log(f"❌ FAILED - Check function error: {str(e)}", Colors.RED)
                    return False, None

            self.tests_passed += 1
            self.log(f"✅ PASSED - Status: {response.status_code}", Colors.GREEN)
            return True, response

        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}", Colors.RED)
            return False, None

    def print_summary(self):
        self.log(f"\n{'='*60}", Colors.BLUE)
        self.log(f"📊 TEST SUMMARY", Colors.BLUE)
        self.log(f"{'='*60}", Colors.BLUE)
        self.log(f"Total tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}", Colors.GREEN)
        self.log(f"Failed: {self.tests_run - self.tests_passed}", Colors.RED if self.tests_run > self.tests_passed else Colors.GREEN)
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%", Colors.GREEN if success_rate == 100 else Colors.YELLOW)
        self.log(f"{'='*60}\n", Colors.BLUE)


def main():
    tester = APITester()
    tester.log("="*60, Colors.BLUE)
    tester.log("🏴‍☠️ GOLDEN PIRATES — Backend API Test Suite", Colors.BLUE)
    tester.log("="*60, Colors.BLUE)
    tester.log(f"Base URL: {BASE_URL}", Colors.BLUE)
    tester.log(f"Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", Colors.BLUE)
    tester.log("="*60 + "\n", Colors.BLUE)

    # ========================================
    # P0 FIX #1: /api/auth/me ALWAYS returns 200
    # ========================================
    tester.log("\n" + "="*60, Colors.YELLOW)
    tester.log("P0 FIX #1: /api/auth/me endpoint behavior", Colors.YELLOW)
    tester.log("="*60, Colors.YELLOW)

    # Test 1: /auth/me without cookie should return 200 with {authed: false}
    def check_unauthed(resp):
        if resp.status_code != 200:
            tester.log(f"   Expected status 200, got {resp.status_code}", Colors.RED)
            return False
        data = resp.json()
        if data.get('authed') is not False:
            tester.log(f"   Expected authed=false, got {data}", Colors.RED)
            return False
        tester.log(f"   ✓ Response: {data}", Colors.GREEN)
        return True

    tester.test(
        "/auth/me without cookie → 200 + {authed: false}",
        "GET",
        "auth/me",
        check_fn=check_unauthed
    )

    # Test 2: Login as admin
    def check_login(resp):
        if resp.status_code != 200:
            tester.log(f"   Expected status 200, got {resp.status_code}", Colors.RED)
            return False
        data = resp.json()
        if not data.get('email') or not data.get('role'):
            tester.log(f"   Expected email and role in response, got {data}", Colors.RED)
            return False
        tester.log(f"   ✓ Logged in as: {data.get('email')}", Colors.GREEN)
        return True

    success, login_resp = tester.test(
        "Admin login",
        "POST",
        "admin/login",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        check_fn=check_login
    )

    if not success:
        tester.log("\n❌ Cannot proceed without admin login", Colors.RED)
        tester.print_summary()
        return 1

    # Extract cookies from login response
    admin_cookies = login_resp.cookies

    # Test 3: /auth/me with valid cookie should return 200 with {authed: true, email, role}
    def check_authed(resp):
        if resp.status_code != 200:
            tester.log(f"   Expected status 200, got {resp.status_code}", Colors.RED)
            return False
        data = resp.json()
        if data.get('authed') is not True:
            tester.log(f"   Expected authed=true, got {data}", Colors.RED)
            return False
        if not data.get('email') or not data.get('role'):
            tester.log(f"   Expected email and role, got {data}", Colors.RED)
            return False
        tester.log(f"   ✓ Response: {data}", Colors.GREEN)
        return True

    tester.test(
        "/auth/me with valid cookie → 200 + {authed: true, email, role}",
        "GET",
        "auth/me",
        cookies=admin_cookies,
        check_fn=check_authed
    )

    # Test 4: /auth/me with invalid cookie should return 200 with {authed: false}
    invalid_cookies = {'access_token': 'invalid_token_12345'}
    tester.test(
        "/auth/me with invalid cookie → 200 + {authed: false}",
        "GET",
        "auth/me",
        cookies=invalid_cookies,
        check_fn=check_unauthed
    )

    # ========================================
    # P2: REGRESSION CHECK - Core endpoints
    # ========================================
    tester.log("\n" + "="*60, Colors.YELLOW)
    tester.log("P2: REGRESSION CHECK - Core endpoints", Colors.YELLOW)
    tester.log("="*60, Colors.YELLOW)

    # Test 5: GET /admin/applications
    def check_apps(resp):
        if resp.status_code != 200:
            return False
        data = resp.json()
        if not isinstance(data, list):
            tester.log(f"   Expected list, got {type(data)}", Colors.RED)
            return False
        tester.log(f"   ✓ Found {len(data)} applications", Colors.GREEN)
        return True

    tester.test(
        "GET /admin/applications",
        "GET",
        "admin/applications",
        cookies=admin_cookies,
        check_fn=check_apps
    )

    # Test 6: GET /admin/stats
    def check_stats(resp):
        if resp.status_code != 200:
            return False
        data = resp.json()
        required_keys = ['total', 'pending', 'accepted', 'reserve', 'rejected', 'donations_pending']
        for key in required_keys:
            if key not in data:
                tester.log(f"   Missing key: {key}", Colors.RED)
                return False
        tester.log(f"   ✓ Stats: total={data['total']}, pending={data['pending']}, accepted={data['accepted']}", Colors.GREEN)
        return True

    tester.test(
        "GET /admin/stats",
        "GET",
        "admin/stats",
        cookies=admin_cookies,
        check_fn=check_stats
    )

    # Test 7: GET /admin/donators
    def check_donators(resp):
        if resp.status_code != 200:
            return False
        data = resp.json()
        if 'items' not in data or 'total' not in data:
            tester.log(f"   Missing required keys in response", Colors.RED)
            return False
        tester.log(f"   ✓ Found {len(data['items'])} donations, total: {data['total']} EUR", Colors.GREEN)
        return True

    tester.test(
        "GET /admin/donators",
        "GET",
        "admin/donators",
        cookies=admin_cookies,
        check_fn=check_donators
    )

    # Test 8: GET /donators (public endpoint)
    def check_public_donators(resp):
        if resp.status_code != 200:
            return False
        data = resp.json()
        required_keys = ['total', 'goal', 'count', 'configured', 'items']
        for key in required_keys:
            if key not in data:
                tester.log(f"   Missing key: {key}", Colors.RED)
                return False
        tester.log(f"   ✓ Public donations: {data['count']} items, total: {data['total']} EUR, goal: {data['goal']} EUR", Colors.GREEN)
        return True

    tester.test(
        "GET /donators (public)",
        "GET",
        "donators",
        check_fn=check_public_donators
    )

    # Test 9: Check pseudo availability
    def check_pseudo(resp):
        if resp.status_code != 200:
            return False
        data = resp.json()
        if 'state' not in data:
            tester.log(f"   Missing 'state' in response", Colors.RED)
            return False
        tester.log(f"   ✓ Pseudo check state: {data['state']}", Colors.GREEN)
        return True

    tester.test(
        "GET /applications/check-pseudo",
        "GET",
        "applications/check-pseudo?pseudo=TestPseudo123",
        check_fn=check_pseudo
    )

    # Test 10: Logout
    def check_logout(resp):
        if resp.status_code != 200:
            return False
        data = resp.json()
        if not data.get('ok'):
            tester.log(f"   Expected ok=true, got {data}", Colors.RED)
            return False
        tester.log(f"   ✓ Logged out successfully", Colors.GREEN)
        return True

    tester.test(
        "POST /auth/logout",
        "POST",
        "auth/logout",
        cookies=admin_cookies,
        check_fn=check_logout
    )

    # Test 11: Verify /auth/me after logout returns {authed: false}
    tester.test(
        "/auth/me after logout → 200 + {authed: false}",
        "GET",
        "auth/me",
        cookies=admin_cookies,
        check_fn=check_unauthed
    )

    # Print summary
    tester.print_summary()
    
    return 0 if tester.tests_passed == tester.tests_run else 1


if __name__ == "__main__":
    sys.exit(main())
