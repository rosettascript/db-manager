#!/bin/bash

# Test script for Phase 12.7 - Data Export Integration
# Tests table export and query export endpoints

set -e

BASE_URL="http://localhost:3000/api"
CONNECTION_ID="conn_1764401629369_ayww2mbaq"  # Sabong Test DB
SCHEMA="public"
TABLE="_prisma_migrations"  # Table known to exist in sabong database

echo "🧪 Testing Phase 12.7 - Data Export Integration"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=${4:-200}
    local data=$5
    
    echo -n "Testing: $description... "
    
    if [ "$method" == "GET" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint?$data" \
                -H "Content-Type: application/json" \
                -o /tmp/export_test_response.bin)
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -o /tmp/export_test_response.bin)
        fi
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -o /tmp/export_test_response.bin)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Check if file was downloaded (for export endpoints)
        if [ -f /tmp/export_test_response.bin ] && [ -s /tmp/export_test_response.bin ]; then
            file_size=$(stat -f%z /tmp/export_test_response.bin 2>/dev/null || stat -c%s /tmp/export_test_response.bin 2>/dev/null || echo "0")
            if [ "$file_size" -gt 0 ]; then
                echo "  → File size: $file_size bytes"
            fi
        fi
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        
        # Show error response if available
        if [ -f /tmp/export_test_response.bin ]; then
            error_msg=$(cat /tmp/export_test_response.bin | head -c 500 2>/dev/null || echo "")
            if [ -n "$error_msg" ]; then
                echo "  → Error: $error_msg"
            fi
        fi
        return 1
    fi
}

echo "📋 Test Configuration:"
echo "   Connection ID: $CONNECTION_ID"
echo "   Schema: $SCHEMA"
echo "   Table: $TABLE"
echo ""

# Check if server is running
echo "Checking if server is running..."
if ! curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running at $BASE_URL${NC}"
    echo "Please start the backend server first:"
    echo "  cd backend && npm run start:dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test 1: Export table data as CSV
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Export Table Data (CSV)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export" \
    "Export table as CSV (no filters)" \
    200 \
    "format=csv&includeHeaders=true"

# Test 2: Export table data as JSON
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Export Table Data (JSON)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export" \
    "Export table as JSON (no headers)" \
    200 \
    "format=json&includeHeaders=false"

# Test 3: Export table with filters
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Export Table Data (with filters)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FILTERS='[{"column":"id","operator":">","value":"0"}]'
test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export" \
    "Export table as CSV with filters" \
    200 \
    "format=csv&includeHeaders=true&filters=$(echo "$FILTERS" | sed 's/ /%20/g' | sed 's/{/%7B/g' | sed 's/}/%7D/g')"

# Test 4: Export table with sorting
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Export Table Data (with sorting)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SORT='{"column":"id","direction":"desc"}'
test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export" \
    "Export table as CSV with sorting" \
    200 \
    "format=csv&includeHeaders=true&sort=$(echo "$SORT" | sed 's/ /%20/g' | sed 's/{/%7B/g' | sed 's/}/%7D/g')"

# Test 5: Export table with column selection
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Export Table Data (selected columns)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export" \
    "Export table as CSV with selected columns" \
    200 \
    "format=csv&includeHeaders=true&selectedColumns=id,name"

# Test 6: Export query results as CSV
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Export Query Results (CSV)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
QUERY='{"query":"SELECT id, name FROM '$SCHEMA'.$TABLE LIMIT 10","format":"csv","includeHeaders":true}'
test_endpoint "POST" \
    "/connections/$CONNECTION_ID/query/export" \
    "Export query results as CSV" \
    200 \
    "$QUERY"

# Test 7: Export query results as JSON
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 7: Export Query Results (JSON)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
QUERY_JSON='{"query":"SELECT * FROM '$SCHEMA'.$TABLE LIMIT 5","format":"json","includeHeaders":false}'
test_endpoint "POST" \
    "/connections/$CONNECTION_ID/query/export" \
    "Export query results as JSON" \
    200 \
    "$QUERY_JSON"

# Test 8: Invalid format (should fail)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Error Handling"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/export" \
    "Invalid export format (should fail)" \
    400 \
    "format=xml&includeHeaders=true"

# Test 9: Non-existent table (should fail)
echo ""
test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/nonexistent_table/export" \
    "Non-existent table (should fail)" \
    404 \
    "format=csv&includeHeaders=true"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All export tests passed!${NC}"
    echo ""
    echo "📝 Note: Export files were downloaded to /tmp/export_test_response.bin"
    echo "   You can inspect them to verify the export format and content."
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the errors above.${NC}"
    exit 1
fi

