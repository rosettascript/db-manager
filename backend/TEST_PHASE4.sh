#!/bin/bash

# Test Phase 4: Table Data Operations with real database

BASE_URL="http://localhost:3000/api"
CONNECTION_ID="conn_1764401629369_ayww2mbaq"
SCHEMA="public"
TABLE="_prisma_migrations"

echo "🧪 Phase 4 Testing - Table Data Operations"
echo "============================================="
echo ""
echo "Connection ID: $CONNECTION_ID"
echo "Database: sabong"
echo "Table: $SCHEMA.$TABLE"
echo ""

# Test 1: Basic pagination
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Get table data (basic pagination)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/data?page=1&pageSize=5" | python3 -m json.tool
echo ""
echo ""

# Test 2: Get table count
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Get table count"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/count" | python3 -m json.tool
echo ""
echo ""

# Test 3: Search functionality
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Search functionality (search='init')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/data?search=init&pageSize=3" | python3 -m json.tool | head -40
echo ""
echo ""

# Test 4: Sorting (ascending)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Sorting (ascending by migration_name)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/data?sortColumn=migration_name&sortDirection=asc&pageSize=3" | python3 -m json.tool | head -40
echo ""
echo ""

# Test 5: Sorting (descending)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Sorting (descending by migration_name)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/data?sortColumn=migration_name&sortDirection=desc&pageSize=3" | python3 -m json.tool | head -40
echo ""
echo ""

# Test 6: Column selection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Column selection (id, migration_name)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/data?columns=id,migration_name&pageSize=3" | python3 -m json.tool | head -40
echo ""
echo ""

# Test 7: Filtering (contains operator)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 7: Filtering (contains operator)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FILTERS='[{"column":"migration_name","operator":"contains","value":"init"}]'
FILTERS_ENC=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$FILTERS")
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/data?filters=$FILTERS_ENC&pageSize=3" | python3 -m json.tool | head -40
echo ""
echo ""

# Test 8: Combined (search + sort + pagination)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Combined features (search + sort + pagination)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/data?search=init&sortColumn=migration_name&sortDirection=asc&page=1&pageSize=2" | python3 -m json.tool | head -40
echo ""
echo ""

# Test 9: Count with filter
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 9: Count with filter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FILTERS='[{"column":"migration_name","operator":"contains","value":"init"}]'
FILTERS_ENC=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$FILTERS")
curl -s "$BASE_URL/connections/$CONNECTION_ID/tables/$SCHEMA/$TABLE/count?filters=$FILTERS_ENC" | python3 -m json.tool
echo ""
echo ""

echo "✅ All tests completed!"

