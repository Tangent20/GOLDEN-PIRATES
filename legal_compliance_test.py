#!/usr/bin/env python3
import os
"""
Golden Pirates — Legal Compliance Testing
Tests GDPR retention, cron security, and admin export functionality
"""
import requests
import sys

BASE_URL = os.environ["VITE_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

class LegalComplianceTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.session = requests.Session()

    def test(self, name, method, endpoint, expected_status, **kwargs):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        headers = kwargs.pop('headers', {})
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, **kwargs)
            elif method == 'POST':
                response = self.session.post(url, headers=headers, **kwargs)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ PASS - Status: {response.status_code}")
            else:
                print(f"   ❌ FAIL - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:300]}")
            
            return success, response
        except Exception as e:
            print(f"   ❌ FAIL - Error: {str(e)}")
            return False, None

    def login_admin(self):
        """Login as admin"""
        print("\n" + "="*60)
        print("ADMIN AUTHENTICATION")
        print("="*60)
        success, response = self.test(
            "Admin login",
            "POST",
            "/admin/login",
            200,
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if success and response:
            self.token = self.session.cookies.get('access_token')
            if self.token:
                print(f"   🔑 Token obtained")
                return True
        return False

    def test_cron_security(self):
        """Test /api/cron/keep-alive requires auth"""
        print("\n" + "="*60)
        print("CRON ENDPOINT SECURITY (GDPR Retention)")
        print("="*60)
        
        # Should return 401 without proper auth header
        self.test(
            "Keep-alive without auth header",
            "POST",
            "/cron/keep-alive",
            401,
            headers={}
        )
        
        # Should return 401 with wrong secret
        self.test(
            "Keep-alive with wrong secret",
            "POST",
            "/cron/keep-alive",
            401,
            headers={"Authorization": "Bearer wrong-secret"}
        )

    def test_admin_export(self):
        """Test admin PDF export still works"""
        print("\n" + "="*60)
        print("ADMIN EXPORT FUNCTIONALITY")
        print("="*60)
        
        if not self.token:
            print("   ⚠️  Skipping - no admin token")
            return
        
        success, response = self.test(
            "Admin PDF export",
            "GET",
            "/admin/export/pdf",
            200,
            timeout=30
        )
        
        if success and response:
            content_type = response.headers.get('content-type', '')
            if 'pdf' in content_type.lower():
                print(f"   ✅ PDF content-type correct: {content_type}")
            else:
                print(f"   ⚠️  Unexpected content-type: {content_type}")

    def test_public_endpoints(self):
        """Test public endpoints still work"""
        print("\n" + "="*60)
        print("PUBLIC ENDPOINTS")
        print("="*60)
        
        self.test(
            "API root",
            "GET",
            "/",
            200
        )
        
        self.test(
            "Donators list (public)",
            "GET",
            "/donators",
            200
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        
        if self.tests_passed == self.tests_run:
            print("\n✅ ALL TESTS PASSED")
            return 0
        else:
            print(f"\n❌ {self.tests_run - self.tests_passed} TEST(S) FAILED")
            return 1

def main():
    print("="*60)
    print("GOLDEN PIRATES — Legal Compliance Testing")
    print("GDPR Retention, Cron Security, Admin Export")
    print("="*60)
    
    tester = LegalComplianceTester()
    
    # Test cron endpoint security
    tester.test_cron_security()
    
    # Test public endpoints
    tester.test_public_endpoints()
    
    # Login and test admin functionality
    if tester.login_admin():
        tester.test_admin_export()
    else:
        print("\n⚠️  Admin login failed - skipping admin tests")
    
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())
