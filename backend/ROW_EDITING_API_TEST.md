# Row Editing API Test Guide

## 📋 Overview

This document describes how to test the new Row Editing APIs:
- **INSERT Row**: Create a new row in a table
- **UPDATE Row**: Update an existing row by primary key

## 🚀 Quick Start

### Prerequisites

1. Backend server must be running:
   ```bash
   cd backend
   npm run start:dev
   ```

2. You need:
   - An active database connection
   - A table to test with
   - The connection ID

---

## 📝 Test Steps

### Step 1: Get Connection ID

```bash
curl -s http://localhost:3000/api/connections | python3 -m json.tool
```

Look for the `id` field of an active connection.

### Step 2: Get Table Structure

Replace `CONN_ID`, `SCHEMA`, and `TABLE` with your values:

```bash
curl -s http://localhost:3000/api/connections/CONN_ID/db/tables/SCHEMA/TABLE | python3 -m json.tool
```

This shows:
- Column names
- Column types
- Primary keys
- Auto-increment columns
- Nullable columns

### Step 3: Get Sample Row Data

```bash
curl -s "http://localhost:3000/api/connections/CONN_ID/db/tables/SCHEMA/TABLE/data?pageSize=1" | python3 -m json.tool
```

Note the primary key value of the first row for update testing.

---

## 🧪 Testing INSERT Row API

**Endpoint:** `POST /api/connections/:connectionId/db/tables/:schema/:table/row`

**Request Body:**
```json
{
  "data": {
    "column_name_1": "value1",
    "column_name_2": "value2"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/connections/CONN_ID/db/tables/SCHEMA/TABLE/row \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Test Name",
      "email": "test@example.com",
      "age": 25
    }
  }' | python3 -m json.tool
```

**Expected Response:**
```json
{
  "success": true,
  "row": {
    "id": 123,
    "name": "Test Name",
    "email": "test@example.com",
    "age": 25,
    ...
  }
}
```

**Notes:**
- Auto-increment columns are automatically skipped
- Primary keys are automatically handled
- Missing columns use default values if available
- Returns the inserted row with generated IDs

---

## 🧪 Testing UPDATE Row API

**Endpoint:** `PUT /api/connections/:connectionId/db/tables/:schema/:table/row/:rowId`

**Request Body:**
```json
{
  "data": {
    "column_name": "new_value"
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/connections/CONN_ID/db/tables/SCHEMA/TABLE/row/ROW_ID \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Updated Name",
      "email": "updated@example.com"
    }
  }' | python3 -m json.tool
```

**Expected Response:**
```json
{
  "success": true,
  "row": {
    "id": ROW_ID,
    "name": "Updated Name",
    "email": "updated@example.com",
    ...
  }
}
```

**Notes:**
- Row ID is the primary key value (comma-separated for composite keys)
- Primary key columns cannot be updated
- Only specified columns are updated
- Returns the updated row

---

## ⚠️ Error Cases

### 1. Invalid Column Name
**Request:** Column that doesn't exist
**Expected:** `400 Bad Request` with error message

### 2. NOT NULL Constraint Violation
**Request:** Missing required column
**Expected:** `400 Bad Request` with constraint error

### 3. Foreign Key Constraint
**Request:** Invalid foreign key value
**Expected:** `400 Bad Request` with FK error

### 4. Unique Constraint Violation
**Request:** Duplicate unique value
**Expected:** `400 Bad Request` with unique constraint error

### 5. Row Not Found (UPDATE)
**Request:** Invalid row ID
**Expected:** `200 OK` with `success: false` and message

---

## 🔧 Using Test Scripts

### Simple Test Script

```bash
cd backend
./TEST_ROW_EDITING_SIMPLE.sh <CONNECTION_ID> <SCHEMA> <TABLE>
```

Example:
```bash
./TEST_ROW_EDITING_SIMPLE.sh conn_123456 public users
```

### Full Test Script

```bash
cd backend
CONNECTION_ID=conn_123 SCHEMA=public TABLE=users ./TEST_ROW_EDITING.sh
```

---

## ✅ Test Checklist

- [ ] Server is running
- [ ] Connection ID obtained
- [ ] Table structure retrieved
- [ ] INSERT row with valid data
- [ ] INSERT row with invalid column (should fail)
- [ ] UPDATE row with valid data
- [ ] UPDATE row with invalid row ID (should fail)
- [ ] UPDATE row with primary key column (should fail)
- [ ] Test with auto-increment columns
- [ ] Test with composite primary keys
- [ ] Test constraint violations

---

## 📊 Example Test Session

```bash
# 1. Get connections
curl -s http://localhost:3000/api/connections | python3 -m json.tool

# 2. Get table details
curl -s http://localhost:3000/api/connections/conn_123/db/tables/public/users | python3 -m json.tool

# 3. Get a sample row
curl -s "http://localhost:3000/api/connections/conn_123/db/tables/public/users/data?pageSize=1" | python3 -m json.tool

# 4. Insert a new row
curl -X POST http://localhost:3000/api/connections/conn_123/db/tables/public/users/row \
  -H "Content-Type: application/json" \
  -d '{"data": {"name": "John Doe", "email": "john@example.com"}}' | python3 -m json.tool

# 5. Update the row (using ID from insert response)
curl -X PUT http://localhost:3000/api/connections/conn_123/db/tables/public/users/row/5 \
  -H "Content-Type: application/json" \
  -d '{"data": {"name": "Jane Doe"}}' | python3 -m json.tool
```

---

## 🐛 Troubleshooting

### Server not responding
- Check if server is running: `curl http://localhost:3000/api/health`
- Check server logs for errors

### Connection not found
- Verify connection ID is correct
- Check if connection is active: `GET /api/connections/:id/status`

### Table not found
- Verify schema and table name are correct
- Check table exists: `GET /api/connections/:id/db/tables`

### Validation errors
- Check column names match exactly (case-sensitive)
- Verify data types match column types
- Check for required columns (NOT NULL)

---

**Ready to test!** 🚀



