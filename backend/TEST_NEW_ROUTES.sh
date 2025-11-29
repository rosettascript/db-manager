#!/bin/bash

# Test script for new schema routes with /db/ prefix

BASE_URL="http://localhost:3000/api"
CONNECTION_ID="conn_1764400374810_5erv4j64z"

echo "🧪 Testing New Schema Routes (with /db/ prefix)"
echo "================================================"
echo ""

# Test 1: Refresh schemas (should work without connection)
echo "Test 1: POST /api/connections/:id/db/schemas/refresh"
curl -s -X POST "$BASE_URL/connections/$CONNECTION_ID/db/schemas/refresh" | python3 -m json.tool
echo ""
echo ""

# Test 2: Get schemas (should return error - connection not connected)
echo "Test 2: GET /api/connections/:id/db/schemas"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/schemas" | python3 -m json.tool
echo ""
echo ""

# Test 3: Get stats
echo "Test 3: GET /api/connections/:id/db/stats"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/stats" | python3 -m json.tool
echo ""
echo ""

# Test 4: Get tables
echo "Test 4: GET /api/connections/:id/db/tables"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables" | python3 -m json.tool
echo ""
echo ""

# Test 5: Verify ConnectionsController still works
echo "Test 5: GET /api/connections/:id (should still work)"
curl -s "$BASE_URL/connections/$CONNECTION_ID" | python3 -m json.tool
echo ""
echo ""

# Test 6: Test non-existent route
echo "Test 6: GET /api/connections/:id/db (should 404)"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db" | python3 -m json.tool
echo ""
echo ""

echo "✅ Route tests completed!"

