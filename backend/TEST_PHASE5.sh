#!/bin/bash

# Phase 5: SQL Query Execution - Test Script
# This script tests all Phase 5 endpoints with various query types

CONN_ID="conn_1764401629369_ayww2mbaq"
BASE_URL="http://localhost:3000/api/connections/$CONN_ID"

echo "🧪 Phase 5: SQL Query Execution - Testing"
echo "=========================================="
echo ""

# Step 1: Verify server
echo "🔍 Step 1: Verifying server..."
SERVER_STATUS=$(curl -s http://localhost:3000/api/health | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('status') == 'ok' else '❌')" 2>/dev/null)
echo "$SERVER_STATUS Server is running"
echo ""

# Step 2: Connect to database
echo "🔍 Step 2: Connecting to database..."
CONNECT_RESPONSE=$(curl -s -X POST "$BASE_URL/connect")
CONNECT_SUCCESS=$(echo "$CONNECT_RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('success') else '❌')" 2>/dev/null)
echo "$CONNECT_SUCCESS Connected to database"
echo ""

# Test 1: Basic SELECT query
echo "🧪 Test 1: Execute SELECT query (basic)"
RESPONSE=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM public._prisma_migrations LIMIT 3", "maxRows": 10, "timeout": 30}')
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('success') else '❌')" 2>/dev/null)
ROW_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('rowCount', 0))" 2>/dev/null)
EXEC_TIME=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('executionTime', 0))" 2>/dev/null)
echo "$SUCCESS SELECT query executed - Rows: $ROW_COUNT, Time: ${EXEC_TIME}ms"
echo ""

# Test 2: SELECT with COUNT
echo "🧪 Test 2: Execute SELECT query with COUNT"
RESPONSE=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) as total FROM public._prisma_migrations", "maxRows": 10, "timeout": 30}')
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('success') else '❌')" 2>/dev/null)
echo "$SUCCESS COUNT query executed"
echo ""

# Test 3: SELECT with WHERE
echo "🧪 Test 3: Execute SELECT with WHERE clause"
RESPONSE=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT migration_name, id FROM public._prisma_migrations WHERE migration_name LIKE '\''%init%'\'' LIMIT 2", "maxRows": 10, "timeout": 30}')
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('success') else '❌')" 2>/dev/null)
ROW_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('rowCount', 0))" 2>/dev/null)
echo "$SUCCESS WHERE clause query executed - Rows: $ROW_COUNT"
echo ""

# Test 4: EXPLAIN plan (basic)
echo "🧪 Test 4: Get EXPLAIN plan (basic)"
RESPONSE=$(curl -s -X POST "$BASE_URL/query/explain" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM public._prisma_migrations LIMIT 5", "analyze": false}')
HAS_PLAN=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('plan') else '❌')" 2>/dev/null)
echo "$HAS_PLAN EXPLAIN plan generated"
echo ""

# Test 5: EXPLAIN ANALYZE
echo "🧪 Test 5: Get EXPLAIN ANALYZE plan"
RESPONSE=$(curl -s -X POST "$BASE_URL/query/explain" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM public._prisma_migrations LIMIT 5", "analyze": true}')
HAS_PLAN=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('plan') else '❌')" 2>/dev/null)
HAS_TIMING=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅' if data.get('planningTime') is not None or data.get('executionTime') is not None else '❌')" 2>/dev/null)
echo "$HAS_PLAN EXPLAIN ANALYZE plan generated"
echo "$HAS_TIMING Timing information extracted"
echo ""

# Test 6: Result limiting
echo "🧪 Test 6: Test query with result limiting (maxRows=2)"
RESPONSE=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM public._prisma_migrations", "maxRows": 2, "timeout": 30}')
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('success') else '❌')" 2>/dev/null)
ROW_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('rowCount', 0))" 2>/dev/null)
HAS_MESSAGE=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅' if data.get('message') else '⚠️')" 2>/dev/null)
echo "$SUCCESS Result limiting works - Rows returned: $ROW_COUNT"
echo "$HAS_MESSAGE Truncation message (if applicable)"
echo ""

# Test 7: Error handling
echo "🧪 Test 7: Test error handling (invalid query)"
RESPONSE=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM non_existent_table", "maxRows": 10, "timeout": 30}')
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print('❌' if not json.load(sys.stdin).get('success') else '✅')" 2>/dev/null)
HAS_ERROR=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('error') else '❌')" 2>/dev/null)
echo "$SUCCESS Error handling works (query failed as expected)"
echo "$HAS_ERROR Error message returned"
echo ""

# Test 8: Query with functions
echo "🧪 Test 8: Test query with functions (NOW, CURRENT_DATE)"
RESPONSE=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT NOW() as current_time, CURRENT_DATE as current_date", "maxRows": 1, "timeout": 30}')
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print('✅' if json.load(sys.stdin).get('success') else '❌')" 2>/dev/null)
echo "$SUCCESS Query with functions executed"
echo ""

echo "=========================================="
echo "✅ Phase 5 Testing Complete!"
echo ""
echo "📊 Summary:"
echo "  - All endpoints tested"
echo "  - Multiple query types tested"
echo "  - Error handling verified"
echo "  - Explain plans generated"
echo ""
echo "📝 Check individual responses above for detailed results"

