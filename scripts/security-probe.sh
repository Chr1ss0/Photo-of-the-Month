#!/usr/bin/env bash
# Black-Box-Sicherheitsprüfung gegen eine laufende Instanz.
#   ./scripts/security-probe.sh http://127.0.0.1:3000
# Prüft u. a. CSRF, Auth-Pflicht, Path-Traversal, Security-Header und Brute-Force-Schutz.
set -u
BASE="${1:-http://127.0.0.1:3000}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
pass=0; fail=0

check() { # name expected actual
  if [[ "$3" == "$2" ]]; then echo "  ✔ $1 ($3)"; pass=$((pass+1)); else echo "  ✘ $1 – erwartet $2, erhalten $3"; fail=$((fail+1)); fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "▶ Ziel: $BASE"
echo "Authentifizierung"
for p in /api/challenges/current /api/submissions/mine /api/submissions/1 /api/submissions/1/image /api/gallery /api/admin/users; do
  check "GET $p ohne Login" 401 "$(status "$BASE$p")"
done
check "Gefälschtes Session-Cookie" 401 "$(status -H 'Cookie: potm_sid=forged; __Host-potm_sid=forged' "$BASE/api/challenges/current")"

echo "CSRF"
check "POST ohne Token" 403 "$(status -X POST -H 'Content-Type: application/json' -d '{"username":"a","password":"b"}' "$BASE/api/auth/login")"
TOKEN=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
check "POST mit fremder Origin" 403 "$(status -b "$JAR" -X POST -H "X-CSRF-Token: $TOKEN" -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{"username":"a","password":"b"}' "$BASE/api/auth/login")"
check "POST mit falschem Token" 403 "$(status -b "$JAR" -X POST -H 'X-CSRF-Token: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' -H 'Content-Type: application/json' -d '{"username":"a","password":"b"}' "$BASE/api/auth/login")"

echo "Eingaben"
check "NoSQL-artiges Objekt als Passwort" 400 "$(status -b "$JAR" -X POST -H "X-CSRF-Token: $TOKEN" -H 'Content-Type: application/json' -d '{"username":"admin","password":{"$ne":""}}' "$BASE/api/auth/login")"
check "Ungültiges JSON" 400 "$(status -b "$JAR" -X POST -H "X-CSRF-Token: $TOKEN" -H 'Content-Type: application/json' -d '{"username":' "$BASE/api/auth/login")"
BIG=$(head -c 40000 /dev/zero | tr '\0' 'a')
check "Übergroßer JSON-Body" 413 "$(status -b "$JAR" -X POST -H "X-CSRF-Token: $TOKEN" -H 'Content-Type: application/json' -d "{\"username\":\"$BIG\"}" "$BASE/api/auth/login")"

echo "Path-Traversal"
for p in '/..%2f..%2fpackage.json' '/%2e%2e/%2e%2e/backend/package.json' '/api/..%2f..%2fpackage.json' '/assets/..%2f..%2f..%2fbackend%2fdata%2fpotm.sqlite'; do
  body=$(curl -s --path-as-is "$BASE$p" | head -c 200)
  if grep -q '"dependencies"\|SQLite format' <<<"$body"; then check "$p" "kein Leak" "LEAK"; else check "$p" "kein Leak" "kein Leak"; fi
done

echo "Security-Header"
H=$(curl -sI "$BASE/")
for h in 'content-security-policy' 'x-content-type-options: nosniff' 'x-frame-options' 'referrer-policy' 'permissions-policy'; do
  if grep -qi "^$h" <<<"$H"; then check "Header $h" ok ok; else check "Header $h" ok fehlt; fi
done
if grep -qi '^x-powered-by' <<<"$H"; then check "X-Powered-By entfernt" ok vorhanden; else check "X-Powered-By entfernt" ok ok; fi

echo "Brute-Force-Schutz"
code=""
for i in $(seq 1 12); do
  code=$(status -b "$JAR" -X POST -H "X-CSRF-Token: $TOKEN" -H 'Content-Type: application/json' -d "{\"username\":\"probe-victim\",\"password\":\"wrong-$i-xxxx\"}" "$BASE/api/auth/login")
done
check "Login nach 12 Fehlversuchen gedrosselt" 429 "$code"

echo; echo "Ergebnis: $pass bestanden, $fail fehlgeschlagen"
[[ $fail -eq 0 ]]
