import os
"""
Test complet des 3 systèmes de messagerie Golden Pirates
- Système A/B : Council ↔ Recruit (collection messages, ChatBox)
- Système C : Recruit ↔ Recruit (collection peer_messages, PeerDen)
"""
import requests
import time
from datetime import datetime

BASE_URL = os.environ["VITE_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


class MessagingTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_cookies = None
        self.test_codes = []
        self.test_app_ids = []
        self.passed = 0
        self.failed = 0
        self.errors = []

    def log(self, msg, status="INFO"):
        prefix = "✅" if status == "PASS" else "❌" if status == "FAIL" else "🔍"
        print(f"{prefix} {msg}")

    def test(self, name, condition, error_msg=""):
        if condition:
            self.passed += 1
            self.log(f"{name}: PASS", "PASS")
            return True
        else:
            self.failed += 1
            self.log(f"{name}: FAIL - {error_msg}", "FAIL")
            self.errors.append(f"{name}: {error_msg}")
            return False

    def admin_login(self):
        """Login admin pour tester les endpoints council"""
        self.log("=== ADMIN LOGIN ===")
        try:
            resp = self.session.post(
                f"{BASE_URL}/admin/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=10
            )
            self.test(
                "Admin login",
                resp.status_code == 200,
                f"Status {resp.status_code}: {resp.text[:200]}"
            )
            if resp.status_code == 200:
                self.admin_cookies = self.session.cookies
                return True
            return False
        except Exception as e:
            self.test("Admin login", False, str(e))
            return False

    def create_test_application(self, pseudo_prefix):
        """Créer une candidature de test pour obtenir un tracking_code"""
        self.log(f"Creating test application: {pseudo_prefix}")
        try:
            data = {
                "pseudo": f"{pseudo_prefix}_{int(time.time())}",
                "power": "10M",
                "troops": "T5 cavalry",
                "activity": "daily",
                "experience": "veteran player",
                "discord": f"test#{int(time.time())}",
                "message": "Test message for messaging system verification"
            }
            resp = requests.post(f"{BASE_URL}/applications", json=data, timeout=10)
            
            if resp.status_code == 200:
                result = resp.json()
                code = result.get("tracking_code")
                app_id = result.get("id")
                self.test_codes.append(code)
                self.test_app_ids.append(app_id)
                self.log(f"Created application: {code} (ID: {app_id})")
                return code, app_id, data["pseudo"]
            else:
                self.log(f"Failed to create application: {resp.status_code}", "FAIL")
                return None, None, None
        except Exception as e:
            self.log(f"Error creating application: {e}", "FAIL")
            return None, None, None

    def test_council_recruit_messaging(self):
        """Test système A/B : Council ↔ Recruit"""
        self.log("\n=== TEST SYSTÈME A/B : COUNCIL ↔ RECRUIT ===")
        
        # Créer une candidature de test
        code, app_id, pseudo = self.create_test_application("MsgTestCouncil")
        if not code:
            self.test("Council↔Recruit setup", False, "Failed to create test application")
            return

        # TEST 1: Recruit envoie message au Council
        self.log("\n--- Test 1: Recruit → Council ---")
        try:
            recruit_msg = f"Test message from recruit at {datetime.now().isoformat()}"
            resp = requests.post(
                f"{BASE_URL}/messages/{code}",
                json={"text": recruit_msg},
                timeout=10
            )
            self.test(
                "Recruit sends message",
                resp.status_code == 200,
                f"Status {resp.status_code}: {resp.text[:200]}"
            )
            
            if resp.status_code == 200:
                msg_data = resp.json()
                self.test("Message has ID", "id" in msg_data, "No message ID")
                self.test("Message sender is recruit", msg_data.get("sender") == "recruit", f"Sender: {msg_data.get('sender')}")
                self.test("Message text correct", msg_data.get("text") == recruit_msg, "Text mismatch")
                recruit_msg_id = msg_data.get("id")
        except Exception as e:
            self.test("Recruit sends message", False, str(e))
            return

        # TEST 2: Recruit lit ses messages
        self.log("\n--- Test 2: Recruit reads messages ---")
        try:
            resp = requests.get(f"{BASE_URL}/messages/{code}", timeout=10)
            self.test(
                "Recruit reads messages",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
            
            if resp.status_code == 200:
                messages = resp.json()
                self.test("Messages is array", isinstance(messages, list), "Not an array")
                self.test("At least 1 message", len(messages) >= 1, f"Got {len(messages)} messages")
        except Exception as e:
            self.test("Recruit reads messages", False, str(e))

        # TEST 3: Admin lit la liste des conversations
        self.log("\n--- Test 3: Admin reads conversations list ---")
        try:
            resp = self.session.get(f"{BASE_URL}/admin/conversations", timeout=10)
            self.test(
                "Admin gets conversations",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
            
            if resp.status_code == 200:
                convs = resp.json()
                self.test("Conversations is array", isinstance(convs, list), "Not an array")
                # Trouver notre conversation
                our_conv = next((c for c in convs if c.get("code") == code), None)
                self.test("Our conversation exists", our_conv is not None, "Conversation not found")
                if our_conv:
                    self.test("Conversation has unread", our_conv.get("unread", 0) > 0, "No unread messages")
        except Exception as e:
            self.test("Admin gets conversations", False, str(e))

        # TEST 4: Admin lit le thread complet
        self.log("\n--- Test 4: Admin reads thread ---")
        try:
            resp = self.session.get(f"{BASE_URL}/admin/conversations/{code}", timeout=10)
            self.test(
                "Admin reads thread",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
            
            if resp.status_code == 200:
                messages = resp.json()
                self.test("Thread messages is array", isinstance(messages, list), "Not an array")
        except Exception as e:
            self.test("Admin reads thread", False, str(e))

        # TEST 5: Council envoie message à la recrue
        self.log("\n--- Test 5: Council → Recruit ---")
        try:
            council_msg = f"Test message from council at {datetime.now().isoformat()}"
            resp = self.session.post(
                f"{BASE_URL}/admin/conversations/{code}",
                json={"text": council_msg},
                timeout=10
            )
            self.test(
                "Council sends message",
                resp.status_code == 200,
                f"Status {resp.status_code}: {resp.text[:200]}"
            )
            
            if resp.status_code == 200:
                msg_data = resp.json()
                self.test("Council message has ID", "id" in msg_data, "No message ID")
                self.test("Message sender is council", msg_data.get("sender") == "council", f"Sender: {msg_data.get('sender')}")
                council_msg_id = msg_data.get("id")
        except Exception as e:
            self.test("Council sends message", False, str(e))

        # TEST 6: Recruit voit le message du council
        self.log("\n--- Test 6: Recruit sees council message ---")
        try:
            resp = requests.get(f"{BASE_URL}/messages/{code}", timeout=10)
            if resp.status_code == 200:
                messages = resp.json()
                council_messages = [m for m in messages if m.get("sender") == "council"]
                self.test(
                    "Recruit sees council message",
                    len(council_messages) > 0,
                    "No council messages found"
                )
                if council_messages:
                    self.test("Council message marked as new", council_messages[-1].get("was_new") == True, "Not marked as new")
        except Exception as e:
            self.test("Recruit sees council message", False, str(e))

        # TEST 7: Soft-delete par recruit
        self.log("\n--- Test 7: Recruit soft-deletes message ---")
        try:
            if 'recruit_msg_id' in locals():
                resp = requests.delete(f"{BASE_URL}/messages/{code}/{recruit_msg_id}", timeout=10)
                self.test(
                    "Recruit deletes message",
                    resp.status_code == 200,
                    f"Status {resp.status_code}"
                )
                
                if resp.status_code == 200:
                    deleted_msg = resp.json()
                    self.test("Message marked deleted", deleted_msg.get("deleted") == True, "Not marked deleted")
                    self.test("Message text cleared", deleted_msg.get("text") == "", "Text not cleared")
        except Exception as e:
            self.test("Recruit deletes message", False, str(e))

        # TEST 8: Mark all read by council
        self.log("\n--- Test 8: Council marks all read ---")
        try:
            resp = self.session.post(f"{BASE_URL}/admin/conversations/{code}/read", timeout=10)
            self.test(
                "Council marks read",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
        except Exception as e:
            self.test("Council marks read", False, str(e))

        # TEST 9: Rate limiting recruit (10/min)
        self.log("\n--- Test 9: Rate limiting recruit (10/min) ---")
        try:
            # Envoyer 11 messages rapidement
            for i in range(11):
                resp = requests.post(
                    f"{BASE_URL}/messages/{code}",
                    json={"text": f"Flood test {i}"},
                    timeout=10
                )
                if i < 10:
                    self.test(f"Message {i+1}/10 accepted", resp.status_code == 200, f"Status {resp.status_code}")
                else:
                    self.test("11th message blocked", resp.status_code == 429, f"Status {resp.status_code} (expected 429)")
        except Exception as e:
            self.test("Rate limiting test", False, str(e))

    def test_peer_to_peer_messaging(self):
        """Test système C : Recruit ↔ Recruit"""
        self.log("\n=== TEST SYSTÈME C : RECRUIT ↔ RECRUIT (PEER) ===")
        
        # Créer deux candidatures
        code1, app_id1, pseudo1 = self.create_test_application("PeerAlpha")
        code2, app_id2, pseudo2 = self.create_test_application("PeerBeta")
        
        if not code1 or not code2:
            self.test("Peer setup", False, "Failed to create test applications")
            return

        # TEST 1: Peer note (bio)
        self.log("\n--- Test 1: Peer saves note ---")
        try:
            note_text = "Test sea note for peer messaging"
            resp = requests.post(
                f"{BASE_URL}/peers/note",
                json={"code": code1, "note": note_text},
                timeout=10
            )
            self.test(
                "Peer saves note",
                resp.status_code == 200,
                f"Status {resp.status_code}: {resp.text[:200]}"
            )
            
            if resp.status_code == 200:
                result = resp.json()
                self.test("Note saved correctly", result.get("note") == note_text, "Note mismatch")
        except Exception as e:
            self.test("Peer saves note", False, str(e))

        # TEST 2: Search peers
        self.log("\n--- Test 2: Search peers ---")
        try:
            resp = requests.get(
                f"{BASE_URL}/peers/search",
                params={"q": pseudo2[:8], "code": code1},
                timeout=10
            )
            self.test(
                "Search peers",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
            
            if resp.status_code == 200:
                results = resp.json()
                self.test("Search results is array", isinstance(results, list), "Not an array")
                # Trouver PeerBeta
                found = any(r.get("app_id") == app_id2 for r in results)
                self.test("Found target peer", found, "Target peer not in results")
        except Exception as e:
            self.test("Search peers", False, str(e))

        # TEST 3: Search with power filter
        self.log("\n--- Test 3: Search with power filter ---")
        try:
            resp = requests.get(
                f"{BASE_URL}/peers/search",
                params={"q": "", "code": code1, "min_power": 5, "max_power": 15},
                timeout=10
            )
            self.test(
                "Search with power filter",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
        except Exception as e:
            self.test("Search with power filter", False, str(e))

        # TEST 4: Send peer message
        self.log("\n--- Test 4: Peer sends message ---")
        try:
            peer_msg = f"Test peer message at {datetime.now().isoformat()}"
            resp = requests.post(
                f"{BASE_URL}/peers/messages",
                json={
                    "from_code": code1,
                    "to_app_id": app_id2,
                    "text": peer_msg
                },
                timeout=10
            )
            self.test(
                "Peer sends message",
                resp.status_code == 200,
                f"Status {resp.status_code}: {resp.text[:200]}"
            )
            
            if resp.status_code == 200:
                msg_data = resp.json()
                self.test("Peer message has ID", "id" in msg_data, "No message ID")
                self.test("Message from_me is true", msg_data.get("from_me") == True, "from_me not true")
                self.test("Message text correct", msg_data.get("text") == peer_msg, "Text mismatch")
        except Exception as e:
            self.test("Peer sends message", False, str(e))

        # TEST 5: Get peer threads
        self.log("\n--- Test 5: Get peer threads ---")
        try:
            resp = requests.get(
                f"{BASE_URL}/peers/threads",
                params={"code": code2},
                timeout=10
            )
            self.test(
                "Get peer threads",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
            
            if resp.status_code == 200:
                threads = resp.json()
                self.test("Threads is array", isinstance(threads, list), "Not an array")
                # Trouver le thread avec PeerAlpha
                our_thread = next((t for t in threads if t.get("app_id") == app_id1), None)
                self.test("Thread exists", our_thread is not None, "Thread not found")
                if our_thread:
                    self.test("Thread has unread", our_thread.get("unread", 0) > 0, "No unread messages")
        except Exception as e:
            self.test("Get peer threads", False, str(e))

        # TEST 6: Get specific thread (marks as read)
        self.log("\n--- Test 6: Get specific thread ---")
        try:
            resp = requests.get(
                f"{BASE_URL}/peers/thread",
                params={"code": code2, "peer": app_id1},
                timeout=10
            )
            self.test(
                "Get specific thread",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
            
            if resp.status_code == 200:
                thread_data = resp.json()
                self.test("Thread has peer info", "peer" in thread_data, "No peer info")
                self.test("Thread has messages", "messages" in thread_data, "No messages")
                messages = thread_data.get("messages", [])
                self.test("At least 1 message", len(messages) >= 1, f"Got {len(messages)} messages")
                if messages:
                    # Le message devrait être from_me=False côté PeerBeta
                    self.test("Message from_me is false", messages[-1].get("from_me") == False, "from_me not false")
        except Exception as e:
            self.test("Get specific thread", False, str(e))

        # TEST 7: Reply to peer
        self.log("\n--- Test 7: Peer replies ---")
        try:
            reply_msg = f"Reply from peer at {datetime.now().isoformat()}"
            resp = requests.post(
                f"{BASE_URL}/peers/messages",
                json={
                    "from_code": code2,
                    "to_app_id": app_id1,
                    "text": reply_msg
                },
                timeout=10
            )
            self.test(
                "Peer replies",
                resp.status_code == 200,
                f"Status {resp.status_code}"
            )
        except Exception as e:
            self.test("Peer replies", False, str(e))

        # TEST 8: Cannot message self
        self.log("\n--- Test 8: Cannot message self ---")
        try:
            resp = requests.post(
                f"{BASE_URL}/peers/messages",
                json={
                    "from_code": code1,
                    "to_app_id": app_id1,
                    "text": "Self message"
                },
                timeout=10
            )
            self.test(
                "Self-message blocked",
                resp.status_code == 400,
                f"Status {resp.status_code} (expected 400)"
            )
        except Exception as e:
            self.test("Self-message blocked", False, str(e))

        # TEST 9: Rate limiting peer (20/h)
        self.log("\n--- Test 9: Rate limiting peer (20/h) ---")
        try:
            # Envoyer 21 messages rapidement
            success_count = 0
            blocked = False
            for i in range(21):
                resp = requests.post(
                    f"{BASE_URL}/peers/messages",
                    json={
                        "from_code": code1,
                        "to_app_id": app_id2,
                        "text": f"Flood test {i}"
                    },
                    timeout=10
                )
                if resp.status_code == 200:
                    success_count += 1
                elif resp.status_code == 429:
                    blocked = True
                    break
            
            self.test(
                "Peer rate limit enforced",
                success_count <= 20 and (success_count == 20 or blocked),
                f"Sent {success_count} messages, blocked={blocked}"
            )
        except Exception as e:
            self.test("Peer rate limiting", False, str(e))

    def test_edge_cases(self):
        """Test edge cases et validations"""
        self.log("\n=== TEST EDGE CASES ===")
        
        code, app_id, pseudo = self.create_test_application("EdgeTest")
        if not code:
            return

        # TEST 1: Empty message blocked
        self.log("\n--- Test 1: Empty message blocked ---")
        try:
            resp = requests.post(
                f"{BASE_URL}/messages/{code}",
                json={"text": "   "},
                timeout=10
            )
            self.test(
                "Empty message blocked",
                resp.status_code == 400,
                f"Status {resp.status_code} (expected 400)"
            )
        except Exception as e:
            self.test("Empty message blocked", False, str(e))

        # TEST 2: Long message truncated
        self.log("\n--- Test 2: Long message handling ---")
        try:
            long_text = "A" * 2500  # Plus de 2000 caractères
            resp = requests.post(
                f"{BASE_URL}/messages/{code}",
                json={"text": long_text},
                timeout=10
            )
            if resp.status_code == 200:
                msg_data = resp.json()
                self.test(
                    "Long message truncated",
                    len(msg_data.get("text", "")) <= 2000,
                    f"Length: {len(msg_data.get('text', ''))}"
                )
        except Exception as e:
            self.test("Long message handling", False, str(e))

        # TEST 3: Invalid tracking code
        self.log("\n--- Test 3: Invalid tracking code ---")
        try:
            resp = requests.get(f"{BASE_URL}/messages/INVALID-CODE", timeout=10)
            self.test(
                "Invalid code rejected",
                resp.status_code == 404,
                f"Status {resp.status_code} (expected 404)"
            )
        except Exception as e:
            self.test("Invalid code rejected", False, str(e))

    def run_all_tests(self):
        """Exécuter tous les tests"""
        print("\n" + "="*80)
        print("GOLDEN PIRATES - TEST COMPLET DES SYSTÈMES DE MESSAGERIE")
        print("="*80 + "\n")
        
        # Login admin d'abord
        if not self.admin_login():
            print("\n❌ ERREUR CRITIQUE: Impossible de se connecter en tant qu'admin")
            return False
        
        # Exécuter les tests
        self.test_council_recruit_messaging()
        self.test_peer_to_peer_messaging()
        self.test_edge_cases()
        
        # Résumé
        print("\n" + "="*80)
        print("RÉSUMÉ DES TESTS")
        print("="*80)
        print(f"✅ Tests réussis: {self.passed}")
        print(f"❌ Tests échoués: {self.failed}")
        print(f"📊 Total: {self.passed + self.failed}")
        print(f"📈 Taux de réussite: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        
        if self.errors:
            print("\n❌ ERREURS DÉTECTÉES:")
            for error in self.errors:
                print(f"  - {error}")
        
        print("\n" + "="*80)
        
        return self.failed == 0


if __name__ == "__main__":
    tester = MessagingTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
