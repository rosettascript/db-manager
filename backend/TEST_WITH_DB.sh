#!/bin/bash

# Test Phase 3 routes with active database connection

BASE_URL="http://localhost:3000/api"
CONNECTION_ID="conn_1764401629369_ayww2mbaq"  # Sabong database

echo "🧪 Testing Phase 3 Routes with Active Database Connection"
echo "================================================================"
echo ""
echo "Connection ID: $CONNECTION_ID"
echo "Database: sabong"
echo ""

# Test 1: Get schemas
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: GET /api/connections/:id/db/schemas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/schemas" | python3 -m json.tool
echo ""
echo ""

# Test 2: Get database statistics
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: GET /api/connections/:id/db/stats"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/stats" | python3 -m json.tool
echo ""
echo ""

# Test 3: Get all tables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: GET /api/connections/:id/db/tables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables" | python3 -m json.tool | head -50
echo ""
echo ""

# Test 4: Get tables filtered by schema
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: GET /api/connections/:id/db/tables?schema=public"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables?schema=public" | python3 -m json.tool | head -50
echo ""
echo ""

# Test 5: Get table details (first table from public schema)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: GET /api/connections/:id/db/tables/:schema/:table"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FIRST_TABLE=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables?schema=public" | python3 -c "import sys, json; tables = json.load(sys.stdin); print(f\"{tables[0]['schema']}/{tables[0]['name']}\" if tables else '')")
if [ ! -z "$FIRST_TABLE" ]; then
  echo "Testing table: $FIRST_TABLE"
  curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$FIRST_TABLE" | python3 -m json.tool | head -100
else
  echo "No tables found in public schema"
fi
echo ""
echo ""

# Test 6: Refresh schemas
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: POST /api/connections/:id/db/schemas/refresh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/connections/$CONNECTION_ID/db/schemas/refresh" | python3 -m json.tool
echo ""
echo ""

echo "✅ All tests completed!"

