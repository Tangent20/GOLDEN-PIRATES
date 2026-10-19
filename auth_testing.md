# Auth Testing Playbook — Golden Pirates

## Stack
- FastAPI + MongoDB (motor) + JWT (PyJWT, HS256) + bcrypt
- Admin-only auth (no public registration)

## Endpoints
- POST /api/admin/login {email, password} → sets httpOnly cookies + returns user
- POST /api/auth/logout → clears cookies
- GET /api/auth/me → current admin user (cookie or Bearer)
- POST /api/applications → public application submit (returns tracking code)
- GET /api/applications/track/{code} → public status check
- GET /api/admin/applications → protected list
- PATCH /api/admin/applications/{id} → protected status update

## MongoDB
- db.users (admin seed on startup, unique index email)
- db.applications (index tracking_code unique)

## curl test
```
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -s -c /tmp/ck.txt -X POST "$API_URL/api/admin/login" -H "Content-Type: application/json" -d '{"email":"admin@goldenpirates.io","password":"Capitaine1023!"}'
curl -s -b /tmp/ck.txt "$API_URL/api/auth/me"
curl -s -X POST "$API_URL/api/applications" -H "Content-Type: application/json" -d '{"pseudo":"TestCap","power":"120M","troops":"Cavalerie T5","activity":"Quotidien 2h","experience":"KvK S1","message":"Ahoy"}'
```
