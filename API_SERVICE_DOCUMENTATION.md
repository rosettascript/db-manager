# API Service Documentation

Complete documentation for all API service functions in the frontend.

---

## 📚 Table of Contents

1. [Connections Service](#connections-service)
2. [Schemas Service](#schemas-service)
3. [Data Service](#data-service)
4. [Queries Service](#queries-service)
5. [Query History Service](#query-history-service)
6. [Diagram Service](#diagram-service)
7. [Export Service](#export-service)
8. [Foreign Keys Service](#foreign-keys-service)

---

## 🔌 Connections Service

**Location:** `lib/api/services/connections.service.ts`

### `list()`

List all database connections.

```typescript
const connections = await connectionsService.list();
```

**Returns:** `Promise<Connection[]>`

**Example:**
```typescript
import { connectionsService } from '@/lib/api';

const connections = await connectionsService.list();
console.log(`Found ${connections.length} connections`);
```

---

### `getById(id: string)`

Get a connection by ID.

```typescript
const connection = await connectionsService.getById('conn_123');
```

**Parameters:**
- `id: string` - Connection ID

**Returns:** `Promise<Connection>`

**Throws:** `ApiException` if connection not found

---

### `create(data: CreateConnectionDto)`

Create a new database connection.

```typescript
const connection = await connectionsService.create({
  name: 'My Database',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'user',
  password: 'password',
  sslMode: 'prefer',
});
```

**Parameters:**
- `data: CreateConnectionDto` - Connection details

**Returns:** `Promise<Connection>`

**Throws:** `ApiException` on validation errors or connection failure

---

### `update(id: string, data: UpdateConnectionDto)`

Update an existing connection.

```typescript
await connectionsService.update('conn_123', {
  name: 'Updated Name',
  host: 'newhost',
});
```

**Parameters:**
- `id: string` - Connection ID
- `data: UpdateConnectionDto` - Updated connection details

**Returns:** `Promise<Connection>`

**Throws:** `ApiException` if connection not found

---

### `delete(id: string)`

Delete a connection.

```typescript
await connectionsService.delete('conn_123');
```

**Parameters:**
- `id: string` - Connection ID

**Returns:** `Promise<void>`

**Throws:** `ApiException` if connection not found

---

### `connect(id: string)`

Connect to a database.

```typescript
await connectionsService.connect('conn_123');
```

**Parameters:**
- `id: string` - Connection ID

**Returns:** `Promise<{ success: boolean; message?: string }>`

**Throws:** `ApiException` on connection failure

---

### `disconnect(id: string)`

Disconnect from a database.

```typescript
await connectionsService.disconnect('conn_123');
```

**Parameters:**
- `id: string` - Connection ID

**Returns:** `Promise<void>`

---

### `test(id: string)`

Test a connection without connecting.

```typescript
const result = await connectionsService.test('conn_123');
if (result.success) {
  console.log(`Connection successful in ${result.connectionTime}ms`);
}
```

**Parameters:**
- `id: string` - Connection ID

**Returns:** `Promise<ConnectionTestResponse>`

---

## 📊 Schemas Service

**Location:** `lib/api/services/schemas.service.ts`

### `getSchemas(connectionId: string)`

Get all schemas for a connection.

```typescript
const schemas = await schemasService.getSchemas('conn_123');
```

**Parameters:**
- `connectionId: string` - Connection ID

**Returns:** `Promise<Schema[]>`

---

### `getTables(connectionId: string, schema?: string)`

Get all tables for a connection, optionally filtered by schema.

```typescript
// Get all tables
const allTables = await schemasService.getTables('conn_123');

// Get tables for specific schema
const publicTables = await schemasService.getTables('conn_123', 'public');
```

**Parameters:**
- `connectionId: string` - Connection ID
- `schema?: string` - Optional schema name

**Returns:** `Promise<Table[]>`

---

### `getTableDetails(connectionId: string, schema: string, table: string)`

Get detailed information about a table.

```typescript
const table = await schemasService.getTableDetails('conn_123', 'public', 'users');
console.log(`Table has ${table.columns.length} columns`);
```

**Parameters:**
- `connectionId: string` - Connection ID
- `schema: string` - Schema name
- `table: string` - Table name

**Returns:** `Promise<Table>`

**Throws:** `ApiException` if table not found

---

### `getDatabaseStats(connectionId: string)`

Get database statistics.

```typescript
const stats = await schemasService.getDatabaseStats('conn_123');
console.log(`Total size: ${stats.totalSize}`);
console.log(`Total tables: ${stats.totalTables}`);
```

**Parameters:**
- `connectionId: string` - Connection ID

**Returns:** `Promise<DatabaseStats>`

---

### `refreshSchemas(connectionId: string)`

Refresh the schema cache.

```typescript
await schemasService.refreshSchemas('conn_123');
```

**Parameters:**
- `connectionId: string` - Connection ID

**Returns:** `Promise<{ success: boolean; message?: string }>`

---

## 📋 Data Service

**Location:** `lib/api/services/data.service.ts`

### `getTableData(connectionId: string, schema: string, table: string, options?: QueryOptions)`

Get table data with pagination, filtering, sorting, and search.

```typescript
const data = await dataService.getTableData('conn_123', 'public', 'users', {
  page: 1,
  pageSize: 100,
  search: 'john',
  sortColumn: 'name',
  sortDirection: 'asc',
  filters: [
    { column: 'status', operator: '=', value: 'active' }
  ],
  columns: ['id', 'name', 'email'], // Optional: specific columns
});
```

**Parameters:**
- `connectionId: string` - Connection ID
- `schema: string` - Schema name
- `table: string` - Table name
- `options?: QueryOptions` - Query options

**Returns:** `Promise<TableDataResponse>`

---

### `getTableCount(connectionId: string, schema: string, table: string, options?: QueryOptions)`

Get total row count for a table (with filters applied).

```typescript
const count = await dataService.getTableCount('conn_123', 'public', 'users', {
  search: 'john',
  filters: [{ column: 'status', operator: '=', value: 'active' }],
});
console.log(`Total rows: ${count.total}`);
```

**Parameters:**
- `connectionId: string` - Connection ID
- `schema: string` - Schema name
- `table: string` - Table name
- `options?: QueryOptions` - Query options (filters, search)

**Returns:** `Promise<TableCountResponse>`

---

## 🔍 Queries Service

**Location:** `lib/api/services/queries.service.ts`

### `executeQuery(connectionId: string, options: QueryExecutionOptions)`

Execute a SQL query.

```typescript
const result = await queriesService.executeQuery('conn_123', {
  query: 'SELECT * FROM users LIMIT 10',
  timeout: 30, // seconds
  maxRows: 1000,
});

if (result.success) {
  console.log(`Returned ${result.rowCount} rows in ${result.executionTime}ms`);
  console.log('Data:', result.data);
}
```

**Parameters:**
- `connectionId: string` - Connection ID
- `options: QueryExecutionOptions` - Query options

**Returns:** `Promise<QueryExecutionResponse>`

**Throws:** `ApiException` on query errors

---

### `explainQuery(connectionId: string, options: ExplainQueryOptions)`

Get query execution plan.

```typescript
const plan = await queriesService.explainQuery('conn_123', {
  query: 'SELECT * FROM users WHERE id = $1',
  analyze: true, // Use EXPLAIN ANALYZE
});

console.log('Plan:', plan.plan);
console.log('Planning time:', plan.planningTime);
console.log('Execution time:', plan.executionTime);
```

**Parameters:**
- `connectionId: string` - Connection ID
- `options: ExplainQueryOptions` - Query options

**Returns:** `Promise<ExplainPlanResponse>`

---

### `cancelQuery(connectionId: string, queryId: string)`

Cancel a running query.

```typescript
await queriesService.cancelQuery('conn_123', 'query_123');
```

**Parameters:**
- `connectionId: string` - Connection ID
- `queryId: string` - Query ID (returned from executeQuery)

**Returns:** `Promise<void>`

---

## 📜 Query History Service

**Location:** `lib/api/services/query-history.service.ts`

### `getQueryHistory(connectionId: string, limit?: number, offset?: number)`

Get query execution history.

```typescript
const history = await queryHistoryService.getQueryHistory('conn_123', 50, 0);
console.log(`Found ${history.length} queries in history`);
```

**Parameters:**
- `connectionId: string` - Connection ID
- `limit?: number` - Maximum number of results (default: 50)
- `offset?: number` - Offset for pagination (default: 0)

**Returns:** `Promise<QueryHistoryItem[]>`

---

### `clearHistory(connectionId: string)`

Clear query history.

```typescript
await queryHistoryService.clearHistory('conn_123');
```

**Parameters:**
- `connectionId: string` - Connection ID

**Returns:** `Promise<void>`

---

### `getSavedQueries(connectionId: string)`

Get all saved queries.

```typescript
const saved = await queryHistoryService.getSavedQueries('conn_123');
```

**Parameters:**
- `connectionId: string` - Connection ID

**Returns:** `Promise<SavedQuery[]>`

---

### `saveQuery(connectionId: string, data: CreateSavedQueryDto)`

Save a query.

```typescript
const saved = await queryHistoryService.saveQuery('conn_123', {
  name: 'Get Active Users',
  query: 'SELECT * FROM users WHERE status = $1',
  description: 'Query to get all active users',
  tags: ['users', 'active'],
});
```

**Parameters:**
- `connectionId: string` - Connection ID
- `data: CreateSavedQueryDto` - Query details

**Returns:** `Promise<SavedQuery>`

---

### `updateSavedQuery(connectionId: string, queryId: string, data: UpdateSavedQueryDto)`

Update a saved query.

```typescript
await queryHistoryService.updateSavedQuery('conn_123', 'query_123', {
  name: 'Updated Query Name',
  description: 'New description',
});
```

**Parameters:**
- `connectionId: string` - Connection ID
- `queryId: string` - Query ID
- `data: UpdateSavedQueryDto` - Updated query details

**Returns:** `Promise<SavedQuery>`

---

### `deleteSavedQuery(connectionId: string, queryId: string)`

Delete a saved query.

```typescript
await queryHistoryService.deleteSavedQuery('conn_123', 'query_123');
```

**Parameters:**
- `connectionId: string` - Connection ID
- `queryId: string` - Query ID

**Returns:** `Promise<void>`

---

## 🗺️ Diagram Service

**Location:** `lib/api/services/diagram.service.ts`

### `getDiagram(connectionId: string, options?: DiagramOptions)`

Get ER diagram data.

```typescript
const diagram = await diagramService.getDiagram('conn_123', {
  schemas: ['public', 'auth'], // Optional: filter by schemas
  showIsolatedTables: true, // Include tables with no relationships
});

console.log(`Diagram has ${diagram.nodes.length} nodes`);
console.log(`Diagram has ${diagram.edges.length} relationships`);
```

**Parameters:**
- `connectionId: string` - Connection ID
- `options?: DiagramOptions` - Diagram options

**Returns:** `Promise<DiagramResponse>`

---

## 📤 Export Service

**Location:** `lib/api/services/export.service.ts`

### `exportTableData(connectionId: string, schema: string, table: string, format: ExportFormat, options?: TableExportOptions)`

Export table data to CSV or JSON.

```typescript
// Export as CSV
await exportService.exportTableData('conn_123', 'public', 'users', 'csv', {
  includeHeaders: true,
  filters: [{ column: 'status', operator: '=', value: 'active' }],
});

// Export as JSON
await exportService.exportTableData('conn_123', 'public', 'users', 'json', {
  includeHeaders: true,
  selectedColumns: ['id', 'name', 'email'],
});
```

**Parameters:**
- `connectionId: string` - Connection ID
- `schema: string` - Schema name
- `table: string` - Table name
- `format: ExportFormat` - 'csv' or 'json'
- `options?: TableExportOptions` - Export options

**Returns:** `Promise<void>` (triggers file download)

---

### `exportQueryResults(connectionId: string, format: ExportFormat, options: QueryExportOptions)`

Export query results to CSV or JSON.

```typescript
await exportService.exportQueryResults('conn_123', 'csv', {
  query: 'SELECT * FROM users WHERE status = $1',
  includeHeaders: true,
});
```

**Parameters:**
- `connectionId: string` - Connection ID
- `format: ExportFormat` - 'csv' or 'json'
- `options: QueryExportOptions` - Export options

**Returns:** `Promise<void>` (triggers file download)

---

## 🔗 Foreign Keys Service

**Location:** `lib/api/services/foreign-keys.service.ts`

### `lookupByPrimaryKey(connectionId: string, schema: string, table: string, id: string)`

Look up a row by primary key.

```typescript
const row = await foreignKeysService.lookupByPrimaryKey('conn_123', 'public', 'users', '123');
console.log('Row:', row);
```

**Parameters:**
- `connectionId: string` - Connection ID
- `schema: string` - Schema name
- `table: string` - Table name
- `id: string` - Primary key value

**Returns:** `Promise<RowLookupResponse>`

---

### `lookupByForeignKey(connectionId: string, schema: string, table: string, fkName: string, fkValue: string | string[])`

Look up referenced table information by foreign key.

```typescript
const lookup = await foreignKeysService.lookupByForeignKey(
  'conn_123',
  'public',
  'orders',
  'user_id',
  '123'
);

console.log(`Referenced table: ${lookup.referencedSchema}.${lookup.referencedTable}`);
```

**Parameters:**
- `connectionId: string` - Connection ID
- `schema: string` - Schema name
- `table: string` - Table name
- `fkName: string` - Foreign key constraint name
- `fkValue: string | string[]` - Foreign key value(s)

**Returns:** `Promise<ForeignKeyLookupResponse>`

---

## 🔄 Using with React Query

All services can be used with React Query:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { connectionsService } from '@/lib/api';
import { queryKeys } from '@/lib/query/queryKeys';

// Query
const { data: connections } = useQuery({
  queryKey: queryKeys.connections.all,
  queryFn: () => connectionsService.list(),
});

// Mutation
const createMutation = useMutation({
  mutationFn: (data) => connectionsService.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.connections.all });
  },
});
```

---

## ⚠️ Error Handling

All service functions throw `ApiException` on errors:

```typescript
import { ApiException, getErrorMessage } from '@/lib/api/errors';

try {
  await connectionsService.connect('conn_123');
} catch (error) {
  if (error instanceof ApiException) {
    console.error(`API Error (${error.statusCode}):`, error.message);
  } else {
    console.error('Error:', getErrorMessage(error));
  }
}
```

---

## 📝 Type Definitions

All types are defined in `lib/api/types.ts`:

- `Connection`
- `CreateConnectionDto`
- `UpdateConnectionDto`
- `Schema`
- `Table`
- `TableDataResponse`
- `QueryExecutionResponse`
- `QueryHistoryItem`
- `SavedQuery`
- `DiagramResponse`
- And more...

---

**Last Updated:** Phase 12.13 - Documentation Complete

