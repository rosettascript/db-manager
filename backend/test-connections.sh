#!/bin/bash

# Connection API Test Script
BASE_URL="http://localhost:3000/api/connections"

echo "🧪 Testing Connection Management APIs"
echo "======================================"
echo ""

# Test 1: Get all connections (should be empty initially)
echo "📋 Test 1: GET /api/connections (List all)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 2: Create a connection
echo "➕ Test 2: POST /api/connections (Create)"
echo "-------------------------------------------"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Local PostgreSQL",
    "host": "localhost",
    "port": 5432,
    "database": "postgres",
    "username": "postgres",
    "password": "testpassword",
    "sslMode": "prefer"
  }')

echo "$CREATE_RESPONSE" | python3 -m json.tool || echo "$CREATE_RESPONSE"

# Extract connection ID (basic extraction)
CONNECTION_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null)
echo ""
echo "Connection ID: $CONNECTION_ID"
echo ""
echo ""

if [ -z "$CONNECTION_ID" ] || [ "$CONNECTION_ID" == "None" ]; then
  echo "❌ Failed to create connection. Cannot continue tests."
  exit 1
fi

# Test 3: Get single connection
echo "🔍 Test 3: GET /api/connections/$CONNECTION_ID (Get by ID)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL/$CONNECTION_ID" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 4: Test connection
echo "🧪 Test 4: POST /api/connections/$CONNECTION_ID/test (Test Connection)"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/$CONNECTION_ID/test" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 5: Get connection status
echo "📊 Test 5: GET /api/connections/$CONNECTION_ID/status (Get Status)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL/$CONNECTION_ID/status" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 6: Update connection
echo "✏️  Test 6: PUT /api/connections/$CONNECTION_ID (Update)"
echo "-------------------------------------------"
curl -s -X PUT "$BASE_URL/$CONNECTION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Connection",
    "port": 5433
  }' | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 7: Get all connections again (should have 1 now)
echo "📋 Test 7: GET /api/connections (List all - after create)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 8: Connect to database (if connection is valid)
echo "🔌 Test 8: POST /api/connections/$CONNECTION_ID/connect (Connect)"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/$CONNECTION_ID/connect" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 9: Get status after connect
echo "📊 Test 9: GET /api/connections/$CONNECTION_ID/status (After Connect)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL/$CONNECTION_ID/status" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 10: Disconnect
echo "🔌 Test 10: POST /api/connections/$CONNECTION_ID/disconnect (Disconnect)"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/$CONNECTION_ID/disconnect" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

# Test 11: Delete connection
echo "🗑️  Test 11: DELETE /api/connections/$CONNECTION_ID (Delete)"
echo "-------------------------------------------"
curl -s -X DELETE "$BASE_URL/$CONNECTION_ID" -w "\nHTTP Status: %{http_code}\n" || echo "Failed"
echo ""
echo ""

# Test 12: Verify deletion
echo "✅ Test 12: GET /api/connections (Verify deletion)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL" | python3 -m json.tool || echo "Failed"
echo ""
echo ""

echo "✅ All tests completed!"
echo "======================================"

