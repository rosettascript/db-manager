#!/bin/bash

# Phase 8: Simple Data Export Test
BASE_URL="http://localhost:3000/api"
CONN_ID="conn_1764401629369_ayww2mbaq"

echo "=========================================="
echo "Phase 8: Data Export - Simple Tests"
echo "=========================================="
echo ""

# Ensure connection
echo "1. Ensuring connection..."
curl -s -X POST "$BASE_URL/connections/$CONN_ID/connect" > /dev/null
sleep 1
echo "✅ Connection checked"
echo ""

# Get a table
echo "2. Getting first table..."
TABLES=$(curl -s "$BASE_URL/connections/$CONN_ID/db/tables")
SCHEMA=$(echo "$TABLES" | jq -r '.[0].schema' 2>/dev/null || echo "public")
TABLE=$(echo "$TABLES" | jq -r '.[0].name' 2>/dev/null || echo "users")
echo "✅ Using: $SCHEMA.$TABLE"
echo ""

# Test CSV Export
echo "3. Testing CSV Export..."
CSV_OUTPUT=$(curl -s -w "\n%{http_code}" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/export?format=csv&limit=5")
HTTP_CODE=$(echo "$CSV_OUTPUT" | tail -1)
CSV_BODY=$(echo "$CSV_OUTPUT" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ CSV Export: HTTP 200"
    echo "$CSV_BODY" | head -3 | while IFS= read -r line; do
        echo "   $line"
    done
    echo "   ..."
else
    echo "❌ CSV Export: HTTP $HTTP_CODE"
    echo "$CSV_BODY" | head -5
fi
echo ""

# Test JSON Export
echo "4. Testing JSON Export..."
JSON_OUTPUT=$(curl -s -w "\n%{http_code}" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/export?format=json&limit=5")
HTTP_CODE=$(echo "$JSON_OUTPUT" | tail -1)
JSON_BODY=$(echo "$JSON_OUTPUT" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ JSON Export: HTTP 200"
    if echo "$JSON_BODY" | jq -e . >/dev/null 2>&1; then
        ITEMS=$(echo "$JSON_BODY" | jq '. | length' 2>/dev/null || echo "0")
        echo "   Valid JSON array with $ITEMS items"
        echo "$JSON_BODY" | jq '.[0]' 2>/dev/null | head -5 | while IFS= read -r line; do
            echo "   $line"
        done
    else
        echo "   ⚠️  Response is not valid JSON"
    fi
else
    echo "❌ JSON Export: HTTP $HTTP_CODE"
    echo "$JSON_BODY" | head -5
fi
echo ""

# Test Query Export
echo "5. Testing Query Export (CSV)..."
QUERY_BODY='{"query":"SELECT * FROM \"'$SCHEMA'\".\"'$TABLE'\" LIMIT 5","format":"csv","includeHeaders":true}'
QUERY_OUTPUT=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$QUERY_BODY" "$BASE_URL/connections/$CONN_ID/query/export")
HTTP_CODE=$(echo "$QUERY_OUTPUT" | tail -1)
QUERY_BODY_OUT=$(echo "$QUERY_OUTPUT" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Query Export: HTTP 200"
    echo "$QUERY_BODY_OUT" | head -3 | while IFS= read -r line; do
        echo "   $line"
    done
else
    echo "❌ Query Export: HTTP $HTTP_CODE"
    echo "$QUERY_BODY_OUT" | head -5
fi
echo ""

echo "=========================================="
echo "Testing Complete!"
echo "=========================================="

