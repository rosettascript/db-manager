#!/bin/bash

# API Foundation Test Script
# Quick command-line test to verify API connectivity

BASE_URL="http://localhost:3000/api"

echo "🧪 Testing API Foundation..."
echo "=============================="
echo ""

PASSED=0
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_code="${4:-200}"
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/$endpoint")
    elif [ "$method" = "POST" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/$endpoint")
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    
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

# Test 1: Health Check
echo "1. Health Check"
test_endpoint "GET /api/health" "GET" "health" "200"
echo ""

# Test 2: List Connections
echo "2. List Connections"
test_endpoint "GET /api/connections" "GET" "connections" "200"
echo ""

# Test 3: Error Handling (404)
echo "3. Error Handling (404)"
test_endpoint "GET /api/connections/nonexistent-id" "GET" "connections/nonexistent-id-12345" "404"
echo ""

# Summary
echo "=============================="
echo "Test Results Summary"
echo "=============================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "Success Rate: ${SUCCESS_RATE}%"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! API foundation is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

