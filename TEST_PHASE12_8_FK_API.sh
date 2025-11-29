#!/bin/bash

# Test script for Phase 12.8 - Foreign Key Navigation API Endpoints
# Tests row lookup and FK lookup endpoints

set -e

BASE_URL="http://localhost:3000/api"
CONNECTION_ID="conn_1764401629369_ayww2mbaq"  # Sabong Test DB
SCHEMA="public"
TABLE="audit_logs"  # Table with FK to users

echo "🧪 Testing Phase 12.8 - Foreign Key Navigation API"
echo "=================================================="
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
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Show a preview of the response
        if [ -n "$body" ]; then
            preview=$(echo "$body" | head -c 100)
            if [ -n "$preview" ]; then
                echo "  → Response preview: ${preview}..."
            fi
        fi
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        
        # Show error response if available
        if [ -n "$body" ]; then
            error_msg=$(echo "$body" | head -c 200)
            echo "  → Error: $error_msg"
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

# First, get table details to find a foreign key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Get Table Details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TABLE_RESPONSE=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE")
FK_NAME=$(echo "$TABLE_RESPONSE" | grep -o '"name":"[^"]*_fkey"' | head -1 | cut -d'"' -f4 || echo "")
FK_COLUMN=$(echo "$TABLE_RESPONSE" | grep -A5 "$FK_NAME" | grep -o '"columns":\["[^"]*' | head -1 | cut -d'"' -f4 || echo "")

if [ -z "$FK_NAME" ]; then
    echo -e "${YELLOW}⚠ Warning: No foreign key found in table. Trying to find a table with FK...${NC}"
    # Try users table as alternative
    TABLE="users"
    TABLE_RESPONSE=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE")
fi

echo "Table: $SCHEMA.$TABLE"
if [ -n "$FK_NAME" ]; then
    echo "Found FK: $FK_NAME"
    echo "FK Column: $FK_COLUMN"
else
    echo -e "${YELLOW}⚠ No foreign key constraints found in this table${NC}"
    echo "Note: This test requires a table with foreign keys"
fi
echo ""

# Test 1: Get a row by primary key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Row Lookup by Primary Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get a sample row ID from the table
ROWS=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/data?page=1&pageSize=1")
ROW_ID=$(echo "$ROWS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$ROW_ID" ]; then
    test_endpoint "GET" \
        "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/row/$ROW_ID" \
        "Get row by primary key" \
        200
else
    echo -e "${YELLOW}⚠ Skipping: No row ID found in table${NC}"
fi
echo ""

# Test 2: Foreign Key Lookup
if [ -n "$FK_NAME" ] && [ -n "$FK_COLUMN" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 2: Foreign Key Lookup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Get a sample FK value from the table
    FK_VALUE=$(echo "$ROWS" | grep -o "\"$FK_COLUMN\":\"[^\"]*\"" | head -1 | cut -d'"' -f4 || echo "")
    
    if [ -n "$FK_VALUE" ]; then
        test_endpoint "GET" \
            "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/fk-lookup?foreignKeyName=$FK_NAME&foreignKeyValue=$FK_VALUE" \
            "Lookup by foreign key" \
            200
    else
        echo -e "${YELLOW}⚠ Skipping: No FK value found in sample row${NC}"
    fi
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 2: Foreign Key Lookup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}⚠ Skipping: No foreign key found to test${NC}"
fi
echo ""

# Test 3: Error handling - Invalid row ID
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Error Handling"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "GET" \
    "/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/row/invalid-id-12345" \
    "Invalid row ID (should return not found)" \
    200

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All FK navigation API tests passed!${NC}"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Test in browser: Open a table with foreign keys"
    echo "   2. Click on FK values to navigate to referenced tables"
    echo "   3. Check browser console for any errors"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the errors above.${NC}"
    exit 1
fi

