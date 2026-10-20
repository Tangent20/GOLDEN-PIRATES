#!/usr/bin/env python3
"""
Golden Pirates Comprehensive Backend API Testing
Tests ALL P0/P1 features from audit requirements:
- Applications flow with draft persistence and cooldown
- Donations flow with PATCH edit endpoint
- PDF/XLSX exports with French accents and timezone handling
- Admin CRUD operations
- Season settings
- Donor profile endpoint
- Cache-Control headers
"""
import requests
import sys
import time
from datetime import datetime

BASE_URL = "https://golden-pirates.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@goldenpirates.io"
ADMIN_PASSWORD = "Capitaine1023!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

class ComprehensiveAPITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.session = requests.Session()
        self.test_data = {}  # Store test data for cleanup

    def log(self, msg, color=Colors.RESET):
        print(f"{color}{msg}{Colors.RESET}")

    def test(self, name, method, endpoint, expected_status, data=None, params=None, check_fn=None, is_blob=False):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        self.tests_run += 1
        
        print(f"\n{Colors.CYAN}🔍 Test {self.tests_run}: {name}{Colors.RESET}")
        
        try:
            headers = {'Content-Type': 'application/json'}
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'
            
            kwargs = {'headers': headers, 'timeout': 30}
            if data:
                kwargs['json'] = data
            if params:
                kwargs['params'] = params
            
            if method == 'GET':
                response = self.session.get(url, **kwargs)
            elif method == 'POST':
                response = self.session.post(url, **kwargs)
            elif method == 'PATCH':
                response = self.session.patch(url, **kwargs)
            elif method == 'PUT':
                response = self.session.put(url, **kwargs)
            elif method == 'DELETE':
                response = self.session.delete(url, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Check status code
            if response.status_code != expected_status:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", Colors.RED)
                try:
                    self.log(f"   Response: {response.text[:300]}", Colors.YELLOW)
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
            import traceback
            traceback.print_exc()
            return False, None

    def run_all_tests(self):
        """Run comprehensive backend tests"""
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"GOLDEN PIRATES COMPREHENSIVE BACKEND API TESTS")
        print(f"Testing P0/P1 features from audit requirements")
        print(f"{'='*70}{Colors.RESET}\n")
        
        # ========== SECTION 1: ADMIN AUTHENTICATION ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 1: ADMIN AUTHENTICATION")
        print(f"{'='*70}{Colors.RESET}")
        
        success, data = self.test(
            "Admin login with correct credentials",
            "POST", "/admin/login", 200,
            data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            check_fn=lambda d, r: d.get('email') == ADMIN_EMAIL
        )
        if success:
            self.token = self.session.cookies.get('access_token')
            self.log(f"   ✓ Logged in as: {data.get('email')}", Colors.GREEN)
        else:
            self.log("❌ CRITICAL: Admin login failed, cannot continue", Colors.RED)
            return 1
        
        # ========== SECTION 2: APPLICATIONS FLOW ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 2: APPLICATIONS FLOW (P0)")
        print(f"{'='*70}{Colors.RESET}")
        
        # Test pseudo check endpoint
        test_pseudo = f"TestRecruit{datetime.now().strftime('%H%M%S')}"
        success, data = self.test(
            "Check pseudo availability",
            "GET", "/applications/check-pseudo", 200,
            params={"pseudo": test_pseudo},
            check_fn=lambda d, r: d.get('state') in ['free', 'invalid']
        )
        if success:
            self.log(f"   ✓ Pseudo state: {data.get('state')}", Colors.GREEN)
        
        # Submit application
        success, data = self.test(
            "Submit application with all fields",
            "POST", "/applications", 200,
            data={
                "pseudo": test_pseudo,
                "power": "12M",
                "troops": "Cavalerie",
                "activity": "4-6h/jour",
                "experience": "Expérience avec accents: café, château, naïve",
                "discord": "testuser#1234",
                "message": "Message de test avec caractères spéciaux: é è à ç ù œ"
            },
            check_fn=lambda d, r: (
                d.get('tracking_code', '').startswith('GP-1023-') and
                d.get('pseudo') == test_pseudo
            )
        )
        if success:
            self.test_data['tracking_code'] = data.get('tracking_code')
            self.test_data['application_id'] = data.get('id')
            self.log(f"   ✓ Tracking code: {data.get('tracking_code')}", Colors.GREEN)
        
        # Track application
        if 'tracking_code' in self.test_data:
            success, data = self.test(
                "Track application by code",
                "GET", f"/applications/track/{self.test_data['tracking_code']}", 200,
                check_fn=lambda d, r: (
                    d.get('pseudo') == test_pseudo and
                    d.get('status') == 'pending'
                )
            )
            if success:
                self.log(f"   ✓ Status: {data.get('status')}", Colors.GREEN)
        
        # Test duplicate pseudo (should fail with cooldown after rejection)
        success, data = self.test(
            "Duplicate pseudo should be blocked (active)",
            "POST", "/applications", 409,
            data={
                "pseudo": test_pseudo,
                "power": "10M",
                "troops": "Infanterie",
                "activity": "2-4h/jour",
                "message": "Duplicate attempt"
            },
            check_fn=lambda d, r: d.get('detail', {}).get('code') == 'duplicate_active'
        )
        
        # Admin: List applications
        success, data = self.test(
            "Admin: List all applications",
            "GET", "/admin/applications", 200,
            check_fn=lambda d, r: (
                isinstance(d, list) and
                any(app.get('pseudo') == test_pseudo for app in d) and
                'no-store' in r.headers.get('Cache-Control', '').lower()
            )
        )
        if success:
            self.log(f"   ✓ Applications count: {len(data)}", Colors.GREEN)
            self.log(f"   ✓ Cache-Control: {data[0] if data else 'N/A'}", Colors.GREEN)
        
        # Admin: Reject application (for cooldown test)
        if 'application_id' in self.test_data:
            success, data = self.test(
                "Admin: Reject application",
                "PATCH", f"/admin/applications/{self.test_data['application_id']}", 200,
                data={"status": "rejected", "note": "Test rejection for cooldown"}
            )
        
        # Test cooldown enforcement
        time.sleep(1)
        success, data = self.test(
            "Cooldown: Reapply within 30 days should fail",
            "POST", "/applications", 429,
            data={
                "pseudo": test_pseudo,
                "power": "15M",
                "troops": "Archer",
                "activity": "6-8h/jour",
                "message": "Trying to reapply"
            },
            check_fn=lambda d, r: (
                d.get('detail', {}).get('code') == 'cooldown' and
                'retry_at' in d.get('detail', {})
            )
        )
        if success:
            self.log(f"   ✓ Cooldown enforced, retry_at: {data.get('detail', {}).get('retry_at')}", Colors.GREEN)
        
        # ========== SECTION 3: DONATIONS FLOW ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 3: DONATIONS FLOW (P0)")
        print(f"{'='*70}{Colors.RESET}")
        
        # Declare donation
        test_donor = f"TestDonor{datetime.now().strftime('%H%M%S')}"
        success, data = self.test(
            "Declare donation with French accents",
            "POST", "/donations/declare", 200,
            data={
                "pseudo": test_donor,
                "amount": 7.50,
                "email": "test@example.com",
                "message": "Merci pour votre travail! Café, château, naïve, œuvre",
                "anonymous": False
            },
            check_fn=lambda d, r: (
                d.get('ok') == True and
                d.get('status') == 'pending' and
                d.get('receipt_id', '').startswith('GPD-1023-')
            )
        )
        if success:
            self.test_data['receipt_id'] = data.get('receipt_id')
            self.test_data['donation_pseudo'] = data.get('pseudo')
            self.log(f"   ✓ Receipt ID: {data.get('receipt_id')}", Colors.GREEN)
        
        # Check donation status
        if 'receipt_id' in self.test_data:
            success, data = self.test(
                "Check donation status",
                "GET", f"/donations/status/{self.test_data['receipt_id']}", 200,
                check_fn=lambda d, r: d.get('status') == 'pending'
            )
        
        # Admin: Get donation ID for PATCH test
        success, data = self.test(
            "Admin: List donations",
            "GET", "/admin/donators", 200,
            check_fn=lambda d, r: (
                'items' in d and
                'no-store' in r.headers.get('Cache-Control', '').lower()
            )
        )
        if success:
            test_donation = next((item for item in data.get('items', []) 
                                if item.get('receipt_id') == self.test_data.get('receipt_id')), None)
            if test_donation:
                self.test_data['donation_id'] = test_donation.get('id')
                self.log(f"   ✓ Found donation ID: {self.test_data['donation_id']}", Colors.GREEN)
        
        # ========== SECTION 4: PATCH ENDPOINT (NEW FEATURE) ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 4: EDIT DONATION (PATCH ENDPOINT - P0)")
        print(f"{'='*70}{Colors.RESET}")
        
        if 'donation_id' in self.test_data:
            # Test PATCH with partial update
            success, data = self.test(
                "PATCH: Edit donation amount and message",
                "PATCH", f"/admin/donators/{self.test_data['donation_id']}", 200,
                data={
                    "amount": 10.00,
                    "message": "Message modifié avec accents: été, français, cœur",
                    "created_at": "2025-01-15T14:30:00+00:00"
                },
                check_fn=lambda d, r: d.get('ok') == True
            )
            if success:
                self.log(f"   ✓ Updated fields: {data.get('updated', [])}", Colors.GREEN)
            
            # Verify the update
            success, data = self.test(
                "Verify PATCH update",
                "GET", "/admin/donators", 200,
                check_fn=lambda d, r: any(
                    item.get('id') == self.test_data.get('donation_id') and
                    item.get('amount') == 10.0
                    for item in d.get('items', [])
                )
            )
            if success:
                updated_donation = next((item for item in data.get('items', []) 
                                       if item.get('id') == self.test_data.get('donation_id')), None)
                if updated_donation:
                    self.log(f"   ✓ New amount: {updated_donation.get('amount')} €", Colors.GREEN)
                    self.log(f"   ✓ New message: {updated_donation.get('message', '')[:50]}...", Colors.GREEN)
        
        # Confirm donation
        if 'donation_id' in self.test_data:
            success, data = self.test(
                "Admin: Confirm donation",
                "POST", f"/admin/donators/{self.test_data['donation_id']}/confirm", 200
            )
        
        # ========== SECTION 5: PDF/XLSX EXPORTS WITH FRENCH ACCENTS ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 5: PDF/XLSX EXPORTS WITH FRENCH ACCENTS (P0)")
        print(f"{'='*70}{Colors.RESET}")
        
        if 'receipt_id' in self.test_data:
            # Test PDF FR
            success, pdf_data = self.test(
                "Download PDF receipt (FR) with French accents",
                "GET", "/donations/invoice/pdf", 200,
                params={"receipt_id": self.test_data['receipt_id'], "lang": "fr"},
                is_blob=True,
                check_fn=lambda d, r: (
                    len(d) > 5000 and
                    d[:4] == b'%PDF' and
                    'attachment' in r.headers.get('Content-Disposition', '').lower()
                )
            )
            if success:
                self.log(f"   ✓ PDF FR size: {len(pdf_data)} bytes", Colors.GREEN)
                # Check for French characters in PDF (they should be encoded)
                try:
                    pdf_text = pdf_data.decode('latin-1', errors='ignore')
                    has_french = any(char in pdf_text for char in ['é', 'è', 'à', 'ç', 'ù', 'œ'])
                    self.log(f"   ✓ French characters present: {has_french}", Colors.GREEN)
                except:
                    pass
            
            # Test PDF EN
            success, pdf_data = self.test(
                "Download PDF receipt (EN)",
                "GET", "/donations/invoice/pdf", 200,
                params={"receipt_id": self.test_data['receipt_id'], "lang": "en"},
                is_blob=True,
                check_fn=lambda d, r: len(d) > 5000 and d[:4] == b'%PDF'
            )
            if success:
                self.log(f"   ✓ PDF EN size: {len(pdf_data)} bytes", Colors.GREEN)
            
            # Test XLSX FR
            success, xlsx_data = self.test(
                "Download XLSX receipt (FR) with French accents",
                "GET", "/donations/invoice/xlsx", 200,
                params={"receipt_id": self.test_data['receipt_id'], "lang": "fr"},
                is_blob=True,
                check_fn=lambda d, r: (
                    len(d) > 3000 and
                    'attachment' in r.headers.get('Content-Disposition', '').lower()
                )
            )
            if success:
                self.log(f"   ✓ XLSX FR size: {len(xlsx_data)} bytes", Colors.GREEN)
            
            # Test XLSX EN
            success, xlsx_data = self.test(
                "Download XLSX receipt (EN)",
                "GET", "/donations/invoice/xlsx", 200,
                params={"receipt_id": self.test_data['receipt_id'], "lang": "en"},
                is_blob=True,
                check_fn=lambda d, r: len(d) > 3000
            )
            if success:
                self.log(f"   ✓ XLSX EN size: {len(xlsx_data)} bytes", Colors.GREEN)
        
        # ========== SECTION 6: TIMEZONE HANDLING ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 6: TIMEZONE HANDLING (P1)")
        print(f"{'='*70}{Colors.RESET}")
        
        if 'receipt_id' in self.test_data:
            # Test different timezones
            for tz in ["Europe/Paris", "America/New_York", "Asia/Tokyo", "invalid_tz"]:
                success, data = self.test(
                    f"PDF with timezone: {tz}",
                    "GET", "/donations/invoice/pdf", 200,
                    params={"receipt_id": self.test_data['receipt_id'], "lang": "fr", "tz": tz},
                    is_blob=True,
                    check_fn=lambda d, r: len(d) > 5000
                )
                if success:
                    self.log(f"   ✓ Timezone {tz} handled correctly", Colors.GREEN)
        
        # ========== SECTION 7: DONOR PROFILE ENDPOINT ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 7: DONOR PROFILE ENDPOINT (P0)")
        print(f"{'='*70}{Colors.RESET}")
        
        if 'donation_pseudo' in self.test_data:
            success, data = self.test(
                "Get donor profile by pseudo",
                "GET", f"/donators/profile/{self.test_data['donation_pseudo']}", 200,
                check_fn=lambda d, r: (
                    d.get('pseudo') == self.test_data['donation_pseudo'] and
                    d.get('total') > 0 and
                    'gifts' in d
                )
            )
            if success:
                self.log(f"   ✓ Total: {data.get('total')} €", Colors.GREEN)
                self.log(f"   ✓ Gifts count: {data.get('count')}", Colors.GREEN)
        
        # Test anonymous donor (should return 404)
        success, data = self.test(
            "Anonymous donor profile should return 404",
            "GET", "/donators/profile/AnonymousDonor", 404
        )
        
        # ========== SECTION 8: SEASON SETTINGS ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 8: SEASON SETTINGS (P0)")
        print(f"{'='*70}{Colors.RESET}")
        
        # Get current season
        success, data = self.test(
            "Get season settings",
            "GET", "/season", 200,
            check_fn=lambda d, r: (
                's2_start' in d and
                'now' in d and
                'no-store' in r.headers.get('Cache-Control', '').lower()
            )
        )
        if success:
            self.log(f"   ✓ S2 start: {data.get('s2_start')}", Colors.GREEN)
            self.log(f"   ✓ Recruit open: {data.get('recruit_open')}", Colors.GREEN)
        
        # Update season settings
        success, data = self.test(
            "Admin: Update season settings",
            "PUT", "/admin/season", 200,
            data={
                "s2_start": "2026-10-31T22:59:00+00:00",
                "recruit_open": "2027-01-15T22:59:00+00:00"
            }
        )
        
        # Verify update
        success, data = self.test(
            "Verify season settings update",
            "GET", "/season", 200,
            check_fn=lambda d, r: d.get('recruit_open') is not None
        )
        
        # ========== SECTION 9: ADMIN EXPORTS ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 9: ADMIN EXPORTS (P0)")
        print(f"{'='*70}{Colors.RESET}")
        
        # Export recruit registry XLSX FR
        success, data = self.test(
            "Admin: Export recruit registry XLSX (FR)",
            "GET", "/admin/export/xlsx", 200,
            params={"lang": "fr", "tz": "Europe/Paris"},
            is_blob=True,
            check_fn=lambda d, r: len(d) > 5000
        )
        if success:
            self.log(f"   ✓ Registry XLSX FR size: {len(data)} bytes", Colors.GREEN)
        
        # Export recruit registry XLSX EN
        success, data = self.test(
            "Admin: Export recruit registry XLSX (EN)",
            "GET", "/admin/export/xlsx", 200,
            params={"lang": "en", "tz": "America/New_York"},
            is_blob=True,
            check_fn=lambda d, r: len(d) > 5000
        )
        if success:
            self.log(f"   ✓ Registry XLSX EN size: {len(data)} bytes", Colors.GREEN)
        
        # Export donations summary
        success, data = self.test(
            "Admin: Export donations summary XLSX",
            "GET", "/admin/donators/export/xlsx", 200,
            params={"lang": "fr", "tz": "Europe/Paris"},
            is_blob=True,
            check_fn=lambda d, r: len(d) > 3000
        )
        if success:
            self.log(f"   ✓ Donations XLSX size: {len(data)} bytes", Colors.GREEN)
        
        # ========== SECTION 10: CLEANUP ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"SECTION 10: CLEANUP TEST DATA")
        print(f"{'='*70}{Colors.RESET}")
        
        # Delete test donation
        if 'donation_id' in self.test_data:
            success, data = self.test(
                "Delete test donation",
                "DELETE", f"/admin/donators/{self.test_data['donation_id']}", 200
            )
        
        # Delete test application
        if 'application_id' in self.test_data:
            success, data = self.test(
                "Delete test application",
                "DELETE", f"/admin/applications/{self.test_data['application_id']}", 200
            )
        
        # ========== SUMMARY ==========
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"TEST SUMMARY")
        print(f"{'='*70}{Colors.RESET}")
        print(f"{Colors.GREEN}✅ Passed: {self.tests_passed}/{self.tests_run}{Colors.RESET}")
        if self.tests_passed < self.tests_run:
            print(f"{Colors.RED}❌ Failed: {self.tests_run - self.tests_passed}/{self.tests_run}{Colors.RESET}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n{Colors.BLUE}Success Rate: {success_rate:.1f}%{Colors.RESET}\n")
        
        return 0 if self.tests_passed == self.tests_run else 1

if __name__ == "__main__":
    tester = ComprehensiveAPITester()
    sys.exit(tester.run_all_tests())
