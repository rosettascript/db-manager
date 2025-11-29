#!/bin/bash

# Phase 7: ER Diagram API Testing Script
# This script tests the ER diagram endpoints

BASE_URL="http://localhost:3000/api"
CONNECTION_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Phase 7: ER Diagram API Testing"
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
CONNECT_STATUS=$(echo $CONNECT_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$CONNECT_STATUS" = "connected" ]; then
    echo -e "${GREEN}✅ Connection established${NC}"
else
    echo -e "${YELLOW}⚠️  Connection status: $CONNECT_STATUS${NC}"
fi
echo ""

# Test 1: Get ER Diagram (all tables)
echo "Test 1: Get ER Diagram (all tables)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/diagram")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    NODE_COUNT=$(echo "$BODY" | grep -o '"nodes":\[' | wc -l)
    EDGE_COUNT=$(echo "$BODY" | grep -o '"edges":\[' | wc -l)
    HAS_NODES=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1)
    
    if [ ! -z "$HAS_NODES" ]; then
        NODES=$(echo "$BODY" | grep -o '"id":"[^"]*' | wc -l)
        echo -e "${GREEN}✅ Found $NODES nodes${NC}"
        print_result 0 "Get ER Diagram - All tables"
    else
        print_result 1 "Get ER Diagram - No nodes found"
    fi
else
    print_result 1 "Get ER Diagram" "HTTP $HTTP_STATUS"
    echo "$BODY" | head -20
fi
echo ""

# Test 2: Get ER Diagram with schema filter
echo "Test 2: Get ER Diagram (filtered by schema)"
echo "--------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/diagram?schemas=public")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    HAS_NODES=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1)
    if [ ! -z "$HAS_NODES" ]; then
        print_result 0 "Get ER Diagram - Filtered by schema"
    else
        print_result 1 "Get ER Diagram - No nodes found"
    fi
else
    print_result 1 "Get ER Diagram - Filtered" "HTTP $HTTP_STATUS"
fi
echo ""

# Test 3: Get ER Diagram without isolated tables
echo "Test 3: Get ER Diagram (hide isolated tables)"
echo "----------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/diagram?showIsolatedTables=false")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    HAS_NODES=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1)
    if [ ! -z "$HAS_NODES" ]; then
        print_result 0 "Get ER Diagram - Hide isolated tables"
    else
        print_result 0 "Get ER Diagram - Hide isolated tables (no connected tables found)"
    fi
else
    print_result 1 "Get ER Diagram - Hide isolated" "HTTP $HTTP_STATUS"
fi
echo ""

# Test 4: Get table relationships (need to find a table first)
echo "Test 4: Get table relationships"
echo "--------------------------------"
# First, get a table from the diagram
DIAGRAM_RESPONSE=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/diagram")
FIRST_NODE_ID=$(echo "$DIAGRAM_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$FIRST_NODE_ID" ]; then
    # Extract schema and table from ID (format: schema.table)
    SCHEMA=$(echo "$FIRST_NODE_ID" | cut -d'.' -f1)
    TABLE=$(echo "$FIRST_NODE_ID" | cut -d'.' -f2)
    
    echo "Testing with table: $SCHEMA.$TABLE"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/relationships")
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        HAS_OUTGOING=$(echo "$BODY" | grep -o '"outgoing":\[[^]]*\]' | head -1)
        HAS_INCOMING=$(echo "$BODY" | grep -o '"incoming":\[[^]]*\]' | head -1)
        print_result 0 "Get Table Relationships - $SCHEMA.$TABLE"
        
        if [ ! -z "$HAS_OUTGOING" ]; then
            OUTGOING_COUNT=$(echo "$BODY" | grep -o '"constraintName":"[^"]*' | wc -l)
            echo -e "${GREEN}  Found outgoing relationships${NC}"
        fi
        if [ ! -z "$HAS_INCOMING" ]; then
            echo -e "${GREEN}  Found incoming relationships${NC}"
        fi
    else
        print_result 1 "Get Table Relationships" "HTTP $HTTP_STATUS"
        echo "$BODY" | head -10
    fi
else
    print_result 1 "Get Table Relationships" "No tables found in diagram"
fi
echo ""

# Test 5: Invalid connection ID
echo "Test 5: Invalid connection ID"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/invalid_id/db/diagram")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" -eq 404 ]; then
    print_result 0 "Invalid connection ID returns 404"
else
    print_result 1 "Invalid connection ID" "Expected 404, got $HTTP_STATUS"
fi
echo ""

# Test 6: Invalid table path
echo "Test 6: Invalid table path"
echo "-------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/connections/$CONNECTION_ID/db/tables/invalid_schema/invalid_table/relationships")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" -eq 404 ] || [ "$HTTP_STATUS" -eq 500 ]; then
    print_result 0 "Invalid table path returns error"
else
    print_result 1 "Invalid table path" "Expected error, got $HTTP_STATUS"
fi
echo ""

echo "=========================================="
echo "Testing Complete!"
echo "=========================================="

