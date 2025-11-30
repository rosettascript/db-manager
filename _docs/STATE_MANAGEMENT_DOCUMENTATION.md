# State Management Documentation

Complete guide for state management patterns in the DB Visualizer frontend.

---

## 📚 Overview

The application uses **React Query (TanStack Query)** for server state management and **React Context** for global application state.

### Key Concepts

- **Server State:** Managed by React Query (caching, fetching, synchronization)
- **Client State:** Managed by React Context (active connection, UI state)
- **Query Keys:** Centralized factory for consistent cache keys
- **Cache Invalidation:** Automatic and manual cache management

---

## 🔑 Query Keys

**Location:** `lib/query/queryKeys.ts`

### Purpose

Query keys ensure consistent caching and enable targeted cache invalidation.

### Structure

```typescript
import { queryKeys } from '@/lib/query/queryKeys';

// Connections
queryKeys.connections.all                    // ['connections']
queryKeys.connections.detail('conn_123')     // ['connections', 'conn_123']
queryKeys.connections.status('conn_123')     // ['connection-status', 'conn_123']

// Schemas
queryKeys.schemas.all('conn_123')            // ['schemas', 'conn_123']

// Tables
queryKeys.tables.all('conn_123')             // ['tables', 'conn_123']
queryKeys.tables.bySchema('conn_123', 'public') // ['tables', 'conn_123', 'public']
queryKeys.tables.detail('conn_123', 'public', 'users') // ['table-details', 'conn_123', 'public', 'users']
queryKeys.tables.data('conn_123', 'public', 'users', page, pageSize, ...) // ['table-data', ...]

// Query History
queryKeys.queryHistory.all('conn_123')       // ['query-history', 'conn_123']

// Saved Queries
queryKeys.savedQueries.all('conn_123')       // ['saved-queries', 'conn_123']

// ER Diagram
queryKeys.diagram.detail('conn_123', ['public'], false) // ['diagram', 'conn_123', 'public', false]
```

### Helper Function

```typescript
import { getConnectionQueryKeys } from '@/lib/query/queryKeys';

// Get all query keys for a connection
const keys = getConnectionQueryKeys('conn_123');
// Returns: { schemas, tables, databaseStats, queryHistory, savedQueries }
```

---

## ⚙️ Query Configuration

**Location:** `lib/query/queryConfig.ts`

### Default Options

```typescript
import { getDefaultQueryOptions } from '@/lib/query/queryConfig';

const { data } = useQuery({
  queryKey: queryKeys.schemas.all(connectionId),
  queryFn: () => schemasService.getSchemas(connectionId),
  ...getDefaultQueryOptions('schemas'),
});
```

### Available Types

- `'connections'` - Short stale time, medium cache
- `'schemas'` - Medium stale time, long cache
- `'tables'` - Medium stale time, long cache
- `'table-data'` - Fresh stale time, medium cache, placeholder data
- `'query'` - Always stale, short cache, no retry
- `'diagram'` - Long stale time, medium cache

### Configuration Values

```typescript
export const queryConfig = {
  cacheTime: {
    long: 5 * 60 * 1000,      // 5 minutes
    medium: 2 * 60 * 1000,    // 2 minutes
    short: 30 * 1000,          // 30 seconds
    veryShort: 10 * 1000,      // 10 seconds
  },
  staleTime: {
    veryStale: 10 * 60 * 1000, // 10 minutes
    stale: 5 * 60 * 1000,       // 5 minutes
    mediumStale: 2 * 60 * 1000, // 2 minutes
    fresh: 30 * 1000,           // 30 seconds
    veryFresh: 10 * 1000,       // 10 seconds
  },
  retry: {
    queries: {
      attempts: 1,
      delay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      attempts: 0,
    },
  },
  refetch: {
    onWindowFocus: false,
    onReconnect: true,
    onMount: false,
  },
};
```

---

## 🔄 Cache Management

**Location:** `lib/query/cacheUtils.ts`

### Invalidate Connection Cache

```typescript
import { invalidateConnectionCache } from '@/lib/query/cacheUtils';
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();
  
  const handleDisconnect = () => {
    // Invalidate all queries for a connection
    invalidateConnectionCache(queryClient, connectionId);
  };
}
```

### Clear All Caches

```typescript
import { clearAllCaches } from '@/lib/query/cacheUtils';

clearAllCaches(queryClient);
```

### Manual Invalidation

```typescript
import { queryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';

// Invalidate specific query
queryClient.invalidateQueries({
  queryKey: queryKeys.schemas.all(connectionId),
});

// Invalidate all queries matching pattern
queryClient.invalidateQueries({
  queryKey: ['schemas', connectionId],
});
```

---

## 🌐 Connection Context

**Location:** `contexts/ConnectionContext.tsx`

### Purpose

Manages the active database connection globally across the application.

### Usage

```typescript
import { useConnection } from '@/contexts/ConnectionContext';

function MyComponent() {
  const {
    activeConnection,      // Current active connection
    connections,           // All connections
    setActiveConnection,   // Set active connection
    refreshConnections,   // Refresh connections list
    isLoading,             // Loading state
    isError,              // Error state
    error,                // Error object
  } = useConnection();
  
  if (!activeConnection) {
    return <div>No connection selected</div>;
  }
  
  // Use active connection
  const connectionId = activeConnection.id;
}
```

### Features

- **Persistence:** Active connection ID stored in `localStorage`
- **Auto-invalidation:** Cache invalidated when connection changes
- **Memoization:** Active connection is memoized for performance
- **Error Handling:** Handles connection errors gracefully

---

## 📝 Common Patterns

### Pattern 1: Fetching Data

```typescript
import { useQuery } from '@tanstack/react-query';
import { schemasService } from '@/lib/api';
import { queryKeys, getDefaultQueryOptions } from '@/lib/query';

function SchemaList() {
  const { activeConnection } = useConnection();
  
  const { data: schemas, isLoading, error } = useQuery({
    queryKey: queryKeys.schemas.all(activeConnection?.id),
    queryFn: () => schemasService.getSchemas(activeConnection!.id),
    enabled: !!activeConnection, // Only run if connection exists
    ...getDefaultQueryOptions('schemas'),
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{schemas?.map(s => s.name)}</div>;
}
```

### Pattern 2: Mutations with Cache Invalidation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsService } from '@/lib/api';
import { queryKeys } from '@/lib/query';

function CreateConnection() {
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: (data) => connectionsService.create(data),
    onSuccess: () => {
      // Invalidate connections list
      queryClient.invalidateQueries({
        queryKey: queryKeys.connections.all,
      });
    },
  });
  
  return (
    <button onClick={() => createMutation.mutate({ name: 'New DB' })}>
      Create
    </button>
  );
}
```

### Pattern 3: Optimistic Updates

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const updateMutation = useMutation({
  mutationFn: ({ id, data }) => connectionsService.update(id, data),
  onMutate: async ({ id, data }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.connections.detail(id) });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(queryKeys.connections.detail(id));
    
    // Optimistically update
    queryClient.setQueryData(queryKeys.connections.detail(id), (old) => ({
      ...old,
      ...data,
    }));
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(
      queryKeys.connections.detail(variables.id),
      context.previous
    );
  },
  onSettled: (data, error, variables) => {
    // Refetch after mutation
    queryClient.invalidateQueries({
      queryKey: queryKeys.connections.detail(variables.id),
    });
  },
});
```

### Pattern 4: Dependent Queries

```typescript
const { data: schemas } = useQuery({
  queryKey: queryKeys.schemas.all(connectionId),
  queryFn: () => schemasService.getSchemas(connectionId),
  enabled: !!connectionId,
});

const { data: tables } = useQuery({
  queryKey: queryKeys.tables.all(connectionId, schemas?.[0]?.name),
  queryFn: () => schemasService.getTables(connectionId, schemas?.[0]?.name),
  enabled: !!connectionId && !!schemas?.[0]?.name, // Depends on schemas
});
```

---

## 🎯 Best Practices

### 1. Always Use Query Keys Factory

✅ **Good:**
```typescript
queryKey: queryKeys.schemas.all(connectionId)
```

❌ **Bad:**
```typescript
queryKey: ['schemas', connectionId] // Inconsistent
```

### 2. Use Default Query Options

✅ **Good:**
```typescript
...getDefaultQueryOptions('schemas')
```

❌ **Bad:**
```typescript
staleTime: 300000, // Hard-coded values
gcTime: 300000,
```

### 3. Invalidate After Mutations

✅ **Good:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.connections.all });
}
```

❌ **Bad:**
```typescript
// No cache invalidation - stale data
```

### 4. Enable Queries Conditionally

✅ **Good:**
```typescript
enabled: !!activeConnection
```

❌ **Bad:**
```typescript
// Query runs even without connection
```

### 5. Handle Loading and Error States

✅ **Good:**
```typescript
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorDisplay error={error} />;
```

❌ **Bad:**
```typescript
// No loading/error handling
return <div>{data.name}</div>; // Crashes if data is undefined
```

---

## 🔍 Debugging

### View Query Cache

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Get all queries
const queries = queryClient.getQueryCache().getAll();
console.log('Cached queries:', queries);

// Get specific query
const query = queryClient.getQueryData(queryKeys.schemas.all(connectionId));
console.log('Schema data:', query);
```

### Check Query State

```typescript
const { data, status, fetchStatus, isStale, isInvalidated } = useQuery({
  queryKey: queryKeys.schemas.all(connectionId),
  queryFn: () => schemasService.getSchemas(connectionId),
});

console.log('Status:', status); // 'pending' | 'error' | 'success'
console.log('Fetch Status:', fetchStatus); // 'fetching' | 'paused' | 'idle'
console.log('Is Stale:', isStale);
console.log('Is Invalidated:', isInvalidated);
```

---

## 📚 Additional Resources

- **React Query Docs:** https://tanstack.com/query/latest
- **Query Keys Guide:** `lib/query/queryKeys.ts`
- **Configuration:** `lib/query/queryConfig.ts`
- **Cache Utils:** `lib/query/cacheUtils.ts`

---

**Last Updated:** Phase 12.13 - Documentation Complete

