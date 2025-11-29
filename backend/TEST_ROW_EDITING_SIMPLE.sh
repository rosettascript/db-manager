#!/bin/bash

# Simple test script for Row Editing APIs
# Tests insert and update row endpoints

BASE_URL="http://localhost:3000/api"
CONNECTION_ID="${1:-}"
SCHEMA="${2:-public}"
TABLE="${3:-}"

if [ -z "$CONNECTION_ID" ] || [ -z "$TABLE" ]; then
  echo "Usage: ./TEST_ROW_EDITING_SIMPLE.sh <CONNECTION_ID> <SCHEMA> <TABLE>"
  echo "Example: ./TEST_ROW_EDITING_SIMPLE.sh conn_123 public users"
  exit 1
fi

echo "🧪 Testing Row Editing APIs"
echo "Connection: $CONNECTION_ID"
echo "Table: $SCHEMA.$TABLE"
echo ""

# Test 1: Get table details
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Get table structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE" | python3 -m json.tool | head -80
echo ""
echo ""

# Test 2: Get first row to see data structure
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Get sample row"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SAMPLE=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/data?pageSize=1")
echo "$SAMPLE" | python3 -m json.tool
echo ""
echo ""

# Test 3: Test INSERT endpoint (with empty data - will show error)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: INSERT row endpoint (empty data - will show error)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/row" \
  -H "Content-Type: application/json" \
  -d '{"data": {}}' | python3 -m json.tool
echo ""
echo ""

# Test 4: Test UPDATE endpoint (will need actual row ID)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: UPDATE row endpoint structure (use actual row ID)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Endpoint: PUT $BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/row/{rowId}"
echo "Body: {\"data\": {\"column_name\": \"value\"}}"
echo ""
echo "✅ API endpoints are ready to test!"
echo ""



