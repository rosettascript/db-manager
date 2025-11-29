#!/bin/bash

# Phase 8: Data Export API Testing Script
# This script tests the data export endpoints

BASE_URL="http://localhost:3000/api"
CONNECTION_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Phase 8: Data Export API Testing"
echo "=========================================="
echo ""

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        if [ ! -z "$3" ]; then
            echo -e "${RED}   Error: $3${NC}"
        fi
    fi
    echo ""
}

# Step 1: Get connection ID
echo "Step 1: Getting connection ID..."
CONNECTIONS_RESPONSE=$(curl -s "$BASE_URL/connections")
CONNECTION_ID=$(echo $CONNECTIONS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$CONNECTION_ID" ]; then
    echo -e "${RED}❌ No connection found. Please create a connection first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found connection: $CONNECTION_ID${NC}"
echo ""

# Step 2: Ensure connection is connected
echo "Step 2: Ensuring connection is connected..."
CONNECT_RESPONSE=$(curl -s -X POST "$BASE_URL/connections/$CONNECTION_ID/connect")
CONNECT_STATUS=$(echo $CONNECT_RESPONSE | grep -o '"success":true' | head -1)

if [ ! -z "$CONNECT_STATUS" ]; then
    echo -e "${GREEN}✅ Connection established${NC}"
else
    echo -e "${YELLOW}⚠️  Connection may need attention${NC}"
fi
echo ""

# Step 3: Get a table to export from
echo "Step 3: Getting a table for export testing..."
TABLES_RESPONSE=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables")
SCHEMA=$(echo "$TABLES_RESPONSE" | jq -r '.[0].schema' 2>/dev/null)
TABLE=$(echo "$TABLES_RESPONSE" | jq -r '.[0].name' 2>/dev/null)

if [ -z "$TABLE" ] || [ "$TABLE" = "null" ]; then
    echo -e "${RED}❌ No tables found in database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using table: $SCHEMA.$TABLE${NC}"
echo ""

# Test 1: Export table as CSV (basic)
echo "Test 1: Export Table as CSV (basic)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export?format=csv&limit=10")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    # Check if response looks like CSV
    FIRST_LINE=$(echo "$BODY" | head -1)
    if [[ "$FIRST_LINE" == *","* ]] || [[ "$BODY" == *"text/csv"* ]]; then
        LINE_COUNT=$(echo "$BODY" | wc -l)
        echo -e "${GREEN}✅ SUCCESS - HTTP $HTTP_STATUS${NC}"
        echo "   CSV file received ($LINE_COUNT lines)"
        echo "   First line preview: ${FIRST_LINE:0:80}..."
        print_result 0 "Export Table as CSV - Basic"
    else
        print_result 1 "Export Table as CSV - Invalid format"
    fi
else
    print_result 1 "Export Table as CSV" "HTTP $HTTP_STATUS"
    echo "$BODY" | head -10
fi
echo ""

# Test 2: Export table as CSV (without headers)
echo "Test 2: Export Table as CSV (no headers)"
echo "-----------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export?format=csv&includeHeaders=false&limit=5")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Export Table as CSV - No headers"
else
    print_result 1 "Export Table as CSV - No headers" "HTTP $HTTP_STATUS"
fi
echo ""

# Test 3: Export table as JSON
echo "Test 3: Export Table as JSON"
echo "----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export?format=json&limit=10")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    # Check if response looks like JSON array
    if echo "$BODY" | jq -e . >/dev/null 2>&1; then
        ARRAY_LENGTH=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ SUCCESS - HTTP $HTTP_STATUS${NC}"
        echo "   JSON array received ($ARRAY_LENGTH items)"
        print_result 0 "Export Table as JSON"
    else
        print_result 1 "Export Table as JSON - Invalid format"
    fi
else
    print_result 1 "Export Table as JSON" "HTTP $HTTP_STATUS"
    echo "$BODY" | head -10
fi
echo ""

# Test 4: Export table with filters
echo "Test 4: Export Table with Filters"
echo "----------------------------------"
# Get first column name from the table
COLUMN_RESPONSE=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE")
FIRST_COLUMN=$(echo "$COLUMN_RESPONSE" | jq -r '.columns[0].name' 2>/dev/null)

if [ ! -z "$FIRST_COLUMN" ] && [ "$FIRST_COLUMN" != "null" ]; then
    FILTERS='[{"column":"'$FIRST_COLUMN'","operator":"is_not_null","value":""}]'
    FILTERS_ENCODED=$(echo "$FILTERS" | jq -rR @uri)
    
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export?format=csv&filters=$FILTERS_ENCODED&limit=5")
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        print_result 0 "Export Table with Filters"
    else
        print_result 1 "Export Table with Filters" "HTTP $HTTP_STATUS"
    fi
else
    print_result 0 "Export Table with Filters - Skipped (no columns)"
fi
echo ""

# Test 5: Export query results as CSV
echo "Test 5: Export Query Results as CSV"
echo "------------------------------------"
QUERY_BODY='{"query":"SELECT * FROM \"'$SCHEMA'\".\"'$TABLE'\" LIMIT 10","format":"csv","includeHeaders":true,"maxRows":10}'
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$QUERY_BODY" \
    "$BASE_URL/connections/$CONNECTION_ID/query/export")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    FIRST_LINE=$(echo "$BODY" | head -1)
    if [[ "$FIRST_LINE" == *","* ]]; then
        echo -e "${GREEN}✅ SUCCESS - HTTP $HTTP_STATUS${NC}"
        echo "   CSV file received from query"
        print_result 0 "Export Query Results as CSV"
    else
        print_result 1 "Export Query Results as CSV - Invalid format"
    fi
else
    print_result 1 "Export Query Results as CSV" "HTTP $HTTP_STATUS"
    echo "$BODY" | head -10
fi
echo ""

# Test 6: Export query results as JSON
echo "Test 6: Export Query Results as JSON"
echo "-------------------------------------"
QUERY_BODY='{"query":"SELECT * FROM \"'$SCHEMA'\".\"'$TABLE'\" LIMIT 10","format":"json","includeHeaders":true,"maxRows":10}'
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$QUERY_BODY" \
    "$BASE_URL/connections/$CONNECTION_ID/query/export")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    if echo "$BODY" | jq -e . >/dev/null 2>&1; then
        echo -e "${GREEN}✅ SUCCESS - HTTP $HTTP_STATUS${NC}"
        echo "   JSON file received from query"
        print_result 0 "Export Query Results as JSON"
    else
        print_result 1 "Export Query Results as JSON - Invalid format"
    fi
else
    print_result 1 "Export Query Results as JSON" "HTTP $HTTP_STATUS"
    echo "$BODY" | head -10
fi
echo ""

# Test 7: Invalid format
echo "Test 7: Invalid Export Format"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export?format=invalid&limit=5")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" -eq 400 ] || [ "$HTTP_STATUS" -eq 422 ]; then
    print_result 0 "Invalid Export Format returns error"
else
    print_result 1 "Invalid Export Format" "Expected error, got $HTTP_STATUS"
fi
echo ""

# Test 8: Invalid connection ID
echo "Test 8: Invalid Connection ID"
echo "------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/invalid_id/db/tables/public/test/export?format=csv")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" -eq 404 ]; then
    print_result 0 "Invalid Connection ID returns 404"
else
    print_result 1 "Invalid Connection ID" "Expected 404, got $HTTP_STATUS"
fi
echo ""

echo "=========================================="
echo "Testing Complete!"
echo "=========================================="

