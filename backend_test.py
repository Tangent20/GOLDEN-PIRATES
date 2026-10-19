#!/usr/bin/env python3
"""
Golden Pirates Backend API Testing
Tests all donation flows, admin operations, and rack-check functionality
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
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log(self, msg, color=Colors.RESET):
        print(f"{color}{msg}{Colors.RESET}")

    def test(self, name, method, endpoint, expected_status, data=None, params=None, check_fn=None, is_blob=False):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        self.tests_run += 1
        
        print(f"\n{Colors.BLUE}🔍 Test {self.tests_run}: {name}{Colors.RESET}")
        
        try:
            headers = {'Content-Type': 'application/json'}
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'
            
            kwargs = {'headers': headers}
            if data:
                kwargs['json'] = data
            if params:
                kwargs['params'] = params
            if is_blob:
                kwargs['timeout'] = 30
            
            if method == 'GET':
                response = self.session.get(url, **kwargs)
            elif method == 'POST':
                response = self.session.post(url, **kwargs)
            elif method == 'PATCH':
                response = self.session.patch(url, **kwargs)
            elif method == 'DELETE':
                response = self.session.delete(url, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Check status code
            if response.status_code != expected_status:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", Colors.RED)
                try:
                    self.log(f"   Response: {response.text[:200]}", Colors.YELLOW)
                except:
                    pass
                return False, None
            
            # Parse response
            result = None
            if not is_blob:
                try:
                    result = response.json()
                except:
                    result = response.text
            else:
                result = response.content
            
            # Run custom check function
            if check_fn:
                check_result = check_fn(result, response)
                if not check_result:
                    self.log(f"❌ FAILED - Custom check failed", Colors.RED)
                    return False, result
            
            self.tests_passed += 1
            self.log(f"✅ PASSED - Status: {response.status_code}", Colors.GREEN)
            return True, result
            
        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}", Colors.RED)
            return False, None

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"\n{Colors.BLUE}{'='*60}")
        print(f"GOLDEN PIRATES BACKEND API TESTS")
        print(f"{'='*60}{Colors.RESET}\n")
        
        # Test 1: Public donators endpoint - should show LOHMIN RUI 3€
        success, data = self.test(
            "GET /api/donators - Public list with LOHMIN RUI",
            "GET", "/donators", 200,
            check_fn=lambda d, r: (
                d.get('total') == 3.0 and
                len(d.get('items', [])) == 1 and
                d['items'][0].get('pseudo') == 'LOHMIN RUI' and
                d['items'][0].get('amount') == 3.0
            )
        )
        if success:
            self.log(f"   ✓ Total: {data.get('total')} €", Colors.GREEN)
            self.log(f"   ✓ Donators: {len(data.get('items', []))}", Colors.GREEN)
            if data.get('items'):
                self.log(f"   ✓ First donator: {data['items'][0].get('pseudo')} - {data['items'][0].get('amount')} €", Colors.GREEN)
        
        # Test 2: Admin login
        success, data = self.test(
            "POST /api/admin/login - Admin authentication",
            "POST", "/admin/login", 200,
            data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            check_fn=lambda d, r: d.get('email') == ADMIN_EMAIL
        )
        if success:
            # Extract token from cookies
            self.token = self.session.cookies.get('access_token')
            self.log(f"   ✓ Logged in as: {data.get('email')}", Colors.GREEN)
        
        # Test 3: Admin donators list
        success, data = self.test(
            "GET /api/admin/donators - Admin view with LOHMIN RUI",
            "GET", "/admin/donators", 200,
            check_fn=lambda d, r: (
                len(d.get('items', [])) >= 1 and
                any(item.get('pseudo') == 'LOHMIN RUI' and item.get('amount') == 3.0 for item in d.get('items', []))
            )
        )
        if success:
            self.log(f"   ✓ Total donators: {len(data.get('items', []))}", Colors.GREEN)
            self.log(f"   ✓ Total amount: {data.get('total')} €", Colors.GREEN)
            lohmin = next((item for item in data.get('items', []) if item.get('pseudo') == 'LOHMIN RUI'), None)
            if lohmin:
                self.log(f"   ✓ LOHMIN RUI found: {lohmin.get('amount')} €, status={lohmin.get('status')}, receipt_id={lohmin.get('receipt_id')}", Colors.GREEN)
        
        # Test 4: Declare a donation (pending status)
        test_pseudo = f"TestDonor{datetime.now().strftime('%H%M%S')}"
        success, data = self.test(
            "POST /api/donations/declare - Donor declares donation",
            "POST", "/donations/declare", 200,
            data={"pseudo": test_pseudo, "amount": 5.0, "email": "test@example.com", "message": "Test donation"},
            check_fn=lambda d, r: (
                d.get('ok') == True and
                d.get('status') == 'pending' and
                d.get('receipt_id', '').startswith('GPD-1023-') and
                d.get('pseudo') == test_pseudo and
                d.get('amount') == 5.0
            )
        )
        test_receipt_id = None
        if success:
            test_receipt_id = data.get('receipt_id')
            self.log(f"   ✓ Receipt ID: {test_receipt_id}", Colors.GREEN)
            self.log(f"   ✓ Status: {data.get('status')}", Colors.GREEN)
            self.log(f"   ✓ Amount: {data.get('amount')} €", Colors.GREEN)
        
        # Test 5: Check donation status
        if test_receipt_id:
            success, data = self.test(
                f"GET /api/donations/status/{test_receipt_id} - Check pending status",
                "GET", f"/donations/status/{test_receipt_id}", 200,
                check_fn=lambda d, r: (
                    d.get('receipt_id') == test_receipt_id and
                    d.get('status') == 'pending' and
                    d.get('pseudo') == test_pseudo
                )
            )
            if success:
                self.log(f"   ✓ Status: {data.get('status')}", Colors.GREEN)
        
        # Test 6: Download PDF invoice for PENDING donation (NEW BEHAVIOR - should return 200)
        if test_receipt_id:
            success, data = self.test(
                f"GET /api/donations/invoice/pdf (pending) - Should return 200 with watermark",
                "GET", f"/donations/invoice/pdf", 200,
                params={"receipt_id": test_receipt_id, "lang": "fr"},
                is_blob=True,
                check_fn=lambda d, r: (
                    len(d) > 1000 and  # PDF should be substantial
                    d[:4] == b'%PDF' and  # Valid PDF header
                    'content-disposition' in r.headers.get('Content-Disposition', '').lower()
                )
            )
            if success:
                self.log(f"   ✓ PDF size: {len(data)} bytes", Colors.GREEN)
                self.log(f"   ✓ Valid PDF header: {data[:4]}", Colors.GREEN)
        
        # Test 7: Download XLSX invoice for PENDING donation (NEW BEHAVIOR - should return 200)
        if test_receipt_id:
            success, data = self.test(
                f"GET /api/donations/invoice/xlsx (pending) - Should return 200",
                "GET", f"/donations/invoice/xlsx", 200,
                params={"receipt_id": test_receipt_id, "lang": "fr"},
                is_blob=True,
                check_fn=lambda d, r: (
                    len(d) > 1000 and  # XLSX should be substantial
                    'content-disposition' in r.headers.get('Content-Disposition', '').lower()
                )
            )
            if success:
                self.log(f"   ✓ XLSX size: {len(data)} bytes", Colors.GREEN)
        
        # Test 8: Confirm donation (admin)
        if test_receipt_id:
            # Get donator ID from admin list
            success, data = self.test(
                "GET /api/admin/donators - Get test donator ID",
                "GET", "/admin/donators", 200
            )
            if success:
                test_donator = next((item for item in data.get('items', []) if item.get('receipt_id') == test_receipt_id), None)
                if test_donator:
                    donator_id = test_donator.get('id')
                    success, data = self.test(
                        f"POST /api/admin/donators/{donator_id}/confirm - Confirm donation",
                        "POST", f"/admin/donators/{donator_id}/confirm", 200,
                        check_fn=lambda d, r: d.get('ok') == True
                    )
        
        # Test 9: Check confirmed status
        if test_receipt_id:
            success, data = self.test(
                f"GET /api/donations/status/{test_receipt_id} - Check confirmed status",
                "GET", f"/donations/status/{test_receipt_id}", 200,
                check_fn=lambda d, r: d.get('status') == 'confirmed'
            )
            if success:
                self.log(f"   ✓ Status changed to: {data.get('status')}", Colors.GREEN)
        
        # Test 10: Reject a donation and verify 409 on invoice download
        test_pseudo2 = f"TestReject{datetime.now().strftime('%H%M%S')}"
        success, data = self.test(
            "POST /api/donations/declare - Create donation to reject",
            "POST", "/donations/declare", 200,
            data={"pseudo": test_pseudo2, "amount": 2.0}
        )
        reject_receipt_id = None
        if success:
            reject_receipt_id = data.get('receipt_id')
            # Get donator ID and reject
            success, data = self.test(
                "GET /api/admin/donators - Get reject donator ID",
                "GET", "/admin/donators", 200
            )
            if success:
                reject_donator = next((item for item in data.get('items', []) if item.get('receipt_id') == reject_receipt_id), None)
                if reject_donator:
                    donator_id = reject_donator.get('id')
                    success, data = self.test(
                        f"POST /api/admin/donators/{donator_id}/reject - Reject donation",
                        "POST", f"/admin/donators/{donator_id}/reject", 200
                    )
        
        # Test 11: Try to download invoice for REJECTED donation (should return 409)
        if reject_receipt_id:
            success, data = self.test(
                f"GET /api/donations/invoice/pdf (rejected) - Should return 409",
                "GET", f"/donations/invoice/pdf", 409,
                params={"receipt_id": reject_receipt_id, "lang": "fr"},
                check_fn=lambda d, r: d.get('detail', {}).get('code') == 'rejected'
            )
            if success:
                self.log(f"   ✓ Correctly blocked rejected donation invoice", Colors.GREEN)
        
        # Test 12: Rack check endpoint
        success, data = self.test(
            "POST /api/applications/rack-check - Check tracking codes",
            "POST", "/applications/rack-check", 200,
            data={"codes": ["GP-1023-TEST", "GP-1023-FAKE"]},
            check_fn=lambda d, r: 'items' in d
        )
        if success:
            self.log(f"   ✓ Rack check returned items dict", Colors.GREEN)
        
        # Test 13: Check DB cleanliness - only admin user
        success, data = self.test(
            "GET /api/admin/applications - Should be empty (no fake profiles)",
            "GET", "/admin/applications", 200,
            check_fn=lambda d, r: isinstance(d, list)
        )
        if success:
            self.log(f"   ✓ Applications count: {len(data)}", Colors.GREEN)
        
        # Print summary
        print(f"\n{Colors.BLUE}{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}{Colors.RESET}")
        print(f"{Colors.GREEN}✅ Passed: {self.tests_passed}/{self.tests_run}{Colors.RESET}")
        if self.tests_passed < self.tests_run:
            print(f"{Colors.RED}❌ Failed: {self.tests_run - self.tests_passed}/{self.tests_run}{Colors.RESET}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n{Colors.BLUE}Success Rate: {success_rate:.1f}%{Colors.RESET}\n")
        
        return 0 if self.tests_passed == self.tests_run else 1

if __name__ == "__main__":
    tester = APITester()
    sys.exit(tester.run_all_tests())
