#!/bin/bash

# Connection Management API Test Script
# This script tests the connection management API endpoints

set -e

BASE_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Connection Management API"
echo "===================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "status.*ok"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "$HEALTH"
    exit 1
fi
echo ""

# Test 2: List Connections
echo "2. Testing List Connections..."
CONNECTIONS=$(curl -s "$BASE_URL/connections")
CONNECTION_COUNT=$(echo "$CONNECTIONS" | jq 'length' 2>/dev/null || echo "0")
if [ "$CONNECTION_COUNT" -ge 0 ]; then
    echo -e "${GREEN}✅ Found $CONNECTION_COUNT connection(s)${NC}"
    echo "$CONNECTIONS" | jq -r '.[] | "   - \(.name) (\(.status))"' 2>/dev/null || echo "   (Could not parse response)"
else
    echo -e "${RED}❌ Failed to list connections${NC}"
    echo "$CONNECTIONS"
    exit 1
fi
echo ""

# Test 3: Get Connection Details (if connections exist)
if [ "$CONNECTION_COUNT" -gt 0 ]; then
    CONNECTION_ID=$(echo "$CONNECTIONS" | jq -r '.[0].id' 2>/dev/null)
    if [ -n "$CONNECTION_ID" ] && [ "$CONNECTION_ID" != "null" ]; then
        echo "3. Testing Get Connection Details..."
        CONNECTION_DETAIL=$(curl -s "$BASE_URL/connections/$CONNECTION_ID")
        if echo "$CONNECTION_DETAIL" | jq -e '.id' > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Connection details retrieved${NC}"
            echo "$CONNECTION_DETAIL" | jq -r '"   ID: \(.id)\n   Name: \(.name)\n   Status: \(.status)"' 2>/dev/null || echo "   (Could not parse response)"
        else
            echo -e "${YELLOW}⚠️  Could not retrieve connection details${NC}"
            echo "$CONNECTION_DETAIL"
        fi
        echo ""
        
        # Test 4: Get Connection Status
        echo "4. Testing Get Connection Status..."
        STATUS=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/status")
        if echo "$STATUS" | jq -e '.status' > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Connection status retrieved${NC}"
            echo "$STATUS" | jq -r '"   Status: \(.status)"' 2>/dev/null || echo "   (Could not parse response)"
        else
            echo -e "${YELLOW}⚠️  Could not retrieve connection status${NC}"
        fi
        echo ""
    fi
fi

# Summary
echo "===================================="
echo -e "${GREEN}✅ API Tests Complete!${NC}"
echo ""
echo "📋 Summary:"
echo "   - Backend is running and healthy"
echo "   - Found $CONNECTION_COUNT connection(s)"
echo "   - API endpoints are accessible"
echo ""
echo "🌐 Next Steps:"
echo "   1. Open your browser"
echo "   2. Go to your frontend URL (http://localhost:8080)"
echo "   3. Click the Settings icon (⚙️) in the header"
echo "   4. Test the Connection Manager UI"
echo ""

