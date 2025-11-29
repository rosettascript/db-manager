#!/bin/bash

# Phase 10: Comprehensive Integration Test
# Tests all API endpoints end-to-end with a real database connection

BASE_URL="http://localhost:3000/api"
CONN_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Phase 10: Comprehensive Integration Test"
echo "=========================================="
echo ""

PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_code="${5:-200}"
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$url")
    elif [ "$method" = "POST" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url")
    elif [ "$method" = "PUT" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$url")
    elif [ "$method" = "DELETE" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "$url")
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    
    # For POST requests, accept both 200 and 201 as success
    if [ "$method" = "POST" ] && [ -z "$5" ]; then
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
            echo -e "${GREEN}✅ PASS${NC} - HTTP $HTTP_CODE"
            ((PASSED++))
            return 0
        fi
    fi
    
    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} - HTTP $HTTP_CODE"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - Expected HTTP $expected_code, got $HTTP_CODE"
        echo "$BODY" | head -3
        ((FAILED++))
        return 1
    fi
}

# Step 1: Get connection (prefer working connection)
echo "Step 1: Getting connection ID..."
CONN_RESPONSE=$(curl -s "$BASE_URL/connections")
# Try to find a working connection (like "Sabong")
CONN_ID=$(echo "$CONN_RESPONSE" | jq -r '.[] | select(.name | contains("Sabong") or contains("sabong")) | .id' 2>/dev/null | head -1)

# If no working connection found, use first available
if [ -z "$CONN_ID" ] || [ "$CONN_ID" = "null" ]; then
    CONN_ID=$(echo "$CONN_RESPONSE" | jq -r '.[0].id' 2>/dev/null)
fi

if [ -z "$CONN_ID" ] || [ "$CONN_ID" = "null" ]; then
    echo -e "${RED}❌ No connection found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using connection: $CONN_ID${NC}"
echo ""

# Step 2: Connect
echo "Step 2: Connecting to database..."
test_endpoint "Connect to database" "POST" "$BASE_URL/connections/$CONN_ID/connect" "" "201"
sleep 2
echo ""

# Step 3: Connection Management Tests
echo "=========================================="
echo "Connection Management Tests"
echo "=========================================="
test_endpoint "List connections" "GET" "$BASE_URL/connections" "" "200"
test_endpoint "Get connection details" "GET" "$BASE_URL/connections/$CONN_ID" "" "200"
test_endpoint "Get connection status" "GET" "$BASE_URL/connections/$CONN_ID/status" "" "200"
echo ""

# Step 4: Schema & Metadata Tests
echo "=========================================="
echo "Schema & Metadata Tests"
echo "=========================================="
test_endpoint "List schemas" "GET" "$BASE_URL/connections/$CONN_ID/db/schemas" "" "200"
test_endpoint "Get database stats" "GET" "$BASE_URL/connections/$CONN_ID/db/stats" "" "200"
test_endpoint "List tables" "GET" "$BASE_URL/connections/$CONN_ID/db/tables" "" "200"

# Get a table for further tests
TABLES=$(curl -s "$BASE_URL/connections/$CONN_ID/db/tables")
SCHEMA=$(echo "$TABLES" | jq -r '.[0].schema' 2>/dev/null || echo "public")
TABLE=$(echo "$TABLES" | jq -r '.[0].name' 2>/dev/null)

if [ ! -z "$TABLE" ] && [ "$TABLE" != "null" ]; then
    test_endpoint "Get table details" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE" "" "200"
    echo ""
    
    # Step 5: Table Data Tests
    echo "=========================================="
    echo "Table Data Tests"
    echo "=========================================="
    test_endpoint "Get table data" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/data?page=1&pageSize=10" "" "200"
    test_endpoint "Get table count" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/count" "" "200"
    echo ""
    
    # Step 6: ER Diagram Tests
    echo "=========================================="
    echo "ER Diagram Tests"
    echo "=========================================="
    test_endpoint "Get ER diagram" "GET" "$BASE_URL/connections/$CONN_ID/db/diagram" "" "200"
    test_endpoint "Get table relationships" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/relationships" "" "200"
    echo ""
    
    # Step 7: Export Tests
    echo "=========================================="
    echo "Export Tests"
    echo "=========================================="
    test_endpoint "Export table as CSV" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/export?format=csv&limit=5" "" "200"
    test_endpoint "Export table as JSON" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/export?format=json&limit=5" "" "200"
    echo ""
    
    # Step 8: Foreign Key Navigation Tests
    echo "=========================================="
    echo "Foreign Key Navigation Tests"
    echo "=========================================="
    # Get a row ID first
    ROW_DATA=$(curl -s "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/data?page=1&pageSize=1")
    ROW_ID=$(echo "$ROW_DATA" | jq -r '.data[0].id' 2>/dev/null)
    
    if [ ! -z "$ROW_ID" ] && [ "$ROW_ID" != "null" ]; then
        test_endpoint "Get row by ID" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/$SCHEMA/$TABLE/row/$ROW_ID" "" "200"
    else
        echo -e "${YELLOW}⚠️  Skipping row lookup (no ID column found)${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  No tables found, skipping table-specific tests${NC}"
    echo ""
fi

    # Step 9: Query Execution Tests
echo "=========================================="
echo "Query Execution Tests"
echo "=========================================="
QUERY_BODY='{"query":"SELECT 1 as test","timeout":10,"maxRows":10}'
test_endpoint "Execute query" "POST" "$BASE_URL/connections/$CONN_ID/query" "$QUERY_BODY" "201"

EXPLAIN_BODY='{"query":"SELECT 1","analyze":false}'
test_endpoint "Explain query" "POST" "$BASE_URL/connections/$CONN_ID/query/explain" "$EXPLAIN_BODY" "201"
echo ""

# Step 10: Query History Tests
echo "=========================================="
echo "Query History Tests"
echo "=========================================="
test_endpoint "Get query history" "GET" "$BASE_URL/connections/$CONN_ID/query-history" "" "200"
test_endpoint "List saved queries" "GET" "$BASE_URL/connections/$CONN_ID/queries" "" "200"
echo ""

# Step 11: Error Handling Tests
echo "=========================================="
echo "Error Handling Tests"
echo "=========================================="
test_endpoint "Invalid connection ID" "GET" "$BASE_URL/connections/invalid_id/db/schemas" "" "404"
test_endpoint "Invalid table path" "GET" "$BASE_URL/connections/$CONN_ID/db/tables/invalid_schema/invalid_table" "" "404"
echo ""

# Summary
echo "=========================================="
echo "Integration Test Summary"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "Success Rate: ${SUCCESS_RATE}%"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All integration tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

