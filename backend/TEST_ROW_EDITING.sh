#!/bin/bash

# Test Row Editing APIs: Insert and Update Row
# This script tests the new single-row insert and update endpoints

BASE_URL="http://localhost:3000/api"

# Get connection ID from environment or use default
CONNECTION_ID="${CONNECTION_ID:-}"
SCHEMA="${SCHEMA:-public}"
TABLE="${TABLE:-}"

echo "🧪 Testing Row Editing APIs"
echo "============================"
echo ""

# Check if connection ID is provided
if [ -z "$CONNECTION_ID" ]; then
  echo "❌ CONNECTION_ID environment variable not set"
  echo ""
  echo "Usage:"
  echo "  CONNECTION_ID=your_conn_id SCHEMA=public TABLE=your_table ./TEST_ROW_EDITING.sh"
  echo ""
  echo "Or get an active connection first:"
  echo "  curl -s $BASE_URL/connections | python3 -m json.tool"
  echo ""
  exit 1
fi

if [ -z "$TABLE" ]; then
  echo "❌ TABLE environment variable not set"
  echo ""
  echo "Usage:"
  echo "  CONNECTION_ID=your_conn_id SCHEMA=public TABLE=your_table ./TEST_ROW_EDITING.sh"
  echo ""
  exit 1
fi

echo "Connection ID: $CONNECTION_ID"
echo "Schema: $SCHEMA"
echo "Table: $TABLE"
echo ""
echo "⚠️  NOTE: This script will INSERT and UPDATE data in your database!"
echo "   Make sure you're testing on a safe table or test database."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test 1: Get table details first to understand structure
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Test 1: Get table details${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TABLE_DETAILS=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE")
echo "$TABLE_DETAILS" | python3 -m json.tool | head -50
echo ""

# Extract primary key column name (simplified - assumes single PK)
PK_COLUMN=$(echo "$TABLE_DETAILS" | python3 -c "import sys, json; data=json.load(sys.stdin); cols=[c for c in data.get('columns', []) if c.get('isPrimaryKey')]; print(cols[0]['name'] if cols else '')" 2>/dev/null)

if [ -z "$PK_COLUMN" ]; then
  echo -e "${YELLOW}⚠️  Warning: Could not find primary key column. Some tests may fail.${NC}"
  echo ""
fi

# Get a sample row to understand data structure
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Test 2: Get sample row data (to understand structure)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SAMPLE_DATA=$(curl -s "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/data?pageSize=1")
echo "$SAMPLE_DATA" | python3 -m json.tool | head -30
echo ""

# Extract first row ID if available
FIRST_ROW_ID=""
if [ ! -z "$PK_COLUMN" ] && [ ! -z "$SAMPLE_DATA" ]; then
  FIRST_ROW_ID=$(echo "$SAMPLE_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); rows=data.get('data', []); print(rows[0].get('$PK_COLUMN', '') if rows else '')" 2>/dev/null)
fi

echo "Primary Key Column: $PK_COLUMN"
echo "First Row ID: $FIRST_ROW_ID"
echo ""

# Test 3: Insert a new row
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Test 3: INSERT a new row${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Creating a test row with minimal data..."
echo ""

# Build insert data - this is a simple example
# In real usage, you'd provide actual column values
INSERT_DATA="{}"

echo "Insert Data: $INSERT_DATA"
echo ""

INSERT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/row" \
  -H "Content-Type: application/json" \
  -d "{\"data\": $INSERT_DATA}")

HTTP_CODE=$(echo "$INSERT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$INSERT_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ INSERT test passed${NC}"
  # Extract inserted row ID
  INSERTED_ROW_ID=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); row=data.get('row', {}); pk='$PK_COLUMN'; print(row.get(pk, '') if pk else '')" 2>/dev/null)
  echo "Inserted Row ID: $INSERTED_ROW_ID"
else
  echo -e "${YELLOW}⚠️  INSERT test returned HTTP $HTTP_CODE${NC}"
  echo "This might be expected if the table requires specific columns."
fi
echo ""

# Test 4: Update an existing row
if [ ! -z "$FIRST_ROW_ID" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${BLUE}Test 4: UPDATE an existing row (Row ID: $FIRST_ROW_ID)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Updating row with minimal changes..."
  echo ""
  
  # Update with empty data (should fail gracefully)
  UPDATE_DATA="{}"
  
  echo "Update Data: $UPDATE_DATA"
  echo ""
  
  UPDATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/row/$FIRST_ROW_ID" \
    -H "Content-Type: application/json" \
    -d "{\"data\": $UPDATE_DATA}")
  
  HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
  BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_CODE/d')
  
  echo "HTTP Status: $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ UPDATE test passed${NC}"
  else
    echo -e "${YELLOW}⚠️  UPDATE test returned HTTP $HTTP_CODE${NC}"
    echo "This might be expected if no columns were provided."
  fi
else
  echo -e "${YELLOW}⚠️  Skipping UPDATE test - no row ID available${NC}"
fi
echo ""

# Test 5: Error case - Insert with invalid data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Test 5: Error handling - Insert with non-existent column${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ERROR_INSERT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/connections/$CONNECTION_ID/db/tables/$SCHEMA/$TABLE/row" \
  -H "Content-Type: application/json" \
  -d '{"data": {"nonexistent_column": "test_value"}}')

HTTP_CODE=$(echo "$ERROR_INSERT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$ERROR_INSERT_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ Error handling test passed (expected 400)${NC}"
else
  echo -e "${YELLOW}⚠️  Expected 400 for error case, got $HTTP_CODE${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Row Editing API tests completed!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Test with actual table data"
echo "  2. Test with specific column updates"
echo "  3. Verify inserted/updated data in database"
echo ""



