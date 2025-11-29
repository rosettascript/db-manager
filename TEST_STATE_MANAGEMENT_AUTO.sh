#!/bin/bash

# State Management Automated Test Script
# Tests state management utilities and configuration

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Print test header
print_test() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    TOTAL=$((TOTAL + 1))
}

# Print pass
print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    PASSED=$((PASSED + 1))
}

# Print fail
print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    FAILED=$((FAILED + 1))
}

echo "🧪 State Management Automated Tests"
echo "===================================="

# Test 1: Check if query keys file exists
print_test "Query Keys File Exists"
if [ -f "frontend/src/lib/query/queryKeys.ts" ]; then
    print_pass "queryKeys.ts file exists"
else
    print_fail "queryKeys.ts file not found"
fi

# Test 2: Check if query config file exists
print_test "Query Config File Exists"
if [ -f "frontend/src/lib/query/queryConfig.ts" ]; then
    print_pass "queryConfig.ts file exists"
else
    print_fail "queryConfig.ts file not found"
fi

# Test 3: Check if cache utils file exists
print_test "Cache Utils File Exists"
if [ -f "frontend/src/lib/query/cacheUtils.ts" ]; then
    print_pass "cacheUtils.ts file exists"
else
    print_fail "cacheUtils.ts file not found"
fi

# Test 4: Validate queryKeys.ts structure
print_test "Query Keys Structure Validation"
QUERY_KEYS_FILE="frontend/src/lib/query/queryKeys.ts"
if [ -f "$QUERY_KEYS_FILE" ]; then
    # Check for required exports
    if grep -q "export const queryKeys" "$QUERY_KEYS_FILE"; then
        print_pass "queryKeys constant exported"
    else
        print_fail "queryKeys constant not found"
    fi
    
    if grep -q "export function getConnectionQueryKeys" "$QUERY_KEYS_FILE"; then
        print_pass "getConnectionQueryKeys function exported"
    else
        print_fail "getConnectionQueryKeys function not found"
    fi
    
    # Check for key structures
    if grep -q "connections:" "$QUERY_KEYS_FILE"; then
        print_pass "connections query keys defined"
    else
        print_fail "connections query keys not found"
    fi
    
    if grep -q "schemas:" "$QUERY_KEYS_FILE"; then
        print_pass "schemas query keys defined"
    else
        print_fail "schemas query keys not found"
    fi
    
    if grep -q "tables:" "$QUERY_KEYS_FILE"; then
        print_pass "tables query keys defined"
    else
        print_fail "tables query keys not found"
    fi
fi

# Test 5: Validate queryConfig.ts structure
print_test "Query Config Structure Validation"
QUERY_CONFIG_FILE="frontend/src/lib/query/queryConfig.ts"
if [ -f "$QUERY_CONFIG_FILE" ]; then
    # Check for required exports
    if grep -q "export const queryConfig" "$QUERY_CONFIG_FILE"; then
        print_pass "queryConfig constant exported"
    else
        print_fail "queryConfig constant not found"
    fi
    
    if grep -q "export function getDefaultQueryOptions" "$QUERY_CONFIG_FILE"; then
        print_pass "getDefaultQueryOptions function exported"
    else
        print_fail "getDefaultQueryOptions function not found"
    fi
    
    # Check for configuration objects
    if grep -q "cacheTime:" "$QUERY_CONFIG_FILE"; then
        print_pass "cacheTime configuration defined"
    else
        print_fail "cacheTime configuration not found"
    fi
    
    if grep -q "staleTime:" "$QUERY_CONFIG_FILE"; then
        print_pass "staleTime configuration defined"
    else
        print_fail "staleTime configuration not found"
    fi
    
    if grep -q "retry:" "$QUERY_CONFIG_FILE"; then
        print_pass "retry configuration defined"
    else
        print_fail "retry configuration not found"
    fi
    
    if grep -q "refetch:" "$QUERY_CONFIG_FILE"; then
        print_pass "refetch configuration defined"
    else
        print_fail "refetch configuration not found"
    fi
fi

# Test 6: Validate cacheUtils.ts structure
print_test "Cache Utils Structure Validation"
CACHE_UTILS_FILE="frontend/src/lib/query/cacheUtils.ts"
if [ -f "$CACHE_UTILS_FILE" ]; then
    # Check for required functions
    if grep -q "export function invalidateConnectionCache" "$CACHE_UTILS_FILE"; then
        print_pass "invalidateConnectionCache function exported"
    else
        print_fail "invalidateConnectionCache function not found"
    fi
    
    if grep -q "export function invalidateSchemaCache" "$CACHE_UTILS_FILE"; then
        print_pass "invalidateSchemaCache function exported"
    else
        print_fail "invalidateSchemaCache function not found"
    fi
    
    if grep -q "export function invalidateTableDataCache" "$CACHE_UTILS_FILE"; then
        print_pass "invalidateTableDataCache function exported"
    else
        print_fail "invalidateTableDataCache function not found"
    fi
    
    if grep -q "export function clearAllCaches" "$CACHE_UTILS_FILE"; then
        print_pass "clearAllCaches function exported"
    else
        print_fail "clearAllCaches function not found"
    fi
fi

# Test 7: Validate query/index.ts exports
print_test "Query Index Exports Validation"
QUERY_INDEX_FILE="frontend/src/lib/query/index.ts"
if [ -f "$QUERY_INDEX_FILE" ]; then
    if grep -q "export.*from './queryKeys'" "$QUERY_INDEX_FILE"; then
        print_pass "queryKeys exported from index"
    else
        print_fail "queryKeys not exported from index"
    fi
    
    if grep -q "export.*from './queryConfig'" "$QUERY_INDEX_FILE"; then
        print_pass "queryConfig exported from index"
    else
        print_fail "queryConfig not exported from index"
    fi
    
    if grep -q "export.*from './cacheUtils'" "$QUERY_INDEX_FILE"; then
        print_pass "cacheUtils exported from index"
    else
        print_fail "cacheUtils not exported from index"
    fi
fi

# Test 8: Validate App.tsx uses queryConfig
print_test "App.tsx QueryConfig Integration"
APP_FILE="frontend/src/App.tsx"
if [ -f "$APP_FILE" ]; then
    if grep -q "import.*queryConfig.*from.*queryConfig" "$APP_FILE"; then
        print_pass "App.tsx imports queryConfig"
    else
        print_fail "App.tsx does not import queryConfig"
    fi
    
    if grep -q "queryConfig.retry" "$APP_FILE"; then
        print_pass "App.tsx uses queryConfig.retry"
    else
        print_fail "App.tsx does not use queryConfig.retry"
    fi
fi

# Test 9: Validate ConnectionContext uses query keys
print_test "ConnectionContext Query Keys Integration"
CONNECTION_CONTEXT_FILE="frontend/src/contexts/ConnectionContext.tsx"
if [ -f "$CONNECTION_CONTEXT_FILE" ]; then
    if grep -q "import.*queryKeys.*from" "$CONNECTION_CONTEXT_FILE"; then
        print_pass "ConnectionContext imports queryKeys"
    else
        print_fail "ConnectionContext does not import queryKeys"
    fi
    
    if grep -q "queryKeys.connections.all" "$CONNECTION_CONTEXT_FILE"; then
        print_pass "ConnectionContext uses queryKeys.connections.all"
    else
        print_fail "ConnectionContext does not use queryKeys.connections.all"
    fi
fi

# Test 10: Check cache time values are reasonable
print_test "Cache Time Values Validation"
if [ -f "$QUERY_CONFIG_FILE" ]; then
    # Check if cache times are defined with reasonable values
    if grep -q "long: 5 \* 60 \* 1000" "$QUERY_CONFIG_FILE" || grep -q "long: 300000" "$QUERY_CONFIG_FILE"; then
        print_pass "Long cache time is 5 minutes (300000ms)"
    else
        print_fail "Long cache time value not found or incorrect"
    fi
    
    if grep -q "medium: 2 \* 60 \* 1000" "$QUERY_CONFIG_FILE" || grep -q "medium: 120000" "$QUERY_CONFIG_FILE"; then
        print_pass "Medium cache time is 2 minutes (120000ms)"
    else
        print_fail "Medium cache time value not found or incorrect"
    fi
    
    if grep -q "short: 30 \* 1000" "$QUERY_CONFIG_FILE" || grep -q "short: 30000" "$QUERY_CONFIG_FILE"; then
        print_pass "Short cache time is 30 seconds (30000ms)"
    else
        print_fail "Short cache time value not found or incorrect"
    fi
fi

# Print summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Test Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total Tests: ${TOTAL}"
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with appropriate code
if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

