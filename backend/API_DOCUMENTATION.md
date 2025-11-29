# API Documentation

## 📋 Overview

Complete API documentation for the DB Visualizer Backend. All endpoints are prefixed with `/api`.

**Base URL:** `http://localhost:3000/api`  
**Content-Type:** `application/json`  
**Authentication:** None (local development)

## 🔌 API Endpoints

### Connection Management

#### 1. List All Connections
**GET** `/connections`

**Description:** Retrieve all saved database connections.

**Response:**
```json
[
  {
    "id": "conn_123",
    "name": "Production DB",
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "user",
    "status": "connected",
    "lastConnected": "2025-11-29T08:00:00.000Z"
  }
]
```

**Status Codes:**
- `200 OK` - Success

---

#### 2. Get Connection Details
**GET** `/connections/:id`

**Description:** Get details of a specific connection.

**Path Parameters:**
- `id` (string) - Connection ID

**Response:**
```json
{
  "id": "conn_123",
  "name": "Production DB",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "status": "connected"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

#### 3. Create Connection
**POST** `/connections`

**Description:** Create a new database connection.

**Request Body:**
```json
{
  "name": "Production DB",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "secret"
}
```

**Response:**
```json
{
  "id": "conn_123",
  "name": "Production DB",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "status": "disconnected"
}
```

**Status Codes:**
- `201 Created` - Connection created
- `400 Bad Request` - Validation error

---

#### 4. Update Connection
**PUT** `/connections/:id`

**Description:** Update an existing connection.

**Path Parameters:**
- `id` (string) - Connection ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "host": "newhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "newpassword"
}
```

**Response:**
```json
{
  "id": "conn_123",
  "name": "Updated Name",
  "host": "newhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "status": "disconnected"
}
```

**Status Codes:**
- `200 OK` - Updated
- `404 Not Found` - Connection not found
- `400 Bad Request` - Validation error

---

#### 5. Delete Connection
**DELETE** `/connections/:id`

**Description:** Delete a connection.

**Path Parameters:**
- `id` (string) - Connection ID

**Response:**
```json
{
  "success": true,
  "message": "Connection deleted successfully"
}
```

**Status Codes:**
- `200 OK` - Deleted
- `404 Not Found` - Connection not found

---

#### 6. Test Connection
**POST** `/connections/:id/test`

**Description:** Test if a connection is valid without connecting.

**Path Parameters:**
- `id` (string) - Connection ID

**Response:**
```json
{
  "success": true,
  "message": "Connection test successful"
}
```

**Status Codes:**
- `200 OK` - Test successful
- `400 Bad Request` - Connection failed
- `404 Not Found` - Connection not found

---

#### 7. Connect to Database
**POST** `/connections/:id/connect`

**Description:** Establish a connection pool to the database.

**Path Parameters:**
- `id` (string) - Connection ID

**Response:**
```json
{
  "success": true,
  "message": "Connected to Production DB"
}
```

**Status Codes:**
- `201 Created` - Connected
- `400 Bad Request` - Connection failed
- `404 Not Found` - Connection not found

---

#### 8. Disconnect from Database
**POST** `/connections/:id/disconnect`

**Description:** Close the connection pool.

**Path Parameters:**
- `id` (string) - Connection ID

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from Production DB"
}
```

**Status Codes:**
- `200 OK` - Disconnected
- `404 Not Found` - Connection not found

---

#### 9. Get Connection Status
**GET** `/connections/:id/status`

**Description:** Get the current connection status.

**Path Parameters:**
- `id` (string) - Connection ID

**Response:**
```json
{
  "connected": true,
  "status": "connected",
  "lastConnected": "2025-11-29T08:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

### Schema & Metadata

#### 10. List Schemas
**GET** `/connections/:connectionId/db/schemas`

**Description:** Get all schemas in the database.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Response:**
```json
[
  {
    "name": "public",
    "tables": []
  },
  {
    "name": "information_schema",
    "tables": []
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

#### 11. Get Database Statistics
**GET** `/connections/:connectionId/db/stats`

**Description:** Get database-wide statistics.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Response:**
```json
{
  "schemaCount": 5,
  "tableCount": 42,
  "totalSize": "125.5 MB",
  "totalSizeBytes": 131596800
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

#### 12. List Tables
**GET** `/connections/:connectionId/db/tables?schema=public`

**Description:** Get all tables, optionally filtered by schema.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Query Parameters:**
- `schema` (string, optional) - Filter by schema name

**Response:**
```json
[
  {
    "id": "public.users",
    "name": "users",
    "schema": "public",
    "rowCount": 1000,
    "size": "1.2 MB",
    "sizeBytes": 1258291,
    "columns": [],
    "indexes": [],
    "foreignKeys": []
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

#### 13. Get Table Details
**GET** `/connections/:connectionId/db/tables/:schema/:table`

**Description:** Get detailed information about a specific table.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `schema` (string) - Schema name
- `table` (string) - Table name

**Response:**
```json
{
  "id": "public.users",
  "name": "users",
  "schema": "public",
  "rowCount": 1000,
  "size": "1.2 MB",
  "sizeBytes": 1258291,
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "nullable": false,
      "defaultValue": "gen_random_uuid()",
      "isPrimaryKey": true,
      "isForeignKey": false
    }
  ],
  "indexes": [
    {
      "name": "users_pkey",
      "type": "btree",
      "columns": ["id"],
      "unique": true
    }
  ],
  "foreignKeys": []
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection or table not found

---

### Table Data

#### 14. Get Table Data
**GET** `/connections/:connectionId/db/tables/:schema/:table/data`

**Description:** Get paginated table data with filtering, sorting, and search.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `schema` (string) - Schema name
- `table` (string) - Table name

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `pageSize` (number, default: 50) - Rows per page
- `filters` (string, optional) - JSON array of filter rules
- `sortColumn` (string, optional) - Column to sort by
- `sortDirection` (string, optional) - `asc` or `desc`
- `search` (string, optional) - Search term
- `columns` (string, optional) - Comma-separated column names

**Response:**
```json
{
  "data": [
    {
      "id": "123",
      "name": "John",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalRows": 1000,
    "totalPages": 20
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection or table not found

---

#### 15. Get Table Row Count
**GET** `/connections/:connectionId/db/tables/:schema/:table/count`

**Description:** Get the total row count for a table.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `schema` (string) - Schema name
- `table` (string) - Table name

**Response:**
```json
{
  "count": 1000
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection or table not found

---

### Query Execution

#### 16. Execute Query
**POST** `/connections/:connectionId/query`

**Description:** Execute a SQL query.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Request Body:**
```json
{
  "query": "SELECT * FROM users WHERE id = $1",
  "timeout": 30,
  "maxRows": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "name": "John"
    }
  ],
  "columns": ["id", "name"],
  "rowCount": 1,
  "executionTime": 45,
  "query": "SELECT * FROM users WHERE id = $1"
}
```

**Status Codes:**
- `201 Created` - Query executed
- `400 Bad Request` - Invalid query
- `404 Not Found` - Connection not found

---

#### 17. Explain Query
**POST** `/connections/:connectionId/query/explain`

**Description:** Get the execution plan for a query.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Request Body:**
```json
{
  "query": "SELECT * FROM users",
  "analyze": false
}
```

**Response:**
```json
{
  "plan": "Seq Scan on users",
  "formattedPlan": "Seq Scan on users  (cost=0.00..100.00 rows=1000 width=64)"
}
```

**Status Codes:**
- `201 Created` - Explain plan generated
- `400 Bad Request` - Invalid query
- `404 Not Found` - Connection not found

---

#### 18. Cancel Query
**POST** `/connections/:connectionId/query/cancel`

**Description:** Cancel a running query (basic implementation).

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Request Body:**
```json
{
  "queryId": "query_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Query cancellation requested"
}
```

**Status Codes:**
- `200 OK` - Cancellation requested
- `404 Not Found` - Query not found

---

### ER Diagram

#### 19. Get ER Diagram
**GET** `/connections/:connectionId/db/diagram?schemas=public&showIsolatedTables=true`

**Description:** Get ER diagram data (nodes and edges) for visualization.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Query Parameters:**
- `schemas` (string, optional) - Comma-separated schema names
- `showIsolatedTables` (boolean, default: true) - Show tables with no relationships

**Response:**
```json
{
  "nodes": [
    {
      "id": "public.users",
      "type": "tableNode",
      "position": { "x": 100, "y": 100 },
      "data": {
        "table": {
          "id": "public.users",
          "name": "users",
          "schema": "public",
          "columns": [],
          "rowCount": 1000
        }
      }
    }
  ],
  "edges": [
    {
      "id": "public.orders-public.users",
      "source": "public.orders",
      "target": "public.users",
      "type": "smoothstep",
      "label": "user_id"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

#### 20. Get Table Relationships
**GET** `/connections/:connectionId/db/tables/:schema/:table/relationships`

**Description:** Get incoming and outgoing relationships for a table.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `schema` (string) - Schema name
- `table` (string) - Table name

**Response:**
```json
{
  "outgoing": [
    {
      "constraintName": "orders_user_id_fkey",
      "columns": ["user_id"],
      "referencedSchema": "public",
      "referencedTable": "users",
      "referencedColumns": ["id"]
    }
  ],
  "incoming": [
    {
      "constraintName": "posts_user_id_fkey",
      "schema": "public",
      "table": "posts",
      "columns": ["user_id"],
      "referencedColumns": ["id"]
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection or table not found

---

### Export

#### 21. Export Table Data
**GET** `/connections/:connectionId/db/tables/:schema/:table/export`

**Description:** Export table data as CSV or JSON.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `schema` (string) - Schema name
- `table` (string) - Table name

**Query Parameters:**
- `format` (string, required) - `csv` or `json`
- `includeHeaders` (boolean, default: true) - Include column headers
- `filters` (string, optional) - JSON array of filters
- `sort` (string, optional) - JSON sort option
- `search` (string, optional) - Search term
- `selectedColumns` (string, optional) - Comma-separated columns
- `limit` (number, optional) - Max rows (default: 100000)

**Response:**
- **CSV:** Returns CSV file download
- **JSON:** Returns JSON array file download

**Status Codes:**
- `200 OK` - Export successful
- `400 Bad Request` - Invalid format
- `404 Not Found` - Connection or table not found

---

#### 22. Export Query Results
**POST** `/connections/:connectionId/query/export`

**Description:** Export query results as CSV or JSON.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Request Body:**
```json
{
  "query": "SELECT * FROM users",
  "format": "csv",
  "includeHeaders": true,
  "timeout": 60,
  "maxRows": 100000
}
```

**Response:**
- **CSV:** Returns CSV file download
- **JSON:** Returns JSON array file download

**Status Codes:**
- `200 OK` - Export successful
- `400 Bad Request` - Invalid format or query
- `404 Not Found` - Connection not found

---

### Query History & Saved Queries

#### 23. Get Query History
**GET** `/connections/:connectionId/query-history?limit=50`

**Description:** Get query execution history.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Query Parameters:**
- `limit` (number, default: 50) - Max history items

**Response:**
```json
[
  {
    "id": "hist_123",
    "query": "SELECT * FROM users",
    "executedAt": "2025-11-29T08:00:00.000Z",
    "executionTime": 45,
    "success": true,
    "rowCount": 100
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

#### 24. Clear Query History
**DELETE** `/connections/:connectionId/query-history`

**Description:** Clear all query history for a connection.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Response:**
```json
{
  "success": true,
  "message": "Query history cleared"
}
```

**Status Codes:**
- `200 OK` - Cleared
- `404 Not Found` - Connection not found

---

#### 25. Create Saved Query
**POST** `/connections/:connectionId/queries`

**Description:** Save a query for later use.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Request Body:**
```json
{
  "name": "User Count",
  "query": "SELECT COUNT(*) FROM users",
  "description": "Count all users"
}
```

**Response:**
```json
{
  "id": "query_123",
  "name": "User Count",
  "query": "SELECT COUNT(*) FROM users",
  "description": "Count all users",
  "createdAt": "2025-11-29T08:00:00.000Z"
}
```

**Status Codes:**
- `201 Created` - Saved
- `400 Bad Request` - Validation error
- `404 Not Found` - Connection not found

---

#### 26. List Saved Queries
**GET** `/connections/:connectionId/queries?search=user`

**Description:** Get all saved queries, optionally filtered by search term.

**Path Parameters:**
- `connectionId` (string) - Connection ID

**Query Parameters:**
- `search` (string, optional) - Search term

**Response:**
```json
[
  {
    "id": "query_123",
    "name": "User Count",
    "query": "SELECT COUNT(*) FROM users",
    "description": "Count all users",
    "createdAt": "2025-11-29T08:00:00.000Z"
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection not found

---

#### 27. Get Saved Query
**GET** `/connections/:connectionId/queries/:id`

**Description:** Get a specific saved query.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `id` (string) - Query ID

**Response:**
```json
{
  "id": "query_123",
  "name": "User Count",
  "query": "SELECT COUNT(*) FROM users",
  "description": "Count all users",
  "createdAt": "2025-11-29T08:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Query not found

---

#### 28. Update Saved Query
**PUT** `/connections/:connectionId/queries/:id`

**Description:** Update a saved query.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `id` (string) - Query ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "query": "SELECT COUNT(*) FROM users WHERE active = true",
  "description": "Count active users"
}
```

**Response:**
```json
{
  "id": "query_123",
  "name": "Updated Name",
  "query": "SELECT COUNT(*) FROM users WHERE active = true",
  "description": "Count active users",
  "createdAt": "2025-11-29T08:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Updated
- `404 Not Found` - Query not found
- `400 Bad Request` - Validation error

---

#### 29. Delete Saved Query
**DELETE** `/connections/:connectionId/queries/:id`

**Description:** Delete a saved query.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `id` (string) - Query ID

**Response:**
```json
{
  "success": true,
  "message": "Query deleted successfully"
}
```

**Status Codes:**
- `200 OK` - Deleted
- `404 Not Found` - Query not found

---

### Foreign Key Navigation

#### 30. Get Row by Primary Key
**GET** `/connections/:connectionId/db/tables/:schema/:table/row/:id`

**Description:** Get a specific row by its primary key value.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `schema` (string) - Schema name
- `table` (string) - Table name
- `id` (string) - Primary key value (or comma-separated for composite keys)

**Response:**
```json
{
  "found": true,
  "row": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection or table not found

---

#### 31. Lookup by Foreign Key
**GET** `/connections/:connectionId/db/tables/:schema/:table/fk-lookup`

**Description:** Lookup a referenced row by foreign key value.

**Path Parameters:**
- `connectionId` (string) - Connection ID
- `schema` (string) - Schema name
- `table` (string) - Table name

**Query Parameters:**
- `foreignKeyName` (string, required) - FK constraint name
- `foreignKeyValue` (string, required) - FK value (or comma-separated for composite)

**Response:**
```json
{
  "found": true,
  "table": {
    "schema": "public",
    "name": "users"
  },
  "row": {
    "id": "123",
    "name": "John Doe"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Connection, table, or FK not found

---

## 🚨 Error Responses

All errors follow this format:

```json
{
  "statusCode": 404,
  "timestamp": "2025-11-29T08:00:00.000Z",
  "path": "/api/connections/123",
  "method": "GET",
  "message": "Connection not found",
  "error": "Not Found"
}
```

### Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Validation error or invalid input
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 🔒 Security Notes

- Passwords are encrypted using AES-256-CBC before storage
- All queries use parameterized statements to prevent SQL injection
- Query timeouts prevent long-running queries
- Result limits prevent excessive data transfer
- Input validation on all endpoints

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- Connection IDs are auto-generated
- Query history is auto-tracked for executed queries
- File-based storage is used for connections, history, and saved queries
- Connection pools are managed automatically

---

**Last Updated:** 2025-11-29

