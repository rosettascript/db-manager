#!/bin/bash

# Quick test script for Row Editing APIs
# This script will guide you through testing or use provided values

BASE_URL="http://localhost:3000/api"

echo "🧪 Quick Test - Row Editing APIs"
echo "================================"
echo ""

# Test 1: Check server health
echo "1️⃣  Checking server health..."
HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Server is running"
else
  echo "❌ Server is not responding (HTTP $HTTP_CODE)"
  echo "Please start the server: cd backend && npm run start:dev"
  exit 1
fi
echo ""

# Test 2: Get connections
echo "2️⃣  Getting connections..."
CONNECTIONS=$(curl -s "$BASE_URL/connections")
CONN_COUNT=$(echo "$CONNECTIONS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")

if [ "$CONN_COUNT" = "0" ] || [ -z "$CONNECTIONS" ]; then
  echo "⚠️  No connections found. Please create a connection first."
  echo ""
  echo "To create a connection:"
  echo "  curl -X POST $BASE_URL/connections \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"name\": \"Test DB\", \"host\": \"localhost\", \"port\": 5432, \"database\": \"test\", \"username\": \"postgres\", \"password\": \"password\", \"sslMode\": \"prefer\"}'"
  exit 1
fi

echo "Found $CONN_COUNT connection(s)"
echo "$CONNECTIONS" | python3 -m json.tool | head -20
echo ""

# Get first connection ID
CONNECTION_ID=$(echo "$CONNECTIONS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if isinstance(data, list) and len(data) > 0 else '')" 2>/dev/null)

if [ -z "$CONNECTION_ID" ]; then
  echo "❌ Could not extract connection ID"
  exit 1
fi

echo "Using Connection ID: $CONNECTION_ID"
echo ""

# Test 3: Get schemas/tables
echo "3️⃣  Getting available tables..."
SCHEMAS=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/schemas" 2>&1)
echo "$SCHEMAS" | python3 -m json.tool 2>&1 | head -30

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Choose a table to test with"
echo "2. Test INSERT row API"
echo "3. Test UPDATE row API"
echo ""
echo "Example commands:"
echo ""
echo "  # Get table structure"
echo "  curl -s $BASE_URL/connections/$CONNECTION_ID/db/tables/SCHEMA/TABLE | python3 -m json.tool"
echo ""
echo "  # Test INSERT"
echo "  curl -X POST $BASE_URL/connections/$CONNECTION_ID/db/tables/SCHEMA/TABLE/row \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"data\": {\"column\": \"value\"}}' | python3 -m json.tool"
echo ""
echo "  # Test UPDATE"
echo "  curl -X PUT $BASE_URL/connections/$CONNECTION_ID/db/tables/SCHEMA/TABLE/row/ROW_ID \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"data\": {\"column\": \"new_value\"}}' | python3 -m json.tool"
echo ""





