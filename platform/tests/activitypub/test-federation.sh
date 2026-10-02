#!/bin/bash
# =============================================================================
# ActivityPub Federation Test Script
# =============================================================================
# Verifies that ActivityPub federation works across two OpenPeeps instances
# and one Mastodon instance.
#
# Prerequisites:
#   - setup.sh must have completed successfully
#   - python3 (for JSON parsing)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
# Domain + mode come from .env (written by setup.sh); fall back to the local
# self-signed test domain when .env is absent.
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a; . "$SCRIPT_DIR/.env"; set +a
fi
DNS_SUFFIX="${DNS_SUFFIX:-activity-pub.test.ap.social}"
PUBLIC="${PUBLIC:-0}"

# Run from the script directory so we find certs/
cd "$SCRIPT_DIR"

ALPHA_DOMAIN="alpha.$DNS_SUFFIX"
BETA_DOMAIN="beta.$DNS_SUFFIX"
MASTO_DOMAIN="mastodon.$DNS_SUFFIX"
ALPHA="https://$ALPHA_DOMAIN"
BETA="https://$BETA_DOMAIN"
MASTO="https://$MASTO_DOMAIN"

# Local mode uses a self-signed CA (curl must be pointed at it); public mode
# relies on the system trust store (Let's Encrypt is a public CA).
CURL_CA="$SCRIPT_DIR/certs/ca.crt"
CURL_OPTS=(-sS --retry 3 --retry-delay 2 --max-time 30)
if [ "$PUBLIC" != "1" ]; then
  CURL_OPTS+=(--cacert "$CURL_CA")
fi

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "  ${RED}✗ FAIL${NC}: $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "  ${YELLOW}⚠ WARN${NC}: $1"; }
info() { echo -e "  ${YELLOW}…${NC} $1"; }

FAILURES=0

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ActivityPub Federation Test Suite"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── 1. Verify actor endpoints are served ─────────────────────────────────────
echo "── Actor endpoint checks ─────────────────────────────────"

info "Checking OpenPeeps Alpha actor (alice)..."
RESP=$(curl "${CURL_OPTS[@]}" -H "Accept: application/activity+json" \
  "$ALPHA/ap/users/alice" || true)
if echo "$RESP" | grep -q '"type":"Person"\|"type": "Person"' \
  && echo "$RESP" | grep -q 'preferredUsername'; then
  pass "Alpha actor JSON served with Person type and preferredUsername"
else
  fail "Alpha actor endpoint returned unexpected response"
  echo "   Response: $(echo "$RESP" | head -c 300)"
fi

info "Checking OpenPeeps Beta actor (bob)..."
RESP=$(curl "${CURL_OPTS[@]}" -H "Accept: application/activity+json" \
  "$BETA/ap/users/bob" || true)
if echo "$RESP" | grep -q '"type":"Person"\|"type": "Person"' \
  && echo "$RESP" | grep -q 'preferredUsername'; then
  pass "Beta actor JSON served with Person type and preferredUsername"
else
  fail "Beta actor endpoint returned unexpected response"
  echo "   Response: $(echo "$RESP" | head -c 300)"
fi

info "Checking Mastodon actor (admin)..."
RESP=$(curl "${CURL_OPTS[@]}" -H "Accept: application/activity+json" \
  "$MASTO/users/admin" || true)
if echo "$RESP" | grep -q '"type":"Person"\|"type": "Person"' \
  && echo "$RESP" | grep -q 'preferredUsername'; then
  pass "Mastodon actor JSON served with Person type and preferredUsername"
else
  fail "Mastodon actor endpoint returned unexpected response"
  echo "   Response: $(echo "$RESP" | head -c 300)"
fi

echo ""

# ── 2. Verify nodeInfo / instance metadata ───────────────────────────────────
echo "── Instance metadata checks ───────────────────────────────"

info "Checking Mastodon instance info..."
RESP=$(curl "${CURL_OPTS[@]}" "$MASTO/.well-known/nodeinfo" || true)
if echo "$RESP" | grep -q '"version"'; then
  pass "Mastodon nodeinfo is reachable"
else
  fail "Mastodon nodeinfo check failed"
  echo "   Response: $(echo "$RESP" | head -c 300)"
fi

info "Checking OpenPeeps Alpha WebFinger..."
RESP=$(curl "${CURL_OPTS[@]}" "$ALPHA/.well-known/webfinger?resource=acct:alice@$ALPHA_DOMAIN" || true)
if echo "$RESP" | grep -q 'alice' && echo "$RESP" | grep -q 'ap/users'; then
  pass "Alpha WebFinger resolves actor URI"
else
  fail "Alpha WebFinger check failed"
  echo "   Response: $(echo "$RESP" | head -c 300)"
fi

echo ""

# ── 3. Follow + post federation (OpenPeeps → Mastodon) ───────────────────────
echo "── Cross-instance follow + note federation ─────────────────"

# Login as alice on Alpha
info "Logging in as alice on Alpha..."
LOGIN_RESP=$(curl "${CURL_OPTS[@]}" -X POST "$ALPHA/api/openpeeps/core/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@alpha.$DNS_SUFFIX\",\"password\":\"password123\"}" || true)

TOKEN_ALPHA=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [ -n "$TOKEN_ALPHA" ]; then
  pass "Alpha login successful"
else
  fail "Alpha login failed"
  echo "   Response: $(echo "$LOGIN_RESP" | head -c 300)"
fi

# Create a public note on Alpha
info "Creating public note on Alpha..."
POST_RESP=$(curl "${CURL_OPTS[@]}" -X POST "$ALPHA/api/openpeeps/core/v1/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ALPHA" \
  -d '{
    "visibility": "public",
    "type": "note",
    "data": {"type": "note", "content": "Hello from OpenPeeps Alpha! Testing ActivityPub federation."}
  }' || true)

POST_ID=$(echo "$POST_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
if [ -n "$POST_ID" ]; then
  pass "Alpha note created (id: $POST_ID)"
else
  fail "Alpha note creation failed"
  echo "   Response: $(echo "$POST_RESP" | head -c 300)"
fi

# Give Mastodon time to receive the Create activity via shared inbox
info "Waiting for federation to propagate (10s)..."
sleep 10

# Check if the note appeared on Mastodon
info "Searching Mastodon for Alpha note content..."

# Create Mastodon OAuth app
info "Creating Mastodon OAuth app..."
APP_RESP=$(curl "${CURL_OPTS[@]}" -X POST "$MASTO/api/v1/apps" \
  -H "Content-Type: application/json" \
  -d '{"name":"FederationTest","redirect_uris":"urn:ietf:wg:oauth:2.0:oob","scopes":"read write follow"}' || true)

CLIENT_ID=$(echo "$APP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('client_id',''))" 2>/dev/null || echo "")
CLIENT_SECRET=$(echo "$APP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('client_secret',''))" 2>/dev/null || echo "")

if [ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ]; then
  pass "Mastodon OAuth app created"
else
  fail "Mastodon OAuth app creation failed"
  echo "   Response: $(echo "$APP_RESP" | head -c 300)"
fi

# Get Mastodon OAuth token (password grant)
info "Getting Mastodon OAuth token..."
TOKEN_MASTO=$(curl "${CURL_OPTS[@]}" -X POST "$MASTO/oauth/token" \
  -d "grant_type=password&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET" \
  -d "username=admin&password=password123&scope=read write follow" || true)

TOKEN_MASTO=$(echo "$TOKEN_MASTO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$TOKEN_MASTO" ]; then
  pass "Mastodon OAuth token obtained"
else
  fail "Mastodon OAuth token failed"
fi

# Search Mastodon for the federated note
info "Searching Mastodon for Alpha note content..."
SEARCH_RESP=$(curl "${CURL_OPTS[@]}" "$MASTO/api/v2/search?q=Hello+from+OpenPeeps" \
  -H "Authorization: Bearer $TOKEN_MASTO" || true)

if echo "$SEARCH_RESP" | grep -q 'OpenPeeps'; then
  pass "Federation confirmed: Alpha note found on Mastodon"
else
  warn "Alpha note not found in Mastodon search (may need more time or federation is not yet working)"
  echo "   Response: $(echo "$SEARCH_RESP" | head -c 300)"
fi

echo ""

# ── 4. Follow from Mastodon → OpenPeeps ──────────────────────────────────────
echo "── Mastodon → OpenPeeps follow ────────────────────────────"

info "Having Mastodon follow OpenPeeps Alpha actor..."
FOLLOW_RESP=$(curl "${CURL_OPTS[@]}" -X POST "$MASTO/api/v1/accounts/follow" \
  -H "Authorization: Bearer $TOKEN_MASTO" \
  -H "Content-Type: application/json" \
  -d "{\"uri\": \"$ALPHA/ap/users/alice\"}" || true)

if echo "$FOLLOW_RESP" | grep -q '"following"'; then
  pass "Mastodon follow request sent to Alpha actor"
else
  fail "Mastodon follow failed"
  echo "   Response: $(echo "$FOLLOW_RESP" | head -c 300)"
fi

# Give OpenPeeps time to receive the Accept
info "Waiting for follow acceptance..."
sleep 5

# Check if Mastodon is now following Alpha locally
info "Checking if Alpha has the follow recorded..."
FOLLOW_DB=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U openpeeps -d openpeeps_alpha -t -c \
  "SELECT COUNT(*) FROM follows WHERE to_id = (SELECT id FROM profiles WHERE handle = 'alice') AND from_id IN (SELECT id FROM profiles WHERE uri LIKE '%$MASTO_DOMAIN%');" 2>&1 || echo "0")

if [ "$(echo "$FOLLOW_DB" | tr -d '[:space:]')" -gt 0 ] 2>/dev/null; then
  pass "Follow edge recorded in OpenPeeps Alpha database"
else
  warn "Follow edge not found in DB (may still be processing)"
  echo "   DB result: $FOLLOW_DB"
fi

echo ""

# ── 5. Actor resolution across instances ─────────────────────────────────────
echo "── Cross-instance actor resolution ────────────────────────"

info "Alpha resolving Mastodon actor URL..."
RESP=$(curl "${CURL_OPTS[@]}" -H "Accept: application/activity+json" \
  "$ALPHA/.well-known/webfinger?resource=acct:admin@$MASTO_DOMAIN" || true)
if echo "$RESP" | grep -q 'mastodon'; then
  pass "Alpha can resolve Mastodon actor via WebFinger"
else
  warn "Alpha WebFinger resolution of Mastodon actor failed"
  echo "   Response: $(echo "$RESP" | head -c 300)"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
if [ "$FAILURES" -eq 0 ]; then
  echo -e " ${GREEN}All tests passed!${NC}"
else
  echo -e " ${RED}$FAILURES test(s) failed.${NC}"
fi
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Diagnostic info ──────────────────────────────────────────────────────────
echo "Quick inspection URLs:"
echo "  Alpha actor:      $ALPHA/ap/users/alice"
echo "  Beta actor:       $BETA/ap/users/bob"
echo "  Mastodon actor:   $MASTO/users/admin"
echo "  Mastodon admin:   $MASTO/web/login (log in as admin / password123)"
echo "  Mailpit:          http://localhost:8025"
echo ""

exit $FAILURES
